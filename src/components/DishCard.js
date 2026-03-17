import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function DishCard({ dish, quantity = 0, onUpdateQuantity }) {
    const [imgLoaded, setImgLoaded] = useState(false);
    const [imgError, setImgError] = useState(false);
    const isVeg = dish.type === 'veg';
    const isSoldOut = dish.is_available === false;

    return (
        <div className="group bg-white rounded-2xl overflow-hidden border border-[#F4F2E6] hover:shadow-2xl hover:shadow-charcoal/5 transition-all duration-500">
            {/* Image */}
            <div className="relative aspect-square overflow-hidden bg-[#FCFAF5]">
                {dish.image_url && !imgError ? (
                    <>
                        {!imgLoaded && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                            </div>
                        )}
                        <img
                            src={dish.image_url}
                            alt={dish.name}
                            loading="lazy"
                            onLoad={() => setImgLoaded(true)}
                            onError={() => setImgError(true)}
                            className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 
                                ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                        />
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-50">
                        <span className="text-4xl text-slate-300">🍽️</span>
                    </div>
                )}

                {/* Sold Out overlay */}
                {isSoldOut && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center">
                        <span className="bg-red-500 text-white text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-xl shadow-lg">Sold Out</span>
                    </div>
                )}

                {/* Veg/Non-Veg Badge overlay */}
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg shadow-sm border border-white/20">
                    <span className={`material-symbols-outlined text-[10px] font-black
                        ${isVeg ? 'text-green-600' : 'text-red-600'}`}>
                        fiber_manual_record
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col gap-2">
                <div className="flex justify-between items-start gap-2">
                    <h3 className="font-extrabold text-lg leading-tight text-charcoal group-hover:text-[#9E9147] transition-colors line-clamp-2 min-h-[50px]">
                        {dish.name}
                    </h3>
                    <span className="font-black text-charcoal text-lg shrink-0">
                        ₹{Number(dish.price).toFixed(0)}
                    </span>
                </div>

                {dish.description && (
                    <p className="text-slate-400 text-xs font-medium leading-relaxed line-clamp-2 min-h-[32px]">
                        {dish.description}
                    </p>
                )}

                <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 bg-[#FDF8D7] px-2 py-1 rounded-lg">
                        <span className="material-symbols-outlined text-sm text-charcoal fill-1">star</span>
                        <span className="text-charcoal text-[11px] font-black">4.8</span>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center">
                        {isSoldOut ? (
                            <button disabled className="bg-slate-100 text-slate-400 px-6 py-2.5 rounded-xl text-xs font-black cursor-not-allowed">
                                Sold Out
                            </button>
                        ) : quantity === 0 ? (
                            <button
                                onClick={() => onUpdateQuantity && onUpdateQuantity(1)}
                                className="bg-primary text-charcoal px-6 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-primary/20 hover:bg-[#F0C900] hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
                            >
                                <span className="material-symbols-outlined text-sm">add</span> Add
                            </button>
                        ) : (
                            <div className="flex items-center bg-[#F4F2E6] rounded-xl px-1 py-1 border border-primary/20 shadow-sm">
                                <button
                                    onClick={() => onUpdateQuantity && onUpdateQuantity(quantity - 1)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-charcoal hover:bg-white/80 transition-colors shadow-sm"
                                >
                                    <span className="material-symbols-outlined text-sm">remove</span>
                                </button>
                                <motion.span
                                    key={quantity}
                                    initial={{ y: -5, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="w-8 text-center text-sm font-black text-charcoal"
                                >
                                    {quantity}
                                </motion.span>
                                <button
                                    onClick={() => onUpdateQuantity && onUpdateQuantity(quantity + 1)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-charcoal shadow-sm active:scale-95 transition-transform"
                                >
                                    <span className="material-symbols-outlined text-sm">add</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
