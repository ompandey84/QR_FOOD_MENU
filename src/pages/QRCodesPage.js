import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { FiDownload, FiPrinter, FiTrash2, FiPlus } from 'react-icons/fi';
import MainLayout from '../components/MainLayout';

export default function QRCodesPage() {
    const navigate = useNavigate();
    const [restaurantId, setRestaurantId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tableCount, setTableCount] = useState(12);
    // Deleted tables tracked locally
    const [deletedTables, setDeletedTables] = useState([]);
    const [confirmDelete, setConfirmDelete] = useState(null);

    useEffect(() => {
        async function loadData() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return navigate('/login');
            const { data: rest } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).single();
            if (!rest) return;
            setRestaurantId(rest.id);
            const savedCount = localStorage.getItem(`tableCount_${rest.id}`);
            if (savedCount) setTableCount(parseInt(savedCount, 10));
            const savedDeleted = JSON.parse(localStorage.getItem(`deletedQRTables_${rest.id}`) || '[]');
            setDeletedTables(savedDeleted);
            setLoading(false);
        }
        loadData();
    }, [navigate]);

    const handleUpdateTableCount = (newCount) => {
        const count = Math.max(1, parseInt(newCount, 10) || 1);
        setTableCount(count);
        localStorage.setItem(`tableCount_${restaurantId}`, count);
        // Also update TablesPage
    };

    const handleAddTable = () => {
        const newCount = tableCount + 1;
        setTableCount(newCount);
        localStorage.setItem(`tableCount_${restaurantId}`, newCount);
        // Remove from deleted if previously deleted
        const updated = deletedTables.filter(t => t !== newCount);
        setDeletedTables(updated);
        localStorage.setItem(`deletedQRTables_${restaurantId}`, JSON.stringify(updated));
    };

    const requestDelete = (tableNumber) => setConfirmDelete(tableNumber);

    const confirmDeleteQR = () => {
        const updated = [...deletedTables, confirmDelete].sort((a, b) => a - b);
        setDeletedTables(updated);
        localStorage.setItem(`deletedQRTables_${restaurantId}`, JSON.stringify(updated));
        // Decrease total table count
        const newCount = tableCount - 1;
        setTableCount(newCount);
        localStorage.setItem(`tableCount_${restaurantId}`, newCount);
        setConfirmDelete(null);
    };

    const visibleTables = Array.from({ length: tableCount + deletedTables.length }, (_, i) => i + 1)
        .filter(n => !deletedTables.includes(n))
        .slice(0, tableCount);

    const getMenuUrl = (tableNumber) => `${window.location.origin}/menu/${restaurantId}?table=${tableNumber}`;

    const downloadQR = (tableNumber) => {
        const svgEl = document.getElementById(`qr-svg-${tableNumber}`)?.querySelector('svg');
        if (!svgEl) return;
        const svgData = new XMLSerializer().serializeToString(svgEl);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `table-${tableNumber}-qr.svg`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <MainLayout 
            activeLink="QR Codes"
            title={
                <div>
                    <span className="block">Table QR Codes</span>
                    <span className="block text-xs text-slate-400 font-medium font-normal mt-0.5">Print and place on tables · {visibleTables.length} QR codes</span>
                </div>
            }
            topNavChildren={
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 hidden sm:flex">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tables:</label>
                        <input
                            type="number" min="1" max="100" value={tableCount}
                            onChange={e => handleUpdateTableCount(e.target.value)}
                            className="w-14 bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold text-charcoal text-center focus:outline-none focus:border-primary"
                        />
                    </div>
                    <button onClick={handleAddTable} className="flex items-center gap-2 bg-primary text-charcoal font-black text-sm px-4 py-2.5 rounded-xl hover:bg-primary/80 transition-all shadow-sm">
                        <FiPlus className="w-4 h-4" /> Add Table
                    </button>
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm text-sm">
                        <FiPrinter className="w-4 h-4" /> Print All
                    </button>
                </div>
            }
        >

                {/* Delete Confirmation Modal */}
                {confirmDelete && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                        <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-sm mx-4">
                            <h3 className="text-lg font-black text-charcoal mb-2">Delete Table {confirmDelete} QR?</h3>
                            <p className="text-sm text-slate-500 mb-6">This will remove the QR code for Table {confirmDelete}. Customers won't be able to scan it.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50">Cancel</button>
                                <button onClick={confirmDeleteQR} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-black text-sm hover:bg-red-600">Delete QR</button>
                            </div>
                        </div>
                    </div>
                )}

                <main className="p-6 lg:p-8">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 print:hidden">
                            {visibleTables.map(table => (
                                <div key={table} className="bg-white p-6 rounded-2xl border border-[#F4F2E6] shadow-sm flex flex-col items-center group hover:border-primary/30 hover:shadow-md transition-all relative">
                                    {/* Delete button */}
                                    <button
                                        onClick={() => requestDelete(table)}
                                        className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                        title="Delete this QR code"
                                    >
                                        <FiTrash2 className="w-4 h-4" />
                                    </button>

                                    <div className="w-full flex justify-between items-center mb-4">
                                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Dine-in</span>
                                        <span className="text-base font-black text-charcoal bg-[#FCFAF5] px-3 py-1 rounded-lg">Table {table}</span>
                                    </div>

                                    <div id={`qr-svg-${table}`} className="p-3 bg-white border-2 border-slate-100 rounded-xl mb-4 shadow-sm group-hover:border-primary/20 transition-colors">
                                        <QRCodeSVG
                                            value={getMenuUrl(table)}
                                            size={150}
                                            level="Q"
                                            includeMargin={true}
                                            fgColor="#1c1a0d"
                                        />
                                    </div>

                                    <p className="text-[10px] text-slate-400 text-center mb-4 px-2 truncate w-full">
                                        {getMenuUrl(table)}
                                    </p>

                                    <button
                                        onClick={() => downloadQR(table)}
                                        className="w-full py-2.5 rounded-xl bg-[#FCFAF5] text-slate-600 font-bold hover:bg-primary hover:text-charcoal transition-colors flex items-center justify-center gap-2 text-sm"
                                    >
                                        <FiDownload className="w-4 h-4" /> Download SVG
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </main>

                {/* Print Layout */}
                <div className="hidden print:grid grid-cols-2 gap-8 p-8 bg-white">
                    {visibleTables.map(table => (
                        <div key={`print-${table}`} className="border-4 border-charcoal p-8 flex flex-col items-center justify-center rounded-3xl break-inside-avoid mb-8 h-[500px]">
                            <h2 className="text-4xl font-black text-charcoal mb-2 uppercase tracking-wide">SmartMenu</h2>
                            <p className="text-lg font-bold text-slate-500 mb-12">Scan to Order</p>
                            <QRCodeSVG value={getMenuUrl(table)} size={240} level="H" includeMargin={true} fgColor="#1c1a0d" />
                            <div className="mt-12 bg-charcoal text-white text-3xl font-black px-12 py-4 rounded-full">TABLE {table}</div>
                        </div>
                    ))}
                </div>
                </div>
        </MainLayout>
    );
}
