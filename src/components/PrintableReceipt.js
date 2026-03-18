import React from 'react';

export default function PrintableReceipt({ order, restaurant }) {
    if (!order) return null;

    const formatDate = (dateString) => {
        const d = new Date(dateString);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Calculate dynamic totals safely with Null Checks
    const subtotal = order?.order_items?.reduce((sum, item) => {
        const price = Number(item?.price) || 0;
        const qty = Number(item?.quantity) || 0;
        return sum + (price * qty);
    }, 0) || 0;
    
    const discountAmount = Number(order?.discount_amount) || 0;
    const discountedSubtotal = Math.max(0, subtotal - discountAmount);
    
    // Tax is 5% of discounted subtotal, or use pre-calculated tax_amount if available
    const taxAmount = Number(order?.tax_amount) || (discountedSubtotal * 0.05);
    const cgst = taxAmount / 2;
    const sgst = taxAmount / 2;
    
    const grandTotal = discountedSubtotal + taxAmount;

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
            <div className="border-t-2 border-dashed border-black pt-3 mb-6 mt-4">
                <div className="space-y-1.5 mb-3 text-sm font-semibold">
                    <div className="flex justify-between">
                        <span>SUBTOTAL</span>
                        <span>₹{subtotal.toFixed(2)}</span>
                    </div>
                    {discountAmount > 0 && (
                        <div className="flex justify-between text-black">
                            <span>DISCOUNT {order.applied_promo ? `(${order.applied_promo})` : ''}</span>
                            <span>-₹{discountAmount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <span>CGST (2.5%)</span>
                        <span>₹{cgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>SGST (2.5%)</span>
                        <span>₹{sgst.toFixed(2)}</span>
                    </div>
                </div>
                <div className="flex justify-between items-end font-bold border-t border-black pt-2">
                    <span className="text-xl tracking-widest">GRAND TOTAL</span>
                    <span className="text-2xl leading-none tabular-nums text-right">₹{grandTotal.toFixed(0)}</span>
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
