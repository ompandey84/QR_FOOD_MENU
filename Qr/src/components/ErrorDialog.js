import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ErrorDialog({ isOpen, title, message, onClose }) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    />

                    {/* Dialog */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
                    >
                        <div className="p-6 sm:p-8 text-center">
                            {/* Icon */}
                            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5 border-[6px] border-red-100/50">
                                <span className="material-symbols-outlined text-red-500 text-3xl">error</span>
                            </div>

                            {/* Content */}
                            <h3 className="text-xl font-black text-charcoal mb-2">{title || 'Oops!'}</h3>
                            <p className="text-slate-500 text-sm leading-relaxed mb-8">
                                {message || 'Something went wrong. Please try again.'}
                            </p>

                            {/* Action */}
                            <button
                                onClick={onClose}
                                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl transition-colors active:scale-[0.98]"
                            >
                                Okay
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
