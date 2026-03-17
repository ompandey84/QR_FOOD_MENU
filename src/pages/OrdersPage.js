import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import Sidebar from '../components/Sidebar';
import TopNav from '../components/TopNav';
import PrintableReceipt from '../components/PrintableReceipt';

// Simplified Kanban configuration
const ORDER_STATUSES = [
    { id: 'pending', label: 'Incoming Orders', color: 'bg-yellow-500' },
    { id: 'completed', label: 'Completed Orders', color: 'bg-green-500' },
];

export default function OrdersPage() {
    const [orders, setOrders] = useState([]);
    const [restaurant, setRestaurant] = useState(null);
    const [restaurantId, setRestaurantId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [printingOrder, setPrintingOrder] = useState(null);

    // Effect for triggering print dialog after state updates
    useEffect(() => {
        if (printingOrder) {
            // Tiny delay to allow React to render the component into the DOM
            setTimeout(() => {
                window.print();
            }, 100);
        }
    }, [printingOrder]);

    // Effect to clean up printing order after printing is done
    useEffect(() => {
        const handleAfterPrint = () => {
            setPrintingOrder(null);
        };
        window.addEventListener('afterprint', handleAfterPrint);
        return () => window.removeEventListener('afterprint', handleAfterPrint);
    }, []);

    // 1. Fetch initial orders
    useEffect(() => {
        async function fetchOrders() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // First get restaurant ID and details
                const { data: rest } = await supabase
                    .from('restaurants')
                    .select('*')
                    .eq('owner_id', user.id)
                    .single();

                if (!rest) return;
                setRestaurant(rest);
                setRestaurantId(rest.id);

                // Then get all orders for this restaurant (including items)
                const { data: ordersData, error } = await supabase
                    .from('orders')
                    .select(`
                        *,
                        order_items (*)
                    `)
                    .eq('restaurant_id', rest.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                // Filter out ghost duplicate orders (0 total or 0 items)
                const validOrders = (ordersData || []).filter(o => o.total > 0 && o.order_items && o.order_items.length > 0);

                setOrders(validOrders);
            } catch (err) {
                console.error("Error fetching orders:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchOrders();
    }, []);

    // 2. Setup real-time subscription for new/updated orders
    useEffect(() => {
        if (!restaurantId) return;

        console.log(`Setting up real-time subscription for restaurant: ${restaurantId}`);
        const subscription = supabase
            .channel('public:orders')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'orders',
                    filter: `restaurant_id=eq.${restaurantId}`
                },
                async (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const { data: newOrderWithItems } = await supabase
                            .from('orders')
                            .select('*, order_items(*)')
                            .eq('id', payload.new.id)
                            .single();

                        if (newOrderWithItems && Number(newOrderWithItems.total) > 0 && newOrderWithItems.order_items?.length > 0) {
                            // Prevent duplicate: only add if not already in state
                            setOrders(prev => {
                                const alreadyExists = prev.some(o => o.id === newOrderWithItems.id);
                                if (alreadyExists) return prev;
                                return [newOrderWithItems, ...prev];
                            });
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        // Fetch full updated order with items so we don't lose order_items
                        const { data: updated } = await supabase
                            .from('orders')
                            .select('*, order_items(*)')
                            .eq('id', payload.new.id)
                            .single();
                        if (updated) {
                            setOrders(prev => prev.map(order => order.id === updated.id ? updated : order));
                        }
                    } else if (payload.eventType === 'DELETE') {
                        setOrders(prev => prev.filter(order => order.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [restaurantId]);

    // Handle moving order to next stage
    const updateOrderStatus = async (orderId, newStatus) => {
        try {
            // Optimistic update
            setOrders(prev => prev.map(order =>
                order.id === orderId ? { ...order, status: newStatus } : order
            ));

            // DB update
            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus })
                .eq('id', orderId);

            if (error) throw error;
        } catch (err) {
            console.error("Failed to update status:", err);
            alert("Failed to update order status");
            // Revert on error (would require refetching or keeping previous state)
        }
    };

    const getNextStatus = (currentStatus) => {
        // Any status that isn't completed should go to completed
        if (currentStatus !== 'completed') {
            return 'completed';
        }
        return null;
    };

    // Helper to format time "10:30 AM"
    const formatTime = (isoString) => {
        if (!isoString) return '';
        const d = new Date(isoString);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <Sidebar active="Orders" />
            <div className="flex-1 flex flex-col min-w-0">
                <div className="no-print">
                    <TopNav title="Orders Dashboard" activeLink="Orders" />
                </div>
                <div className="flex flex-1 flex-col xl:flex-row overflow-hidden">
                    <main className="flex-1 p-6 h-full xl:overflow-hidden overflow-y-auto flex flex-col no-print">

                        {/* Header Details */}
                        <div className="flex justify-between items-end mb-6 shrink-0">
                            <div>
                                <h1 className="text-2xl font-black tracking-tight mb-1">Live Orders</h1>
                                <p className="text-slate-500 text-sm">Real-time order tracking system</p>
                            </div>
                            <div className="flex gap-3">
                                <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                                    <span className="text-slate-500 text-xs uppercase font-bold tracking-wider block">Today's Revenue</span>
                                    <span className="text-lg font-black text-slate-800">
                                        ₹{orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + Number(o.total), 0).toFixed(0)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                            </div>
                        ) : (
                            /* KANBAN BOARD */
                            <div className="flex-1 flex gap-6 overflow-x-auto pb-4 snap-x">
                                {ORDER_STATUSES.map(column => {
                                    // For the 'pending' column, we'll actually show anything that isn't 'completed'
                                    // just in case there are legacy orders with 'preparing' or 'ready' status
                                    const columnOrders = column.id === 'pending'
                                        ? orders.filter(o => o.status !== 'completed')
                                        : orders.filter(o => o.status === 'completed');

                                    return (
                                        <div key={column.id} className="flex-none w-[350px] flex flex-col bg-slate-100/50 rounded-2xl p-4 border border-slate-200/60 snap-center">
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

                                            {/* Cards Container */}
                                            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                                                {columnOrders.map(order => (
                                                    <div
                                                        key={order.id}
                                                        className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 animate-slide-up-fade"
                                                    >
                                                        {/* Card Header */}
                                                        <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-3">
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="text-xs font-bold text-slate-400">
                                                                        #{order.id.slice(0, 5).toUpperCase()}
                                                                    </span>
                                                                    <span className="text-xs text-slate-400">•</span>
                                                                    <span className="text-xs font-medium text-slate-500">
                                                                        {formatTime(order.created_at)}
                                                                    </span>
                                                                </div>
                                                                <h3 className="font-bold text-slate-800">{order.customer_name}</h3>
                                                                {order.table_number && (
                                                                    <p className="text-xs font-medium text-primary mt-0.5">
                                                                        Table {order.table_number}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="block font-bold text-slate-900">₹{order.total}</span>
                                                                <span className="text-xs text-slate-500">{order.order_items?.length || 0} items</span>
                                                            </div>
                                                        </div>

                                                        {/* Items List */}
                                                        <div className="space-y-1.5 mb-4">
                                                            {order.order_items?.map((item, i) => (
                                                                <div key={i} className="flex gap-2 text-sm border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                                                                    <span className="font-bold text-slate-400 min-w-[20px]">{item.quantity}x</span>
                                                                    <span className="text-slate-700">{item.name}</span>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex gap-2">
                                                            {getNextStatus(order.status) && (
                                                                <button
                                                                    onClick={() => updateOrderStatus(order.id, getNextStatus(order.status))}
                                                                    className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-bold text-sm rounded-xl transition-colors shadow-sm shadow-green-500/20"
                                                                >
                                                                    Mark Completed ✓
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => setPrintingOrder(order)}
                                                                className={`flex-none px-4 py-3 font-bold text-sm rounded-xl transition-colors border ${printingOrder?.id === order.id ? 'bg-primary text-charcoal border-primary shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'} no-print`}
                                                                title="View Receipt"
                                                            >
                                                                🖨️
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}

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
                                <p className="text-sm px-6">Click the 🖨️ icon on any active order to preview and print its thermal receipt.</p>
                            </div>
                        )}
                    </aside>
                </div>
            </div>
        </div>
    );
}
