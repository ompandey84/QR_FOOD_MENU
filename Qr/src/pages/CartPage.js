import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

export default function CartPage() {
    const navigate = useNavigate();
    const { restaurantId } = useParams();
    const location = useLocation();
    const tableParam = new URLSearchParams(location.search).get('table') || '';

    // Load cart from localStorage
    const [cart, setCart] = useState(() => {
        try {
            const saved = localStorage.getItem(`cart_${restaurantId}`);
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    });

    const [menuItems, setMenuItems] = useState([]);
    const [restaurant, setRestaurant] = useState(null);
    const [loading, setLoading] = useState(true);

    // Load restaurant and menu items from DB
    useEffect(() => {
        async function load() {
            try {
                const { data: rest } = await supabase
                    .from('restaurants').select('*').eq('id', restaurantId).single();
                setRestaurant(rest);

                const { data: items } = await supabase
                    .from('menu_items').select('*').eq('restaurant_id', restaurantId);
                setMenuItems(items || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [restaurantId]);

    // Persist cart changes
    useEffect(() => {
        localStorage.setItem(`cart_${restaurantId}`, JSON.stringify(cart));
    }, [cart, restaurantId]);

    const cartItems = Object.entries(cart)
        .filter(([_, qty]) => qty > 0)
        .map(([id, qty]) => {
            const dish = menuItems.find(item => item.id === id);
            return dish ? { ...dish, quantity: qty } : null;
        })
        .filter(Boolean);

    const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const updateQuantity = (itemId, newQty) => {
        setCart(prev => {
            const updated = { ...prev };
            if (newQty <= 0) delete updated[itemId];
            else updated[itemId] = newQty;
            return updated;
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    if (cartItems.length === 0) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
                <span className="text-6xl mb-4">🛒</span>
                <h2 className="text-2xl font-black text-charcoal mb-2">Your cart is empty</h2>
                <p className="text-slate-400 text-sm mb-6">Add some delicious items from the menu!</p>
                <button
                    onClick={() => navigate(`/menu/${restaurantId}${tableParam ? `?table=${tableParam}` : ''}`)}
                    className="bg-primary text-charcoal font-bold px-8 py-3 rounded-xl shadow-sm hover:bg-[#F0C900] transition-all"
                >
                    Browse Menu
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
                <button
                    onClick={() => navigate(`/menu/${restaurantId}${tableParam ? `?table=${tableParam}` : ''}`)}
                    className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                    <span className="material-symbols-outlined text-charcoal">arrow_back</span>
                </button>
                <div className="flex-1">
                    <h1 className="text-lg font-black text-charcoal">Your Cart</h1>
                    <p className="text-xs text-slate-400">{cartItems.length} item{cartItems.length !== 1 ? 's' : ''} · {restaurant?.name || 'Restaurant'}</p>
                </div>
            </header>

            {/* Cart Items */}
            <main className="flex-1 p-4 pb-32 max-w-lg mx-auto w-full">
                <AnimatePresence>
                    {cartItems.map((item, index) => (
                        <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -100 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-white rounded-2xl p-4 mb-3 border border-slate-100 shadow-sm flex gap-4"
                        >
                            {item.image_url ? (
                                <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
                                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className="w-20 h-20 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
                                    <span className="text-2xl">🍽️</span>
                                </div>
                            )}

                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <div className={`w-3 h-3 rounded-sm border-2 flex items-center justify-center ${item.type === 'veg' ? 'border-green-500' : 'border-red-500'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${item.type === 'veg' ? 'bg-green-500' : 'bg-red-500'}`} />
                                        </div>
                                        <h3 className="font-bold text-sm text-charcoal truncate">{item.name}</h3>
                                    </div>
                                    <p className="text-sm font-black text-charcoal">₹{Number(item.price).toFixed(0)}</p>
                                </div>

                                <div className="flex items-center gap-1 mt-2">
                                    <button
                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                        className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-sm">remove</span>
                                    </button>
                                    <span className="w-8 text-center text-sm font-black text-charcoal">{item.quantity}</span>
                                    <button
                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                        className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center hover:bg-[#F0C900] transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-sm text-charcoal">add</span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col items-end justify-between">
                                <span className="text-sm font-black text-charcoal">₹{(item.price * item.quantity).toFixed(0)}</span>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </main>

            {/* Fixed Bottom Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 pb-6 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <div className="max-w-lg mx-auto">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-slate-500 font-medium">Subtotal</span>
                        <span className="text-xl font-black text-charcoal">₹{cartTotal.toFixed(0)}</span>
                    </div>
                    <button
                        onClick={() => navigate(`/menu/${restaurantId}/checkout${tableParam ? `?table=${tableParam}` : ''}`, {
                            state: { cart, menuItems, restaurant }
                        })}
                        className="w-full bg-primary text-charcoal font-black py-4 rounded-2xl text-base uppercase tracking-wider shadow-lg shadow-primary/30 hover:bg-[#F0C900] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        Proceed to Checkout
                        <span className="material-symbols-outlined">arrow_forward</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
