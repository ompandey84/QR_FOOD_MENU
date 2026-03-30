import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import ErrorDialog from '../components/ErrorDialog';
import MainLayout from '../components/MainLayout';

const PLANS = [
    {
        id: 'starter',
        name: 'Starter',
        price: 69,
        description: 'Perfect for small cafes just getting started.',
        features: [
            'Up to 20 menu items',
            'Up to 3 QR codes',
            'Order management system',
        ],
        notIncluded: [
            'Analytics dashboard',
            'Offers & promo codes',
            "Chef's Picks billboard",
            'Custom logo & branding',
            'WhatsApp receipts',
            'Priority support'
        ]
    },
    {
        id: 'growth',
        name: 'Growth',
        price: 149,
        description: 'Everything you need to grow your restaurant.',
        isPopular: true,
        features: [
            'Up to 50 menu items',
            'Up to 8 QR codes',
            'Order management system',
            "Basic Analytics (Today's stats)",
            'Up to 3 active promo codes',
            'Custom logo & branding'
        ],
        notIncluded: [
            "Chef's Picks billboard",
            'WhatsApp receipts',
            'Priority support'
        ]
    },
    {
        id: 'pro',
        name: 'Pro',
        price: 199,
        description: 'Advanced features for established restaurants.',
        features: [
            'Unlimited menu items',
            'Unlimited QR codes',
            'Order management system',
            'Full Analytics (Charts & trends)',
            'Unlimited active promo codes',
            "Chef's Picks billboard",
            'Custom logo & branding',
            'WhatsApp receipts',
            'Priority support'
        ],
        notIncluded: []
    }
];

