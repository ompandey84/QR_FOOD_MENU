import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FiPlus, FiTrash2, FiEdit2 } from 'react-icons/fi';

export default function OffersManager({ restaurantId }) {
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [form, setForm] = useState({
        title: '',
        description: '',
        badge_text: '',
        promo_code: '',
        color_theme: 'orange-red',
        is_active: true
    });

    const THEMES = [
        { id: 'orange-red', label: 'Sunset (Orange/Red)', classes: 'from-orange-500 to-red-500' },
        { id: 'emerald-teal', label: 'Fresh (Emerald/Teal)', classes: 'from-emerald-500 to-teal-600' },
        { id: 'indigo-purple', label: 'Royal (Indigo/Purple)', classes: 'from-indigo-500 to-purple-600' },
        { id: 'charcoal-slate', label: 'Premium (Charcoal/Slate)', classes: 'from-charcoal to-slate-900' },
        { id: 'primary-yellow', label: 'Vibrant (Yellow/Primary)', classes: 'from-primary to-yellow-400 text-charcoal' }
    ];

    useEffect(() => {
        if (restaurantId) fetchOffers();
        // eslint-disable-next-line
    }, [restaurantId]);

    async function fetchOffers() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('special_offers')
                .select('*')
                .eq('restaurant_id', restaurantId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOffers(data || []);
        } catch (err) {
            console.error('Error fetching offers:', err);
        } finally {
            setLoading(false);
        }
    }

    function handleEdit(offer) {
        setForm({
            title: offer.title,
            description: offer.description,
            badge_text: offer.badge_text,
            promo_code: offer.promo_code,
            color_theme: offer.color_theme,
            is_active: offer.is_active
        });
        setEditingId(offer.id);
        setShowForm(true);
    }

    function resetForm() {
        setForm({
            title: '', description: '', badge_text: '', promo_code: '', color_theme: 'orange-red', is_active: true
        });
        setEditingId(null);
        setShowForm(false);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            const offerData = { ...form, restaurant_id: restaurantId };

            if (editingId) {
                const { error } = await supabase.from('special_offers').update(offerData).eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('special_offers').insert([offerData]);
                if (error) throw error;
            }

            await fetchOffers();
            resetForm();
        } catch (err) {
            alert('Error saving offer: ' + err.message);
        }
    }

    async function handleDelete(id) {
        if (!window.confirm('Delete this offer?')) return;
        try {
            const { error } = await supabase.from('special_offers').delete().eq('id', id);
            if (error) throw error;
            setOffers(prev => prev.filter(o => o.id !== id));
        } catch (err) {
            alert('Error deleting offer: ' + err.message);
        }
    }

    async function toggleActive(offer) {
        try {
            const { error } = await supabase.from('special_offers')
                .update({ is_active: !offer.is_active })
                .eq('id', offer.id);
            if (error) throw error;
            setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, is_active: !offer.is_active } : o));
        } catch (err) {
            alert('Error toggling status: ' + err.message);
        }
    }

    if (loading) return <div className="p-4 text-sm text-slate-500 flex items-center gap-2"><div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /> Loading offers...</div>;

    return (
        <div className="bg-white rounded-[2rem] p-6 lg:p-8 shadow-sm border border-slate-100 mt-8">
            <div className="flex flex-col items-center justify-center text-center mb-8">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-charcoal flex items-center justify-center gap-2">
                        <span className="w-8 h-1 bg-primary rounded-full hidden sm:block"></span>
                        Special Offers 🎁
                        <span className="w-8 h-1 bg-primary rounded-full hidden sm:block"></span>
                    </h2>
                    <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">Manage promotional banners shown on your customer menu.</p>
                </div>
                {!showForm && (
                    <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-sm !px-6 !py-2.5 mt-4 group">
                        <FiPlus className="group-hover:rotate-90 transition-transform" /> Add New Offer
                    </button>
                )}
            </div>

            {showForm ? (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8 animate-fade-in mx-auto max-w-3xl">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                        {editingId ? <><FiEdit2 className="text-primary" /> Edit Offer</> : <><FiPlus className="text-primary" /> Create New Offer</>}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1">Offer Title</label>
                                <input required type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm" placeholder="e.g. Flat 20% OFF" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Badge Text (Optional)</label>
                                <input type="text" value={form.badge_text} onChange={e => setForm({ ...form, badge_text: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm" placeholder="e.g. Holi Special" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold mb-1">Description</label>
                                <textarea required rows="2" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm resize-none" placeholder="Details about the offer..." />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Promo Code (or Auto-applied text)</label>
                                <input type="text" value={form.promo_code} onChange={e => setForm({ ...form, promo_code: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm" placeholder="e.g. CODE20 or 'Auto-applied'" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Color Theme</label>
                                <select value={form.color_theme} onChange={e => setForm({ ...form, color_theme: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm appearance-none cursor-pointer">
                                    {THEMES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center gap-2 mt-4">
                                <input type="checkbox" id="isActive" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary cursor-pointer" />
                                <label htmlFor="isActive" className="text-sm font-medium cursor-pointer">Offer is Active</label>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                            <button type="button" onClick={resetForm} className="px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                            <button type="submit" className="btn-primary text-sm !px-8 !py-2.5">Save Offer</button>
                        </div>
                    </form>
                </div>
            ) : null}

            <div className="space-y-4">
                {offers.length === 0 && !showForm ? (
                    <div className="flex flex-col items-center justify-center py-20 px-6 bg-[#FCFAF5] rounded-3xl border-2 border-dashed border-[#F4F2E6] text-center max-w-xl mx-auto">
                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-md mb-6 border border-[#F4F2E6]">
                            <span className="material-symbols-outlined text-4xl text-primary font-bold">celebration</span>
                        </div>
                        <h3 className="text-xl font-black text-charcoal mb-2">Grow your Sales! 🚀</h3>
                        <p className="text-slate-400 text-sm mb-8 max-w-sm">Create beautiful promotional banners to attract more customers and boost your revenue.</p>
                        <button onClick={() => setShowForm(true)} className="btn-primary !px-10 !py-3 flex items-center gap-3 group shadow-xl shadow-primary/20">
                            Create First Offer <FiPlus className="group-hover:rotate-12 transition-transform" />
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {offers.map(offer => {
                            const theme = THEMES.find(t => t.id === offer.color_theme) || THEMES[0];
                            const isLightText = offer.color_theme !== 'primary-yellow';
                            return (
                                <div key={offer.id} className={`rounded-2xl p-5 shadow-sm relative overflow-hidden bg-gradient-to-br ${theme.classes} ${!offer.is_active ? 'opacity-60 grayscale' : ''}`}>
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl -mr-8 -mt-8 pointer-events-none" />
                                    <div className="relative z-10 flex flex-col h-full">
                                        <div className="flex items-start justify-between mb-2">
                                            {offer.badge_text ? (
                                                <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm ${isLightText ? 'bg-white/20 text-white' : 'bg-black/10 text-charcoal'}`}>
                                                    {offer.badge_text}
                                                </span>
                                            ) : <span />}
                                            <div className="flex items-center gap-1 bg-white/90 backdrop-blur-md rounded-lg p-1 shadow-sm">
                                                <button onClick={() => toggleActive(offer)} className={`p-1.5 rounded transition-colors ${offer.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`} title={offer.is_active ? 'Deactivate' : 'Activate'}>
                                                    <div className={`w-2.5 h-2.5 rounded-full ${offer.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                </button>
                                                <button onClick={() => handleEdit(offer)} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors" title="Edit"><FiEdit2 className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => handleDelete(offer.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete"><FiTrash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </div>
                                        <h3 className={`text-xl font-black leading-tight mb-1 ${isLightText ? 'text-white' : 'text-charcoal'}`}>{offer.title}</h3>
                                        <p className={`text-xs mb-4 line-clamp-2 flex-grow ${isLightText ? 'text-white/90' : 'text-charcoal/80'}`}>{offer.description}</p>

                                        {offer.promo_code && (
                                            <div className={`text-[10px] font-medium px-2.5 py-1.5 rounded-lg border border-dashed mt-auto w-fit ${isLightText ? 'bg-black/20 border-white/20 text-white' : 'bg-white/40 border-charcoal/20 text-charcoal'}`}>
                                                {offer.promo_code}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
