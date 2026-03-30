import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function CartBar({ itemCount, total, tableNumber, restaurantId }) {
    const navigate = useNavigate();

    if (itemCount === 0) return null;

    const handleOpenCart = () => {
        navigate(`/menu/${restaurantId}/cart${tableNumber ? `?table=${tableNumber}` : ''}`);
    };

    return (
        <footer className="fixed bottom-4 left-4 right-4 z-50 pointer-events-none animate-slide-up">
            <div className="max-w-[500px] mx-auto pointer-events-auto">
                <div
                    onClick={handleOpenCart}
                    className="bg-charcoal rounded-2xl shadow-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-charcoal/90 active:scale-[0.98] transition-all"
                >
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <span className="material-symbols-outlined text-primary text-xl">shopping_cart</span>
                            <span className="absolute -top-2 -right-2 bg-primary text-charcoal text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full">
                                {itemCount}
                            </span>
                        </div>
                        <span className="text-white text-sm font-bold">{itemCount} Item{itemCount !== 1 ? 's' : ''} · ₹{total.toFixed(0)}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-primary text-charcoal px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider">
                        View Cart
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
