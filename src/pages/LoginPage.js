import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function LoginPage() {
    const navigate = useNavigate();
    const [isSignUp, setIsSignUp] = useState(false);

    // Form fields
    const [restaurantName, setRestaurantName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) navigate('/dashboard', { replace: true });
        });
    }, [navigate]);

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isSignUp) {
                // 1. Basic validation
                if (!restaurantName.trim()) throw new Error('Restaurant Name is required');
                if (!phone.trim()) throw new Error('Contact Number is required');
                if (phone.length !== 10) throw new Error('Contact Number must be 10 digits');

                // 2. Sign up user
                const { data: authData, error: signUpErr } = await supabase.auth.signUp({ email, password });
                if (signUpErr) throw signUpErr;

                if (authData.user) {
                    // 3. Create restaurant profile immediately
                    const { error: profileErr } = await supabase.from('restaurants').insert({
                        owner_id: authData.user.id,
                        name: restaurantName.trim(),
                        phone: phone.trim()
                    });
                    if (profileErr) throw profileErr;

                    navigate('/dashboard', { replace: true });
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                navigate('/dashboard', { replace: true });
            }
        } catch (err) {
            console.error('Auth Error Details:', err);
            let msg = err.message;
            if (msg.includes('fetch')) {
                msg = 'Connection Error: Failed to reach Supabase. Please check if your project is PAUSED or if an AdBlocker is blocking supabase.co';
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-background-light flex">
            {/* Left — Hero Image */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden rounded-r-3xl">
                <img
                    src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80"
                    alt="Restaurant"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 p-10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex items-center justify-center p-2 bg-primary/20 rounded-lg text-primary backdrop-blur-sm">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                        </div>
                        <span className="text-white text-lg font-bold">QR Menu Pro</span>
                    </div>
                    <h2 className="text-4xl font-black text-white leading-tight tracking-tight">
                        Elevate your<br />dining experience.
                    </h2>
                    <p className="text-white/70 mt-4 max-w-md text-sm leading-relaxed">
                        The most intuitive dashboard for restaurant owners to manage menus
                        and track customer insights in real-time.
                    </p>
                </div>
            </div>

            {/* Right — Login Form */}
            <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
                <div className="w-full max-w-md animate-fade-in py-8">
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">
                        {isSignUp ? 'Create Restaurant Account' : 'Admin Login'}
                    </h1>
                    <p className="text-slate-500 mt-2 mb-8">
                        {isSignUp ? 'Join QR Menu Pro and digitize your restaurant today.' : 'Welcome back! Please enter your details.'}
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Extra fields for Sign Up */}
                        {isSignUp && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 animate-fade-in">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Restaurant Name</label>
                                    <input
                                        type="text" value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)}
                                        required placeholder="e.g. Green Bistro" className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Contact Number</label>
                                    <input
                                        type="tel" value={phone} maxLength={10}
                                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        required placeholder="10-digit number" className="input-field"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                    </svg>
                                </span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="e.g. owner@restaurant.com"
                                    className="input-field pl-12"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                    </svg>
                                </span>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    placeholder="••••••••"
                                    className="input-field pl-12 pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        {showPassword ? (
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                        ) : (
                                            <>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </>
                                        )}
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 animate-fade-in">
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary h-12 flex items-center justify-center gap-2 
                         disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                            ) : (
                                isSignUp ? 'Create Restaurant Account' : 'Sign In securely'
                            )}
                        </button>
                    </form>

                    {/* Divider mask wrapper so it doesn't bump the bottom visually */}
                    <div className="mt-8 pt-6 border-t border-slate-100">
                        {/* Toggle */}
                        <p className="text-center text-sm text-slate-500">
                            {isSignUp ? 'Already have an account? ' : 'New restaurant owner? '}
                            <button
                                onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                                className="font-bold text-primary hover:underline hover:text-green-600 transition-colors"
                            >
                                {isSignUp ? 'Sign In instead' : 'Create an account'}
                            </button>
                        </p>

                        {/* Footer links removed */}
                    </div>
                </div>
            </div>

            {/* Background decoration */}
            <div className="fixed top-0 right-0 -z-10 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
        </div>
    );
}
