import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopNav from '../components/TopNav';
import { FiPlus, FiTrash2, FiToggleLeft, FiToggleRight } from 'react-icons/fi';

export default function OffersPage() {
    const navigate = useNavigate();
    const [restaurantId, setRestaurantId] = useState(null);
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Form state
    const [form, setForm] = useState({
        title: '',
        description: '',
        promo_code: '',
        badge_text: 'Offer',
        color_theme: 'orange-red',
        is_active: true
    });

    useEffect(() => {
        async function loadOffers() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return navigate('/login');

            const { data: rest } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).single();
            if (!rest) return;
            setRestaurantId(rest.id);

            const { data } = await supabase
                .from('special_offers')
                .select('*')
                .eq('restaurant_id', rest.id)
                .order('created_at', { ascending: false });

            setOffers(data || []);
            setLoading(false);
        }
        loadOffers();
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title || !form.promo_code) return alert("Title and Promo Code are required.");

        try {
            const { data, error } = await supabase.from('special_offers').insert({
                restaurant_id: restaurantId,
                title: form.title,
                description: form.description,
                promo_code: form.promo_code.toUpperCase(),
                badge_text: form.badge_text,
                color_theme: form.color_theme,
                is_active: form.is_active
            }).select().single();

            if (error) throw error;

            setOffers([data, ...offers]);
            setShowForm(false);
            setForm({ title: '', description: '', promo_code: '', badge_text: 'Offer', color_theme: 'orange-red', is_active: true });
        } catch (err) {
            alert('Error creating offer: ' + err.message);
        }
    };

    const toggleActive = async (id, currentStatus) => {
        try {
            const { error } = await supabase.from('special_offers')
                .update({ is_active: !currentStatus })
                .eq('id', id);
            if (error) throw error;
            setOffers(offers.map(o => o.id === id ? { ...o, is_active: !currentStatus } : o));
        } catch (err) {
            alert('Error updating status: ' + err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this offer? This cannot be undone.")) return;
        const prev = offers;
        setOffers(offers.filter(o => o.id !== id)); // optimistic
        const { error } = await supabase.from('special_offers').delete().eq('id', id);
        if (error) {
            setOffers(prev); // rollback
            alert('Error deleting offer: ' + error.message + '\n\nCode: ' + error.code);
        }
    };

    return (
        <div className="min-h-screen bg-[#FCFAF5] flex">
            <Sidebar active="Offers" />
            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
                <TopNav title="" activeLink="Offers" />

                <main className="p-6 lg:p-10 max-w-5xl mx-auto w-full">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-black text-charcoal">Special Offers & Promos</h1>
                            <p className="text-slate-500 font-medium mt-1">Create promo codes and discounts for your customers.</p>
                        </div>
                        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
                            <FiPlus /> Add Offer
                        </button>
                    </div>

                    {showForm && (
                        <div className="bg-white p-6 rounded-3xl border border-[#F4F2E6] shadow-sm mb-8 animate-fade-in">
                            <h2 className="text-xl font-bold mb-4">New Promo Code</h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Offer Title</label>
                                        <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-[#FCFAF5] border border-[#F4F2E6] rounded-xl px-4 py-3 text-sm font-bold text-charcoal focus:outline-none focus:border-primary transition-colors" placeholder="e.g. Weekend Special 20% OFF" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Promo Code</label>
                                        <input type="text" value={form.promo_code} onChange={e => setForm({ ...form, promo_code: e.target.value.toUpperCase() })} className="w-full bg-[#FCFAF5] border border-[#F4F2E6] rounded-xl px-4 py-3 text-sm font-bold text-charcoal uppercase focus:outline-none focus:border-primary transition-colors" placeholder="e.g. WEEKEND20" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Description</label>
                                        <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full bg-[#FCFAF5] border border-[#F4F2E6] rounded-xl px-4 py-3 text-sm font-bold text-charcoal focus:outline-none focus:border-primary transition-colors" placeholder="e.g. Get 20% off on all main courses." />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 mt-4">
                                    <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cancel</button>
                                    <button type="submit" className="px-6 py-3 rounded-xl font-bold bg-charcoal text-white hover:bg-slate-800 transition-colors shadow-lg shadow-charcoal/20">Save Offer</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
                    ) : offers.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border border-[#F4F2E6] border-dashed">
                            <span className="text-5xl block mb-4">🎟️</span>
                            <h3 className="text-lg font-bold text-charcoal mb-2">No offers created yet</h3>
                            <p className="text-slate-400">Add a promo code to attract more customers.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {offers.map(offer => (
                                <div key={offer.id} className={`bg-white rounded-3xl border-2 p-6 flex flex-col relative transition-all hover:shadow-md ${offer.is_active ? 'border-[#F4F2E6]' : 'border-slate-100 opacity-60'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="bg-red-50 text-red-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">{offer.badge_text}</span>
                                        <button onClick={() => handleDelete(offer.id)} className="text-slate-300 hover:text-red-500 transition-colors"><FiTrash2 /></button>
                                    </div>
                                    <h3 className="text-xl font-black tracking-tight text-charcoal mb-1">{offer.title}</h3>
                                    <p className="text-sm font-medium text-slate-500 mb-4 flex-1">{offer.description}</p>

                                    <div className="bg-[#FCFAF5] border border-[#F4F2E6] rounded-xl p-3 flex justify-between items-center mb-4">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Code</span>
                                        <span className="font-black text-charcoal tracking-widest">{offer.promo_code}</span>
                                    </div>

                                    <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                                        <span className={`text-xs font-bold ${offer.is_active ? 'text-green-500' : 'text-slate-400'}`}>
                                            {offer.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                        <button onClick={() => toggleActive(offer.id, offer.is_active)} className={`text-3xl ${offer.is_active ? 'text-green-500' : 'text-slate-300'}`}>
                                            {offer.is_active ? <FiToggleRight /> : <FiToggleLeft />}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
