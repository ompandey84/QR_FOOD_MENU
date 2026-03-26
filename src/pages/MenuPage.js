import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import SearchBar from '../components/SearchBar';
import CategoryTabs from '../components/CategoryTabs';
import CategorySection from '../components/CategorySection';
import CartBar from '../components/CartBar';
import OrderModal from '../components/OrderModal';
import MyOrdersModal from '../components/MyOrdersModal';
import SpecialOffers from '../components/SpecialOffers';
import ReservationModal from '../components/ReservationModal';
export default function MenuPage() {
    const { restaurantId } = useParams();
    const [restaurant, setRestaurant] = useState(null);
    const [menuItems, setMenuItems] = useState([]);
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [vegOnly, setVegOnly] = useState(false);
    const location = useLocation();
    const tableParam = new URLSearchParams(location.search).get('table');
    const [tableNumber, setTableNumber] = useState(tableParam || '');

    // Cart & Order State
    const [cart, setCart] = useState({}); // { dishId: quantity }
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [isMyOrdersOpen, setIsMyOrdersOpen] = useState(false);
    const [isReservationOpen, setIsReservationOpen] = useState(false);

    useEffect(() => {
        async function loadMenu() {
            try {
                const { data: rest, error: restErr } = await supabase
                    .from('restaurants')
                    .select('*')
                    .eq('id', restaurantId)
                    .single();
                if (restErr) throw restErr;
                setRestaurant(rest);

                const { data: items, error: itemsErr } = await supabase
                    .from('menu_items')
                    .select('*')
                    .eq('restaurant_id', restaurantId)
                    .order('category');
                if (itemsErr) throw itemsErr;
                setMenuItems(items || []);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        loadMenu();
    }, [restaurantId]);

    const categories = useMemo(() => {
        const cats = [...new Set(menuItems.map((item) => item.category))];
        return ['All', ...cats];
    }, [menuItems]);

    // Scroll‑spy: update active category based on scroll position
    useEffect(() => {
        const handleScroll = () => {
            const scrollPos = window.scrollY + 100; // offset for header height
            let current = 'All';
            for (const cat of categories) {
                if (cat === 'All') continue;
                const el = document.getElementById(cat);
                if (el && el.offsetTop <= scrollPos) {
                    current = cat;
                } else {
                    break;
                }
            }
            setActiveCategory(current);
        };
        window.addEventListener('scroll', handleScroll);
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, [categories]);

    const handleCategoryClick = (cat) => {
        setActiveCategory(cat);
        const el = document.getElementById(cat);
        if (el) {
            const y = el.getBoundingClientRect().top + window.scrollY - 120; // header offset
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

    const filtered = useMemo(() => {
        let items = menuItems;
        if (vegOnly) items = items.filter((item) => item.type === 'veg');
        if (search.trim()) {
            const q = search.toLowerCase();
            items = items.filter(
                (item) =>
                    item.name.toLowerCase().includes(q) ||
                    item.description?.toLowerCase().includes(q) ||
                    item.category.toLowerCase().includes(q)
            );
        }
        return items;
    }, [menuItems, search, vegOnly]);

    const cartItems = useMemo(() => {
        return Object.entries(cart)
            .filter(([_, qty]) => qty > 0)
            .map(([id, qty]) => {
                const dish = menuItems.find(item => item.id === id);
                return { ...dish, quantity: qty };
            })
            .filter(item => item.id);
    }, [cart, menuItems]);

    const cartTotal = useMemo(() => cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cartItems]);
    const cartItemCount = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems]);

    const handleUpdateQuantity = (dishId, newQuantity) => {
        setCart(prev => {
            const updated = { ...prev };
            if (newQuantity <= 0) delete updated[dishId];
            else updated[dishId] = newQuantity;
            return updated;
        });
    };

    const handleConfirmOrder = async (customerDetails) => {
        try {
            const finalTotal = cartTotal - (customerDetails.discount_amount || 0);

            // Try inserting with new schema columns first
            let order;
            const payload = {
                restaurant_id: restaurantId,
                customer_name: customerDetails.name,
                customer_phone: customerDetails.phone,
                table_number: customerDetails.table,
                total: finalTotal,
                applied_promo: customerDetails.applied_promo || '',
                discount_amount: customerDetails.discount_amount || 0,
                status: 'pending',
                payment_status: customerDetails.payment_method === 'online' ? 'pending' : 'unpaid',
                payment_method: customerDetails.payment_method || 'counter',
                payment_id: ''
            };

            const { data: initialData, error: initialErr } = await supabase
                .from('orders')
                .insert(payload)
                .select()
                .single();

            if (initialErr) {
                // PGRST204 means column not found in schema cache
                if (initialErr.code === 'PGRST204') {
                    console.warn("Schema outdated, falling back to older orders table structure.");
                    const fallbackPayload = {
                        restaurant_id: restaurantId,
                        customer_name: customerDetails.name,
                        table_number: customerDetails.table,
                        total: finalTotal,
                        status: 'pending'
                    };
                    const { data: fallbackData, error: fallbackErr } = await supabase
                        .from('orders')
                        .insert(fallbackPayload)
                        .select()
                        .single();

                    if (fallbackErr) throw fallbackErr;
                    order = fallbackData;
                } else {
                    throw initialErr;
                }
            } else {
                order = initialData;
            }

            const itemsToInsert = cartItems.map(item => ({
                order_id: order.id,
                menu_item_id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity
            }));
            const { error: itemsErr } = await supabase.from('order_items').insert(itemsToInsert);
            if (itemsErr) throw itemsErr;

            // Save to localStorage for My Orders tracking
            const storedOrders = JSON.parse(localStorage.getItem('my_orders') || '[]');
            localStorage.setItem('my_orders', JSON.stringify([order.id, ...storedOrders]));

            // Clear cart but keep modal open for payment step
            setCart({});
            // Return orderId so OrderModal can show the payment step
            return { orderId: order.id };
        } catch (err) {

            alert("Failed to place order. Please try again or ask the counter.");
            return null;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background-light p-4 space-y-4">
                <div className="h-12 bg-slate-200 rounded animate-pulse" />
                <div className="h-10 bg-slate-200 rounded animate-pulse" />
                <div className="flex space-x-2">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-8 w-16 bg-slate-200 rounded animate-pulse" />)}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-48 bg-slate-200 rounded animate-pulse" />)}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-background-light flex items-center justify-center p-6">
                <div className="card text-center max-w-md">
                    <span className="text-5xl block mb-4">⚠️</span>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h2>
                    <p className="text-slate-500 text-sm">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background-light flex flex-col relative w-full overflow-x-hidden">
            {/* Top info bar */}
            <div className="bg-charcoal text-white/80 text-xs py-2 px-4 hidden md:block">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <span>{restaurant?.description || restaurant?.name || 'Welcome to our restaurant'}</span>
                    {restaurant?.phone && (
                        <span className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                            Order Online {restaurant.phone}
                        </span>
                    )}
                </div>
            </div>

            <header className="sticky top-0 z-50 transition-all duration-300 bg-white/95 backdrop-blur-lg shadow-lg shadow-charcoal/5">
                <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-8">
                        {/* Brand */}
                        <div className="flex items-center gap-3">
                            <div className="bg-primary p-2.5 rounded-xl hidden sm:block">
                                <svg className="w-6 h-6 text-charcoal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.126-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M16.5 3.75V16.5" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-xl font-black tracking-tight text-charcoal leading-none">{restaurant?.name || 'SmartMenu'}</h1>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] font-bold text-warm-gray uppercase tracking-widest leading-none">Digital Menu</span>
                                    {tableNumber && (
                                        <span className="bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded leading-none">Table {tableNumber}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <nav className="hidden md:flex items-center gap-8">
                            <button className="text-charcoal text-sm font-semibold hover:text-[#9E9147] transition-colors" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Menu</button>
                            <button className="text-charcoal/60 text-sm font-medium hover:text-charcoal transition-colors" onClick={() => {
                                const el = document.getElementById('Offers');
                                if (el) window.scrollTo({ top: el.offsetTop - 120, behavior: 'smooth' });
                            }}>Offers</button>
                            <button className="text-charcoal/60 text-sm font-medium hover:text-charcoal transition-colors flex items-center gap-1" onClick={() => setIsMyOrdersOpen(true)}>
                                My Orders
                                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                            </button>
                        </nav>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsReservationOpen(true)}
                            className="hidden sm:flex items-center gap-2 bg-primary/20 hover:bg-primary/30 text-charcoal px-4 py-2 rounded-xl text-sm font-black transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm">calendar_month</span> Reserve Table
                        </button>
                        <button onClick={() => setIsOrderModalOpen(true)} className="relative p-2 bg-[#F4F2E6] rounded-full hover:bg-primary/20 transition-colors">
                            <span className="material-symbols-outlined text-charcoal">shopping_basket</span>
                            {cartItemCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-primary text-charcoal text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                                    {cartItemCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 md:px-6 py-6 mb-24">
                <section className="relative w-full aspect-[21/9] md:aspect-[3/1] rounded-2xl overflow-hidden mb-12 group shadow-xl shadow-charcoal/5">
                    <img className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Restaurant placeholder" src={restaurant?.logo_url || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=2070"} />
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/30 to-transparent flex flex-col justify-end p-8 md:p-16">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 mb-3">
                                {tableParam && <span className="text-white/80 text-sm font-medium backdrop-blur-md bg-white/10 px-3 py-1 rounded-full border border-white/20">Table {tableParam}</span>}
                            </div>
                            <h1 className="text-white text-5xl md:text-7xl font-black leading-tight tracking-tighter truncate mb-2">{restaurant?.name || 'Restaurant Menu'}</h1>
                            <p className="text-white/70 text-sm md:text-lg max-w-xl font-medium line-clamp-2">{restaurant?.description || 'Exquisite flavors crafted with fresh, local ingredients. Enjoy your digital dining experience.'}</p>
                            <button
                                onClick={() => setIsReservationOpen(true)}
                                className="mt-4 inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold text-sm px-5 py-2.5 rounded-xl border border-white/20 transition-all w-fit"
                            >
                                <span className="material-symbols-outlined text-primary text-sm">event_available</span>
                                Reserve a Table
                            </button>
                        </div>
                    </div>
                </section>

                <div id="Offers"><SpecialOffers /></div>
                <div className="mb-5"><SearchBar value={search} onChange={setSearch} /></div>
                <div className="flex items-center mb-4"><label className="inline-flex items-center cursor-pointer"><input type="checkbox" className="form-checkbox h-4 w-4 text-orange-500" checked={vegOnly} onChange={() => setVegOnly(!vegOnly)} /><span className="ml-2 text-sm text-slate-700">Veg Only</span></label></div>
                <div className="mb-6"><CategoryTabs categories={categories} activeCategory={activeCategory} onSelect={handleCategoryClick} /></div>
                {search && <p className="text-sm text-slate-500 mb-4">{filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{search}"</p>}
                {categories.filter(cat => cat !== 'All').map((cat) => (
                    <CategorySection key={cat} id={cat} title={cat} dishes={filtered.filter((d) => d.category === cat)} cart={cart} onUpdateQuantity={handleUpdateQuantity} />
                ))}

                <div className="mt-12" />
            </main>

            <CartBar itemCount={cartItemCount} total={cartTotal} tableNumber={tableNumber} onTableChange={setTableNumber} onCheckout={() => setIsOrderModalOpen(true)} />
            <OrderModal isOpen={isOrderModalOpen} onClose={() => setIsOrderModalOpen(false)} cart={cartItems} total={cartTotal} tableNumber={tableNumber} onConfirm={handleConfirmOrder} />
            <MyOrdersModal isOpen={isMyOrdersOpen} onClose={() => setIsMyOrdersOpen(false)} />
            <ReservationModal isOpen={isReservationOpen} onClose={() => setIsReservationOpen(false)} restaurantId={restaurantId} />

        </div >
    );
}
