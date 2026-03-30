import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import SearchBar from '../components/SearchBar';
import CategoryTabs from '../components/CategoryTabs';
import CategorySection from '../components/CategorySection';
import CartBar from '../components/CartBar';
import MyOrdersModal from '../components/MyOrdersModal';
import SpecialOffers from '../components/SpecialOffers';
import CustomerOrderTracker from '../components/CustomerOrderTracker';
import ErrorDialog from '../components/ErrorDialog';

export default function MenuPage() {
    const { restaurantId } = useParams();
    const navigate = useNavigate();
    const [restaurant, setRestaurant] = useState(null);
    const [menuItems, setMenuItems] = useState([]);
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [vegOnly, setVegOnly] = useState(false);
    const location = useLocation();
    const tableParam = new URLSearchParams(location.search).get('table');
    const tableNumber = tableParam || '';

    // Error Dialog State
    const [errorDialog, setErrorDialog] = useState({ isOpen: false, title: '', message: '' });

    // Sponsored / Featured dishes
    const [sponsoredItems, setSponsoredItems] = useState([]);

    // Cart State — persisted in localStorage
    const [cart, setCart] = useState(() => {
        try {
            const saved = localStorage.getItem(`cart_${restaurantId}`);
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    });
    const [isMyOrdersOpen, setIsMyOrdersOpen] = useState(() => {
        // Auto-open My Orders if user navigated back from checkout
        try {
            const ids = JSON.parse(localStorage.getItem('my_orders') || '[]');
            return ids.length > 0 && window.history.state?.idx > 0;
        } catch { return false; }
    });
    const hasMyOrders = (() => {
        try { return JSON.parse(localStorage.getItem('my_orders') || '[]').length > 0; } catch { return false; }
    })();

    const [trackedOrderId, setTrackedOrderId] = useState(null);

    // Genie animation state
    const [flyingItems, setFlyingItems] = useState([]);
    const cartIconRef = useRef(null);

    // Persist cart to localStorage on every change
    useEffect(() => {
        localStorage.setItem(`cart_${restaurantId}`, JSON.stringify(cart));
    }, [cart, restaurantId]);

    useEffect(() => {
        async function loadMenu() {
            try {
                const { data: rest, error: restErr } = await supabase
                    .from('restaurants').select('*').eq('id', restaurantId).single();
                if (restErr) throw restErr;
                setRestaurant(rest);

                const { data: items, error: itemsErr } = await supabase
                    .from('menu_items').select('*').eq('restaurant_id', restaurantId).order('category');
                if (itemsErr) throw itemsErr;

                const availableItems = (items || []).filter(item => item.is_available !== false);
                setMenuItems(availableItems);

                const { data: sponsored } = await supabase
                    .from('sponsored_items')
                    .select('*, menu_items(*)')
                    .eq('restaurant_id', restaurantId)
                    .eq('is_active', true)
                    .order('sort_order', { ascending: true });

                if (sponsored) {
                    const validSponsored = sponsored
                        .filter(s => s.menu_items && s.menu_items.is_available !== false)
                        .map(s => s.menu_items);
                    setSponsoredItems(validSponsored);
                }
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

    // Scroll-spy
    useEffect(() => {
        const handleScroll = () => {
            const scrollPos = window.scrollY + 100;
            let current = 'All';
            for (const cat of categories) {
                if (cat === 'All') continue;
                const el = document.getElementById(cat);
                if (el && el.offsetTop <= scrollPos) current = cat;
                else break;
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
            const y = el.getBoundingClientRect().top + window.scrollY - 120;
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

    // Genie fly animation
    const triggerFlyAnimation = useCallback((event, dish) => {
        const cartEl = cartIconRef.current;
        if (!cartEl) return;

        const cartRect = cartEl.getBoundingClientRect();
        let startX, startY;

        if (event?.currentTarget) {
            const btn = event.currentTarget;
            const btnRect = btn.getBoundingClientRect();
            startX = btnRect.left + btnRect.width / 2;
            startY = btnRect.top + btnRect.height / 2;
        } else {
            startX = window.innerWidth / 2;
            startY = window.innerHeight / 2;
        }

        const endX = cartRect.left + cartRect.width / 2;
        const endY = cartRect.top + cartRect.height / 2;

        const id = Date.now() + Math.random();
        setFlyingItems(prev => [...prev, {
            id,
            startX, startY, endX, endY,
            name: dish?.name || '🍽️',
            imageUrl: dish?.image_url,
            isVeg: dish?.type === 'veg',
        }]);

        setTimeout(() => {
            setFlyingItems(prev => prev.filter(item => item.id !== id));
        }, 700);
    }, []);

    const handleUpdateQuantity = (dishId, newQuantity, event, dish) => {
        const prevQty = cart[dishId] || 0;
        setCart(prev => {
            const updated = { ...prev };
            if (newQuantity <= 0) delete updated[dishId];
            else updated[dishId] = newQuantity;
            return updated;
        });

        // Only animate on increment (adding)
        if (newQuantity > prevQty && event) {
            const dishData = dish || menuItems.find(item => item.id === dishId);
            triggerFlyAnimation(event, dishData);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white p-4 space-y-4 animate-pulse">
                <div className="h-12 bg-slate-100 rounded-xl" />
                <div className="h-10 bg-slate-100 rounded-xl" />
                <div className="flex space-x-2">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-8 w-20 bg-slate-100 rounded-full" />)}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-slate-50 rounded-2xl overflow-hidden">
                            <div className="aspect-square bg-slate-100" />
                            <div className="p-5 space-y-3">
                                <div className="h-5 bg-slate-100 rounded w-3/4" />
                                <div className="h-3 bg-slate-100 rounded w-1/2" />
                                <div className="h-10 bg-slate-100 rounded-xl w-20 ml-auto" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-6">
                <div className="card text-center max-w-md">
                    <span className="text-5xl block mb-4">⚠️</span>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h2>
                    <p className="text-slate-500 text-sm">{error}</p>
                </div>
            </div>
        );
    }

    const notAccepting = restaurant && restaurant.is_accepting_orders === false;

    return (
        <div className="min-h-screen bg-white flex flex-col relative w-full overflow-x-hidden">
            {/* Flying items animation */}
            {flyingItems.map(item => (
                <div
                    key={item.id}
                    className="fixed z-[9999] pointer-events-none"
                    style={{
                        left: item.startX,
                        top: item.startY,
                        animation: 'genie-fly 0.6s cubic-bezier(0.2, 0.6, 0.35, 1) forwards',
                        '--end-x': `${item.endX - item.startX}px`,
                        '--end-y': `${item.endY - item.startY}px`,
                    }}
                >
                    <div className="w-10 h-10 -ml-5 -mt-5 rounded-full bg-primary shadow-lg shadow-primary/40 flex items-center justify-center text-charcoal font-black text-xs border-2 border-white overflow-hidden">
                        {item.imageUrl ? (
                            <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <span>+1</span>
                        )}
                    </div>
                </div>
            ))}

            {/* Not accepting banner */}
            {notAccepting && (
                <div className="bg-red-500 text-white text-center py-2.5 px-4 text-sm font-bold">
                    🚫 This restaurant is currently not accepting orders
                </div>
            )}

            {/* Top info bar */}
            <div className="bg-charcoal text-white/80 text-xs py-2 px-4 hidden md:block">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <span>{restaurant?.description || restaurant?.name || 'Welcome to our restaurant'}</span>
                    {restaurant?.phone && (
                        <span className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                            Contact: {restaurant.phone}
                        </span>
                    )}
                </div>
            </div>

            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg shadow-lg shadow-charcoal/5">
                <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-3">
                            {restaurant?.logo_url ? (
                                <img src={restaurant.logo_url} alt="Logo" className="w-10 h-10 rounded-xl object-cover" />
                            ) : (
                                <div className="bg-primary p-2.5 rounded-xl hidden sm:flex items-center justify-center">
                                    <svg className="w-6 h-6 text-charcoal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.126-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M16.5 3.75V16.5" />
                                    </svg>
                                </div>
                            )}
                            <div>
                                <h1 className="text-xl font-black tracking-tight text-charcoal leading-none">{restaurant?.name || 'SmartMenu'}</h1>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {restaurant?.city && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{restaurant.city}</span>}
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
                    <div className="flex items-center gap-2">
                        {/* My Orders button in header */}
                        {hasMyOrders && (
                            <button
                                onClick={() => setIsMyOrdersOpen(true)}
                                className="relative flex items-center gap-1.5 px-3 py-2 bg-slate-50 rounded-full hover:bg-primary/10 transition-colors text-sm font-bold text-charcoal"
                            >
                                <span className="material-symbols-outlined text-base">receipt_long</span>
                                <span className="hidden sm:inline">My Orders</span>
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            </button>
                        )}
                        <button
                            ref={cartIconRef}
                            onClick={() => {
                                if (cartItemCount > 0) {
                                    navigate(`/menu/${restaurantId}/cart${tableNumber ? `?table=${tableNumber}` : ''}`, {
                                        state: { cart, menuItems, restaurant }
                                    });
                                }
                            }}
                            className="relative p-2 bg-slate-50 rounded-full hover:bg-primary/20 transition-colors"
                        >
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
                {/* Hero Banner */}
                <section className="relative w-full aspect-[4/1] md:aspect-[3/1] rounded-2xl overflow-hidden mb-6 md:mb-12 group shadow-xl shadow-charcoal/5">
                    <img className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Restaurant" src={restaurant?.logo_url || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=2070"} />
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/30 to-transparent flex flex-col justify-end p-4 md:p-16">
                        <div className="flex flex-col gap-1">
                            {tableParam && <span className="hidden md:inline-block text-white/80 text-sm font-medium backdrop-blur-md bg-white/10 px-3 py-1 rounded-full border border-white/20 w-fit">Table {tableParam}</span>}
                            <h1 className="text-white text-2xl md:text-7xl font-black leading-tight tracking-tighter truncate mb-1 md:mb-2">{restaurant?.name || 'Restaurant Menu'}</h1>
                            <p className="text-white/70 text-xs md:text-lg max-w-xl font-medium line-clamp-1 md:line-clamp-2">{restaurant?.description || 'Exquisite flavors crafted with fresh, local ingredients.'}</p>
                        </div>
                    </div>
                </section>

                {/* Sponsored / Featured Section */}
                {sponsoredItems.length > 0 && (
                    <section className="mb-10">
                        <h2 className="text-2xl font-black tracking-tight flex items-center gap-2 mb-6">
                            ⭐ Chef's Picks
                            <span className="w-12 h-1 bg-primary rounded-full"></span>
                        </h2>
                        <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                            {sponsoredItems.map(dish => (
                                <div key={dish.id} className="flex-none w-[260px] snap-center bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100/80 overflow-hidden hover:shadow-lg transition-all group">
                                    {dish.image_url && (
                                        <div className="aspect-video overflow-hidden">
                                            <img src={dish.image_url} alt={dish.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                        </div>
                                    )}
                                    <div className="p-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className={`w-3 h-3 rounded border-2 flex items-center justify-center ${dish.type === 'veg' ? 'border-green-500' : 'border-red-500'}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${dish.type === 'veg' ? 'bg-green-500' : 'bg-red-500'}`} />
                                            </div>
                                            <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">FEATURED</span>
                                        </div>
                                        <h3 className="font-bold text-charcoal text-base leading-tight truncate">{dish.name}</h3>
                                        <div className="flex items-center justify-between mt-3">
                                            <span className="font-black text-charcoal">₹{Number(dish.price).toFixed(0)}</span>
                                            <button
                                                onClick={(e) => handleUpdateQuantity(dish.id, (cart[dish.id] || 0) + 1, e, dish)}
                                                className="bg-primary text-charcoal px-4 py-1.5 rounded-lg text-xs font-black shadow-sm hover:bg-[#F0C900] active:scale-95 transition-all"
                                            >
                                                {cart[dish.id] > 0 ? `${cart[dish.id]} Added` : '+ Add'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

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

            <CartBar
                itemCount={cartItemCount}
                total={cartTotal}
                tableNumber={tableNumber}
                restaurantId={restaurantId}
            />
            <MyOrdersModal isOpen={isMyOrdersOpen} onClose={() => setIsMyOrdersOpen(false)} />
            {trackedOrderId && (
                <CustomerOrderTracker orderId={trackedOrderId} onClose={() => setTrackedOrderId(null)} />
            )}

            <ErrorDialog
                isOpen={errorDialog.isOpen}
                title={errorDialog.title}
                message={errorDialog.message}
                onClose={() => setErrorDialog({ ...errorDialog, isOpen: false })}
            />
        </div>
    );
}
