import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { supabase } from '../supabaseClient';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';

export default function MenuManagerPage() {
    const navigate = useNavigate();
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(null);

    useEffect(() => {
        async function loadItems() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return navigate('/login');
                const { data: rest } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).single();
                if (!rest) return;
                const { data: items } = await supabase
                    .from('menu_items').select('*').eq('restaurant_id', rest.id).order('category');
                setMenuItems(items || []);
            } catch (err) {

            } finally {
                setLoading(false);
            }
        }
        loadItems();
    }, [navigate]);

    async function handleDelete(id) {
        if (!window.confirm('Delete this dish?')) return;
        setDeleting(id);
        try {
            await supabase.from('menu_items').delete().eq('id', id);
            setMenuItems((prev) => prev.filter((item) => item.id !== id));
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setDeleting(null);
        }
    }

    const categories = [...new Set(menuItems.map(i => i.category))];

    return (
        <MainLayout activeLink="Menu" title="Menu Manager" topNavChildren={
                    <button onClick={() => navigate('/add-dish')}
                        className="btn-primary flex items-center gap-2 text-sm !py-2.5 !px-5">
                        <FiPlus className="w-4 h-4" /> Add New Dish
                    </button>
        }>
                <main className="flex-1 p-6 lg:p-10">
                    <h1 className="text-3xl font-black tracking-tight mb-2">Menu Manager</h1>
                    <p className="text-slate-500 mb-8">Organize and manage all your menu items and categories.</p>

                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        </div>
                    ) : menuItems.length === 0 ? (
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
                            {/* Category sections */}
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
                                                    <div key={item.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors">
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
                                                            </div>
                                                            <p className="text-slate-400 text-xs mt-0.5 truncate">{item.description}</p>
                                                        </div>
                                                        <span className="text-primary font-bold text-sm whitespace-nowrap">₹{Number(item.price).toFixed(0)}</span>
                                                        <div className="flex items-center gap-1">
                                                            <button onClick={() => navigate(`/edit-dish/${item.id}`)}
                                                                className="p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors">
                                                                <FiEdit2 className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => handleDelete(item.id)} disabled={deleting === item.id}
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
        </MainLayout>
    );
}
