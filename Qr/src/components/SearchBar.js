import React from 'react';
import { FiSearch, FiX } from 'react-icons/fi';

export default function SearchBar({ value, onChange }) {
    return (
        <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FiSearch className="h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
            </div>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Search dishes, categories..."
                className="w-full pl-12 pr-10 h-12 rounded-xl border border-slate-200 
                   bg-white shadow-sm
                   focus:ring-2 focus:ring-primary/30 focus:border-primary 
                   outline-none transition-all duration-300
                   placeholder:text-slate-400 text-slate-800 text-sm font-medium"
            />
            {value && (
                <button
                    onClick={() => onChange('')}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center 
                     text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <FiX className="h-5 w-5" />
                </button>
            )}
        </div>
    );
}
