import React, { useRef, useEffect } from 'react';

// You can customize icons per category here if desired
const getCategoryIcon = (categoryName) => {
    const lower = categoryName.toLowerCase();
    if (lower === 'all') return null; // No icon for "All"
    if (lower.includes('veg') && !lower.includes('non')) return 'eco';
    if (lower.includes('non-veg') || lower.includes('meat') || lower.includes('chicken')) return 'restaurant';
    if (lower.includes('drink') || lower.includes('beverage')) return 'local_bar';
    if (lower.includes('dessert') || lower.includes('sweet')) return 'bakery_dining';
    return 'restaurant_menu'; // default fallback
};

export default function CategoryTabs({ categories, activeCategory, onSelect }) {
    const scrollRef = useRef(null);
    const activeRef = useRef(null);

    useEffect(() => {
        if (activeRef.current && scrollRef.current) {
            const container = scrollRef.current;
            const active = activeRef.current;
            const scrollLeft = active.offsetLeft - container.offsetWidth / 2 + active.offsetWidth / 2;
            container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }
    }, [activeCategory]);

    return (
        <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto pb-4 pt-1 no-scrollbar sticky top-[73px] bg-white/90 backdrop-blur-md z-40 -mx-4 px-4 sm:mx-0 sm:px-0 border-b border-[#F4F2E6]/50 mb-8"
        >
            {categories.map((cat) => {
                const isActive = cat === activeCategory;
                const icon = getCategoryIcon(cat);

                return (
                    <button
                        key={cat}
                        ref={isActive ? activeRef : null}
                        onClick={() => onSelect(cat)}
                        className={`flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl px-6 transition-all duration-300 font-black text-xs uppercase tracking-widest ${isActive
                            ? 'bg-primary text-charcoal shadow-xl shadow-primary/20 scale-105'
                            : 'bg-[#F4F2E6] text-slate-500 hover:bg-primary/20 hover:text-charcoal'
                            }`}
                    >
                        {icon && (
                            <span className={`material-symbols-outlined text-lg ${isActive ? 'text-charcoal' :
                                (icon === 'eco' ? 'text-green-600' :
                                    icon === 'restaurant' ? 'text-red-500' :
                                        icon === 'local_bar' ? 'text-blue-500' :
                                            icon === 'bakery_dining' ? 'text-orange-500' : 'text-slate-400')
                                }`}>
                                {icon}
                            </span>
                        )}
                        <span>{cat}</span>
                    </button>
                );
            })}
        </div>
    );
}