export default function SubscriptionPage() {
    const navigate = useNavigate();
    const [loadingId, setLoadingId] = useState(null);
    const [errorDialog, setErrorDialog] = useState({ isOpen: false, title: '', message: '' });
    const [currentPlan, setCurrentPlan] = useState(null);

    useEffect(() => {
        const fetchPlan = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data: rest } = await supabase.from('restaurants').select('plan').eq('owner_id', user.id).single();
            if (rest && rest.plan) setCurrentPlan(rest.plan);
        };
        fetchPlan();
    }, []);

    const currentTier = currentPlan ? { starter: 1, growth: 2, pro: 3 }[currentPlan] : 0;
    const [showPayment, setShowPayment] = useState(false);
    const [selectedPlanDetails, setSelectedPlanDetails] = useState(null);

    const handleSelectPlan = (planId) => {
        const plan = PLANS.find(p => p.id === planId);
        setSelectedPlanDetails(plan);
        setShowPayment(true);
    };

    const handleConfirmPayment = async () => {
        setLoadingId(selectedPlanDetails.id);
        setShowPayment(false);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("You must be logged in to select a plan.");

            // Update the restaurant's plan after 'successful' mock payment
            const { error: updateErr } = await supabase
                .from('restaurants')
                .update({ plan: selectedPlanDetails.id })
                .eq('owner_id', user.id);

            if (updateErr) throw updateErr;

            // Redirect to dashboard
            navigate('/dashboard');

        } catch (err) {
            console.error(err);
            setErrorDialog({
                isOpen: true,
                title: 'Activation Failed',
                message: err.message || 'Could not activate plan. Please try again.'
            });
        } finally {
            setLoadingId(null);
            setSelectedPlanDetails(null);
        }
    };

    return (
        <MainLayout activeLink="My Plan" title="My Plan">
            <div className="max-w-7xl mx-auto">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h1 className="text-4xl font-black text-charcoal tracking-tight sm:text-5xl mb-4">
                        Choose Your Plan
                    </h1>
                    <p className="text-lg text-slate-500">
                        Unlock powerful features to manage and scale your restaurant. Upgrade or downgrade at any time.
                    </p>
                    <button
                        onClick={async () => {
                            await supabase.auth.signOut();
                            navigate('/login', { replace: true });
                        }}
                        className="mt-4 text-sm text-slate-400 hover:text-red-500 font-medium underline transition-colors"
                    >
                        Sign out instead
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start max-w-6xl mx-auto">
                    {PLANS.map((plan) => {
                        const isLowerTier = currentTier > { starter: 1, growth: 2, pro: 3 }[plan.id];
                        return (
                        <div
                            key={plan.id}
                            className={`relative bg-white rounded-3xl p-8 flex flex-col h-full shadow-xl transition-transform duration-300 hover:-translate-y-2
                            ${plan.isPopular ? 'border-2 border-primary ring-4 ring-primary/10' : 'border border-slate-100'}
                            ${isLowerTier ? 'opacity-50 grayscale-[50%]' : ''}`}
                        >
                            {plan.isPopular && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-charcoal font-black text-xs uppercase tracking-widest px-4 py-1.5 rounded-full shadow-sm">
                                    Most Popular
                                </div>
                            )}

                            <div className="mb-6">
                                <h2 className="text-2xl font-black text-charcoal">{plan.name}</h2>
                                <p className="text-slate-500 text-sm mt-2 min-h-[40px]">{plan.description}</p>
                            </div>

                            <div className="mb-8 flex items-baseline text-charcoal">
                                <span className="text-5xl font-black tracking-tight">₹{plan.price}</span>
                                <span className="text-slate-500 ml-1 font-medium">/month</span>
                            </div>

                            <button
                                onClick={() => handleSelectPlan(plan.id)}
                                disabled={loadingId !== null || currentPlan === plan.id || isLowerTier}
                                className={`w-full py-4 rounded-xl font-bold text-sm tracking-wide transition-all mb-8 shadow-sm flex items-center justify-center gap-2
                                ${currentPlan === plan.id || isLowerTier
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-2 border-slate-200' 
                                    : plan.isPopular
                                        ? 'bg-charcoal text-white hover:bg-slate-800 hover:shadow-md'
                                        : 'bg-primary text-charcoal hover:bg-[#F0C900] hover:shadow-md'}
                                ${loadingId === plan.id ? 'opacity-80 cursor-wait' : ''}`}
                            >
                                {loadingId === plan.id ? (
                                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : currentPlan === plan.id ? (
                                    'Current Plan'
                                ) : isLowerTier ? (
                                    'Lower Tier'
                                ) : (
                                    'Select Plan'
                                )}
                            </button>

                            <div className="flex-1 space-y-4">
                                {plan.features.map((feature, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-green-500 text-xl shrink-0">check_circle</span>
                                        <span className="text-sm font-medium text-slate-700">{feature}</span>
                                    </div>
                                ))}
                                {plan.notIncluded.map((feature, i) => (
                                    <div key={`not-${i}`} className="flex items-start gap-3 opacity-40">
                                        <span className="material-symbols-outlined text-slate-400 text-xl shrink-0">cancel</span>
                                        <span className="text-sm font-medium text-slate-500 line-through">{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        );
                    })}
                </div>
            </div>

            {/* Mock Payment Dialog */}
            {showPayment && selectedPlanDetails && (
                <div className="fixed inset-0 z-[200] overflow-y-auto">
                    <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm transition-opacity" onClick={() => setShowPayment(false)} />
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-black text-charcoal flex items-center gap-2">
                                    <span className="material-symbols-outlined text-green-500">lock</span>
                                    Secure Checkout
                                </h3>
                                <button onClick={() => setShowPayment(false)} className="text-slate-400 hover:text-charcoal transition-colors">✕</button>
                            </div>
                            
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
                                <div className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Plan Selected</div>
                                <div className="text-lg font-black text-charcoal">{selectedPlanDetails.name} Plan</div>
                                <div className="text-3xl font-black text-primary mt-2 flex items-end gap-1">
                                    ₹{selectedPlanDetails.price} <span className="text-sm text-slate-500 font-medium mb-1">/ month</span>
                                </div>
                            </div>

                            <p className="text-sm text-slate-500 mb-6 text-center font-medium">
                                This is a demo platform. Click below to simulate a successful payment.
                            </p>

                            <button
                                onClick={handleConfirmPayment}
                                disabled={loadingId === selectedPlanDetails.id}
                                className="w-full btn-primary py-4 text-base shadow-lg shadow-primary/20 flex justify-center items-center gap-2"
                            >
                                {loadingId === selectedPlanDetails.id ? (
                                    <div className="w-5 h-5 border-2 border-charcoal/20 border-t-charcoal rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">payments</span>
                                        Pay ₹{selectedPlanDetails.price} Now
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ErrorDialog
                isOpen={errorDialog.isOpen}
                title={errorDialog.title}
                message={errorDialog.message}
                onClose={() => setErrorDialog({ ...errorDialog, isOpen: false })}
            />
        </MainLayout>
    );
}
