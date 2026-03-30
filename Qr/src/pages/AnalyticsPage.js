import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { FiDownload, FiTrendingUp, FiShoppingBag, FiDollarSign, FiClock, FiCheckCircle, FiAlertCircle, FiBell, FiX } from 'react-icons/fi';
import MainLayout from '../components/MainLayout';
import Shimmer from '../components/Shimmer';
import { useSubscription } from '../hooks/useSubscription';
import PlanGate from '../components/PlanGate';

// ... (skip down to AnalyticsPage component)
function StatCard({ icon, label, value, sub, color = 'primary' }) {
    const colors = {
        primary: 'from-yellow-50 to-yellow-100 border-yellow-200',
        green: 'from-green-50 to-green-100 border-green-200',
        blue: 'from-blue-50 to-blue-100 border-blue-200',
        red: 'from-red-50 to-red-100 border-red-200',
    };
    const iconColors = {
        primary: 'bg-yellow-400 text-charcoal',
        green: 'bg-green-500 text-white',
        blue: 'bg-blue-500 text-white',
        red: 'bg-red-400 text-white',
    };
    return (
        <div className={`rounded-2xl border bg-gradient-to-br p-3 sm:p-5 ${colors[color]}`}>
            <div className="flex items-start justify-between mb-2 sm:mb-4">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${iconColors[color]}`}>
                    {icon}
                </div>
            </div>
            <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest leading-tight">{label}</p>
            <p className="text-2xl sm:text-3xl font-black tracking-tight mt-1 text-charcoal">{value}</p>
            {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
    );
}

function TopDishRow({ rank, name, orders, revenue }) {
    return (
        <div className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-charcoal text-xs font-black flex items-center justify-center shrink-0">{rank}</span>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-charcoal truncate">{name}</p>
                <p className="text-xs text-slate-400">{orders} orders</p>
            </div>
            <span className="text-sm font-black text-charcoal">₹{revenue.toFixed(0)}</span>
        </div>
    );
}

function RecentOrderRow({ order }) {
    const statusColors = {
        pending: 'bg-yellow-100 text-yellow-700',
        preparing: 'bg-blue-100 text-blue-700',
        ready: 'bg-purple-100 text-purple-700',
        completed: 'bg-green-100 text-green-700',
        cancelled: 'bg-red-100 text-red-600',
    };
    return (
        <div className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-charcoal font-black text-xs">T{order.table_number || '?'}</div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-charcoal truncate">{order.customer_name}</p>
                <p className="text-xs text-slate-400">{new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <div className="text-right">
                <p className="text-sm font-black text-charcoal">₹{Number(order.total).toFixed(0)}</p>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg ${statusColors[order.status] || 'bg-slate-100 text-slate-500'}`}>{order.status}</span>
            </div>
        </div>
    );
}

