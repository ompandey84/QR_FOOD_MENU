import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { FiPlus, FiX } from 'react-icons/fi';
import MainLayout from '../components/MainLayout';

const STATUS_COLORS = {
    pending: 'bg-blue-50 text-blue-600 border-blue-200',
    confirmed: 'bg-green-50 text-green-600 border-green-200',
    cancelled: 'bg-red-50 text-red-500 border-red-200',
    completed: 'bg-slate-100 text-slate-400 border-slate-200',
};

const EMPTY_FORM = { customer_name: '', phone: '', date: '', time: '', party_size: 2, notes: '' };

export default function ReservationsPage() {
    const navigate = useNavigate();
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [restaurantId, setRestaurantId] = useState(null);
    const [filter, setFilter] = useState('all');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    useEffect(() => {
        async function loadReservations() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return navigate('/login');
            const { data: rest } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).single();
            if (!rest) return;
            setRestaurantId(rest.id);
            const { data } = await supabase
                .from('reservations')
                .select('*')
                .eq('restaurant_id', rest.id)
                .order('date', { ascending: true })
                .order('time', { ascending: true });
            setReservations(data || []);
            setLoading(false);
        }
        loadReservations();
    }, [navigate]);

    async function updateStatus(id, status) {
        await supabase.from('reservations').update({ status }).eq('id', id);
        setReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    }

    async function handleBookTable(e) {
        e.preventDefault();
        if (!form.customer_name || !form.date || !form.time) {
            setFormError('Name, date, and time are required.');
            return;
        }
        if (form.phone && form.phone.replace(/\D/g, '').length !== 10) {
            setFormError('Phone number must be exactly 10 digits.');
            return;
        }
        setSaving(true);
        setFormError('');
        const { data, error } = await supabase.from('reservations').insert({
            restaurant_id: restaurantId,
            customer_name: form.customer_name,
            phone: form.phone,
            date: form.date,
            time: form.time,
            party_size: parseInt(form.party_size, 10) || 2,
            notes: form.notes,
            status: 'confirmed', // Owner reservations are auto-confirmed
        }).select().single();

        if (error) {
            setFormError(error.message);
        } else {
            setReservations(prev => [data, ...prev].sort((a, b) => a.date.localeCompare(b.date)));
            setForm(EMPTY_FORM);
            setShowForm(false);
        }
        setSaving(false);
    }

    const filtered = filter === 'all' ? reservations : reservations.filter(r => r.status === filter);

    return (
        <MainLayout 
            activeLink="Reservations"
            title={
                <div>
                    <span className="block">Table Reservations</span>
                    <span className="block text-xs text-slate-400 font-medium font-normal mt-0.5">Manage bookings · {reservations.length} total</span>
                </div>
            }
            topNavChildren={
                <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-primary text-charcoal font-black text-sm px-4 py-2.5 rounded-xl hover:bg-primary/80 transition-all shadow-sm">
                    <FiPlus className="w-4 h-4" /> Book a Table
                </button>
            }
        >

                {/* Book a Table Modal (owner) */}
                {showForm && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                                <h2 className="text-lg font-black text-charcoal">Book a Table</h2>
                                <button onClick={() => { setShowForm(false); setFormError(''); }} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleBookTable} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Guest Name *</label>
                                        <input type="text" required value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })}
                                            className="w-full bg-[#FCFAF5] border border-[#F4F2E6] rounded-xl px-4 py-3 text-sm font-bold text-charcoal focus:outline-none focus:border-primary transition-colors"
                                            placeholder="e.g. Raj Sharma" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Phone <span className="normal-case text-slate-300">(10 digits)</span></label>
                                        <input type="tel" inputMode="numeric" maxLength={10}
                                            value={form.phone}
                                            onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                            className="w-full bg-[#FCFAF5] border border-[#F4F2E6] rounded-xl px-4 py-3 text-sm font-bold text-charcoal focus:outline-none focus:border-primary transition-colors"
                                            placeholder="e.g. 98765 43210" />
                                        <p className="text-[10px] text-slate-400 mt-1 ml-1">{(form.phone || '').length}/10 digits</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Date *</label>
                                        <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                                            min={new Date().toISOString().split('T')[0]}
                                            className="w-full bg-[#FCFAF5] border border-[#F4F2E6] rounded-xl px-4 py-3 text-sm font-bold text-charcoal focus:outline-none focus:border-primary transition-colors" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Time *</label>
                                        <input type="time" required value={form.time} onChange={e => setForm({ ...form, time: e.target.value })}
                                            className="w-full bg-[#FCFAF5] border border-[#F4F2E6] rounded-xl px-4 py-3 text-sm font-bold text-charcoal focus:outline-none focus:border-primary transition-colors" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Party Size</label>
                                        <input type="number" min="1" max="20" value={form.party_size} onChange={e => setForm({ ...form, party_size: e.target.value })}
                                            className="w-full bg-[#FCFAF5] border border-[#F4F2E6] rounded-xl px-4 py-3 text-sm font-bold text-charcoal focus:outline-none focus:border-primary transition-colors" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Notes</label>
                                        <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                                            placeholder="e.g. Window seat preferred"
                                            className="w-full bg-[#FCFAF5] border border-[#F4F2E6] rounded-xl px-4 py-3 text-sm font-bold text-charcoal focus:outline-none focus:border-primary transition-colors" />
                                    </div>
                                </div>

                                {formError && (
                                    <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                                        ⚠️ {formError}
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => { setShowForm(false); setFormError(''); }} className="flex-1 py-3 rounded-xl border border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition-colors text-sm">Cancel</button>
                                    <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-charcoal text-white font-black text-sm hover:bg-slate-800 transition-colors shadow-lg shadow-charcoal/20 flex items-center justify-center gap-2">
                                        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '✓ Confirm Booking'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <main className="p-6 lg:p-8 space-y-6">
                    {/* Filter Row */}
                    <div className="flex gap-2 bg-white p-1 rounded-xl w-fit border border-[#F4F2E6] shadow-sm">
                        {['all', 'pending', 'confirmed', 'cancelled'].map(f => (
                            <button key={f} onClick={() => setFilter(f)}
                                className={`capitalize text-xs font-black px-4 py-2 rounded-lg transition-all ${filter === f ? 'bg-primary text-charcoal shadow-sm' : 'text-slate-400 hover:text-charcoal'}`}>
                                {f}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-[#F4F2E6]">
                            <span className="text-5xl mb-4">📅</span>
                            <h3 className="text-lg font-black text-charcoal">No reservations yet</h3>
                            <p className="text-slate-400 text-sm mt-1">Use the "Book a Table" button to add one.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-[#F4F2E6] shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-[#F4F2E6]">
                                            {['Guest', 'Phone', 'Date', 'Time', 'Party', 'Notes', 'Status', 'Actions'].map(h => (
                                                <th key={h} className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#F4F2E6]">
                                        {filtered.map(r => (
                                            <tr key={r.id} className="hover:bg-[#FCFAF5]/50 transition-colors">
                                                <td className="px-5 py-4 font-bold text-charcoal text-sm">{r.customer_name}</td>
                                                <td className="px-5 py-4 text-sm text-slate-600">{r.phone || '—'}</td>
                                                <td className="px-5 py-4 font-bold text-sm text-charcoal">{new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                                <td className="px-5 py-4 text-sm text-slate-600">{r.time}</td>
                                                <td className="px-5 py-4 text-center">
                                                    <span className="bg-primary/10 text-charcoal text-xs font-black px-2 py-1 rounded-lg">{r.party_size} pax</span>
                                                </td>
                                                <td className="px-5 py-4 text-xs text-slate-400 max-w-[120px] truncate">{r.notes || '—'}</td>
                                                <td className="px-5 py-4">
                                                    <span className={`capitalize px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border ${STATUS_COLORS[r.status] || 'bg-slate-50 text-slate-400'}`}>{r.status}</span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex gap-2">
                                                        {r.status === 'pending' && (<>
                                                            <button onClick={() => updateStatus(r.id, 'confirmed')} className="text-[10px] font-black bg-green-50 text-green-600 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors">Confirm</button>
                                                            <button onClick={() => updateStatus(r.id, 'cancelled')} className="text-[10px] font-black bg-red-50 text-red-500 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors">Cancel</button>
                                                        </>)}
                                                        {r.status === 'confirmed' && (
                                                            <button onClick={() => updateStatus(r.id, 'completed')} className="text-[10px] font-black bg-slate-100 text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors">Done</button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </main>
        </MainLayout>
    );
}
