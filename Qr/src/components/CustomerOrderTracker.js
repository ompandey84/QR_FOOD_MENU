import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

const STATUS_STEPS = [
    { key: 'pending', label: 'Order Received', icon: '🧾', color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { key: 'preparing', label: 'Preparing', icon: '👨‍🍳', color: 'text-orange-600', bg: 'bg-orange-50' },
    { key: 'ready', label: 'Ready for Pickup', icon: '✅', color: 'text-green-600', bg: 'bg-green-50' },
    { key: 'completed', label: 'Completed', icon: '⭐', color: 'text-slate-500', bg: 'bg-slate-50' },
];

function getStepIndex(status) {
    const idx = STATUS_STEPS.findIndex(s => s.key === status);
    return idx === -1 ? 0 : idx;
}

export default function CustomerOrderTracker({ orderId, onClose }) {
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const prevStatusRef = useRef(null);
    const audioRef = useRef(null);

    useEffect(() => {
        if (!orderId) return;

        const fetchOrder = async () => {
            const { data } = await supabase
                .from('orders')
                .select('id, status, total, customer_name, table_number')
                .eq('id', orderId)
                .single();

            if (data) {
                // Play chime if status changed to 'ready'
                if (prevStatusRef.current && prevStatusRef.current !== data.status && data.status === 'ready') {
                    try { audioRef.current?.play(); } catch { }
                }
                prevStatusRef.current = data.status;
                setOrder(data);
            }
            setLoading(false);
        };

        fetchOrder();

        // Subscribe to realtime
        const channel = supabase
            .channel(`order-tracker-${orderId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, (payload) => {
                if (payload.new) {
                    if (prevStatusRef.current && prevStatusRef.current !== payload.new.status && payload.new.status === 'ready') {
                        try { audioRef.current?.play(); } catch { }
                    }
                    prevStatusRef.current = payload.new.status;
                    setOrder(prev => ({ ...prev, ...payload.new }));
                }
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [orderId]);

    if (!orderId) return null;

    const currentStep = order ? getStepIndex(order.status) : 0;
    const currentStepInfo = STATUS_STEPS[currentStep];
    const total = order?.total ?? 0;

    return (
        <div className="fixed bottom-20 right-4 z-[99] w-[320px] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            {/* Hidden audio element for notification chime */}
            <audio ref={audioRef} preload="none">
                <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAA..." type="audio/wav" />
            </audio>

            {/* Header */}
            <div className="bg-charcoal text-white px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    <span className="font-bold text-sm">Live Order Tracking</span>
                </div>
                <button onClick={onClose} className="text-white/60 hover:text-white text-lg leading-none">✕</button>
            </div>

            {loading ? (
                <div className="p-6 flex justify-center">
                    <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
            ) : !order ? (
                <div className="p-6 text-center text-sm text-slate-500">Order not found</div>
            ) : order.status === 'cancelled' ? (
                <div className="p-5 text-center">
                    <span className="text-3xl block mb-2">❌</span>
                    <p className="font-bold text-red-600">Order Cancelled</p>
                    <p className="text-xs text-slate-500 mt-1">Please contact the restaurant for assistance.</p>
                    <button onClick={onClose} className="mt-3 btn-secondary text-xs py-2 px-4">Close</button>
                </div>
            ) : (
                <div className="p-4">
                    {/* Current status highlight */}
                    <div className={`flex items-center gap-3 p-3 rounded-xl mb-4 ${currentStepInfo.bg}`}>
                        <span className="text-2xl">{currentStepInfo.icon}</span>
                        <div>
                            <p className={`font-black text-sm ${currentStepInfo.color}`}>{currentStepInfo.label}</p>
                            <p className="text-xs text-slate-500">
                                {order.status === 'pending' && 'Your order has been received!'}
                                {order.status === 'preparing' && 'Your food is being prepared.'}
                                {order.status === 'ready' && 'Go pick up your order! 🎉'}
                                {order.status === 'completed' && 'Enjoy your meal! Thank you.'}
                            </p>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="flex items-center gap-1 mb-4">
                        {STATUS_STEPS.slice(0, 3).map((step, idx) => (
                            <React.Fragment key={step.key}>
                                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${idx <= currentStep ? 'bg-primary text-charcoal' : 'bg-slate-100 text-slate-400'}`}>
                                    {idx < currentStep ? '✓' : idx + 1}
                                </div>
                                {idx < 2 && <div className={`flex-1 h-1 rounded-full transition-all ${idx < currentStep ? 'bg-primary' : 'bg-slate-100'}`} />}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Order info */}
                    <div className="bg-slate-50 rounded-xl p-3 flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-medium">
                            {order.table_number ? `Table ${order.table_number}` : 'Your Order'}
                        </span>
                        <span className="font-black text-charcoal">₹{Number(total).toFixed(0)}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
