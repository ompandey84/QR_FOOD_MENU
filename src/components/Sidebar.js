import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { HiOutlineChartBar, HiOutlineCollection, HiOutlineCog } from 'react-icons/hi';
import { FiShoppingBag, FiMaximize } from 'react-icons/fi';
import { MdOutlineTableRestaurant, MdOutlineRedeem, MdOutlineKitchen, MdOutlineReceipt } from 'react-icons/md';
import { BsCalendarCheck } from 'react-icons/bs';

function Sidebar({ active, isMobileOpen: propIsMobileOpen, setIsMobileOpen: propSetIsMobileOpen }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [pendingCount, setPendingCount] = useState(0);
    const [kitchenCount, setKitchenCount] = useState(0);
    const [userName, setUserName] = useState('Owner');
    
    // Internal state fallback for pages using CustomEvent
    const [internalMobileOpen, setInternalMobileOpen] = useState(false);
    
    // Derived state determining whether to use controlled props or internal state
    const isMobileOpen = propIsMobileOpen !== undefined ? propIsMobileOpen : internalMobileOpen;
    const setIsMobileOpen = propSetIsMobileOpen || setInternalMobileOpen;

    useEffect(() => {
        const handleOpen = () => setIsMobileOpen(true);
        window.addEventListener('open-sidebar', handleOpen);
        return () => window.removeEventListener('open-sidebar', handleOpen);
    }, []);

    useEffect(() => {
        let subscription;

        async function fetchInitialCount() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get display name
            setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Owner');

            const { data: rest } = await supabase
                .from('restaurants')
                .select('id')
                .eq('owner_id', user.id)
                .single();

            if (!rest) return;

            const { count } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('restaurant_id', rest.id)
                .eq('status', 'pending');

            setPendingCount(count || 0);

            // Also count kitchen-active orders (pending + preparing)
            const { count: kitCount } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('restaurant_id', rest.id)
                .in('status', ['pending', 'preparing']);
            setKitchenCount(kitCount || 0);

            subscription = supabase
                .channel('sidebar-pending')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${rest.id}` }, async () => {
                    const { count: c } = await supabase
                        .from('orders')
                        .select('*', { count: 'exact', head: true })
                        .eq('restaurant_id', rest.id)
                        .eq('status', 'pending');
                    setPendingCount(c || 0);
                    const { count: kc } = await supabase
                        .from('orders')
                        .select('*', { count: 'exact', head: true })
                        .eq('restaurant_id', rest.id)
                        .in('status', ['pending', 'preparing']);
                    setKitchenCount(kc || 0);
                })
                .subscribe();
        }

        fetchInitialCount();

        return () => {
            if (subscription) supabase.removeChannel(subscription);
        };
    }, []);

    const navItems = [
        { name: 'Dashboard', icon: HiOutlineChartBar, path: '/dashboard' },
        { name: 'Menu Management', icon: HiOutlineCollection, path: '/menu-manager' },
        { name: 'Offers', icon: MdOutlineRedeem, path: '/offers' },
        { name: 'Orders', icon: FiShoppingBag, path: '/orders', badge: pendingCount },
        { name: 'Kitchen', icon: MdOutlineKitchen, path: '/kitchen', badge: kitchenCount },
        { name: 'Running Bill', icon: MdOutlineReceipt, path: '/running-bill' },
        { name: 'Reservations', icon: BsCalendarCheck, path: '/reservations' },
        { name: 'QR Codes', icon: FiMaximize, path: '/qr-codes' },
        { name: 'Tables', icon: MdOutlineTableRestaurant, path: '/tables' },
        { name: 'Settings', icon: HiOutlineCog, path: '/settings' },
    ];

    return (
        <>
            {/* Mobile Backdrop */}
            {isMobileOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/40 z-[990] lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            <aside className={`
                fixed inset-y-0 left-0 z-[999] w-64 bg-white border-r border-[#F4F2E6] flex flex-col h-full
                transform transition-transform duration-300 ease-in-out shadow-2xl
                lg:static lg:translate-x-0 lg:shadow-none lg:z-50 lg:h-screen lg:sticky lg:top-0
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
            {/* Logo Section */}
            <div className="px-6 py-8 flex items-center gap-3">
                <div className="w-10 h-10 bg-charcoal rounded-2xl flex items-center justify-center text-primary transform rotate-12">
                    <span className="material-symbols-outlined font-bold text-xl -rotate-12">restaurant_menu</span>
                </div>
                <div className="flex flex-col">
                    <h2 className="text-lg font-black tracking-tight text-charcoal leading-none">SmartMenu</h2>
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider mt-1 uppercase">Admin Console</span>
                </div>
            </div>

            {/* Navigation items */}
            <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    // Use URL path matching for reliable highlighting
                    const isActive = location.pathname === item.path;
                    return (
                        <button
                            key={item.name}
                            onClick={() => {
                                setIsMobileOpen(false); // auto-close on mobile
                                navigate(item.path);
                            }}
                            className={`w-full group flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200
                                ${isActive
                                    ? 'bg-primary text-charcoal shadow-sm'
                                    : 'text-slate-500 hover:bg-[#FCFAF5] hover:text-charcoal'}`}
                        >
                            <div className="flex items-center gap-3">
                                <Icon className={`w-5 h-5 ${isActive ? 'text-charcoal' : 'text-slate-400 group-hover:text-charcoal'}`} />
                                <span className={`text-sm tracking-tight ${isActive ? 'font-black' : 'font-semibold'}`}>
                                    {item.name}
                                </span>
                            </div>
                            {item.badge > 0 && (
                                <span className="bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Bottom Profile Info */}
            <div className="p-4 border-t border-[#F4F2E6]">
                <div className="p-4 bg-[#FCFAF5] rounded-2xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                        <span className="material-symbols-outlined text-primary">person</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-xs font-black text-charcoal truncate capitalize">{userName}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Owner</span>
                    </div>
                </div>
            </div>
        </aside>
        </>
    );
}

export default Sidebar;
