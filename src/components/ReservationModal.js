import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { motion } from 'framer-motion';

export default function ReservationModal({ isOpen, onClose, restaurantId }) {
    const [form, setForm] = useState({ name: '', phone: '', date: '', time: '', party_size: 2, notes: '' });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const today = new Date().toISOString().split('T')[0];

    // Keep phone strictly 10 digits
    const handlePhone = (val) => {
        const digits = val.replace(/\D/g, '').slice(0, 10);
        setForm(p => ({ ...p, phone: digits }));
    };

    async function handleSubmit(e) {
        e.preventDefault();
        if (!form.name || !form.phone || !form.date || !form.time) {
            setError('Please fill in all required fields.');
            return;
        }
        if (form.phone.length !== 10) {
            setError('Phone number must be exactly 10 digits.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const { error: err } = await supabase.from('reservations').insert({
                restaurant_id: restaurantId,
                customer_name: form.name,
                phone: form.phone,
                date: form.date,
                time: form.time,
                party_size: form.party_size,
                notes: form.notes,
                status: 'pending'
            });
            if (err) {
                // If reservations table doesn't exist in DB yet, show helpful message
                if (err.message?.includes('reservations')) {
                    setError('Reservation system is not set up yet. Please ask the restaurant owner to set it up.');
                } else {
                    throw err;
                }
                return;
            }
            setSuccess(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[200] overflow-y-auto">
            <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm" onClick={onClose} />
            <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="relative w-full max-w-md bg-white sm:rounded-[2rem] shadow-2xl"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-[#F4F2E6] flex justify-between items-center bg-[#FCFAF5] sm:rounded-t-[2rem]">
                        <div>
                            <h2 className="text-xl font-black text-charcoal">Reserve a Table</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Book your seat in advance</p>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-[#F4F2E6]">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    {success ? (
                        <div className="p-10 flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mb-4">🎉</div>
                            <h3 className="text-xl font-black text-charcoal mb-2">Reservation Confirmed!</h3>
                            <p className="text-slate-400 text-sm mb-6">We'll have your table ready on <strong>{form.date}</strong> at <strong>{form.time}</strong>. See you then!</p>
                            <button onClick={onClose} className="btn-primary !px-10">Done</button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-bold rounded-xl p-3">{error}</div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Your Name *</label>
                                    <input
                                        className="w-full bg-[#FCFAF5] border border-[#F4F2E6] rounded-xl px-4 py-3 text-sm font-bold text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        placeholder="e.g. Rahul Sharma"
                                        value={form.name}
                                        onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                                        Phone Number * <span className="normal-case text-slate-300">(10 digits)</span>
                                    </label>
                                    <input
                                        type="tel"
                                        inputMode="numeric"
                                        maxLength={10}
                                        className="w-full bg-[#FCFAF5] border border-[#F4F2E6] rounded-xl px-4 py-3 text-sm font-bold text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        placeholder="98765 43210"
                                        value={form.phone}
                                        onChange={e => handlePhone(e.target.value)}
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1 ml-1">{form.phone.length}/10 digits</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Date *</label>
                                    <input
                                        type="date"
                                        min={today}
                                        className="w-full bg-[#FCFAF5] border border-[#F4F2E6] rounded-xl px-4 py-3 text-sm font-bold text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        value={form.date}
                                        onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Time *</label>
                                    <input
                                        type="time"
                                        className="w-full bg-[#FCFAF5] border border-[#F4F2E6] rounded-xl px-4 py-3 text-sm font-bold text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        value={form.time}
                                        onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Party Size</label>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        {[1, 2, 3, 4, 5, 6, 8, 10].map(n => (
                                            <button
                                                key={n} type="button"
                                                onClick={() => setForm(p => ({ ...p, party_size: n }))}
                                                className={`w-10 h-10 rounded-xl text-sm font-black transition-all ${form.party_size === n ? 'bg-primary text-charcoal shadow-sm' : 'bg-[#F4F2E6] text-slate-500 hover:bg-primary/20'}`}
                                            >
                                                {n}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Special Requests</label>
                                    <textarea
                                        rows={2}
                                        className="w-full bg-[#FCFAF5] border border-[#F4F2E6] rounded-xl px-4 py-3 text-sm font-bold text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                        placeholder="Window seat, birthday cake, etc..."
                                        value={form.notes}
                                        onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <button type="submit" disabled={loading} className="w-full btn-primary !py-4 flex items-center justify-center gap-2 disabled:opacity-60">
                                {loading ? (
                                    <><div className="w-4 h-4 border-2 border-charcoal/20 border-t-charcoal rounded-full animate-spin" /> Confirming...</>
                                ) : (
                                    <><span className="material-symbols-outlined text-sm">event_available</span> Confirm Reservation</>
                                )}
                            </button>
                        </form>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
