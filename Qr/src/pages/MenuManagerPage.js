import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { supabase } from '../supabaseClient';
import Shimmer from '../components/Shimmer';
import ConfirmDialog from '../components/ConfirmDialog';
import { FiTrash2, FiEdit2, FiPlus, FiArrowUp, FiArrowDown, FiStar } from 'react-icons/fi';
import { useSubscription } from '../hooks/useSubscription';
import ErrorDialog from '../components/ErrorDialog';
import PlanGate from '../components/PlanGate';

export default function MenuManagerPage() {
    const navigate = useNavigate();
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(null);
    const [showConfirm, setShowConfirm] = useState(null);
    const [restaurantId, setRestaurantId] = useState(null);
    const [errorDialog, setErrorDialog] = useState({ isOpen: false, title: '', message: '' });

    const { canAddItem, limits, plan } = useSubscription(restaurantId);
    const canUseFeatured = plan === 'growth' || plan === 'pro';

    useEffect(() => {
        async function loadItems() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return navigate('/login');
                const { data: rest } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).single();
                if (!rest) return;
                setRestaurantId(rest.id);
                const { data: items } = await supabase
                    .from('menu_items').select('*').eq('restaurant_id', rest.id).order('category');
                setMenuItems(items || []);
            } catch (err) {
                /* silent */
            } finally {
                setLoading(false);
            }
        }
        loadItems();
    }, [navigate]);

    async function handleDelete(id) {
        setDeleting(id);
        try {
            await supabase.from('menu_items').delete().eq('id', id);
            setMenuItems((prev) => prev.filter((item) => item.id !== id));
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setDeleting(null);
            setShowConfirm(null);
        }
    }

    // Toggle stock in-place
    async function toggleStock(item) {
        const newVal = !item.is_available;
        setMenuItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: newVal } : i));
        const { error } = await supabase.from('menu_items').update({ is_available: newVal }).eq('id', item.id);
        if (error) {
            setMenuItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: !newVal } : i));
        }
    }

    // Toggle featured/star dish (premium only)
    async function toggleFeatured(item) {
        if (!canUseFeatured) {
            setErrorDialog({
                isOpen: true,
                title: 'Premium Feature',
                message: 'Marking star dishes is available on the Premium plan. Upgrade to showcase your best dishes on the QR menu banner.'
            });
            return;
        }
        const newVal = !item.is_featured;
        setMenuItems(prev => prev.map(i => i.id === item.id ? { ...i, is_featured: newVal } : i));
        const { error } = await supabase.from('menu_items').update({ is_featured: newVal }).eq('id', item.id);
        if (error) {
            setMenuItems(prev => prev.map(i => i.id === item.id ? { ...i, is_featured: !newVal } : i));
        }
    }

    const categories = [...new Set(menuItems.map(i => i.category))];

    // Shimmer skeleton
    const ShimmerList = () => (
        <div className="space-y-8">
            {[1, 2, 3].map(cat => (
                <div key={cat}>
                    <Shimmer className="h-6 w-40 rounded-lg mb-4" />
                    <div className="card !p-0 overflow-hidden">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-slate-50 last:border-0">
                                <Shimmer className="w-14 h-14 rounded-xl" />
                                <div className="flex-1 space-y-2">
                                    <Shimmer className="h-4 w-32 rounded" />
                                    <Shimmer className="h-3 w-48 rounded" />
                                </div>
                                <Shimmer className="h-4 w-12 rounded" />
                                <Shimmer className="h-8 w-20 rounded-full" />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );

    const handleAddDish = () => {
        if (!canAddItem(menuItems.length)) {
            setErrorDialog({
                isOpen: true,
                title: 'Limit Reached',
                message: `Your current plan only allows up to ${limits.maxItems} menu items. Please upgrade your plan to add more dishes.`
            });
            return;
        }
        navigate('/add-dish');
    };

    return (
        <MainLayout activeLink="Menu Management" title="Menu Manager" topNavChildren={
            <button onClick={handleAddDish}
                className="btn-primary flex items-center gap-2 text-sm !py-2.5 !px-5 shadow-sm transition-transform active:scale-95">
                <FiPlus className="w-4 h-4" /> Add New Dish
            </button>
        }>
            <main className="flex-1 p-6 lg:p-10">
                <h1 className="text-3xl font-black tracking-tight mb-2">Menu Manager</h1>
                <p className="text-slate-500 mb-8">Organize and manage all your menu items and categories.</p>

                {/* Subscription Limit Banner */}
                {limits.maxItems !== Infinity && (
                    <div className="mb-8 p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-charcoal text-sm">Menu Item Usage</h3>
                            <p className="text-xs text-slate-500 mt-1">You have used {menuItems.length} out of {limits.maxItems} available items.</p>
                        </div>
                        {menuItems.length >= limits.maxItems && (
                            <button onClick={() => navigate('/subscription')} className="bg-white text-charcoal border border-slate-200 px-4 py-2 rounded-lg text-xs font-black shadow-sm hover:border-primary transition-colors uppercase tracking-wider">
                                Upgrade Plan
                            </button>
                        )}
                    </div>
                )}

                {loading ? <ShimmerList /> : menuItems.length === 0 ? (
                    <div className="card text-center py-16">
                        <span className="text-5xl block mb-4">🍽️</span>
                        <h3 className="text-lg font-bold text-slate-700 mb-2">Your menu is empty</h3>
                        <p className="text-slate-500 text-sm mb-6">Start building your menu by adding your first dish</p>
                        <button onClick={() => navigate('/add-dish')} className="btn-primary inline-flex items-center gap-2">
                            <FiPlus className="w-4 h-4" /> Add Your First Dish
                        </button>
                    </div>
                ) : (
                    <>
                        {categories.map((cat) => {
                            const items = menuItems.filter(i => i.category === cat);
                            return (
                                <div key={cat} className="mb-8">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-lg font-bold tracking-tight">{cat}</h2>
                                            <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                                                {items.length} items
                                            </span>
                                        </div>
                                    </div>
                                    <div className="card !p-0 overflow-hidden">
                                        <div className="divide-y divide-slate-100">
                                            {items.map((item) => (
                                                <div key={item.id} className={`flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors ${!item.is_available ? 'opacity-50' : ''}`}>
                                                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                                                        {item.image_url ? (
                                                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-xl">🍽️</div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center
                                                                ${item.type === 'veg' ? 'border-green-500' : 'border-red-500'}`}>
                                                                <div className={`w-2 h-2 rounded-full ${item.type === 'veg' ? 'bg-green-500' : 'bg-red-500'}`} />
                                                            </div>
                                                            <h4 className="font-semibold text-slate-800 text-sm truncate">{item.name}</h4>
                                                            {!item.is_available && (
                                                                <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">OUT OF STOCK</span>
                                                            )}
                                                        </div>
                                                        <p className="text-slate-400 text-xs mt-0.5 truncate">{item.description}</p>
                                                    </div>
                                                    <span className="text-primary font-bold text-sm whitespace-nowrap">₹{Number(item.price).toFixed(0)}</span>
                                                    
                                                    {/* Star / Featured Toggle */}
                                                    <button
                                                        onClick={() => toggleFeatured(item)}
                                                        className={`p-2 rounded-lg transition-colors ${item.is_featured ? 'text-yellow-500 bg-yellow-50 hover:bg-yellow-100' : 'text-slate-300 hover:text-yellow-400 hover:bg-yellow-50'} ${!canUseFeatured ? 'opacity-50' : ''}`}
                                                        title={canUseFeatured ? (item.is_featured ? 'Remove from Banner' : 'Mark as Star Dish (shows on banner)') : 'Upgrade to Premium to use Star Dishes'}
                                                    >
                                                        <FiStar className={`w-4 h-4 ${item.is_featured ? 'fill-yellow-400' : ''}`} />
                                                    </button>

                                                    {/* Stock Toggle */}
                                                    <button
                                                        onClick={() => toggleStock(item)}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${item.is_available ? 'bg-green-500' : 'bg-slate-300'}`}
                                                        title={item.is_available ? 'Mark Out of Stock' : 'Mark In Stock'}
                                                    >
                                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${item.is_available ? 'translate-x-[22px]' : 'translate-x-1'}`} />
                                                    </button>

                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => navigate(`/edit-dish/${item.id}`)}
                                                            className="p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors">
                                                            <FiEdit2 className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => setShowConfirm(item.id)} disabled={deleting === item.id}
                                                            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
                                                            <FiTrash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}
            </main>
            <div className="fixed top-0 right-0 -z-10 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
            
            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={!!showConfirm}
                title="Delete Dish"
                message="Are you sure you want to delete this dish? This action cannot be undone."
                onConfirm={() => handleDelete(showConfirm)}
                onCancel={() => setShowConfirm(null)}
            />

            <ErrorDialog
                isOpen={errorDialog.isOpen}
                title={errorDialog.title}
                message={errorDialog.message}
                onClose={() => setErrorDialog({ isOpen: false, title: '', message: '' })}
            />
        </MainLayout>
    );
}
