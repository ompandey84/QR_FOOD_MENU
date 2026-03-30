import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import ConfirmDialog from '../components/ConfirmDialog';
import Shimmer from '../components/Shimmer';
import { FiPlus, FiTrash2, FiEdit2, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import { useSubscription } from '../hooks/useSubscription';
import ErrorDialog from '../components/ErrorDialog';

const EMPTY_FORM = {
    display_name: '',
    type: 'percentage',
    min_order_value: '',
    discount_value: '',
    free_item_id: '',
    start_date: '',
    end_date: '',
    is_auto_apply: true,
    promo_code: '',
    max_redemptions_total: '',
    max_redemptions_per_user: '',
    is_active: true,
};

export default function OffersPage() {
    const navigate = useNavigate();
    const [restaurantId, setRestaurantId] = useState(null);
    const [offers, setOffers] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingOffer, setEditingOffer] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });
    const [errorDialog, setErrorDialog] = useState({ isOpen: false, title: '', message: '' });

    const { limits, canAddOffer } = useSubscription(restaurantId);

    useEffect(() => {
        async function load() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return navigate('/login');
            const { data: rest } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).single();
            if (!rest) return;
            setRestaurantId(rest.id);

            const [{ data: offersData }, { data: itemsData }] = await Promise.all([
                supabase.from('offers').select('*, menu_items(name)').eq('restaurant_id', rest.id).order('created_at', { ascending: false }),
                supabase.from('menu_items').select('id, name').eq('restaurant_id', rest.id).eq('is_available', true).order('name'),
            ]);

            setOffers(offersData || []);
            setMenuItems(itemsData || []);
            setLoading(false);
        }
        load();
    }, [navigate]);

    const openNew = () => {
        if (!canAddOffer(offers.length)) {
            setErrorDialog({
                isOpen: true,
                title: 'Limit Reached',
                message: `Your current plan only allows up to ${limits.maxOffers} active offers. Please upgrade your plan to add more.`
            });
            return;
        }
        setEditingOffer(null);
        setForm(EMPTY_FORM);
        setShowForm(true);
    };

    const openEdit = (offer) => {
        setEditingOffer(offer);
        setForm({
            display_name: offer.display_name || '',
            type: offer.type || 'percentage',
            min_order_value: offer.min_order_value ? String(offer.min_order_value) : '',
            discount_value: offer.discount_value ? String(offer.discount_value) : '',
            free_item_id: offer.free_item_id || '',
            start_date: offer.start_date ? new Date(offer.start_date).toISOString().slice(0, 16) : '',
            end_date: offer.end_date ? new Date(offer.end_date).toISOString().slice(0, 16) : '',
            is_auto_apply: offer.is_auto_apply ?? true,
            promo_code: offer.promo_code || '',
            max_redemptions_total: offer.max_redemptions_total ? String(offer.max_redemptions_total) : '',
            max_redemptions_per_user: offer.max_redemptions_per_user ? String(offer.max_redemptions_per_user) : '',
            is_active: offer.is_active ?? true,
        });
        setShowForm(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.display_name.trim()) return alert('Display Name is required');
        if (form.type !== 'free_item' && !form.discount_value) return alert('Discount value is required');
        if (form.type === 'free_item' && !form.free_item_id) return alert('Please select a free item');
        if (!form.is_auto_apply && !form.promo_code.trim()) return alert('Promo code is required');

        const payload = {
            restaurant_id: restaurantId,
            display_name: form.display_name.trim(),
            type: form.type,
            min_order_value: parseFloat(form.min_order_value) || 0,
            discount_value: form.type !== 'free_item' ? parseFloat(form.discount_value) : null,
            free_item_id: form.type === 'free_item' ? form.free_item_id : null,
            start_date: form.start_date || null,
            end_date: form.end_date || null,
            is_auto_apply: form.is_auto_apply,
            promo_code: form.is_auto_apply ? null : form.promo_code.trim().toUpperCase(),
            max_redemptions_total: parseInt(form.max_redemptions_total) || null,
            max_redemptions_per_user: parseInt(form.max_redemptions_per_user) || null,
            is_active: form.is_active,
        };

        setSaving(true);
        let error;

        if (editingOffer) {
            ({ error } = await supabase.from('offers').update(payload).eq('id', editingOffer.id));
        } else {
            ({ error } = await supabase.from('offers').insert([payload]));
        }

        setSaving(false);
        if (error) return alert(error.message);

        // Refresh
        const { data } = await supabase.from('offers').select('*, menu_items(name)').eq('restaurant_id', restaurantId).order('created_at', { ascending: false });
        setOffers(data || []);
        setShowForm(false);
        setEditingOffer(null);
    };

    const toggleStatus = async (id, current) => {
        await supabase.from('offers').update({ is_active: !current }).eq('id', id);
        setOffers(offers.map(o => o.id === id ? { ...o, is_active: !current } : o));
    };

    const handleDelete = async () => {
        const id = deleteDialog.id;
        setDeleteDialog({ open: false, id: null });
        await supabase.from('offers').delete().eq('id', id);
        setOffers(offers.filter(o => o.id !== id));
    };

    const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

    return (
        <MainLayout activeLink="Offers" title="">
            <main className="p-6 lg:p-10 max-w-5xl mx-auto w-full">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-charcoal">Offers & Discounts</h1>
                        <p className="text-slate-500 font-medium mt-1">Create promo codes and automatic discounts for your customers.</p>
                    </div>
                    <button onClick={openNew} className="btn-primary flex items-center gap-2 shadow-sm transition-transform active:scale-95">
                        <FiPlus /> Create Offer
                    </button>
                </div>

                {/* Subscription Limit Banner */}
                {limits.maxOffers !== Infinity && (
                    <div className="mb-8 p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-charcoal text-sm">Active Offers Limit</h3>
                            <p className="text-xs text-slate-500 mt-1">You have {offers.length} out of {limits.maxOffers} permitted offers.</p>
                        </div>
                        {offers.length >= limits.maxOffers && (
                            <button onClick={() => navigate('/subscription')} className="bg-white text-charcoal border border-slate-200 px-4 py-2 rounded-lg text-xs font-black shadow-sm hover:border-primary transition-colors uppercase tracking-wider">
                                Upgrade Plan
                            </button>
                        )}
                    </div>
                )}

                {/* Form */}
                {showForm && (
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-8">
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-xl font-bold text-charcoal">{editingOffer ? 'Edit Offer' : 'New Offer'}</h2>
                            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Display Name *</label>
                                    <input className="input-field" value={form.display_name} onChange={e => set('display_name', e.target.value)} placeholder="e.g. Weekend Special, Happy Hour 10% Off" required />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Offer Type</label>
                                    <select className="input-field cursor-pointer" value={form.type} onChange={e => set('type', e.target.value)}>
                                        <option value="percentage">Percentage Discount (e.g. 10% off)</option>
                                        <option value="flat">Flat Discount (e.g. ₹50 off)</option>
                                        <option value="free_item">Free Item</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Min Order Value (₹) <span className="text-slate-400 normal-case">(Optional)</span></label>
                                    <input type="number" min="0" className="input-field" value={form.min_order_value} onChange={e => set('min_order_value', e.target.value)} placeholder="e.g. 500" />
                                </div>

                                {form.type === 'free_item' ? (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Free Menu Item *</label>
                                        <select className="input-field cursor-pointer" value={form.free_item_id} onChange={e => set('free_item_id', e.target.value)} required>
                                            <option value="">-- Choose an item --</option>
                                            {menuItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                                        </select>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                                            Discount Value {form.type === 'percentage' ? '(%)' : '(₹)'} *
                                        </label>
                                        <input type="number" min="1" max={form.type === 'percentage' ? 100 : undefined} className="input-field" value={form.discount_value} onChange={e => set('discount_value', e.target.value)} placeholder={form.type === 'percentage' ? 'e.g. 15' : 'e.g. 100'} required />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Start Date <span className="text-slate-400 normal-case">(Optional)</span></label>
                                    <input type="datetime-local" className="input-field" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">End Date <span className="text-slate-400 normal-case">(Optional)</span></label>
                                    <input type="datetime-local" className="input-field" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
                                </div>
                            </div>

                            {/* Application Method */}
                            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Application Method</h4>
                                <div className="flex gap-6 mb-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={form.is_auto_apply} onChange={() => set('is_auto_apply', true)} className="accent-primary w-4 h-4" />
                                        <span className="font-bold text-slate-700 text-sm">Auto-Apply</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={!form.is_auto_apply} onChange={() => set('is_auto_apply', false)} className="accent-primary w-4 h-4" />
                                        <span className="font-bold text-slate-700 text-sm">Promo Code</span>
                                    </label>
                                </div>
                                {!form.is_auto_apply && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Promo Code *</label>
                                        <input className="input-field uppercase font-black tracking-widest" value={form.promo_code} onChange={e => set('promo_code', e.target.value.toUpperCase())} placeholder="e.g. SUMMER20" required />
                                    </div>
                                )}
                            </div>

                            {/* Redemption Limits */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Max Total Redemptions <span className="text-slate-400 normal-case">(Optional)</span></label>
                                    <input type="number" min="1" className="input-field" value={form.max_redemptions_total} onChange={e => set('max_redemptions_total', e.target.value)} placeholder="Leave empty for unlimited" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Max Per User <span className="text-slate-400 normal-case">(Optional)</span></label>
                                    <input type="number" min="1" className="input-field" value={form.max_redemptions_per_user} onChange={e => set('max_redemptions_per_user', e.target.value)} placeholder="Leave empty for unlimited" />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
                                <button type="submit" disabled={saving} className="btn-primary text-sm flex items-center gap-2 disabled:opacity-60">
                                    {saving ? <div className="w-4 h-4 border-2 border-charcoal/30 border-t-charcoal rounded-full animate-spin" /> : null}
                                    {editingOffer ? 'Update Offer' : 'Save Offer'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Offers List */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => <Shimmer key={i} className="h-64 rounded-3xl" />)}
                    </div>
                ) : offers.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 border-dashed">
                        <span className="text-5xl block mb-4">🎟️</span>
                        <h3 className="text-lg font-bold text-charcoal mb-2">No offers created yet</h3>
                        <p className="text-slate-400">Add promotions to attract more customers.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {offers.map(offer => (
                            <div key={offer.id} className={`bg-white rounded-3xl border-2 p-6 flex flex-col relative transition-all hover:shadow-md ${offer.is_active ? 'border-slate-100' : 'border-slate-100 opacity-60'}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                        {offer.type === 'free_item' ? 'Free Item' : offer.type === 'percentage' ? 'Percentage' : 'Flat Off'}
                                    </span>
                                    <div className="flex gap-1 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEdit(offer)} className="p-1.5 text-slate-400 hover:text-primary transition-colors"><FiEdit2 /></button>
                                        <button onClick={() => setDeleteDialog({ open: true, id: offer.id })} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"><FiTrash2 /></button>
                                    </div>
                                </div>
                                {/* Show edit/delete on hover by wrapping the card */}
                                <div className="absolute top-4 right-4 flex gap-1">
                                    <button onClick={() => openEdit(offer)} className="p-1.5 text-slate-300 hover:text-primary transition-colors"><FiEdit2 className="w-4 h-4" /></button>
                                    <button onClick={() => setDeleteDialog({ open: true, id: offer.id })} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"><FiTrash2 className="w-4 h-4" /></button>
                                </div>

                                <h3 className="text-xl font-black tracking-tight text-charcoal mb-1">{offer.display_name}</h3>
                                <p className="text-lg font-black text-primary mb-1">
                                    {offer.type === 'percentage' && `${offer.discount_value}% OFF`}
                                    {offer.type === 'flat' && `₹${offer.discount_value} OFF`}
                                    {offer.type === 'free_item' && `FREE: ${offer.menu_items?.name || 'Item'}`}
                                </p>
                                {offer.min_order_value > 0 && (
                                    <p className="text-xs text-slate-500 font-medium mb-3">On orders above ₹{parseFloat(offer.min_order_value).toFixed(0)}</p>
                                )}

                                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-3 space-y-2 flex-1">
                                    {!offer.is_auto_apply && offer.promo_code && (
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-bold text-slate-400 uppercase tracking-widest">Code</span>
                                            <span className="font-black text-charcoal tracking-widest">{offer.promo_code}</span>
                                        </div>
                                    )}
                                    {offer.end_date && (
                                        <div className="flex justify-between items-center text-xs border-t border-slate-200/60 pt-2">
                                            <span className="font-bold text-slate-400 uppercase tracking-widest">Ends</span>
                                            <span className="font-black text-red-500">{new Date(offer.end_date).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center text-xs border-t border-slate-200/60 pt-2">
                                        <span className="font-bold text-slate-400 uppercase tracking-widest">Used</span>
                                        <span className="font-black text-charcoal">{offer.total_redemptions || 0}{offer.max_redemptions_total ? ` / ${offer.max_redemptions_total}` : ''}</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                                    <span className={`text-xs font-bold ${offer.is_active ? 'text-green-500' : 'text-slate-400'}`}>
                                        {offer.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                    <button onClick={() => toggleStatus(offer.id, offer.is_active)} className={`text-3xl ${offer.is_active ? 'text-green-500' : 'text-slate-300'}`}>
                                        {offer.is_active ? <FiToggleRight /> : <FiToggleLeft />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <ConfirmDialog
                isOpen={deleteDialog.open}
                title="Delete Offer?"
                message="Are you sure? This cannot be undone."
                confirmText="Delete"
                isDestructive
                onConfirm={handleDelete}
                onCancel={() => setDeleteDialog({ open: false, id: null })}
            />

            <ErrorDialog
                isOpen={errorDialog.isOpen}
                title={errorDialog.title}
                message={errorDialog.message}
                onClose={() => setErrorDialog({ ...errorDialog, isOpen: false })}
            />
        </MainLayout>
    );
}
