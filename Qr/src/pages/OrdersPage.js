import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import MainLayout from '../components/MainLayout';
import PrintableReceipt from '../components/PrintableReceipt';
import { useOrderNotifications } from '../hooks/useOrderNotifications';

// 2-column Kanban: Incoming (all active) and Completed
const ORDER_STATUSES = [
    { id: 'incoming',  label: 'Incoming Orders', color: 'bg-yellow-400' },
    { id: 'completed', label: 'Completed',        color: 'bg-green-500'  },
];

export default function OrdersPage() {
    const [orders, setOrders] = useState([]);
    const [restaurant, setRestaurant] = useState(null);
    const [restaurantId, setRestaurantId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [printingOrder, setPrintingOrder] = useState(null);

    const [newOrderIds, setNewOrderIds] = useState(new Set());
    const seenIdsRef = useRef(new Set());
    const soundEnabled = true;
    const { playBeep, fireNotification } = useOrderNotifications(soundEnabled);

    // Trigger print dialog when printingOrder is set
    useEffect(() => {
        if (printingOrder) {
            setTimeout(() => { window.print(); }, 100);
        }
    }, [printingOrder]);

    // Clean up after print
    useEffect(() => {
        const handleAfterPrint = () => setPrintingOrder(null);
        window.addEventListener('afterprint', handleAfterPrint);
        return () => window.removeEventListener('afterprint', handleAfterPrint);
    }, []);

    // ─── Core fetch function (used by poll + initial load) ──────────────
    const restaurantIdRef = useRef(null);

    const fetchAllOrders = async (restId) => {
        const id = restId || restaurantIdRef.current;
        if (!id) return;
        const { data: ordersData } = await supabase
            .from('orders')
            .select('*, order_items (*)')
            .eq('restaurant_id', id)
            .order('created_at', { ascending: false });

        const validOrders = (ordersData || []).filter(o => o.order_items?.length > 0);

        setOrders(prev => {
            // Detect new orders for notification
            const newOnes = validOrders.filter(o => !seenIdsRef.current.has(o.id));
            if (newOnes.length > 0) {
                newOnes.forEach(o => {
                    seenIdsRef.current.add(o.id);
                    playBeepRef.current?.();
                    fireNotificationRef.current?.(o);
                    setNewOrderIds(ids => {
                        const next = new Set([...ids, o.id]);
                        setTimeout(() => setNewOrderIds(s => { const n = new Set(s); n.delete(o.id); return n; }), 8000);
                        return next;
                    });
                });
            }
            return validOrders;
        });
    };

    // 1. Initial load — get restaurant, then fetch orders
    useEffect(() => {
        async function init() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: rest } = await supabase
                    .from('restaurants')
                    .select('*')
                    .eq('owner_id', user.id)
                    .single();

                if (!rest) return;
                setRestaurant(rest);
                setRestaurantId(rest.id);
                restaurantIdRef.current = rest.id;

                await fetchAllOrders(rest.id);
            } catch (err) {
                console.error('OrdersPage init error:', err);
            } finally {
                setLoading(false);
            }
        }
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 2. POLLING every 5 seconds — guaranteed live updates
    useEffect(() => {
        const interval = setInterval(() => {
            fetchAllOrders();
        }, 5000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 3. Refs for stable notification callbacks
    const playBeepRef = useRef(playBeep);
    const fireNotificationRef = useRef(fireNotification);
    useEffect(() => { playBeepRef.current = playBeep; }, [playBeep]);
    useEffect(() => { fireNotificationRef.current = fireNotification; }, [fireNotification]);

    // 4. Realtime subscription as bonus (instant updates when DB pub is configured)
    useEffect(() => {
        if (!restaurantId) return;
        const channel = supabase
            .channel(`orders-rt-${restaurantId}`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
                () => { fetchAllOrders(); } // Just re-fetch on any change
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [restaurantId]);


    // Update order status in DB and state
    const updateOrderStatus = async (orderId, newStatus) => {
        try {
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
            const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
            if (error) throw error;
        } catch (err) {
            // Status update failed silently
        }
    };

    // Mark any active order as completed
    const markCompleted = (orderId) => updateOrderStatus(orderId, 'completed');

    // Format time helper
    const formatTime = (isoString) => {
        if (!isoString) return '';
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <MainLayout activeLink="Orders" title="Orders Dashboard">
                <div className="flex flex-1 flex-col xl:flex-row overflow-hidden">
                    <main className="flex-1 p-6 h-full xl:overflow-hidden overflow-y-auto flex flex-col no-print">

                        {/* Notification Permission Banner */}
                        {typeof Notification !== 'undefined' && Notification.permission !== 'granted' && (
                            <div className="mb-4 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-2xl flex items-center justify-between gap-3 shrink-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">🔔</span>
                                    <div>
                                        <p className="text-sm font-black text-yellow-800">Enable Notifications</p>
                                        <p className="text-xs text-yellow-600">Allow notifications to get live order alerts with sound</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => Notification.requestPermission().then(p => {
                                        if (p === 'granted') {
                                            new Notification('🔔 Notifications Enabled!', { body: 'You will now get live order alerts.' });
                                        }
                                    })}
                                    className="flex-shrink-0 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-black text-xs px-4 py-2 rounded-xl transition-colors"
                                >
                                    Enable Now
                                </button>
                            </div>
                        )}

                        {/* Header */}
                        <div className="flex justify-between items-end mb-6 shrink-0">
                            <div>
                                <h1 className="text-2xl font-black tracking-tight mb-1">Live Orders</h1>
                                <p className="text-slate-500 text-sm">Real-time order tracking · Kitchen drives status flow</p>
                            </div>
                            <div className="flex gap-3">
                                <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                                    <span className="text-slate-500 text-xs uppercase font-bold tracking-wider block">Revenue</span>
                                    <span className="text-lg font-black text-slate-800">
                                        ₹{orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + Number(o.total), 0).toFixed(0)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex-1 flex gap-6 animate-pulse">
                                {[1, 2].map(col => (
                                    <div key={col} className="flex-none w-[360px] bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                        <div className="h-5 w-32 bg-slate-200 rounded mb-4" />
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 mb-3">
                                                <div className="flex justify-between mb-3">
                                                    <div className="space-y-2">
                                                        <div className="h-3 w-16 bg-slate-200 rounded" />
                                                        <div className="h-4 w-24 bg-slate-200 rounded" />
                                                    </div>
                                                    <div className="h-5 w-12 bg-slate-200 rounded" />
                                                </div>
                                                <div className="flex gap-2 mb-3">
                                                    <div className="h-6 w-20 bg-slate-100 rounded-full" />
                                                    <div className="h-6 w-16 bg-slate-100 rounded-full" />
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="h-3 w-full bg-slate-100 rounded" />
                                                    <div className="h-3 w-3/4 bg-slate-100 rounded" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* 2-COLUMN KANBAN */
                            <div className="flex-1 flex gap-6 overflow-x-auto pb-4 snap-x">
                                {ORDER_STATUSES.map(column => {
                                    const isIncoming = column.id === 'incoming';
                                    const columnOrders = isIncoming
                                        ? orders.filter(o => o.status !== 'completed')
                                        : orders.filter(o => o.status === 'completed');

                                    return (
                                        <div key={column.id} className="flex-none w-[360px] flex flex-col bg-slate-100/50 rounded-2xl p-4 border border-slate-200/60 snap-center">
                                            {/* Column Header */}
                                            <div className="flex justify-between items-center mb-4 px-1">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-3 h-3 rounded-full ${column.color}`} />
                                                    <h2 className="font-bold text-slate-700">{column.label}</h2>
                                                </div>
                                                <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full">
                                                    {columnOrders.length}
                                                </span>
                                            </div>

                                            {/* Cards */}
                                            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                                                {columnOrders.map(order => {
                                                    const payMethod = order.payment_method || 'counter';
                                                    const payStatus = order.payment_status || 'unpaid';
                                                    const isUnpaidCounter = payMethod === 'counter' && payStatus !== 'paid';

                                                    return (
                                                        <div
                                                            key={order.id}
                                                            className={`bg-white p-4 rounded-xl shadow-sm border-l-4 border border-slate-200 transition-all
                                                                ${newOrderIds.has(order.id) ? 'animate-flash-new' : ''}
                                                                ${isUnpaidCounter ? 'border-l-yellow-400' : isIncoming ? 'border-l-blue-400' : 'border-l-green-400'}`}
                                                        >
                                                            {/* Card Header */}
                                                            <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-3">
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="text-xs font-bold text-slate-400">#{order.id.slice(0, 5).toUpperCase()}</span>
                                                                        <span className="text-xs text-slate-400">•</span>
                                                                        <span className="text-xs font-medium text-slate-500">{formatTime(order.created_at)}</span>
                                                                    </div>
                                                                    <h3 className="font-bold text-slate-800">{order.customer_name}</h3>
                                                                    {order.table_number && (
                                                                        <p className="text-xs font-medium text-primary mt-0.5">Table {order.table_number}</p>
                                                                    )}
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className="block font-bold text-slate-900">₹{order.total}</span>
                                                                    <span className="text-xs text-slate-500">{order.order_items?.length || 0} items</span>
                                                                </div>
                                                            </div>

                                                            {/* Payment Badges */}
                                                            <div className="flex gap-2 mb-3">
                                                                <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border
                                                                    ${payMethod === 'online'
                                                                        ? 'bg-green-50 text-green-700 border-green-200'
                                                                        : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                                                                    {payMethod === 'online' ? '🟢 Online/UPI' : '💵 Cash/Counter'}
                                                                </span>
                                                                <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border
                                                                    ${payStatus === 'paid'
                                                                        ? 'bg-green-50 text-green-700 border-green-200'
                                                                        : 'bg-yellow-50 text-yellow-700 border-yellow-300'}`}>
                                                                    {payStatus === 'paid' ? '✅ Paid' : '🕐 Pending'}
                                                                </span>
                                                            </div>

                                                            {/* Items */}
                                                            <div className="space-y-1.5 mb-3">
                                                                {order.order_items?.map((item, i) => (
                                                                    <div key={i} className="flex gap-2 text-sm border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                                                                        <span className="font-bold text-slate-400 min-w-[20px]">{item.quantity}x</span>
                                                                        <span className="text-slate-700">{item.name}</span>
                                                                        <span className="ml-auto text-slate-500 font-medium">₹{(item.price * item.quantity).toFixed(0)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            {/* Customer Instructions Warning */}
                                                            {order.instructions && (
                                                                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3 flex items-start gap-2">
                                                                    <span className="text-red-500 text-sm mt-0.5">⚠️</span>
                                                                    <div>
                                                                        <span className="text-xs font-black text-red-600 uppercase tracking-wider block mb-0.5">Special Instructions</span>
                                                                        <p className="text-sm text-red-700 font-medium">{order.instructions}</p>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Actions */}
                                                            <div className="flex gap-2">
                                                                {isIncoming && (
                                                                    <button
                                                                        onClick={() => markCompleted(order.id)}
                                                                        className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold text-sm rounded-xl transition-colors"
                                                                    >
                                                                        ✅ Mark Completed
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => setPrintingOrder(order)}
                                                                    className={`flex-none px-4 py-2.5 font-bold text-sm rounded-xl transition-colors border ${printingOrder?.id === order.id ? 'bg-primary text-charcoal border-primary shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'} no-print`}
                                                                    title="View Receipt"
                                                                >
                                                                    🖨️
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                {columnOrders.length === 0 && (
                                                    <div className="text-center py-8">
                                                        <p className="text-sm font-medium text-slate-400">Empty</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </main>

                    {/* Receipt Sidebar */}
                    <aside className={`w-full xl:w-[400px] border-t xl:border-t-0 xl:border-l border-slate-200 bg-slate-100/50 p-6 overflow-y-auto ${printingOrder ? 'block' : 'hidden xl:block'} print:block print:w-full print:border-none print:p-0 print:bg-white`}>
                        {printingOrder ? (
                            <div className="xl:sticky xl:top-0 print:static">
                                <div className="flex items-center justify-between mb-4 no-print">
                                    <h3 className="font-bold text-slate-800">Preview Receipt</h3>
                                    <button onClick={() => setPrintingOrder(null)} className="text-slate-400 hover:text-slate-600 transition-colors bg-white px-3 py-1 rounded-lg border border-slate-200 text-sm shadow-sm font-bold">✕ Close</button>
                                </div>
                                <div className="bg-white p-6 shadow-sm border border-slate-200 mx-auto max-w-[350px] xl:max-w-none print:shadow-none print:border-none print:p-0 print:max-w-none print:w-full">
                                    <PrintableReceipt order={printingOrder} restaurant={restaurant} />
                                </div>
                                <div className="max-w-[350px] xl:max-w-none mx-auto mt-6 no-print">
                                    <button
                                        onClick={() => window.print()}
                                        className="w-full py-4 bg-charcoal hover:bg-slate-800 text-white font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                                    >
                                        <span className="text-xl">🖨️</span> PRINT SLIP
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 no-print">
                                <span className="text-6xl mb-6 opacity-40">🧾</span>
                                <h3 className="text-lg font-bold text-slate-600 mb-2">No Receipt Selected</h3>
                                <p className="text-sm px-6">Click the 🖨️ icon on any order to preview and print its receipt.</p>
                            </div>
                        )}
                    </aside>
                </div>
        </MainLayout>
    );
}
