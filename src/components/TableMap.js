import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { MdTableRestaurant, MdTimer, MdCurrencyRupee, MdOutlineEventAvailable } from 'react-icons/md';

/**
 * Live Table Map Component
 * Represents 15 tables with real-time occupancy and billing status.
 */
const TableMap = () => {
  const [tables, setTables] = useState([]);
  const [activeOrders, setActiveOrders] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // 1. Generate static array of 15 tables
  const staticTables = Array.from({ length: 15 }, (_, i) => ({
    id: i + 1,
    table_number: (i + 1).toString(),
  }));

  // Helper to format duration
  const getDuration = (createdAt) => {
    const diff = Math.floor((currentTime - new Date(createdAt)) / 1000);
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return `${mins}m ${secs}s`;
  };

  // 2. Fetch Initial Data
  const fetchActiveOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, table_number, total, status, created_at')
        .neq('status', 'completed'); // Active orders (pending, preparing, etc.)

      if (error) throw error;

      // Map orders to table_number for quick lookup
      const orderMap = {};
      data.forEach((order) => {
        orderMap[order.table_number] = order;
      });
      setActiveOrders(orderMap);
    } catch (err) {
      console.error('Error fetching active orders:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveOrders();

    // 3. Supabase Realtime Sync
    const channel = supabase
      .channel('live-table-map')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('Realtime update received:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const order = payload.new;
            setActiveOrders((prev) => {
              const next = { ...prev };
              if (order.status === 'completed') {
                delete next[order.table_number];
              } else {
                next[order.table_number] = order;
              }
              return next;
            });
          } else if (payload.eventType === 'DELETE') {
            const oldOrder = payload.old;
            setActiveOrders((prev) => {
              const next = { ...prev };
              // We need to find which table this order belonged to if old record is partial
              // In most cases, payload.old includes the primary key. 
              // Better to re-fetch if specific detail is missing, or manage by ID.
              // For simplicity, we filter by the ID if it was in our map.
              Object.keys(next).forEach(key => {
                if (next[key].id === oldOrder.id) {
                    delete next[key];
                }
              });
              return next;
            });
          }
        }
      )
      .subscribe();

    // Update timer every second
    const timerInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // 4. Cleanup
    return () => {
      supabase.removeChannel(channel);
      clearInterval(timerInterval);
    };
  }, [fetchActiveOrders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50/50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <MdTableRestaurant className="text-orange-500" />
              Live Table Map
            </h1>
            <p className="text-gray-500 text-sm">Real-time occupancy & billing status</p>
          </div>
          <div className="flex gap-4 text-xs font-semibold uppercase tracking-wider">
            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Available
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-full border border-orange-200">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              Occupied
            </div>
          </div>
        </header>

        {/* Grid Layout */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {staticTables.map((table) => {
            const order = activeOrders[table.table_number];
            const isOccupied = !!order;

            return (
              <motion.div
                key={table.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.05, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}
                whileTap={{ scale: 0.95 }}
                className={`
                  relative cursor-pointer rounded-2xl p-5 border-2 transition-colors duration-300 overflow-hidden
                  ${isOccupied 
                    ? 'bg-orange-50 border-orange-400 text-orange-900 ring-4 ring-orange-500/10' 
                    : 'bg-white border-green-200 text-gray-800 hover:border-green-400'}
                `}
                onClick={() => isOccupied && console.log('Order Details:', order)}
              >
                {/* Background Decor */}
                <div className={`absolute -right-4 -top-4 opacity-10 text-6xl rotate-12`}>
                   <MdTableRestaurant />
                </div>

                <div className="flex justify-between items-start mb-4">
                  <span className={`text-3xl font-black ${isOccupied ? 'text-orange-500' : 'text-gray-300'}`}>
                    {table.table_number.padStart(2, '0')}
                  </span>
                  {isOccupied && (
                    <div className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      Occupied
                    </div>
                  )}
                </div>

                {isOccupied ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 font-bold text-lg">
                      <MdCurrencyRupee className="text-orange-600" />
                      {parseFloat(order.total).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-orange-700">
                      <MdTimer className="text-sm animate-spin-slow" />
                      <span>{getDuration(order.created_at)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-2 flex flex-col items-center justify-center text-center">
                    <MdOutlineEventAvailable className="text-green-400 text-2xl mb-1" />
                    <span className="text-green-600 text-xs font-semibold uppercase tracking-tighter">
                      Available
                    </span>
                  </div>
                )}

                {/* Status Indicator */}
                <div className={`
                   absolute bottom-0 left-0 h-1 transition-all duration-500
                   ${isOccupied ? 'w-full bg-orange-500' : 'w-0 bg-green-500'}
                `} />
              </motion.div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default TableMap;
