import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { useParams } from 'react-router-dom';

export default function OrderModal({ isOpen, onClose, cart, total, tableNumber, onConfirm }) {
    const { restaurantId } = useParams();
    const [name, setName] = useState('');
    const [table, setTable] = useState(tableNumber || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [placedOrderId, setPlacedOrderId] = useState(null);

    // Promo states
    const [promoCode, setPromoCode] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [appliedPromo, setAppliedPromo] = useState(null);
    const [promoError, setPromoError] = useState('');

    // Sync table from prop when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setTable(tableNumber || '');
            setPromoCode('');
            setAppliedPromo(null);
            setPromoError('');
            setPlacedOrderId(null);
        }
    }, [isOpen, tableNumber]);

    const handleApplyPromo = async () => {
        if (!promoCode.trim()) return;
        setIsValidating(true);
        setPromoError('');
        try {
            const { data, error } = await supabase
                .from('special_offers')
                .select('*')
                .eq('restaurant_id', restaurantId)
                .eq('promo_code', promoCode.trim())
                .eq('is_active', true)
                .single();

            if (error || !data) {
                setPromoError('Invalid or expired coupon code');
                setAppliedPromo(null);
                return;
            }

            // Check expiry date
            if (data.expiry_date && new Date(data.expiry_date) < new Date()) {
                setPromoError('This coupon has expired');
                setAppliedPromo(null);
                return;
            }

            // Check minimum order value
            if (data.min_order_value && total < data.min_order_value) {
                setPromoError(`Minimum order value of ₹${data.min_order_value} required`);
                setAppliedPromo(null);
                return;
            }

            let discount = 0;
            if (data.discount_type === 'percentage') {
                discount = (data.discount_value / 100) * total;
            } else {
                discount = data.discount_value;
            }

            setAppliedPromo({
                code: data.promo_code,
                discount_amount: discount,
                title: data.title
            });
        } catch {
            setPromoError('Error validating coupon');
        } finally {
            setIsValidating(false);
        }
    };

    const discountAmount = appliedPromo ? appliedPromo.discount_amount : 0;
    const finalTotal = Math.max(0, total - discountAmount);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setIsSubmitting(true);
        const result = await onConfirm({
            name,
            table,
            applied_promo: appliedPromo?.code || '',
            discount_amount: discountAmount
        });
        setIsSubmitting(false);
        if (result?.orderId) {
            setPlacedOrderId(result.orderId);
            
            // Set payment status as unpaid/counter directly
            await supabase.from('orders').update({
                payment_method: 'counter',
                payment_status: 'unpaid'
            }).eq('id', result.orderId);
        }
    };

    const handleWhatsAppReceipt = () => {
        const itemList = cart.map(i => `${i.quantity}x ${i.name} ₹${(i.price * i.quantity).toFixed(0)}`).join('%0A');
        const msg = `*SmartMenu Receipt*%0ATable ${table || 'Walk-in'}%0A%0A${itemList}%0A%0A*Total: ₹${finalTotal.toFixed(0)}*%0AStatus: Paid ✅`;
        window.open(`https://wa.me/?text=${msg}`, '_blank');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 z-0"
                    />

                    <motion.div
                        initial={{ opacity: 0, y: 100, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 100, scale: 0.9 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="bg-white w-full max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center p-4 border-b border-slate-100 shrink-0">
                            <h2 className="text-lg font-bold text-slate-800">Complete Your Order</h2>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Body */}
                        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto">
                            {/* Order Summary */}
                            <div className="bg-slate-50 rounded-xl p-3 mb-5 border border-slate-100 shadow-sm">
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Order Summary</h4>
                                <div className="space-y-2 mb-3">
                                    {cart.map(item => (
                                        <div key={item.id} className="flex justify-between text-sm">
                                            <span className="text-slate-700">
                                                <span className="text-primary font-medium">{item.quantity}x</span> {item.name}
                                            </span>
                                            <span className="font-medium text-slate-900">₹{(item.price * item.quantity).toFixed(0)}</span>
                                        </div>
                                    ))}
                                </div>
                                {appliedPromo && (
                                    <div className="flex justify-between text-sm text-green-600 font-medium py-2 border-t border-slate-200 border-dashed">
                                        <span>Discount ({appliedPromo.code})</span>
                                        <span>- ₹{discountAmount.toFixed(0)}</span>
                                    </div>
                                )}
                                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-base">
                                    <span className="text-slate-800">Total to Pay</span>
                                    <div className="text-right">
                                        {appliedPromo && <span className="text-xs text-slate-400 line-through mr-2 block">₹{total.toFixed(0)}</span>}
                                        <span className="text-primary">₹{finalTotal.toFixed(0)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* Coupon */}
                                <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Have a coupon?</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={promoCode}
                                            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                            disabled={!!appliedPromo}
                                            placeholder="ENTER CODE"
                                            className="flex-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-primary disabled:bg-slate-100 uppercase font-bold tracking-widest text-charcoal"
                                        />
                                        {appliedPromo ? (
                                            <button type="button" onClick={() => { setAppliedPromo(null); setPromoCode(''); }}
                                                className="px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-red-100">
                                                Remove
                                            </button>
                                        ) : (
                                            <button type="button" onClick={handleApplyPromo} disabled={!promoCode.trim() || isValidating}
                                                className="px-4 py-2 bg-charcoal text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-all disabled:opacity-50">
                                                {isValidating ? '...' : 'Apply'}
                                            </button>
                                        )}
                                    </div>
                                    {promoError && <p className="text-[10px] text-red-500 mt-1 font-medium">{promoError}</p>}
                                    {appliedPromo && <p className="text-[10px] text-green-600 mt-1 font-bold">✓ Coupon applied!</p>}
                                </div>

                                {/* Name */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Your Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text" required value={name} onChange={(e) => setName(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                        placeholder="e.g. Rahul Kumar"
                                    />
                                </div>

                                {/* Table */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Table Number <span className="text-slate-400 font-normal">(Optional)</span></label>
                                    <input
                                        type="text" value={table} onChange={(e) => setTable(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                        placeholder="e.g. 12 or A4"
                                    />
                                </div>
                            </div>

                            {/* Placed Order Success Screen */}
                            {placedOrderId ? (
                                <div className="mt-6">
                                    <div className="text-center py-4">
                                        <div className="text-4xl mb-2">🎉</div>
                                        <h3 className="font-black text-charcoal text-lg">Order Confirmed!</h3>
                                        <p className="text-slate-400 text-sm mb-4">Your order is received and being prepared.</p>
                                        <button onClick={handleWhatsAppReceipt} className="w-full py-3 rounded-xl font-bold bg-green-500 text-white hover:bg-green-600 flex items-center justify-center gap-2 shadow-sm">
                                            <span>📱</span> Share Receipt on WhatsApp
                                        </button>
                                        <button onClick={onClose} className="w-full py-3 rounded-xl font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 mt-3 border border-slate-200">Done</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-6">
                                    <button
                                        type="submit"
                                        disabled={!name.trim() || isSubmitting}
                                        className={`w-full py-3.5 rounded-xl font-bold text-lg shadow-sm transition-all
                                    ${!name.trim() || isSubmitting
                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                : 'bg-primary text-charcoal hover:bg-yellow-400 hover:shadow-md active:scale-[0.98]'}`}
                                    >
                                        {isSubmitting ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <div className="w-5 h-5 border-2 border-charcoal/20 border-t-charcoal rounded-full animate-spin" />
                                                Placing Order...
                                            </span>
                                        ) : (
                                            `Review & Pay • ₹${finalTotal.toFixed(0)}`
                                        )}
                                    </button>
                                    <p className="text-[10px] text-center text-slate-400 mt-3">By clicking confirm, you place a live order.</p>
                                </div>
                            )}
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
