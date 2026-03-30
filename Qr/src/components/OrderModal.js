import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { useParams } from 'react-router-dom';
import ErrorDialog from './ErrorDialog';

export default function OrderModal({ isOpen, onClose, cart, total, tableNumber, onConfirm }) {
    const { restaurantId } = useParams();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [table, setTable] = useState(tableNumber || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [placedOrderId, setPlacedOrderId] = useState(null);
    const [step, setStep] = useState(0); // 0: Info, 1: Payment Method, 2: Success

    // Promo states
    const [promoCode, setPromoCode] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [appliedPromo, setAppliedPromo] = useState(null);
    const [promoError, setPromoError] = useState('');

    // Global Error
    const [errorDialog, setErrorDialog] = useState({ isOpen: false, title: '', message: '' });
    const showError = (title, message) => setErrorDialog({ isOpen: true, title, message });

    // Sync table from prop when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setTable(tableNumber || '');
            setPromoCode('');
            setAppliedPromo(null);
            setPromoError('');
            setPlacedOrderId(null);
            setStep(0);
        }
    }, [isOpen, tableNumber]);

    const handleApplyPromo = async () => {
        if (!promoCode.trim()) return;
        setIsValidating(true);
        setPromoError('');
        try {
            const { data, error } = await supabase
                .from('offers')
                .select('*')
                .eq('restaurant_id', restaurantId)
                .eq('promo_code', promoCode.trim().toUpperCase())
                .eq('is_active', true)
                .eq('is_auto_apply', false)
                .single();

            if (error || !data) {
                showError('Invalid Code', 'This coupon code is invalid or has expired.');
                setAppliedPromo(null);
                setPromoCode('');
                return;
            }

            if (data.end_date && new Date(data.end_date) < new Date()) {
                showError('Expired Code', 'This coupon code has expired.');
                setAppliedPromo(null);
                setPromoCode('');
                return;
            }

            if (data.start_date && new Date(data.start_date) > new Date()) {
                showError('Inactive Code', 'This coupon code is not yet active.');
                setAppliedPromo(null);
                setPromoCode('');
                return;
            }

            if (data.min_order_value && total < data.min_order_value) {
                showError('Minimum Order Required', `This coupon requires a minimum order value of ₹${data.min_order_value}.`);
                setAppliedPromo(null);
                setPromoCode('');
                return;
            }

            if (data.max_redemptions_total && (data.total_redemptions || 0) >= data.max_redemptions_total) {
                showError('Limit Reached', 'This coupon has reached its maximum usage limit.');
                setAppliedPromo(null);
                setPromoCode('');
                return;
            }

            let discount = 0;
            if (data.type === 'percentage') {
                discount = (data.discount_value / 100) * total;
            } else if (data.type === 'flat') {
                discount = data.discount_value;
            } else if (data.type === 'free_item') {
                discount = 0; // Free item added to order separately
            }

            setAppliedPromo({
                code: data.promo_code,
                discount_amount: Math.min(discount, total),
                display_name: data.display_name,
                offer_id: data.id,
                type: data.type,
                free_item_id: data.free_item_id,
            });
        } catch {
            showError('Server Error', 'There was a problem validating your coupon. Please try again.');
        } finally {
            setIsValidating(false);
        }
    };

    const discountAmount = appliedPromo ? appliedPromo.discount_amount : 0;
    const finalTotal = Math.max(0, total - discountAmount);

    const handleNextStep = (e) => {
        e.preventDefault();
        if (!name.trim() || !phone.trim()) return;
        setStep(1);
    };

    const handleConfirmPayment = async (method) => {
        setIsSubmitting(true);
        const result = await onConfirm({
            name,
            phone,
            table,
            applied_promo: appliedPromo?.offer_id || null,
            discount_amount: discountAmount,
            payment_method: method
        });
        setIsSubmitting(false);
        if (result?.orderId) {
            setPlacedOrderId(result.orderId);
            setStep(2);

            // Update payment status based on method
            await supabase.from('orders').update({
                payment_method: method,
                payment_status: method === 'online' ? 'pending' : 'unpaid'
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
                        <div className="p-4 sm:p-5 overflow-y-auto">
                            {/* Order Summary - Always visible for context */}
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

                            {/* Step 0: Customer Info */}
                            {step === 0 && (
                                <form onSubmit={handleNextStep} className="space-y-4">
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

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Your Name <span className="text-red-500">*</span></label>
                                        <input
                                            type="text" required value={name} onChange={(e) => setName(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                            placeholder="e.g. Rahul Kumar"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
                                        <input
                                            type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                            placeholder="e.g. 9876543210"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Table Number <span className="text-slate-400 font-normal">(Optional)</span></label>
                                        <input
                                            type="text" value={table} onChange={(e) => setTable(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                            placeholder="e.g. 12 or A4"
                                        />
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={!name.trim() || !phone.trim()}
                                            className={`w-full py-3.5 rounded-xl font-bold text-lg shadow-sm transition-all
                                        ${!name.trim() || !phone.trim()
                                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                    : 'bg-primary text-charcoal hover:bg-yellow-400 hover:shadow-md active:scale-[0.98]'}`}
                                        >
                                            Continue to Payment
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Step 1: Payment Method Selection */}
                            {step === 1 && (
                                <div className="space-y-4">
                                    <h3 className="text-center font-bold text-slate-800 text-lg mb-2">Select Payment Method</h3>
                                    
                                    <div className="grid gap-3">
                                        <button 
                                            onClick={() => handleConfirmPayment('online')}
                                            disabled={isSubmitting}
                                            className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-100 hover:border-primary hover:bg-primary/5 transition-all group"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-primary/20">
                                                <span className="material-symbols-outlined">payments</span>
                                            </div>
                                            <div className="text-left">
                                                <div className="font-bold text-slate-800">Pay Online</div>
                                                <div className="text-xs text-slate-500">Fast & Secure (UPI, Cards, etc.)</div>
                                            </div>
                                            <div className="ml-auto">
                                                <span className="material-symbols-outlined text-slate-300 group-hover:text-primary">chevron_right</span>
                                            </div>
                                        </button>

                                        <button 
                                            onClick={() => handleConfirmPayment('counter')}
                                            disabled={isSubmitting}
                                            className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-100 hover:border-primary hover:bg-primary/5 transition-all group"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 group-hover:bg-primary/20">
                                                <span className="material-symbols-outlined">storefront</span>
                                            </div>
                                            <div className="text-left">
                                                <div className="font-bold text-slate-800">Pay at Counter</div>
                                                <div className="text-xs text-slate-500">Settle your bill at the desk</div>
                                            </div>
                                            <div className="ml-auto">
                                                <span className="material-symbols-outlined text-slate-300 group-hover:text-primary">chevron_right</span>
                                            </div>
                                        </button>
                                    </div>

                                    <button 
                                        onClick={() => setStep(0)}
                                        className="w-full py-3 text-slate-400 font-medium text-sm hover:text-slate-600 transition-colors"
                                    >
                                        ← Back to Details
                                    </button>

                                    {isSubmitting && (
                                        <div className="fixed inset-0 bg-white/80 z-50 flex flex-col items-center justify-center">
                                            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                                            <p className="font-bold text-slate-800">Finalizing Your Order...</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Step 2: Success */}
                            {step === 2 && (
                                <div className="text-center py-6">
                                    <div className="text-5xl mb-4">🎉</div>
                                    <h3 className="font-black text-charcoal text-xl mb-1">Order Confirmed!</h3>
                                    <p className="text-slate-500 text-sm mb-6 max-w-[240px] mx-auto">
                                        Your order has been received. Please {placedOrderId?.payment_method === 'online' ? 'complete your payment' : 'settle the bill'} at the counter.
                                    </p>
                                    
                                    <div className="space-y-3">
                                        <button onClick={handleWhatsAppReceipt} className="w-full py-3.5 rounded-xl font-bold bg-[#25D366] text-white hover:bg-[#20bd5a] flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]">
                                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                                            Share Receipt
                                        </button>
                                        <button onClick={onClose} className="w-full py-3.5 rounded-xl font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 shadow-sm transition-all active:scale-[0.98]">
                                            Close & Order More
                                        </button>
                                    </div>
                                </div>
                            )}

                        </div>
                    </motion.div>
                </div>
            )}
            
            <ErrorDialog 
                isOpen={errorDialog.isOpen} 
                title={errorDialog.title} 
                message={errorDialog.message} 
                onClose={() => setErrorDialog({ ...errorDialog, isOpen: false })} 
            />
        </AnimatePresence>
    );
}
