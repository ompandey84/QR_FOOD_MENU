import React, { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import Sidebar from '../components/Sidebar';
import TopNav from '../components/TopNav';
import PrintableReceipt from '../components/PrintableReceipt';

// ─── helpers ─────────────────────────────────────────
function isWithin24h(isoString) {
    return (Date.now() - new Date(isoString).getTime()) < 24 * 60 * 60 * 1000;
}

function elapsed(isoString) {
    const secs = Math.floor((Date.now() - new Date(isoString)) / 1000);
    if (secs < 60) return `${secs}s`;
    if (secs < 3600) return `${Math.floor(secs / 60)}m`;
    return `${Math.floor(secs / 3600)}h`;
}

// Merge order_items from multiple orders into a single flat array,
// summing quantities for items with the same name
function mergeItems(orders) {
    const map = new Map();
    orders.forEach(order => {
        (order.order_items || []).forEach(item => {
            const key = item.name.toLowerCase().trim();
            if (map.has(key)) {
                map.get(key).quantity += item.quantity;
            } else {
                map.set(key, { ...item });
            }
        });
    });
    return Array.from(map.values());
}

// ─── Running Bill table card ──────────────────────────
function TableBillCard({ tableNumber, orders, onCloseBill, onPrint }) {
    const activeOrders = orders.filter(o => isWithin24h(o.created_at) && o.status !== 'completed');
    const mergedItems = mergeItems(activeOrders);
    const total = mergedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const sessionStart = activeOrders.length ? activeOrders[activeOrders.length - 1].created_at : null;
    const hasUnpaid = activeOrders.some(o => o.payment_status !== 'paid');

    if (activeOrders.length === 0) return null;

    return (
        <div className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden ${hasUnpaid ? 'border-yellow-400' : 'border-slate-200'}`}>
            {/* Card header */}
            <div className={`flex justify-between items-center px-5 py-4 ${hasUnpaid ? 'bg-yellow-50' : 'bg-slate-50'}`}>
                <div>
                    <h3 className="text-2xl font-black text-slate-900">Table {tableNumber}</h3>
                    {sessionStart && (
                        <p className="text-xs text-slate-500 mt-0.5">
                            Session started {elapsed(sessionStart)} ago · {activeOrders.length} order(s)
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {hasUnpaid && <span className="px-2 py-1 bg-yellow-400 text-yellow-900 text-xs font-black rounded-full">UNPAID</span>}
                    <span className="text-2xl font-black text-slate-900">₹{total.toFixed(0)}</span>
                </div>
            </div>

            {/* Items list */}
            <div className="px-5 py-4 space-y-2 border-t border-dashed border-slate-200">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                    <span>Item</span>
                    <div className="flex gap-6">
                        <span>Qty</span>
                        <span className="w-16 text-right">Amount</span>
                    </div>
                </div>
                {mergedItems.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-slate-800 flex-1">{item.name}</span>
                        <div className="flex gap-6">
                            <span className="font-bold text-slate-600 w-8 text-center">{item.quantity}</span>
                            <span className="font-bold text-slate-900 w-16 text-right">₹{(item.price * item.quantity).toFixed(0)}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer actions */}
            <div className="px-5 pb-4 flex gap-2 border-t border-slate-100 pt-4">
                <button
                    onClick={() => onPrint(activeOrders, tableNumber, total)}
                    className="flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors border border-slate-200"
                    title="Print Bill"
                >
                    🖨️ Print
                </button>
                <button
                    onClick={() => onCloseBill(activeOrders.map(o => o.id))}
                    className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white font-black text-sm rounded-xl transition-colors shadow-sm"
                >
                    ✅ Close Bill & Mark Completed
                </button>
            </div>
        </div>
    );
}

// ─── Main Page ──────────────────────────────────────
export default function RunningBillPage() {
    const [orders, setOrders] = useState([]);
    const [restaurantId, setRestaurantId] = useState(null);
    const [restaurant, setRestaurant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [printData, setPrintData] = useState(null); // { items, tableNumber, total }
    const timerRef = useRef(null);

    // ── fetch all non-completed orders from last 24h ──
    const fetchOrders = useCallback(async (restId) => {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('restaurant_id', restId)
            .neq('status', 'completed')
            .gte('created_at', cutoff)
            .order('created_at', { ascending: false });
        const valid = (data || []).filter(o => o.total > 0 && o.order_items?.length > 0);
        setOrders(valid);
    }, []);

    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data: rest } = await supabase.from('restaurants').select('*').eq('owner_id', user.id).single();
            if (!rest) return;
            setRestaurantId(rest.id);
            setRestaurant(rest);
            await fetchOrders(rest.id);
            setLoading(false);
        }
        init();
    }, [fetchOrders]);

    // ── real-time subscription ──
    useEffect(() => {
        if (!restaurantId) return;
        const channel = supabase
            .channel(`running-bill-${restaurantId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
                () => fetchOrders(restaurantId))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' },
                () => fetchOrders(restaurantId))
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, [restaurantId, fetchOrders]);

    // ── ticker to refresh elapsed times ──
    useEffect(() => {
        timerRef.current = setInterval(() => setOrders(o => [...o]), 30000);
        return () => clearInterval(timerRef.current);
    }, []);

    // ── close bill: mark all given order IDs as completed ──
    async function handleCloseBill(orderIds) {
        await supabase.from('orders').update({ status: 'completed' }).in('id', orderIds);
        await fetchOrders(restaurantId);
    }

    // ── group active orders by table ──
    const byTable = {};
    orders.forEach(order => {
        const key = order.table_number || 'Walk-in';
        if (!byTable[key]) byTable[key] = [];
        byTable[key].push(order);
    });
    const tables = Object.keys(byTable).sort();

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <Sidebar active="Running Bill" />
            <div className="flex-1 flex flex-col min-w-0">
                <TopNav title="Running Bill" activeLink="Running Bill" />

                <main className="flex-1 p-6 overflow-y-auto">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <h1 className="text-2xl font-black tracking-tight">Running Bills 🧾</h1>
                            <p className="text-slate-500 text-sm">All active 24-hour table sessions · merges repeated orders</p>
                        </div>
                        <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-center">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Active Tables</span>
                            <span className="text-xl font-black text-slate-800">{tables.length}</span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        </div>
                    ) : tables.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <span className="text-6xl mb-4">🍽️</span>
                            <h2 className="text-xl font-black text-slate-400">No Active Bills</h2>
                            <p className="text-slate-500 text-sm mt-2">Bills appear here as soon as customers place orders.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                            {tables.map(table => (
                                <TableBillCard
                                    key={table}
                                    tableNumber={table}
                                    orders={byTable[table]}
                                    onCloseBill={handleCloseBill}
                                    onPrint={(activeOrders, tableNumber, total) => {
                                        // Build a fake consolidated "order" for PrintableReceipt
                                        setPrintData({
                                            id: `BILL-${tableNumber}`,
                                            table_number: tableNumber,
                                            customer_name: activeOrders[0]?.customer_name || '',
                                            created_at: activeOrders[activeOrders.length - 1]?.created_at,
                                            total,
                                            order_items: mergeItems(activeOrders)
                                        });
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {/* Print overlay */}
            {printData && (
                <div className="print-only">
                    <PrintableReceipt order={printData} restaurant={restaurant} />
                </div>
            )}
        </div>
    );
}
