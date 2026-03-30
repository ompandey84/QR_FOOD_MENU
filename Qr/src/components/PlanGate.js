import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from './ConfirmDialog';
import { supabase } from '../supabaseClient';

export default function PlanGate({ isAllowed, featureName, currentPlan, restaurantId, children }) {
    const navigate = useNavigate();
    const [showConfirm, setShowConfirm] = useState(false);
    const [upgrading, setUpgrading] = useState(false);

    if (isAllowed) {
        return <>{children}</>;
    }

    const upgradeCost = currentPlan === 'starter' ? 130 : currentPlan === 'growth' ? 50 : 0;

    const handleUpgrade = async () => {
        setUpgrading(true);
        const { error } = await supabase.from('restaurants').update({ plan: 'pro' }).eq('id', restaurantId);
        setUpgrading(false);
        if (!error) {
            window.location.reload(); // Hard reload to quickly apply unlocked limits system-wide
        } else {
            console.error('Upgrade failed:', error);
            setShowConfirm(false);
        }
    };

    return (
        <div className="relative group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            <div className="opacity-20 pointer-events-none filter blur-[2px] select-none h-[250px] overflow-hidden">
                {children}
            </div>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-gradient-to-t from-slate-100/90 via-slate-100/50 to-transparent backdrop-blur-[1px]">
                <div className="w-12 h-12 bg-charcoal rounded-full flex items-center justify-center shadow-lg mb-3">
                    <span className="material-symbols-outlined text-primary text-xl">lock</span>
                </div>
                <h3 className="text-charcoal font-black text-xl mb-1">{featureName}</h3>
                <p className="text-slate-500 text-sm text-center font-medium max-w-xs mb-5">
                    Upgrade your plan to unlock {featureName.toLowerCase()} and grow your business.
                </p>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/subscription')}
                        className="bg-white text-charcoal font-bold px-4 py-2.5 rounded-xl border border-slate-200 text-sm shadow-sm hover:bg-slate-50 transition-all"
                    >
                        View Plans
                    </button>
                    {upgradeCost > 0 && (
                        <button
                            onClick={() => setShowConfirm(true)}
                            className="bg-primary text-charcoal font-bold px-6 py-2.5 rounded-xl text-sm shadow-sm hover:bg-[#F0C900] active:scale-95 transition-all flex items-center gap-2"
                        >
                            Pay ₹{upgradeCost} to Upgrade to Pro
                        </button>
                    )}
                </div>
            </div>

            <ConfirmDialog
                isOpen={showConfirm}
                title="Upgrade to Pro Plan"
                message={`You are currently on the ${currentPlan === 'starter' ? 'Starter' : 'Growth'} plan. Confirm payment of ₹${upgradeCost} to instantly upgrade to the Pro plan and unlock all features?`}
                onConfirm={handleUpgrade}
                onCancel={() => !upgrading && setShowConfirm(false)}
                confirmText={upgrading ? "Upgrading..." : "Confirm Upgrade"}
                confirmColor="primary"
            />
        </div>
    );
}
