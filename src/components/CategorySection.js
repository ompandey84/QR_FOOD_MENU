import React from 'react';
import DishCard from './DishCard';

export default function CategorySection({ id, title, dishes, cart, onUpdateQuantity }) {
    if (!dishes || dishes.length === 0) return null;
    return (
        <section id={id} className="mb-10 pt-4">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                    {title}
                    <span className="w-12 h-1 bg-primary rounded-full"></span>
                </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {dishes.map((dish) => (
                    <DishCard
                        key={dish.id}
                        dish={dish}
                        quantity={cart[dish.id] || 0}
                        onUpdateQuantity={(qty) => onUpdateQuantity(dish.id, qty)}
                    />
                ))}
            </div>
        </section>
    );
}
