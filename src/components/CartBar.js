import React from 'react';

export default function CartBar({ itemCount, total, tableNumber, onTableChange, onCheckout }) {
    if (itemCount === 0) return null;

    return (
        <footer className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none animate-slide-up">
            <div className="max-w-[1200px] mx-auto pointer-events-auto">
                <div className="bg-charcoal rounded-2xl shadow-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between border border-white/10 backdrop-blur-lg gap-4">
                    <div className="flex items-center gap-4 px-2 justify-between sm:justify-start">
                        <div className="flex items-center gap-4">
                            <div className="bg-primary/20 p-2 rounded-lg shrink-0">
                                <span className="material-symbols-outlined text-primary">shopping_cart_checkout</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-white text-sm font-bold">{itemCount} Items Added</span>
                                <span className="text-white/60 text-xs font-medium">₹{total.toFixed(0)}</span>
                            </div>
                        </div>

                        {/* Table Input */}
                        <div className="flex flex-col items-end sm:items-start pl-4 sm:pl-0 sm:border-l sm:border-white/10 sm:ml-4">
                            <span className="text-white/40 text-[10px] uppercase font-bold tracking-wider mb-1">Table No.</span>
                            <input
                                type="text"
                                value={tableNumber}
                                onChange={(e) => onTableChange(e.target.value)}
                                placeholder="--"
                                className="w-12 bg-white/10 border border-white/20 rounded-lg text-sm font-bold text-white text-center py-1 outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-white/30"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6 justify-between sm:justify-end w-full sm:w-auto">
                        <div className="hidden sm:block text-right">
                            <span className="text-white/60 text-xs font-medium block uppercase tracking-wider">Total</span>
                            <span className="text-primary text-lg font-black tracking-tight">₹{total.toFixed(0)}</span>
                        </div>
                        <button
                            onClick={onCheckout}
                            className="bg-primary text-charcoal flex-1 sm:flex-none px-6 sm:px-8 h-12 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-white active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            Checkout
                            <span className="material-symbols-outlined text-lg">arrow_forward</span>
                        </button>
                    </div>
                </div>
            </div>
        </footer>
    );
}
