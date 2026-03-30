import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const PLAN_LIMITS = {
    starter: {
        maxItems: 20,
        maxQRs: 3,
        hasAnalytics: false,
        maxOffers: 0,
        hasChefsPicks: false,
        hasCustomLogo: false,
        hasWhatsAppReceipt: false
    },
    growth: {
        maxItems: 50,
        maxQRs: 8,
        hasAnalytics: true,
        maxOffers: 3,
        hasChefsPicks: false,
        hasCustomLogo: true,
        hasWhatsAppReceipt: false
    },
    pro: {
        maxItems: Infinity,
        maxQRs: Infinity,
        hasAnalytics: true,
        maxOffers: Infinity,
        hasChefsPicks: true,
        hasCustomLogo: true,
        hasWhatsAppReceipt: true
    }
};

export function useSubscription(restaurantId) {
    const [plan, setPlan] = useState(null); // null = no plan selected yet
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!restaurantId) {
            setLoading(false);
            return;
        }

        async function loadPlan() {
            try {
                const { data } = await supabase
                    .from('restaurants')
                    .select('plan')
                    .eq('id', restaurantId)
                    .single();
                
                if (data && data.plan) {
                    setPlan(data.plan);
                }
            } catch (err) {
                console.error('Error fetching subscription plan:', err);
            } finally {
                setLoading(false);
            }
        }

        loadPlan();
    }, [restaurantId]);

    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;

    // Helper functions
    const canAddItem = (currentCount) => currentCount < limits.maxItems;
    const canAddQR = (currentCount) => currentCount < limits.maxQRs;
    const canAddOffer = (currentCount) => currentCount < limits.maxOffers;

    return {
        plan,
        limits,
        loading,
        canAddItem,
        canAddQR,
        canAddOffer
    };
}
