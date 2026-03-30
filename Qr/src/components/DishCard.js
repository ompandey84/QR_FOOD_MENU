import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function DishCard({ dish, quantity = 0, onUpdateQuantity }) {
    const [imgLoaded, setImgLoaded] = useState(false);
    const [imgError, setImgError] = useState(false);
    const isVeg = dish.type === 'veg';
    const hasImage = dish.image_url && !imgError;

    return (
        <div className="group bg-white rounded-2xl overflow-hidden md:border border-slate-100 hover:shadow-2xl md:hover:shadow-charcoal/5 transition-all duration-500 
            flex flex-row md:flex-col p-4 md:p-0 border-b md:border-b-slate-100 border-dashed md:border-solid gap-4 md:gap-0 relative">
            
            {/* Desktop Veg/Non-Veg Badge (Absolute) */}
            <div className={`hidden md:flex absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg shadow-sm border border-white/20 items-center`}>
                <span className={`material-symbols-outlined text-[10px] font-black ${isVeg ? 'text-green-600' : 'text-red-600'}`}>fiber_manual_record</span>
            </div>

            {/* Left/Top Content (Info) */}
            <div className="flex-1 min-w-0 md:p-6 flex flex-col justify-center order-1 md:order-2">
                {/* Mobile Veg Badge & Name */}
                <div className="flex items-start gap-2 mb-1 md:mb-0">
                    <div className={`flex md:hidden mt-1 flex-shrink-0 w-3.5 h-3.5 rounded-sm border items-center justify-center ${isVeg ? 'border-green-600' : 'border-red-600'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-extrabold text-base md:text-lg leading-tight text-charcoal md:group-hover:text-[#9E9147] transition-colors md:line-clamp-2 md:min-h-[50px]">
                            {dish.name}
                        </h3>
                    </div>
                </div>
                
                {/* Price */}
                <div className="mb-2 md:mb-0 md:mt-2">
                    <span className="font-black text-charcoal text-sm md:text-lg shrink-0">
                        ₹{Number(dish.price).toFixed(0)}
                    </span>
                </div>

                {/* Description */}
                {dish.description && (
                    <p className="text-slate-500 md:text-slate-400 text-xs md:font-medium leading-relaxed line-clamp-2 md:min-h-[32px]">
                        {dish.description}
                    </p>
                )}

                {/* Desktop Action Container */}
                <div className="hidden md:flex mt-4 items-center justify-end">
                    <div className="flex items-center">
                        {quantity === 0 ? (
                            <button onClick={(e) => onUpdateQuantity && onUpdateQuantity(1, e)}
                                className="bg-primary text-charcoal px-6 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-primary/20 hover:bg-[#F0C900] hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-sm">add</span> Add
                            </button>
                        ) : (
                            <div className="flex items-center bg-[#F4F2E6] rounded-xl px-1 py-1 border border-primary/20 shadow-sm">
                                <button onClick={(e) => onUpdateQuantity && onUpdateQuantity(quantity - 1, e)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-charcoal hover:bg-white/80 transition-colors shadow-sm">
                                    <span className="material-symbols-outlined text-sm">remove</span>
                                </button>
                                <motion.span key={quantity} initial={{ y: -5, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                                    className="w-8 text-center text-sm font-black text-charcoal">{quantity}</motion.span>
                                <button onClick={(e) => onUpdateQuantity && onUpdateQuantity(quantity + 1, e)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-charcoal shadow-sm active:scale-95 transition-transform">
                                    <span className="material-symbols-outlined text-sm">add</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right/Top Image & Mobile Action */}
            <div className="relative flex-shrink-0 order-2 md:order-1 flex flex-col items-center justify-start md:block">
                {/* Image Container */}
                <div className={`${hasImage ? 'w-28 h-28 md:w-full md:aspect-square' : 'w-24 md:w-full md:aspect-[3/1] bg-transparent'} rounded-2xl md:rounded-b-none overflow-hidden md:bg-slate-50 relative shrink-0 shadow-sm md:shadow-none`}>
                    {hasImage && (
                        <>
                            {!imgLoaded && (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                                    <div className="w-5 h-5 md:w-8 md:h-8 border-2 md:border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                                </div>
                            )}
                            <img
                                src={dish.image_url}
                                alt={dish.name}
                                loading="lazy"
                                onLoad={() => setImgLoaded(true)}
                                onError={() => setImgError(true)}
                                className={`w-full h-full object-cover md:transition-transform md:duration-700 md:group-hover:scale-110 
                                    ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                            />
                        </>
                    )}
                </div>

                {/* Mobile Action Button (Overlapping Image) */}
                <div className={`md:hidden flex items-center justify-center ${hasImage ? '-mt-4' : 'mt-2'} relative z-10`}>
                    {quantity === 0 ? (
                        <button onClick={(e) => onUpdateQuantity && onUpdateQuantity(1, e)}
                            className="bg-white text-green-700 border border-slate-200 px-6 py-2 rounded-xl text-xs font-black shadow-md hover:bg-slate-50 transition-all uppercase tracking-wider">
                            Add
                        </button>
                    ) : (
                        <div className="flex items-center bg-white rounded-xl px-1 py-1 border border-green-600 shadow-md">
                            <button onClick={(e) => onUpdateQuantity && onUpdateQuantity(quantity - 1, e)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-green-700 transition-colors">
                                <span className="material-symbols-outlined text-sm font-bold">remove</span>
                            </button>
                            <motion.span key={quantity} initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                                className="w-7 text-center text-sm font-black text-green-700">{quantity}</motion.span>
                            <button onClick={(e) => onUpdateQuantity && onUpdateQuantity(quantity + 1, e)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-green-700 transition-transform">
                                <span className="material-symbols-outlined text-sm font-bold">add</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
        </div>
    );
}
