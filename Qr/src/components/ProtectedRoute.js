import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function ProtectedRoute({ children }) {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [hasPlan, setHasPlan] = useState(true); // assume true until checked
    const location = useLocation();

    useEffect(() => {
        checkUser();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                checkPlan(session.user.id);
            } else {
                setLoading(false);
            }
        });
        return () => subscription.unsubscribe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function checkUser() {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        if (user) {
            await checkPlan(user.id);
        }
        setLoading(false);
    }

    async function checkPlan(userId) {
        try {
            const { data: rest } = await supabase
                .from('restaurants')
                .select('plan')
                .eq('owner_id', userId)
                .single();
            setHasPlan(!!(rest && rest.plan));
        } catch {
            setHasPlan(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background-light flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) return <Navigate to="/login" replace />;

    // If no plan selected and not already on subscription page, force subscription
    if (!hasPlan && location.pathname !== '/subscription') {
        return <Navigate to="/subscription" replace />;
    }

    return children;
}
