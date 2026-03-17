import React from 'react';
import { useNavigate } from 'react-router-dom';

function TopNav({ title, children }) {
    const navigate = useNavigate();

    const navLinks = [
        { name: 'Dashboard', path: '/dashboard' },
        { name: 'Orders', path: '/orders' },
        { name: 'Settings', path: '/settings' },
    ];

    return (
        <header className="flex items-center justify-between border-b border-primary/10 bg-white px-6 lg:px-10 py-3 sticky top-0 z-50">
            <div className="flex items-center gap-8">
                {/* Mobile logo */}
                <div className="flex lg:hidden items-center gap-3">
                    <div className="flex items-center justify-center p-2 bg-primary/20 rounded-lg text-primary">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-bold leading-tight tracking-tight">SmartMenu</h2>
                </div>
                <h1 className="hidden lg:block text-lg font-bold tracking-tight">{title}</h1>
                {/* Mobile nav links */}
                <nav className="hidden md:flex lg:hidden items-center gap-6">
                    {navLinks.map((link) => (
                        <button
                            key={link.name}
                            onClick={() => navigate(link.path)}
                            className="text-sm font-medium text-slate-600 hover:text-primary transition-colors"
                        >
                            {link.name}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="flex items-center gap-4">
                {children}
            </div>
        </header>
    );
}

export default TopNav;
