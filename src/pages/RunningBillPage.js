import React, { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import Sidebar from '../components/Sidebar';
import TopNav from '../components/TopNav';
import { useReactToPrint } from 'react-to-print';

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

// Merge order_items from multiple orders into a single flat array
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

// ─── Printable Component (Hidden) ─────────────────────
const PrintableRunningBill = React.forwardRef(({ data, restaurant }, ref) => {
    if (!data) return null;

    const calc = data.calculations || {};

    return (
        <div ref={ref} className="relative bg-white w-[300px] p-4 text-black text-sm mx-auto" style={{ fontFamily: "'Courier New', Courier, monospace" }}>
            {/* Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] z-0 rotate-[-45deg] text-4xl font-black text-center whitespace-pre-wrap leading-none">
                {restaurant?.name || "RESTAURANT"}
            </div>
            
            <div className="relative z-10">
                {/* Header */}
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold uppercase mb-1 tracking-tight">{restaurant?.name || 'SmartMenu'}</h2>
                    {restaurant?.address && <p className="whitespace-pre-wrap text-[10px] leading-tight mb-1">{restaurant.address}</p>}
                </div>
                
                {/* Order Details */}
                <div className="mb-4 pb-3 border-b-2 border-dashed border-black">
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-xs uppercase">Bill #{data.id?.slice(0, 6)}</span>
                        <span className="font-bold text-xs border border-black px-1.5 py-0.5">TABLE {data.table_number}</span>
                    </div>
                </div>

                {/* Items List */}
                <div className="mb-4">
                    <div className="flex justify-between text-[10px] font-bold border-b border-black pb-2 mb-3">
                        <span className="flex-1">ITEM</span>
                        <span className="w-8 text-center">QTY</span>
                        <span className="w-16 text-right">AMT</span>
                    </div>
                    <div className="space-y-2 text-[11px]">
                        {data.order_items?.map((item, i) => (
                            <div key={i} className="flex justify-between items-start">
                                <span className="flex-1 pr-2 break-words font-semibold">{item.name}</span>
                                <span className="w-8 text-center font-bold">{item.quantity}</span>
                                <span className="w-16 text-right font-bold tabular-nums">₹{item.price * item.quantity}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Totals */}
                <div className="border-t-2 border-dashed border-black pt-3 mb-6 mt-4">
                    <div className="space-y-1.5 mb-3 text-[11px] font-semibold">
                        <div className="flex justify-between">
                            <span>SUBTOTAL</span>
                            <span>₹{calc.subtotal?.toFixed(2)}</span>
                        </div>
                        {calc.appliedDynamicCharges?.map((charge, idx) => (
                            <div key={idx} className="flex justify-between">
                                <span>{charge.name} {charge.type === 'percentage' ? `(${charge.value}%)` : '(Flat)'}</span>
                                <span>₹{charge.calculated_amount?.toFixed(2)}</span>
                            </div>
                        ))}
                        {calc.manualServiceCharge > 0 && (
                            <div className="flex justify-between text-black">
                                <span>SERVICE CHG</span>
                                <span>₹{calc.manualServiceCharge?.toFixed(2)}</span>
                            </div>
                        )}
                        {calc.customDiscount > 0 && (
                            <div className="flex justify-between text-black">
                                <span>CUSTOM DISCOUNT</span>
                                <span>-₹{calc.customDiscount?.toFixed(2)}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-between items-end font-bold border-t border-black pt-2">
                        <span className="text-sm tracking-widest">GRAND TOTAL</span>
                        <span className="text-xl leading-none tabular-nums text-right">₹{data.total?.toFixed(0)}</span>
                    </div>
                </div>
                
                <div className="text-center text-[10px] font-bold uppercase tracking-widest pt-2 border-t border-dashed border-black">
                    <p className="mt-2">*** THANK YOU! ***</p>
                </div>
            </div>
        </div>
    );
});

function TableBillCard({ tableNumber, orders, onCloseBill, onPrintTrigger, dynamicCharges }) {
    const [isEditing, setIsEditing] = useState(false);
    const [custom, setCustom] = useState({ discount: 0, service: 0 });

    const activeOrders = orders.filter(o => isWithin24h(o.created_at) && ['pending', 'unpaid'].includes(o.payment_status?.toLowerCase()));
    if (activeOrders.length === 0) return null;

    const mergedItems = mergeItems(activeOrders);
    
    // Dynamic Math logic
    const subtotal = mergedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const customDiscount = Number(custom.discount) || 0;
    const manualServiceCharge = Number(custom.service) || 0;
    const discountedSubtotal = Math.max(0, subtotal - customDiscount);

    let dynamicTaxAmount = 0;
    const appliedDynamicCharges = (dynamicCharges || []).map(charge => {
        let calcVal = 0;
        if (charge.type === 'percentage') {
            calcVal = (discountedSubtotal * charge.value) / 100;
        } else if (charge.type === 'flat') {
            calcVal = Number(charge.value) || 0;
        }
        dynamicTaxAmount += calcVal;
        return { ...charge, calculated_amount: calcVal };
    });

    const grandTotal = Math.max(0, discountedSubtotal + dynamicTaxAmount + manualServiceCharge);

    const sessionStart = activeOrders.length ? activeOrders[activeOrders.length - 1].created_at : null;

    const handlePrintClick = () => {
        onPrintTrigger({
            id: `BILL-${tableNumber}`,
            table_number: tableNumber,
            customer_name: activeOrders[0]?.customer_name || '',
            created_at: activeOrders[activeOrders.length - 1]?.created_at,
            total: grandTotal,
            order_items: mergedItems,
            calculations: {
                subtotal,
                customDiscount,
                manualServiceCharge,
                appliedDynamicCharges
            }
        });
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 overflow-hidden flex flex-col">
            {/* Card header */}
            <div className="flex justify-between items-center px-5 py-4 bg-slate-50 border-b border-slate-100">
                <div>
                    <h3 className="text-2xl font-black text-slate-900">Table {tableNumber}</h3>
                    {sessionStart && (
                        <p className="text-xs text-slate-500 mt-0.5">
                            Started {elapsed(sessionStart)} ago · {activeOrders.length} order(s)
                        </p>
                    )}
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className="px-2 py-1 bg-yellow-400 text-yellow-900 text-[10px] font-black uppercase tracking-wider rounded-lg">Pending</span>
                    <span className="text-2xl font-black text-slate-900">₹{grandTotal.toFixed(0)}</span>
                </div>
            </div>

            {/* Editable Bill Mechanics */}
            {isEditing && (
                <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex gap-3">
                    <div className="flex-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">- Custom Discount (₹)</label>
                        <input type="number" min="0" value={custom.discount} onChange={e => setCustom({...custom, discount: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:border-green-500 transition-colors" />
                    </div>
                    <div className="flex-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">+ Service Charge (₹)</label>
                        <input type="number" min="0" value={custom.service} onChange={e => setCustom({...custom, service: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:border-green-500 transition-colors" />
                    </div>
                </div>
            )}

            {/* Items list */}
            <div className="px-5 py-4 space-y-2 flex-1">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                    <span>Item</span>
                    <div className="flex gap-6">
                        <span>Qty</span>
                        <span className="w-16 text-right">Amount</span>
                    </div>
                </div>
                <div className="max-h-48 overflow-y-auto pr-1 space-y-2">
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
            </div>

            {/* Footer actions */}
            <div className="px-5 pb-4 pt-3 flex flex-wrap gap-2 border-t border-slate-100 bg-white">
                <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors border border-slate-200"
                >
                    {isEditing ? '✕ Close Edit' : '✏️ Edit'}
                </button>
                <button
                    onClick={handlePrintClick}
                    className="flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors border border-slate-200"
                    title="Print Bill"
                >
                    🖨️ Print
                </button>
                <button
                    onClick={() => onCloseBill(activeOrders.map(o => o.id))}
                    className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white font-black text-sm rounded-xl transition-colors shadow-sm"
                >
                    💳 Settle & Checkout
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
    const [dynamicCharges, setDynamicCharges] = useState([]);
    const timerRef = useRef(null);

    // react-to-print state
    const [selectedBillForPrint, setSelectedBillForPrint] = useState(null);
    const printComponentRef = useRef();

    const handlePrintFn = useReactToPrint({
        content: () => printComponentRef.current,
    });

    // Handle asynchronous state update before printing
    const triggerPrint = (tableData) => {
        setSelectedBillForPrint(tableData);
        setTimeout(() => {
            if (printComponentRef.current) {
                handlePrintFn();
            }
        }, 100);
    };

    // ── fetch all strictly pending/unpaid orders from last 24h ──
    const fetchOrders = useCallback(async (restId) => {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('restaurant_id', restId)
            .in('payment_status', ['pending', 'unpaid'])
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
            const { data: chargesData } = await supabase.from('dynamic_charges').select('*').eq('is_active', true);
            setDynamicCharges(chargesData || []);
            
            await fetchOrders(rest.id);
            setLoading(false);
        }
        init();
    }, [fetchOrders]);

    // ── real-time subscription for instant pop-ins ──
    useEffect(() => {
        if (!restaurantId) return;
        const channel = supabase
            .channel(`running-bill-${restaurantId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
                () => fetchOrders(restaurantId))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' },
                () => fetchOrders(restaurantId))
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [restaurantId, fetchOrders]);

    // ── ticker to refresh elapsed times ──
    useEffect(() => {
        timerRef.current = setInterval(() => setOrders(o => [...o]), 30000);
        return () => clearInterval(timerRef.current);
    }, []);

    // ── 3. Checkout Logic: update payment_status to 'paid' ──
    async function handleCloseBill(orderIds) {
        await supabase.from('orders').update({ payment_status: 'paid' }).in('id', orderIds);
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

                <main className="flex-1 p-6 overflow-y-auto relative">
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
                                    dynamicCharges={dynamicCharges}
                                    onCloseBill={handleCloseBill}
                                    onPrintTrigger={triggerPrint}
                                />
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {/* Visually Hidden Print Component */}
            <div style={{ display: 'none' }}>
                <PrintableRunningBill ref={printComponentRef} data={selectedBillForPrint} restaurant={restaurant} />
            </div>
        </div>
    );
}
