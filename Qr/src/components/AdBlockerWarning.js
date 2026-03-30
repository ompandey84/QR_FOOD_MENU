import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FiAlertTriangle, FiX } from 'react-icons/fi';

export default function AdBlockerWarning() {
    const [isBlocked, setIsBlocked] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        let isMounted = true;
        
        async function checkSupabaseConnection() {
            // Do not check for adblockers if the URL is literally just missing from Environment Variables
            if (!process.env.REACT_APP_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL.includes('placeholder')) {
                return;
            }

            try {
                // A lightweight ping to check if the network request is blocked
                // Adblockers usually intercept and block the actual fetch call entirely 
                // throwing a "Failed to fetch" TypeError.
                const { error } = await supabase.from('restaurants').select('id').limit(1);
                
                // If there's an error but it's not a generic fetch/network failure, that's fine 
                // (e.g., auth error, or RLS error means it connected successfully).
                // But if it's a TypeError "Failed to fetch", it's likely an AdBlocker.
                if (error && error.message && error.message.includes('Failed to fetch')) {
                    if (isMounted) setIsBlocked(true);
                }
            } catch (err) {
                if (err.message && err.message.includes('Failed to fetch')) {
                    if (isMounted) setIsBlocked(true);
                }
            }
        }

        checkSupabaseConnection();

        return () => { isMounted = false; };
    }, []);

    if (!isBlocked || dismissed) return null;

    return (
        <div className="bg-red-500 text-white px-4 py-3 shadow-lg flex items-start sm:items-center justify-between z-[100] relative">
            <div className="flex items-start sm:items-center gap-3 max-w-7xl mx-auto w-full">
                <div className="bg-red-600/50 p-2 rounded-lg shrink-0 mt-0.5 sm:mt-0">
                    <FiAlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1 text-sm font-medium pr-4">
                    <strong className="font-black block sm:inline">Connection Blocked! </strong>
                    <span className="opacity-90">
                        Your browser's AdBlocker or privacy shield (like Brave Shields, uBlock, etc.) is blocking our database connection. Please <b>disable it for this site</b> to allow menus and orders to load properly.
                    </span>
                </div>
                <button 
                    onClick={() => setDismissed(true)}
                    className="p-2 hover:bg-red-600/50 rounded-lg shrink-0 transition-colors"
                    aria-label="Dismiss warning"
                >
                    <FiX className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
