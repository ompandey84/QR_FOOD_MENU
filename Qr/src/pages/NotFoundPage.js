import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
    return (
        <div className="min-h-screen bg-[#FCFAF5] flex flex-col items-center justify-center p-6 text-center">
            <h1 className="text-8xl font-black text-charcoal mb-4 tracking-tighter">404</h1>
            <h2 className="text-2xl font-bold text-slate-700 mb-2">Page Not Found</h2>
            <p className="text-slate-500 mb-8 max-w-sm">Oops! The page you are looking for doesn't exist or has been moved.</p>
            <Link to="/" className="flex items-center gap-2 bg-primary text-charcoal font-black text-sm px-6 py-3 rounded-xl hover:bg-primary/80 transition-all shadow-sm">
                Return to Home
            </Link>
        </div>
    );
}
