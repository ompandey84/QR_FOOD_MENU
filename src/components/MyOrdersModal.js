import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { motion } from 'framer-motion';

export default function MyOrdersModal({ isOpen, onClose }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchMyOrders();
        }
    }, [isOpen]);

    async function fetchMyOrders() {
        try {
            setLoading(true);
            const storedIds = JSON.parse(localStorage.getItem('my_orders') || '[]');
            if (storedIds.length === 0) {
                setOrders([]);
                return;
            }

            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    order_items (*)
                `)
                .in('id', storedIds)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOrders(data || []);
        } catch (err) {
            console.error("Error fetching my orders:", err);
        } finally {
            setLoading(false);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] overflow-y-auto">
            <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="relative w-full max-w-lg bg-white sm:rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-[#F4F2E6] flex justify-between items-center bg-[#FCFAF5] sm:rounded-t-[2rem]">
                        <div>
                            <h2 className="text-xl font-black text-charcoal">My Orders</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Track your active meals</p>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-[#F4F2E6] text-charcoal hover:bg-slate-50 transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white">
                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-4">
                                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                <span className="text-sm font-bold text-slate-400 uppercase">Fetching status...</span>
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="py-20 text-center">
                                <div className="w-20 h-20 bg-[#F4F2E6] rounded-full flex items-center justify-center mx-auto mb-6">
                                    <span className="material-symbols-outlined text-4xl text-slate-300">shopping_cart</span>
                                </div>
                                <h3 className="text-lg font-black text-charcoal">No orders found</h3>
                                <p className="text-sm text-slate-400 font-medium px-10">You haven't placed any orders yet or your history was cleared.</p>
                                <button onClick={onClose} className="mt-8 btn-primary !px-8">Back to Menu</button>
                            </div>
                        ) : (
                            <div className="space-y-6 pb-6">
                                {orders.map((order) => (
                                    <div key={order.id} className="bg-[#FCFAF5]/50 rounded-2xl border border-[#F4F2E6] p-5 shadow-sm">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order ID</span>
                                                <h4 className="text-sm font-black text-charcoal">#{order.id.slice(0, 8).toUpperCase()}</h4>
                                            </div>
                                            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider
                                                ${order.status === 'completed' ? 'bg-green-100 text-green-600' :
                                                    order.status === 'cooking' ? 'bg-orange-100 text-orange-600' :
                                                        'bg-blue-100 text-blue-600'}`}>
                                                {order.status}
                                            </span>
                                        </div>

                                        <div className="space-y-2 mb-4">
                                            {order.order_items?.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-xs">
                                                    <span className="font-bold text-charcoal">{item.quantity}x {item.name}</span>
                                                    <span className="text-slate-400">₹{item.price * item.quantity}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="pt-3 border-t border-dashed border-[#F4F2E6] flex justify-between items-center">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Paid</span>
                                                <span className="text-lg font-black text-charcoal tracking-tighter">₹{order.total}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">Table No.</span>
                                                <p className="text-sm font-black text-primary">Table {order.table_number}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 bg-[#FCFAF5] sm:rounded-b-[2rem] border-t border-[#F4F2E6]">
                        <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Live status updates enabled</p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
