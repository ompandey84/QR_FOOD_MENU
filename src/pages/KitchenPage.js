import React, { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import Sidebar from '../components/Sidebar';
import TopNav from '../components/TopNav';
import { useOrderNotifications } from '../hooks/useOrderNotifications';

// ─────────────────── helpers ────────────────────
const STATUS_CONFIG = {
    pending:    { label: 'New Order',  bg: 'bg-yellow-100', border: 'border-yellow-400', badge: 'bg-yellow-400 text-yellow-900', dot: 'bg-yellow-400' },
    preparing:  { label: 'Preparing', bg: 'bg-blue-100',   border: 'border-blue-400',   badge: 'bg-blue-500 text-white',       dot: 'bg-blue-500'   },
    ready:      { label: 'Ready!',    bg: 'bg-green-100',  border: 'border-green-500',  badge: 'bg-green-500 text-white',      dot: 'bg-green-500'  },
};

function elapsed(isoString) {
    const secs = Math.floor((Date.now() - new Date(isoString)) / 1000);
    if (secs < 60)  return `${secs}s ago`;
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    return `${Math.floor(secs / 3600)}h ago`;
}

// ─────────────────── Order Card ───────────────────
function KitchenCard({ order, onStatusChange, isNew }) {
    const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;

    return (
        <div
            className={`
                relative flex flex-col rounded-2xl border-2 p-5 shadow-md transition-all duration-300
                ${cfg.bg} ${cfg.border}
                ${isNew ? 'animate-flash-new' : ''}
            `}
        >
            {/* NEW badge */}
            {isNew && (
                <span className="absolute -top-3 left-4 px-3 py-0.5 bg-red-500 text-white text-xs font-black rounded-full shadow animate-pulse">
                    NEW
                </span>
            )}

            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-xs font-bold text-gray-500 tracking-wider uppercase mb-0.5">
                        #{String(order.id).slice(0, 6).toUpperCase()}
                    </p>
                    {order.table_number && (
                        <p className="text-3xl font-black text-gray-800 leading-none">
                            Table {order.table_number}
                        </p>
                    )}
                    {order.customer_name && (
                        <p className="text-sm font-semibold text-gray-600 mt-1">
                            {order.customer_name}
                        </p>
                    )}
                </div>
                <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-black ${cfg.badge}`}>
                        {cfg.label}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">
                        🕐 {elapsed(order.created_at)}
                    </span>
                </div>
            </div>

            {/* Items */}
            <div className="flex-1 space-y-2 mb-5 border-t border-dashed border-gray-300 pt-4">
                {order.order_items?.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                        <span className="text-lg font-bold text-gray-800">{item.name}</span>
                        <span className="text-xl font-black text-gray-900 bg-white/60 px-3 py-0.5 rounded-lg border border-gray-200">
                            ×{item.quantity}
                        </span>
                    </div>
                ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                {order.status === 'pending' && (
                    <button
                        onClick={() => onStatusChange(order.id, 'preparing')}
                        className="flex-1 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-black text-sm shadow transition-all active:scale-95"
                    >
                        🍳 START PREPARING
                    </button>
                )}
                {order.status === 'preparing' && (
                    <button
                        onClick={() => onStatusChange(order.id, 'ready')}
                        className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-black text-sm shadow transition-all active:scale-95"
                    >
                        ✅ MARK READY
                    </button>
                )}
                {order.status === 'ready' && (
                    <div className="flex-1 py-3 rounded-xl bg-green-200 text-green-800 font-black text-sm text-center">
                        🎉 READY — Waiting to Serve
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────── Main Page ────────────────────
export default function KitchenPage() {
    const [orders, setOrders] = useState([]);
    const [restaurantId, setRestaurantId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all | pending | preparing | ready
    const [soundOn, setSoundOn] = useState(() => localStorage.getItem('kds-sound') !== 'false');
    const [newOrderIds, setNewOrderIds] = useState(new Set());
    const seenIdsRef = useRef(new Set());
    const newestCardRef = useRef(null);
    const timerRef = useRef(null);

    const { playBeep, fireNotification } = useOrderNotifications(soundOn);

    // ── helper: merge or replace orders ──
    const mergeOrders = useCallback((incoming) => {
        setOrders(prev => {
            const map = new Map(prev.map(o => [o.id, o]));
            incoming.forEach(o => map.set(o.id, o));
            return Array.from(map.values()).sort(
                (a, b) => new Date(b.created_at) - new Date(a.created_at)
            );
        });
    }, []);

    // ── Initial fetch ──
    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: rest } = await supabase
                .from('restaurants').select('id').eq('owner_id', user.id).single();
            if (!rest) return;

            setRestaurantId(rest.id);

            const { data } = await supabase
                .from('orders')
                .select('*, order_items(*)')
                .eq('restaurant_id', rest.id)
                .in('status', ['pending', 'preparing', 'ready'])
                .order('created_at', { ascending: false });

            const validOrders = (data || []).filter(o => o.total > 0 && o.order_items?.length > 0);
            validOrders.forEach(o => seenIdsRef.current.add(o.id));
            setOrders(validOrders);
            setLoading(false);
        }
        init();
    }, []);

    // ── Real-time subscription ──
    useEffect(() => {
        if (!restaurantId) return;

        const channel = supabase
            .channel(`kitchen-${restaurantId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
                async (payload) => {
                    const { eventType, new: newRow, old: oldRow } = payload;

                    if (eventType === 'DELETE' || newRow?.status === 'completed') {
                        setOrders(prev => prev.filter(o => o.id !== (newRow?.id || oldRow?.id)));
                        return;
                    }

                    // FIX: 1-second delay to allow order_items to populate in the DB
                    setTimeout(async () => {
                        // Fetch full order with items
                        const { data: fullOrder } = await supabase
                            .from('orders')
                            .select('*, order_items(*)')
                            .eq('id', newRow.id)
                            .single();

                        if (!fullOrder || fullOrder.total <= 0 || !fullOrder.order_items?.length) return;

                        const isNew = !seenIdsRef.current.has(fullOrder.id);
                        seenIdsRef.current.add(fullOrder.id);

                        if (isNew) {
                            playBeep();
                            fireNotification(fullOrder);
                            setNewOrderIds(prev => new Set([...prev, fullOrder.id]));
                            // Remove "new" highlight after 8 seconds
                            setTimeout(() => {
                                setNewOrderIds(prev => {
                                    const next = new Set(prev);
                                    next.delete(fullOrder.id);
                                    return next;
                                });
                            }, 8000);
                            // Scroll to top where newest card lands
                            setTimeout(() => newestCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
                        }

                        mergeOrders([fullOrder]);
                    }, 1000);
                }
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [restaurantId, playBeep, fireNotification, mergeOrders]);

    // ── Tick elapsed time every 30s ──
    useEffect(() => {
        timerRef.current = setInterval(() => setOrders(o => [...o]), 30000);
        return () => clearInterval(timerRef.current);
    }, []);

    // ── Status update ──
    async function handleStatusChange(orderId, newStatus) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    }

    // ── Toggle sound ──
    function toggleSound() {
        setSoundOn(prev => {
            localStorage.setItem('kds-sound', String(!prev));
            return !prev;
        });
    }

    // ── Filtered view ──
    const FILTERS = [
        { id: 'all',       label: 'All' },
        { id: 'pending',   label: '🟡 New' },
        { id: 'preparing', label: '🔵 Preparing' },
        { id: 'ready',     label: '🟢 Ready' },
    ];

    const visible = filter === 'all' ? orders : orders.filter(o => o.status === filter);

    // ── Count badges ──
    const counts = orders.reduce((acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="min-h-screen bg-gray-900 flex">
            <div className="no-print"><Sidebar active="Kitchen" /></div>

            <div className="flex-1 flex flex-col min-w-0">
                <div className="no-print"><TopNav title="Kitchen Display" activeLink="Kitchen" /></div>

                {/* KDS Header */}
                <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex flex-wrap items-center justify-between gap-4 no-print">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-black text-white tracking-tight">
                            🍳 Kitchen Display
                        </h1>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-green-400 text-xs font-bold uppercase tracking-wider">Live</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Filter Tabs */}
                        <div className="flex gap-1 bg-gray-700 p-1 rounded-xl">
                            {FILTERS.map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setFilter(f.id)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                                        filter === f.id
                                            ? 'bg-white text-gray-900 shadow'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    {f.label}
                                    {f.id !== 'all' && counts[f.id] > 0 && (
                                        <span className="ml-1.5 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                                            {counts[f.id]}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Sound Toggle */}
                        <button
                            onClick={toggleSound}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all border ${
                                soundOn
                                    ? 'bg-yellow-400 text-gray-900 border-yellow-500'
                                    : 'bg-gray-700 text-gray-400 border-gray-600'
                            }`}
                        >
                            {soundOn ? '🔔 Sound ON' : '🔕 Sound OFF'}
                        </button>
                    </div>
                </header>

                {/* Order Grid */}
                <main className="flex-1 p-6 overflow-y-auto" ref={newestCardRef}>
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
                        </div>
                    ) : visible.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <span className="text-7xl mb-4">🍽️</span>
                            <h2 className="text-2xl font-black text-gray-400">All Quiet in the Kitchen</h2>
                            <p className="text-gray-600 mt-2">New orders will appear here automatically.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {visible.map(order => (
                                <KitchenCard
                                    key={order.id}
                                    order={order}
                                    onStatusChange={handleStatusChange}
                                    isNew={newOrderIds.has(order.id)}
                                />
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
