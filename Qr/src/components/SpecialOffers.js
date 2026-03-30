import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { useParams } from 'react-router-dom';

const THEMES = [
    { id: 'orange-red', classes: 'from-orange-500 to-red-500', isLight: true },
    { id: 'emerald-teal', classes: 'from-emerald-500 to-teal-600', isLight: true },
    { id: 'indigo-purple', classes: 'from-indigo-500 to-purple-600', isLight: true },
    { id: 'charcoal-slate', classes: 'from-charcoal to-slate-900', isLight: true },
    { id: 'primary-yellow', classes: 'from-primary to-yellow-400', isLight: false }
];

export default function SpecialOffers() {
    const { restaurantId } = useParams();
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchOffers() {
            try {
                // Query the new 'offers' table instead of 'special_offers'
                const { data, error } = await supabase
                    .from('offers')
                    .select('*')
                    .eq('restaurant_id', restaurantId)
                    .eq('is_active', true)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                // Filter: only show non-expired offers
                const now = new Date();
                const valid = (data || []).filter(o => {
                    if (o.end_date && new Date(o.end_date) < now) return false;
                    if (o.start_date && new Date(o.start_date) > now) return false;
                    return true;
                });
                setOffers(valid);
            } catch (_) {
                /* fail-soft: hide offers section if fetch fails */
            } finally {
                setLoading(false);
            }
        }
        if (restaurantId) fetchOffers();
    }, [restaurantId]);

    if (loading) {
        return (
            <div className="mb-10 w-full animate-pulse">
                <div className="h-8 w-48 bg-slate-200 rounded-lg mb-6"></div>
                <div className="flex gap-4 overflow-hidden">
                    {[1, 2].map(i => <div key={i} className="flex-none w-[280px] h-40 bg-slate-100 rounded-[2rem]"></div>)}
                </div>
            </div>
        );
    }

    if (offers.length === 0) return null;

    return (
        <div className="mb-10 w-full">
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2 mb-6">
                Special Offers 🎁
                <span className="w-12 h-1 bg-primary rounded-full"></span>
            </h2>
            <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                {offers.map((offer, index) => {
                    const theme = THEMES[index % THEMES.length];
                    const isLight = theme.isLight;

                    // Build display text based on offer type
                    let discountText = offer.display_name;
                    if (offer.type === 'percentage') discountText = `${offer.discount_value}% OFF`;
                    else if (offer.type === 'flat') discountText = `₹${offer.discount_value} OFF`;
                    else if (offer.type === 'free_item') discountText = 'FREE ITEM!';

                    return (
                        <motion.div
                            key={offer.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`flex-none w-[280px] sm:w-[320px] rounded-[2rem] bg-gradient-to-br ${theme.classes} p-6 ${isLight ? 'text-white' : 'text-charcoal'} shadow-lg snap-center relative overflow-hidden`}
                        >
                            {/* Decorative Blur blob */}
                            <div className={`absolute ${index % 2 === 0 ? 'top-0 right-0 -mr-10 -mt-10' : 'bottom-0 right-0 -mr-10 -mb-10'} w-32 h-32 ${isLight ? 'bg-white/10' : 'bg-white/40'} rounded-full blur-2xl pointer-events-none`} />

                            <div className="relative z-10 flex flex-col h-full">
                                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-3 backdrop-blur-sm self-start ${isLight ? 'bg-white/20' : 'bg-charcoal/10'}`}>
                                    {offer.type === 'free_item' ? '🎁 Free Item' : offer.type === 'percentage' ? '🏷️ Discount' : '💰 Flat Off'}
                                </span>
                                <h3 className="text-2xl font-black leading-tight mb-2 tracking-tight">{discountText}</h3>
                                <p className={`text-sm mb-5 line-clamp-2 flex-grow ${isLight ? 'text-white/90' : 'text-charcoal/80'}`}>
                                    {offer.display_name}
                                    {offer.min_order_value > 0 && ` · Min order ₹${offer.min_order_value}`}
                                </p>

                                {offer.promo_code && !offer.is_auto_apply && (
                                    <div className="flex items-center justify-between mt-auto">
                                        <div className={`text-xs font-bold px-4 py-2 rounded-xl border border-dashed tracking-wider ${isLight ? 'bg-black/20 border-white/20' : 'bg-white/40 border-charcoal/20'}`}>
                                            Use Code: <span className="text-primary">{offer.promo_code}</span>
                                        </div>
                                    </div>
                                )}
                                {offer.is_auto_apply && (
                                    <div className={`text-xs font-bold px-3 py-1.5 rounded-lg mt-auto self-start ${isLight ? 'bg-white/20' : 'bg-charcoal/10'}`}>
                                        ✨ Auto-applied at checkout
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
