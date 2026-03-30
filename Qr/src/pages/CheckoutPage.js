import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import ErrorDialog from '../components/ErrorDialog';

const STEPS = ['Details', 'Review & Coupon', 'Payment', 'Confirmed'];

export default function CheckoutPage() {
    const navigate = useNavigate();
    const { restaurantId } = useParams();
    const location = useLocation();
    const tableParam = new URLSearchParams(location.search).get('table') || '';

    // Load cart from localStorage
    const [cart, setCart] = useState(() => {
        try {
            const saved = localStorage.getItem(`cart_${restaurantId}`);
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    });

    const [menuItems, setMenuItems] = useState(location.state?.menuItems || []);
    const [restaurant, setRestaurant] = useState(location.state?.restaurant || null);

    // Customer form
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [table, setTable] = useState(tableParam);
    const [instructions, setInstructions] = useState('');

    // Checkout fields config from restaurant
    const [checkoutFields, setCheckoutFields] = useState({ name: true, phone: true, table: false });
    const [whatsappEnabled, setWhatsappEnabled] = useState(false);

    // Steps
    const [step, setStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [placedOrderId, setPlacedOrderId] = useState(null);

    // Promo
    const [promoCode, setPromoCode] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [appliedPromo, setAppliedPromo] = useState(null);
    const [promoError, setPromoError] = useState('');

    // Error
    const [errorDialog, setErrorDialog] = useState({ isOpen: false, title: '', message: '' });
    const showError = (title, message) => setErrorDialog({ isOpen: true, title, message });

    // Load restaurant + menu items from DB if not passed via state
    useEffect(() => {
        async function loadData() {
            try {
                if (!restaurant) {
                    const { data } = await supabase.from('restaurants').select('*').eq('id', restaurantId).single();
                    if (data) setRestaurant(data);
                }
                if (menuItems.length === 0) {
                    const { data: items } = await supabase.from('menu_items').select('*').eq('restaurant_id', restaurantId);
                    if (items) setMenuItems(items);
                }
            } catch (e) { console.error(e); }
        }
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [restaurantId]);

    // Load restaurant checkout config
    useEffect(() => {
        if (restaurant) {
            setCheckoutFields(restaurant.checkout_fields ?? { name: true, phone: true, table: false });
            setWhatsappEnabled(restaurant.whatsapp_receipts_enabled ?? false);
        }
    }, [restaurant]);

    // Check if any checkout fields are required
    const hasAnyFields = checkoutFields.name || checkoutFields.phone || checkoutFields.table;

    // Auto-skip to step 1 if no fields needed
    useEffect(() => {
        if (!hasAnyFields && step === 0) setStep(1);
    }, [hasAnyFields, step]);

    // Cart items including free item from promo
    const cartItems = Object.entries(cart)
        .filter(([_, qty]) => qty > 0)
        .map(([id, qty]) => {
            const dish = menuItems.find(item => item.id === id);
            return dish ? { ...dish, quantity: qty, isFree: false } : null;
        })
        .filter(Boolean);

    // Add free item at end if promo is free_item type
    const freeItem = appliedPromo?.type === 'free_item' ? appliedPromo.freeItem : null;
    const allCartItems = freeItem
        ? [...cartItems, { ...freeItem, quantity: 1, isFree: true }]
        : cartItems;

    const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountAmount = appliedPromo?.type === 'free_item' ? (freeItem?.price || 0) : (appliedPromo?.discount_amount || 0);
    const finalTotal = Math.max(0, cartTotal - (appliedPromo?.type === 'free_item' ? 0 : discountAmount));

    // Validation for step 0
    const isStep0Valid = () => {
        if (checkoutFields.name && !name.trim()) return false;
        if (checkoutFields.phone && (!phone.trim() || phone.length !== 10)) return false;
        return true;
    };

    // Real-time promo validation
    const handleApplyPromo = async () => {
        const code = promoCode.trim().toUpperCase();
        if (!code) return;
        setIsValidating(true);
        setPromoError('');

        try {
            const { data, error } = await supabase
                .from('offers')
                .select('*, menu_items(id, name, price, image_url, type)')
                .eq('restaurant_id', restaurantId)
                .eq('promo_code', code)
                .eq('is_active', true)
                .eq('is_auto_apply', false)
                .single();

            if (error || !data) {
                setPromoError('Invalid coupon code. Please check and try again.');
                return;
            }

            // Check expiry
            if (data.end_date && new Date(data.end_date) < new Date()) {
                setPromoError('This coupon has expired.');
                return;
            }

            // Check start date
            if (data.start_date && new Date(data.start_date) > new Date()) {
                setPromoError('This coupon is not active yet.');
                return;
            }

            // Check minimum order
            if (data.min_order_value && cartTotal < data.min_order_value) {
                setPromoError(`Minimum order ₹${data.min_order_value} required for this coupon.`);
                return;
            }

            // FREE ITEM type
            if (data.type === 'free_item') {
                const freeItem = data.menu_items;
                if (!freeItem) {
                    setPromoError('Free item is no longer available.');
                    return;
                }
                setAppliedPromo({
                    code: data.promo_code,
                    discount_amount: 0,
                    offer_id: data.id,
                    type: 'free_item',
                    freeItem: freeItem,
                    label: `🎁 Free item: ${freeItem.name}`,
                });
                setPromoError('');
                return;
            }

            // Calculate discount for percentage / flat
            let discount = 0;
            if (data.type === 'percentage') discount = (data.discount_value / 100) * cartTotal;
            else if (data.type === 'flat') discount = data.discount_value;

            setAppliedPromo({
                code: data.promo_code,
                discount_amount: Math.min(discount, cartTotal),
                offer_id: data.id,
                type: data.type,
                value: data.discount_value,
            });
            setPromoError('');
        } catch {
            setPromoError('Could not validate coupon. Please try again.');
        } finally {
            setIsValidating(false);
        }
    };

    const handleConfirmPayment = async (method) => {
        setIsSubmitting(true);
        try {
            if (restaurant && restaurant.is_accepting_orders === false) {
                showError('Orders Paused', 'This restaurant is not accepting orders right now.');
                setIsSubmitting(false);
                return;
            }

            const payload = {
                restaurant_id: restaurantId,
                customer_name: name || 'Guest',
                customer_phone: phone || null,
                table_number: table || null,
                instructions: instructions.trim() || null,
                total: finalTotal,
                applied_promo: appliedPromo?.code || null,
                discount_amount: discountAmount,
                status: 'pending',
                payment_status: method === 'online' ? 'pending' : 'unpaid',
                payment_method: method,
                payment_id: null
            };

            const { data: order, error: orderErr } = await supabase
                .from('orders').insert(payload).select().single();

            let orderId;
            if (orderErr) {
                // Fallback minimal insert
                const { data: fallback, error: fbErr } = await supabase.from('orders').insert({
                    restaurant_id: restaurantId,
                    customer_name: name || 'Guest',
                    table_number: table || null,
                    instructions: instructions.trim() || null,
                    total: finalTotal,
                    status: 'pending'
                }).select().single();
                if (fbErr) throw fbErr;
                orderId = fallback.id;
            } else {
                orderId = order.id;
            }

            // Insert order items (include free item if applicable)
            const itemsToInsert = allCartItems.map(item => ({
                order_id: orderId,
                menu_item_id: item.id,
                name: item.isFree ? `🎁 ${item.name} (FREE)` : item.name,
                price: item.isFree ? 0 : item.price,
                quantity: item.quantity
            }));
            await supabase.from('order_items').insert(itemsToInsert);

            setPlacedOrderId(orderId);

            // Save to local orders for tracking
            const storedOrders = JSON.parse(localStorage.getItem('my_orders') || '[]');
            localStorage.setItem('my_orders', JSON.stringify([orderId, ...storedOrders]));

            // Clear cart
            localStorage.removeItem(`cart_${restaurantId}`);
            setCart({});

            setStep(3);
        } catch (err) {
            console.error(err);
            showError('Order Failed', 'Failed to place order. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleWhatsAppReceipt = () => {
        const itemList = cartItems.map(i => `${i.quantity}x ${i.name} ₹${(i.price * i.quantity).toFixed(0)}`).join('%0A');
        const msg = `*${restaurant?.name || 'SmartMenu'} Receipt*%0A${table ? `Table ${table}%0A` : ''}%0A${itemList}%0A%0A*Total: ₹${finalTotal.toFixed(0)}*%0AStatus: Confirmed ✅`;
        window.open(`https://wa.me/?text=${msg}`, '_blank');
    };

    if (cartItems.length === 0 && step < 3) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
                <span className="text-6xl mb-4">🛒</span>
                <h2 className="text-2xl font-black text-charcoal mb-2">Cart is empty</h2>
                <button onClick={() => navigate(`/menu/${restaurantId}`)} className="bg-primary text-charcoal font-bold px-6 py-3 rounded-xl mt-4">Back to Menu</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white border-b border-slate-100 px-4 py-3">
                <div className="max-w-lg mx-auto flex items-center gap-3">
                    {step < 3 && (
                        <button onClick={() => step === 0 || (step === 1 && !hasAnyFields) ? navigate(-1) : setStep(s => s - 1)} className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                            <span className="material-symbols-outlined text-charcoal">arrow_back</span>
                        </button>
                    )}
                    <div className="flex-1">
                        <h1 className="text-lg font-black text-charcoal">{STEPS[step]}</h1>
                        <p className="text-xs text-slate-400">Step {step + 1} of {STEPS.length}</p>
                    </div>
                </div>
                {/* Progress bar */}
                <div className="max-w-lg mx-auto mt-3 flex gap-1">
                    {STEPS.map((_, i) => (
                        <div key={i} className={`flex-1 h-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-primary' : 'bg-slate-200'}`} />
                    ))}
                </div>
            </header>

            <main className="flex-1 p-4 max-w-lg mx-auto w-full">
                <AnimatePresence mode="wait">
                    {/* STEP 0: Customer Details */}
                    {step === 0 && hasAnyFields && (
                        <motion.div key="step0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-5">
                            <div className="text-center py-4">
                                <span className="text-4xl">👋</span>
                                <h2 className="text-xl font-black text-charcoal mt-2">Tell us about you</h2>
                                <p className="text-sm text-slate-400">Just a few details to get your order started</p>
                            </div>

                            {checkoutFields.name && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Your Name <span className="text-red-500">*</span></label>
                                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="e.g. Rahul Kumar" />
                                </div>
                            )}
                            {checkoutFields.phone && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Phone Number <span className="text-red-500">*</span></label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        className="input-field"
                                        placeholder="e.g. 9876543210"
                                        maxLength={10}
                                    />
                                    {phone.length > 0 && phone.length < 10 && (
                                        <p className="text-xs text-red-400 mt-1">Enter a valid 10-digit number</p>
                                    )}
                                </div>
                            )}
                            {checkoutFields.table && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Table Number</label>
                                    <input type="text" value={table} onChange={e => setTable(e.target.value)} className="input-field" placeholder="e.g. 5 or A4" />
                                </div>
                            )}

                            {/* Special Instructions */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Special Instructions <span className="text-slate-400 font-normal">(optional)</span></label>
                                <textarea
                                    rows="3"
                                    value={instructions}
                                    onChange={e => setInstructions(e.target.value)}
                                    className="input-field resize-none"
                                    placeholder="e.g. No onion, extra spicy, allergies..."
                                />
                            </div>

                            <button
                                onClick={() => setStep(1)}
                                disabled={!isStep0Valid()}
                                className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${isStep0Valid()
                                    ? 'bg-primary text-charcoal shadow-lg shadow-primary/30 hover:bg-[#F0C900] active:scale-[0.98]'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                            >
                                Continue
                            </button>
                        </motion.div>
                    )}

                    {/* STEP 1: Review + Coupon */}
                    {step === 1 && (
                        <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-5">
                            <h2 className="text-lg font-black text-charcoal flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">receipt_long</span>
                                Order Summary
                            </h2>

                            {/* Instructions display if added without fields */}
                            {!hasAnyFields && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Special Instructions <span className="text-slate-400 font-normal">(optional)</span></label>
                                    <textarea
                                        rows="2"
                                        value={instructions}
                                        onChange={e => setInstructions(e.target.value)}
                                        className="input-field resize-none"
                                        placeholder="e.g. No onion, extra spicy..."
                                    />
                                </div>
                            )}

                            {/* Items */}
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
                                {allCartItems.map((item, idx) => (
                                    <div key={`${item.id}-${idx}`} className="flex justify-between text-sm">
                                        <span className="text-slate-700 flex items-center gap-1.5">
                                            <span className="text-primary font-bold">{item.quantity}×</span>
                                            {item.isFree && <span className="bg-green-100 text-green-700 text-[10px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">FREE</span>}
                                            {item.name}
                                        </span>
                                        <span className={`font-bold ${item.isFree ? 'text-green-600 line-through text-slate-300' : 'text-charcoal'}`}>
                                            {item.isFree ? `FREE` : `₹${(item.price * item.quantity).toFixed(0)}`}
                                        </span>
                                    </div>
                                ))}

                                {appliedPromo && appliedPromo.type !== 'free_item' && (
                                    <div className="flex justify-between text-sm text-green-600 font-medium pt-2 border-t border-dashed border-slate-200">
                                        <span>Discount ({appliedPromo.code})</span>
                                        <span>- ₹{discountAmount.toFixed(0)}</span>
                                    </div>
                                )}

                                <div className="border-t border-slate-200 pt-3 flex justify-between font-black text-base">
                                    <span className="text-charcoal">Total</span>
                                    <span className="text-primary text-xl">₹{finalTotal.toFixed(0)}</span>
                                </div>
                            </div>

                            {/* Instructions preview if set */}
                            {instructions.trim() && hasAnyFields && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
                                    <span className="font-bold">📝 Instructions:</span> {instructions}
                                </div>
                            )}

                            {/* Coupon Section */}
                            <div className="bg-white rounded-2xl border border-primary/10 p-4">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">🎟️ Have a coupon code?</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={promoCode}
                                        onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoError(''); }}
                                        disabled={!!appliedPromo}
                                        placeholder="ENTER CODE"
                                        className="flex-1 px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary disabled:bg-slate-100 uppercase font-bold tracking-widest text-charcoal"
                                    />
                                    {appliedPromo ? (
                                        <button onClick={() => { setAppliedPromo(null); setPromoCode(''); setPromoError(''); }}
                                            className="px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-red-100">
                                            Remove
                                        </button>
                                    ) : (
                                        <button onClick={handleApplyPromo} disabled={!promoCode.trim() || isValidating}
                                            className="px-5 py-2.5 bg-charcoal text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50">
                                            {isValidating ? '...' : 'Apply'}
                                        </button>
                                    )}
                                </div>
                                {promoError && <p className="text-xs text-red-500 mt-2 font-medium">❌ {promoError}</p>}
                                {appliedPromo && appliedPromo.type === 'free_item' && (
                                    <p className="text-xs text-green-600 mt-2 font-bold">🎁 {appliedPromo.label} added to your order!</p>
                                )}
                                {appliedPromo && appliedPromo.type !== 'free_item' && (
                                    <p className="text-xs text-green-600 mt-2 font-bold">✓ Coupon applied! You save ₹{discountAmount.toFixed(0)}</p>
                                )}
                            </div>

                            <button
                                onClick={() => setStep(2)}
                                className="w-full py-4 rounded-2xl bg-primary text-charcoal font-black text-base shadow-lg shadow-primary/30 hover:bg-[#F0C900] active:scale-[0.98] transition-all"
                            >
                                Continue to Payment
                            </button>
                        </motion.div>
                    )}

                    {/* STEP 2: Payment Method */}
                    {step === 2 && (
                        <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-5 pt-4">
                            <div className="text-center mb-4">
                                <span className="text-4xl">💳</span>
                                <h2 className="text-xl font-black text-charcoal mt-2">How would you like to pay?</h2>
                                <p className="text-sm text-slate-400">Total: <span className="font-bold text-primary">₹{finalTotal.toFixed(0)}</span></p>
                            </div>

                            <div className="grid gap-3">
                                <button
                                    onClick={() => handleConfirmPayment('online')}
                                    disabled={isSubmitting}
                                    className="flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-100 bg-white hover:border-primary hover:bg-primary/5 transition-all group shadow-sm"
                                >
                                    <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-primary/20 transition-colors">
                                        <span className="material-symbols-outlined text-2xl">payments</span>
                                    </div>
                                    <div className="text-left flex-1">
                                        <div className="font-black text-charcoal text-base">Pay Online</div>
                                        <div className="text-xs text-slate-500">UPI, Cards, Net Banking</div>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">chevron_right</span>
                                </button>

                                <button
                                    onClick={() => handleConfirmPayment('counter')}
                                    disabled={isSubmitting}
                                    className="flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-100 bg-white hover:border-primary hover:bg-primary/5 transition-all group shadow-sm"
                                >
                                    <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 group-hover:bg-primary/20 transition-colors">
                                        <span className="material-symbols-outlined text-2xl">storefront</span>
                                    </div>
                                    <div className="text-left flex-1">
                                        <div className="font-black text-charcoal text-base">Pay at Counter</div>
                                        <div className="text-xs text-slate-500">Settle at the billing desk</div>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">chevron_right</span>
                                </button>
                            </div>

                            {isSubmitting && (
                                <div className="fixed inset-0 bg-white/90 z-50 flex flex-col items-center justify-center">
                                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                                    <p className="font-black text-charcoal text-lg">Placing Your Order...</p>
                                    <p className="text-sm text-slate-400 mt-1">Just a moment</p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* STEP 3: Success */}
                    {step === 3 && (
                        <motion.div key="step3" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12 space-y-6">
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 10, delay: 0.2 }} className="text-7xl">
                                🎉
                            </motion.div>
                            <div>
                                <h2 className="text-2xl font-black text-charcoal mb-1">Order Confirmed!</h2>
                                <p className="text-slate-500 text-sm max-w-xs mx-auto">Your order has been placed successfully. The kitchen is on it!</p>
                            </div>

                            {placedOrderId && (
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 inline-block">
                                    <span className="text-xs text-slate-400 uppercase tracking-wider font-bold block mb-1">Order ID</span>
                                    <span className="text-sm font-mono font-black text-charcoal">{placedOrderId?.slice(0, 8)}...</span>
                                </div>
                            )}

                            <div className="space-y-3 max-w-sm mx-auto">
                                {whatsappEnabled && (
                                    <button onClick={handleWhatsAppReceipt} className="w-full py-3.5 rounded-2xl font-bold bg-[#25D366] text-white hover:bg-[#20bd5a] flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]">
                                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                                        Share Receipt on WhatsApp
                                    </button>
                                )}
                                <button
                                    onClick={() => navigate(`/menu/${restaurantId}${tableParam ? `?table=${tableParam}` : ''}`)}
                                    className="w-full py-3.5 rounded-2xl font-bold bg-primary text-charcoal hover:bg-[#F0C900] shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined">home</span>
                                    Back to Home
                                </button>
                                <button
                                    onClick={() => navigate(`/menu/${restaurantId}${tableParam ? `?table=${tableParam}` : ''}`)}
                                    className="w-full py-3.5 rounded-2xl font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined">restaurant_menu</span>
                                    Order More
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            <ErrorDialog
                isOpen={errorDialog.isOpen}
                title={errorDialog.title}
                message={errorDialog.message}
                onClose={() => setErrorDialog({ ...errorDialog, isOpen: false })}
            />
        </div>
    );
}
