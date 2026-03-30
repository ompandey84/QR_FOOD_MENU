import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { supabase } from '../supabaseClient';
import Shimmer from '../components/Shimmer';
import { FiPlus, FiTrash2, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { useSubscription } from '../hooks/useSubscription';
import PlanGate from '../components/PlanGate';

export default function SponsoredPage() {
    const navigate = useNavigate();
    const [menuItems, setMenuItems] = useState([]);
    const [sponsored, setSponsored] = useState([]);
    const [loading, setLoading] = useState(true);
    const [restaurantId, setRestaurantId] = useState(null);
    const [adding, setAdding] = useState(false);

    const { limits, plan } = useSubscription(restaurantId);

    useEffect(() => {
        async function load() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return navigate('/login');
            const { data: rest } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).single();
            if (!rest) return;
            setRestaurantId(rest.id);

            // Load menu items
            const { data: items } = await supabase.from('menu_items').select('id, name, image_url, price, type, is_available')
                .eq('restaurant_id', rest.id).order('name');
            setMenuItems(items || []);

            // Load sponsored
            const { data: sp } = await supabase.from('sponsored_items').select('*, menu_items(id, name, image_url, price, type)')
                .eq('restaurant_id', rest.id).order('sort_order', { ascending: true });
            setSponsored(sp || []);
            setLoading(false);
        }
        load();
    }, [navigate]);

    const sponsoredIds = new Set(sponsored.map(s => s.menu_item_id));
    const availableToAdd = menuItems.filter(i => !sponsoredIds.has(i.id) && i.is_available !== false);

    async function handleAdd(menuItemId) {
        setAdding(true);
        const { data, error } = await supabase.from('sponsored_items')
            .insert({ restaurant_id: restaurantId, menu_item_id: menuItemId, sort_order: sponsored.length })
            .select('*, menu_items(id, name, image_url, price, type)')
            .single();
        if (!error && data) setSponsored(prev => [...prev, data]);
        setAdding(false);
    }

    async function handleRemove(id) {
        await supabase.from('sponsored_items').delete().eq('id', id);
        setSponsored(prev => prev.filter(s => s.id !== id));
    }

    async function handleReorder(index, direction) {
        const newList = [...sponsored];
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= newList.length) return;
        [newList[index], newList[targetIndex]] = [newList[targetIndex], newList[index]];
        setSponsored(newList);
        // Update sort_order in DB
        await Promise.all(newList.map((item, i) =>
            supabase.from('sponsored_items').update({ sort_order: i }).eq('id', item.id)
        ));
    }

    async function handleToggle(item) {
        const newVal = !item.is_active;
        setSponsored(prev => prev.map(s => s.id === item.id ? { ...s, is_active: newVal } : s));
        await supabase.from('sponsored_items').update({ is_active: newVal }).eq('id', item.id);
    }

    return (
        <MainLayout activeLink="Settings" title="Featured Items">
            <main className="flex-1 p-6 lg:p-10 max-w-4xl">
                <h1 className="text-3xl font-black tracking-tight mb-2">Featured / Sponsored Dishes</h1>
                <p className="text-slate-500 mb-8">Select dishes to appear in the "Chef's Picks" billboard on your customer menu. Drag to reorder.</p>

                <PlanGate 
                    isAllowed={limits.hasChefsPicks} 
                    featureName="Chef's Picks Billboard"
                    currentPlan={plan}
                    restaurantId={restaurantId}
                >
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="card flex items-center gap-4">
                                    <Shimmer className="w-14 h-14 rounded-xl" />
                                    <div className="flex-1 space-y-2">
                                        <Shimmer className="h-4 w-32 rounded" />
                                        <Shimmer className="h-3 w-20 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            {/* Current sponsored items */}
                            <div className="space-y-3 mb-8">
                                {sponsored.length === 0 && (
                                    <div className="card text-center py-12">
                                        <span className="text-4xl block mb-3">⭐</span>
                                        <h3 className="text-lg font-bold text-slate-700 mb-1">No featured dishes yet</h3>
                                        <p className="text-slate-500 text-sm">Add dishes below to create a featured billboard for your customers.</p>
                                    </div>
                                )}
                                {sponsored.map((item, index) => (
                                    <div key={item.id} className={`card !p-4 flex items-center gap-4 ${!item.is_active ? 'opacity-50' : ''}`}>
                                        {/* Reorder controls */}
                                        <div className="flex flex-col gap-1">
                                            <button onClick={() => handleReorder(index, -1)} disabled={index === 0}
                                                className="p-1 rounded text-slate-300 hover:text-slate-600 disabled:opacity-30">
                                                <FiArrowUp className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => handleReorder(index, 1)} disabled={index === sponsored.length - 1}
                                                className="p-1 rounded text-slate-300 hover:text-slate-600 disabled:opacity-30">
                                                <FiArrowDown className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        {/* Thumbnail */}
                                        <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                                            {item.menu_items?.image_url ? (
                                                <img src={item.menu_items.image_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xl">🍽️</div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded border-2 flex items-center justify-center
                                                    ${item.menu_items?.type === 'veg' ? 'border-green-500' : 'border-red-500'}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${item.menu_items?.type === 'veg' ? 'bg-green-500' : 'bg-red-500'}`} />
                                                </div>
                                                <h4 className="font-bold text-sm text-charcoal truncate">{item.menu_items?.name}</h4>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-0.5">₹{Number(item.menu_items?.price || 0).toFixed(0)}</p>
                                        </div>

                                        {/* Active toggle */}
                                        <button
                                            onClick={() => handleToggle(item)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${item.is_active ? 'bg-green-500' : 'bg-slate-300'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${item.is_active ? 'translate-x-[22px]' : 'translate-x-1'}`} />
                                        </button>

                                        {/* Remove */}
                                        <button onClick={() => handleRemove(item.id)}
                                            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                                            <FiTrash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Add dish dropdown */}
                            <div className="card">
                                <h3 className="text-sm font-bold text-slate-700 mb-4">Add a dish to Featured</h3>
                                {availableToAdd.length === 0 ? (
                                    <p className="text-sm text-slate-400">All available dishes are already featured.</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {availableToAdd.map(item => (
                                            <button
                                                key={item.id}
                                                onClick={() => handleAdd(item.id)}
                                                disabled={adding}
                                                className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-primary/5 hover:border-primary/30 transition-all text-left disabled:opacity-50"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                                                    {item.image_url ? (
                                                        <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-sm">🍽️</div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-charcoal truncate">{item.name}</p>
                                                    <p className="text-xs text-slate-400">₹{Number(item.price).toFixed(0)}</p>
                                                </div>
                                                <FiPlus className="w-4 h-4 text-primary flex-shrink-0" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </PlanGate>
            </main>
        </MainLayout>
    );
}
