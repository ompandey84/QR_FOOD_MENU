import React from 'react';

export default function PrintableReceipt({ order, restaurant }) {
    if (!order) return null;

    const formatDate = (dateString) => {
        const d = new Date(dateString);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="receipt-container w-full" style={{ fontFamily: "'Courier New', Courier, monospace", color: '#000', background: '#fff' }}>
            <style>
                {`
                @media print {
                    @page { margin: 0; }
                    body {
                        margin: 0;
                        padding: 0;
                        background: #fff !important;
                    }
                    * {
                        color: #000 !important;
                        box-shadow: none !important;
                    }
                    .receipt-container {
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 10px !important;
                    }
                }
                `}
            </style>

            {/* Header */}
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold uppercase mb-1 tracking-tight">{restaurant?.name || 'SmartMenu'}</h2>
                {restaurant?.address && <p className="whitespace-pre-wrap text-sm leading-tight mb-1">{restaurant.address}</p>}
                {restaurant?.phone && <p className="text-sm">Tel: {restaurant.phone}</p>}
            </div>

            {/* Order Details */}
            <div className="mb-4 pb-4 border-b-2 border-dashed border-black">
                <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-sm uppercase">Order #{order.id?.slice(0, 6)}</span>
                    {order.table_number && <span className="font-bold text-sm border border-black px-2 py-0.5">TABLE {order.table_number}</span>}
                </div>
                <div className="flex justify-between items-center text-xs mt-3">
                    <span className="font-bold">DATE:</span>
                    <span>{formatDate(order.created_at)}</span>
                </div>
                {order.customer_name && (
                    <div className="flex justify-between items-center text-xs mt-1">
                        <span className="font-bold">CUSTOMER:</span>
                        <span>{order.customer_name}</span>
                    </div>
                )}
            </div>

            {/* Items List */}
            <div className="mb-4">
                <div className="flex justify-between text-xs font-bold border-b border-black pb-2 mb-3">
                    <span className="flex-1">ITEM</span>
                    <span className="w-12 text-center">QTY</span>
                    <span className="w-20 text-right">AMT</span>
                </div>

                <div className="space-y-3">
                    {order.order_items?.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm items-start">
                            <span className="flex-1 pr-2 break-words font-semibold">{item.name}</span>
                            <span className="w-12 text-center font-bold">{item.quantity}</span>
                            <span className="w-20 text-right font-bold tabular-nums">₹{item.price * item.quantity}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Total Section */}
            <div className="border-t-2 border-dashed border-black pt-4 mb-6 mt-6">
                <div className="flex justify-between items-end font-bold">
                    <span className="text-xl tracking-widest">TOTAL</span>
                    <span className="text-2xl leading-none tabular-nums text-right">₹{Number(order.total).toFixed(0)}</span>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs font-bold uppercase tracking-widest pt-2">
                <p>*** THANK YOU! ***</p>
                <p className="mt-1">Please Visit Again</p>
            </div>
        </div>
    );
}
