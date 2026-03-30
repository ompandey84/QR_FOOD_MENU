import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { FiUsers, FiClock, FiTrash2, FiEdit2, FiCheck, FiX } from 'react-icons/fi';

export default function TablesPage() {
    const navigate = useNavigate();
    const [restaurantId, setRestaurantId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tablesData, setTablesData] = useState([]);
    const [activeFilter, setActiveFilter] = useState('all');
    const [tableCount, setTableCount] = useState(12);
    const [seatsMap, setSeatsMap] = useState({});
    const [editingSeats, setEditingSeats] = useState(null); // table number being edited
    const [editSeatsValue, setEditSeatsValue] = useState('');
    const [deletingTable, setDeletingTable] = useState(null);

    const fetchStatus = useCallback(async (count, restId) => {
        const { data: orders } = await supabase
            .from('orders')
            .select('id, table_number, status, total, created_at')
            .eq('restaurant_id', restId)
            .not('status', 'eq', 'completed');

        const tableMap = new Map();
        for (let i = 1; i <= count; i++) {
            tableMap.set(i.toString(), { number: i, status: 'available', order: null });
        }

        if (orders) {
            orders.forEach(order => {
                if (Number(order.total) === 0) return;
                // CRITICAL: DB returns table_number as integer, Map keys are strings — must coerce
                const tableStr = String(order.table_number);
                if (tableMap.has(tableStr)) {
                    tableMap.set(tableStr, { number: parseInt(tableStr, 10), status: 'occupied', order });
                }
            });
        }
        setTablesData(Array.from(tableMap.values()));
        setLoading(false);
    }, []);

    useEffect(() => {
        let subscription;
        async function loadTables() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return navigate('/login');
            const { data: rest } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).single();
            if (!rest) return;
            setRestaurantId(rest.id);

            let count = 12;
            const savedCount = localStorage.getItem(`tableCount_${rest.id}`);
            if (savedCount) count = parseInt(savedCount, 10);
            setTableCount(count);

            const savedSeats = JSON.parse(localStorage.getItem(`tableSeats_${rest.id}`) || '{}');
            setSeatsMap(savedSeats);

            await fetchStatus(count, rest.id);

            subscription = supabase
                .channel('public:orders:tables')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${rest.id}` }, () => fetchStatus(count, rest.id))
                .subscribe();
        }

        loadTables();
        return () => { if (subscription) supabase.removeChannel(subscription); };
    }, [navigate, fetchStatus]);

    const startEditSeats = (tableNumber, currentSeats) => {
        setEditingSeats(tableNumber);
        setEditSeatsValue(String(currentSeats));
    };

    const commitEditSeats = (tableNumber) => {
        const val = parseInt(editSeatsValue, 10);
        if (!isNaN(val) && val > 0) {
            const updated = { ...seatsMap, [tableNumber]: val };
            setSeatsMap(updated);
            localStorage.setItem(`tableSeats_${restaurantId}`, JSON.stringify(updated));
        }
        setEditingSeats(null);
    };

    const handleDeleteTable = (tableNumber) => {
        if (tablesData.find(t => t.number === tableNumber)?.status === 'occupied') {
            alert('Cannot delete an occupied table. Please clear the order first.');
            return;
        }
        setDeletingTable(tableNumber);
    };

    const confirmDeleteTable = () => {
        const tableToDelete = deletingTable;
        // Remove the table from the top: reduce count, remap seats
        const newCount = tableCount - 1;
        const newSeats = { ...seatsMap };
        delete newSeats[tableToDelete];
        // Re-number: shift tables above the deleted one down
        const reNumbered = {};
        Object.entries(newSeats).forEach(([k, v]) => {
            const n = parseInt(k);
            reNumbered[n > tableToDelete ? String(n - 1) : k] = v;
        });
        setSeatsMap(reNumbered);
        setTableCount(newCount);
        localStorage.setItem(`tableCount_${restaurantId}`, newCount);
        localStorage.setItem(`tableSeats_${restaurantId}`, JSON.stringify(reNumbered));
        setDeletingTable(null);
        // Re-fetch status with new count
        if (restaurantId) fetchStatus(newCount, restaurantId);
    };

    const getElapsedTime = (createdAt) => {
        const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
        return mins < 1 ? 'Just now' : `${mins}m`;
    };

    const filteredTables = tablesData.filter(t => {
        if (activeFilter === 'all') return true;
        return t.status === activeFilter;
    });

    const occupiedCount = tablesData.filter(t => t.status === 'occupied').length;
    const availableCount = tableCount - occupiedCount;

    return (
        <MainLayout
            activeLink="Tables"
            title={
                <div>
                    <span className="block pr-4">Live Floor Plan</span>
                    <span className="block text-xs text-slate-400 font-medium font-normal mt-0.5">Real-time table status · Click seat count to edit</span>
                </div>
            }
            topNavChildren={
                    <div className="flex items-center gap-4 max-w-full overflow-x-auto no-scrollbar">
                        <div className="flex items-center gap-2 bg-red-50 border border-red-100 px-3 py-1.5 rounded-xl whitespace-nowrap">
                            <span className="w-2.5 h-2.5 bg-red-400 rounded-full animate-pulse" />
                            <span className="text-sm font-black text-red-600">{occupiedCount} Occupied</span>
                        </div>
                        <div className="flex items-center gap-2 bg-green-50 border border-green-100 px-3 py-1.5 rounded-xl whitespace-nowrap">
                            <span className="w-2.5 h-2.5 bg-green-400 rounded-full" />
                            <span className="text-sm font-black text-green-600">{availableCount} Available</span>
                        </div>
                    </div>
            }
        >
                <main className="p-6 lg:p-8 space-y-6">
                    {/* Filters */}
                    <div className="flex items-center justify-between">
                        <div className="flex gap-2 bg-white p-1 rounded-xl w-fit border border-[#F4F2E6] shadow-sm">
                            {[{ id: 'all', label: `All (${tableCount})` }, { id: 'available', label: `Available (${availableCount})` }, { id: 'occupied', label: `Occupied (${occupiedCount})` }].map(f => (
                                <button key={f.id} onClick={() => setActiveFilter(f.id)}
                                    className={`text-xs font-black px-4 py-2.5 rounded-lg transition-all ${activeFilter === f.id ? 'bg-primary text-charcoal shadow-sm' : 'text-slate-400 hover:text-charcoal'}`}>
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Delete Confirmation Modal */}
                    {deletingTable && (
                        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                            <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-sm mx-4">
                                <h3 className="text-lg font-black text-charcoal mb-2">Delete Table {deletingTable}?</h3>
                                <p className="text-sm text-slate-500 mb-6">This will permanently remove Table {deletingTable} from your floor plan.</p>
                                <div className="flex gap-3">
                                    <button onClick={() => setDeletingTable(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">Cancel</button>
                                    <button onClick={confirmDeleteTable} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-black text-sm hover:bg-red-600 transition-colors">Delete Table</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tables Grid */}
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {filteredTables.map(table => {
                                const isOccupied = table.status === 'occupied';
                                const seats = seatsMap[table.number] || 4;

                                return (
                                    <div key={table.number} className={`rounded-2xl border-2 p-4 flex flex-col relative transition-all ${isOccupied ? 'bg-charcoal border-charcoal text-white' : 'bg-white border-[#F4F2E6] text-charcoal hover:border-primary/40 hover:shadow-md'}`}>
                                        {/* Status dot + Delete button */}
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`w-2 h-2 rounded-full ${isOccupied ? 'bg-orange-400 animate-pulse' : 'bg-green-400'}`} />
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${isOccupied ? 'text-white/50' : 'text-slate-400'}`}>{table.status}</span>
                                            </div>
                                            {!isOccupied && (
                                                <button onClick={() => handleDeleteTable(table.number)} className="text-slate-300 hover:text-red-400 transition-colors" title="Delete Table">
                                                    <FiTrash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Table Number */}
                                        <div className="flex-1 flex items-center justify-center py-3">
                                            <h2 className="text-5xl font-black tracking-tighter opacity-90">{table.number}</h2>
                                        </div>

                                        {/* Bottom row */}
                                        {isOccupied && table.order ? (
                                            <div className="border-t border-white/10 pt-2 flex justify-between items-center text-xs">
                                                <span className="flex items-center gap-1 text-white/50 font-bold">
                                                    <FiClock className="w-3 h-3" />{getElapsedTime(table.order.created_at)}
                                                </span>
                                                <span className="font-black text-primary">₹{table.order.total}</span>
                                            </div>
                                        ) : (
                                            <div className="border-t border-slate-100 pt-2 flex justify-between items-center">
                                                {editingSeats === table.number ? (
                                                    <div className="flex items-center gap-1 w-full">
                                                        <FiUsers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                        <input
                                                            type="number" min="1" max="20"
                                                            value={editSeatsValue}
                                                            onChange={e => setEditSeatsValue(e.target.value)}
                                                            className="w-12 text-xs font-bold border border-primary rounded-lg px-1.5 py-0.5 focus:outline-none text-charcoal"
                                                            autoFocus
                                                            onKeyDown={e => { if (e.key === 'Enter') commitEditSeats(table.number); if (e.key === 'Escape') setEditingSeats(null); }}
                                                        />
                                                        <button onClick={() => commitEditSeats(table.number)} className="text-green-500 hover:text-green-600"><FiCheck className="w-3.5 h-3.5" /></button>
                                                        <button onClick={() => setEditingSeats(null)} className="text-red-400 hover:text-red-500"><FiX className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
                                                            <FiUsers className="w-3 h-3" /> {seats} seats
                                                        </span>
                                                        <button onClick={() => startEditSeats(table.number, seats)} className="text-slate-300 hover:text-primary transition-colors" title="Edit Capacity">
                                                            <FiEdit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>
        </MainLayout>
    );
}