// Shimmer skeleton for dashboard
function DashboardShimmer() {
    return (
        <div className="space-y-6 lg:space-y-8 animate-pulse">
            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="rounded-2xl border border-slate-100 bg-white p-5">
                        <Shimmer className="w-10 h-10 rounded-xl mb-4" />
                        <Shimmer className="h-3 w-20 rounded mb-2" />
                        <Shimmer className="h-8 w-24 rounded" />
                    </div>
                ))}
            </div>
            {/* Content cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6">
                    <Shimmer className="h-6 w-40 rounded mb-4" />
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="flex items-center gap-3 py-3 border-b border-slate-50">
                            <Shimmer className="w-9 h-9 rounded-xl" />
                            <div className="flex-1 space-y-2">
                                <Shimmer className="h-4 w-28 rounded" />
                                <Shimmer className="h-3 w-16 rounded" />
                            </div>
                            <Shimmer className="h-4 w-12 rounded" />
                        </div>
                    ))}
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                    <Shimmer className="h-6 w-32 rounded mb-4" />
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-3 py-3 border-b border-slate-50">
                            <Shimmer className="w-6 h-6 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Shimmer className="h-4 w-24 rounded" />
                                <Shimmer className="h-3 w-16 rounded" />
                            </div>
                            <Shimmer className="h-4 w-12 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function AnalyticsPage() {
    const navigate = useNavigate();
    const [metrics, setMetrics] = useState({ totalRevenue: 0, totalOrders: 0, avgOrderValue: 0, completedOrders: 0, pendingOrders: 0 });
    const [topDishes, setTopDishes] = useState([]);
    const [recentOrders, setRecentOrders] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [showNotif, setShowNotif] = useState(false);
    const [loading, setLoading] = useState(true);
    const [allOrders, setAllOrders] = useState([]);
    const [isAccepting, setIsAccepting] = useState(true);
    const [restaurantId, setRestaurantId] = useState(null);
    
    const { limits, plan } = useSubscription(restaurantId);

    const loadMetrics = useCallback(async (restId) => {
        const { data: orders } = await supabase.from('orders').select('*, order_items(*)').eq('restaurant_id', restId).order('created_at', { ascending: false });
        const valid = (orders || []).filter(o => Number(o.total) > 0);

        setAllOrders(valid);
        setRecentOrders(valid.slice(0, 8));

        const completed = valid.filter(o => o.status === 'completed');
        const pending = valid.filter(o => o.status === 'pending' || o.status === 'preparing' || o.status === 'ready');
        const totalRev = completed.reduce((s, o) => s + Number(o.total), 0);

        setMetrics({
            totalRevenue: totalRev,
            totalOrders: valid.length,
            avgOrderValue: completed.length > 0 ? totalRev / completed.length : 0,
            completedOrders: completed.length,
            pendingOrders: pending.length,
        });

        const dishMap = {};
        valid.forEach(order => {
            (order.order_items || []).forEach(item => {
                if (!dishMap[item.name]) dishMap[item.name] = { orders: 0, revenue: 0 };
                dishMap[item.name].orders += item.quantity;
                dishMap[item.name].revenue += Number(item.price) * item.quantity;
            });
        });
        const sorted = Object.entries(dishMap)
            .map(([name, v]) => ({ name, ...v }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
        setTopDishes(sorted);

        const notifOrders = valid.filter(o => o.status === 'pending').slice(0, 5);
        setNotifications(notifOrders.map(o => ({
            id: o.id,
            title: `New order from ${o.customer_name}`,
            sub: `Table ${o.table_number} · ₹${Number(o.total).toFixed(0)}`,
            time: new Date(o.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        })));
    }, []);

    useEffect(() => {
        let sub;
        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return navigate('/login');
            const { data: rest } = await supabase.from('restaurants').select('id, is_accepting_orders').eq('owner_id', user.id).single();
            if (!rest) return;
            setRestaurantId(rest.id);
            setIsAccepting(rest.is_accepting_orders ?? true);
            await loadMetrics(rest.id);
            setLoading(false);
            sub = supabase.channel('analytics-live')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${rest.id}` }, () => loadMetrics(rest.id))
                .subscribe();
        }
        init();
        return () => { if (sub) supabase.removeChannel(sub); };
    }, [navigate, loadMetrics]);

    const handleToggleAccepting = async () => {
        const newVal = !isAccepting;
        setIsAccepting(newVal);
        const { error } = await supabase.from('restaurants').update({ is_accepting_orders: newVal }).eq('id', restaurantId);
        if (error) { setIsAccepting(!newVal); }
    };

    const handleExport = () => {
        if (!allOrders.length) return alert('No orders to export.');
        const rows = [['Order ID', 'Customer', 'Table', 'Total', 'Status', 'Date']];
        allOrders.forEach(o => rows.push([o.id, o.customer_name, o.table_number, o.total, o.status, new Date(o.created_at).toLocaleString('en-IN')]));
        const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'orders_report.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    const unreadCount = notifications.length;

    return (
        <MainLayout 
            activeLink="Dashboard" 
            title="Analytics Dashboard"
            topNavChildren={
                <div className="flex items-center gap-3">
                    <button onClick={handleExport}
                        className="flex items-center gap-2 bg-primary text-charcoal font-black text-sm px-4 py-2 rounded-xl hover:bg-primary/80 transition-all shadow-sm">
                        <FiDownload className="w-4 h-4" /> Export CSV
                    </button>
                    <div className="relative">
                        <button onClick={() => setShowNotif(v => !v)}
                            className="relative p-2.5 rounded-xl bg-slate-50 text-slate-500 hover:text-primary transition-all border border-slate-100">
                            <FiBell className="w-5 h-5" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">{unreadCount}</span>
                            )}
                        </button>
                        {showNotif && (
                            <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
                                <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                                    <h3 className="font-black text-charcoal">Pending Orders</h3>
                                    <button onClick={() => setShowNotif(false)}><FiX className="w-4 h-4 text-slate-400" /></button>
                                </div>
                                <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                                    {notifications.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400 text-sm">No pending orders 🎉</div>
                                    ) : notifications.map(n => (
                                        <div key={n.id} className="p-4 flex gap-3 hover:bg-slate-50 cursor-pointer" onClick={() => { navigate('/orders'); setShowNotif(false); }}>
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                <FiAlertCircle className="text-primary w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-charcoal">{n.title}</p>
                                                <p className="text-xs text-slate-400">{n.sub} · {n.time}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-3 bg-slate-50 text-center">
                                    <button onClick={() => { navigate('/orders'); setShowNotif(false); }} className="text-xs font-bold text-primary hover:underline">View All Orders →</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            }
        >
            <main className="p-4 lg:p-8 pb-32 lg:pb-8 space-y-6 lg:space-y-8">
                {/* Title + Accepting Orders Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-3xl font-black tracking-tight text-charcoal">Good to see you! 👋</h2>
                            {plan && (
                                <span className="text-xs bg-primary/20 text-charcoal px-3 py-1 rounded-full uppercase tracking-widest font-black border border-primary/30 shadow-sm mt-1">
                                    {plan} Plan
                                </span>
                            )}
                        </div>
                        <p className="text-slate-400 mt-1 font-medium">Here's a live overview of your restaurant's performance.</p>
                    </div>
                    {/* Accepting Orders Toggle */}
                    <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-100 shadow-sm">
                        <div className={`w-3 h-3 rounded-full ${isAccepting ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                        <span className={`text-sm font-bold ${isAccepting ? 'text-green-600' : 'text-slate-500'}`}>
                            {isAccepting ? 'Accepting Orders' : 'Orders Paused'}
                        </span>
                        <button
                            onClick={handleToggleAccepting}
                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${isAccepting ? 'bg-green-500' : 'bg-slate-300'}`}
                        >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${isAccepting ? 'translate-x-[22px]' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>

                {loading ? <DashboardShimmer /> : (<>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                        <StatCard icon={<FiDollarSign className="w-5 h-5" />} label="Total Revenue" value={`₹${metrics.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} sub="From completed orders" color="primary" />
                        <StatCard icon={<FiShoppingBag className="w-5 h-5" />} label="Total Orders" value={metrics.totalOrders} sub={`${metrics.completedOrders} completed`} color="green" />
                        <StatCard icon={<FiTrendingUp className="w-5 h-5" />} label="Avg Order Value" value={`₹${metrics.avgOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} sub="Per completed order" color="blue" />
                        <StatCard icon={<FiClock className="w-5 h-5" />} label="Pending Orders" value={metrics.pendingOrders} sub="Need attention" color="red" />
                    </div>

                    {/* Main Content Grid */}
                    <PlanGate 
                        isAllowed={limits.hasAnalytics} 
                        featureName="Analytics Dashboard"
                        currentPlan={plan}
                        restaurantId={restaurantId}
                    >
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Recent Orders */}
                            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-black text-charcoal">Recent Orders</h3>
                                    <button onClick={() => navigate('/orders')} className="text-xs font-bold text-primary hover:underline">View All →</button>
                                </div>
                                {recentOrders.length === 0 ? (
                                    <div className="h-48 flex flex-col items-center justify-center text-slate-400">
                                        <FiShoppingBag className="w-10 h-10 mb-2 opacity-30" />
                                        <p className="text-sm">No orders yet. Your orders will appear here.</p>
                                    </div>
                                ) : recentOrders.map(o => <RecentOrderRow key={o.id} order={o} />)}
                            </div>

                            {/* Top Dishes */}
                            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-black text-charcoal">Top Dishes</h3>
                                </div>
                                {topDishes.length === 0 ? (
                                    <div className="h-48 flex flex-col items-center justify-center text-slate-400">
                                        <p className="text-sm text-center">Top dishes will appear after customers start ordering.</p>
                                    </div>
                                ) : topDishes.map((d, i) => <TopDishRow key={d.name} rank={i + 1} name={d.name} orders={d.orders} revenue={d.revenue} />)}
                            </div>
                        </div>
                    </PlanGate>

                    {/* Fixed Bottom Bar */}
                    <div className="fixed bottom-0 left-0 right-0 w-full z-50 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] p-3 pb-6 md:pb-3 lg:static lg:bg-transparent lg:shadow-none lg:p-0">
                        <div className="grid grid-cols-3 gap-2 lg:gap-4 max-w-7xl mx-auto">
                            {[
                                { label: 'Pending', count: metrics.pendingOrders, icon: <FiClock />, color: 'border-yellow-200 bg-yellow-50 text-yellow-700' },
                                { label: 'Completed', count: metrics.completedOrders, icon: <FiCheckCircle />, color: 'border-green-200 bg-green-50 text-green-700' },
                                { label: 'All Orders', count: metrics.totalOrders, icon: <FiShoppingBag />, color: 'border-blue-200 bg-blue-50 text-blue-700' },
                            ].map(s => (
                                <div key={s.label} className={`rounded-xl lg:rounded-2xl border p-2 lg:p-5 ${s.color} flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-4 text-center lg:text-left`}>
                                    <div className="text-xl lg:text-2xl">{s.icon}</div>
                                    <div>
                                        <p className="text-xl lg:text-2xl font-black leading-none">{s.count}</p>
                                        <p className="text-[9px] lg:text-xs font-bold uppercase tracking-widest opacity-70 mt-1 lg:mt-0">{s.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>)}
            </main>
        </MainLayout>
    );
}
