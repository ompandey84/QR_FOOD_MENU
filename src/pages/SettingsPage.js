import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopNav from '../components/TopNav';
import { supabase } from '../supabaseClient';
import { FiSave, FiUpload } from 'react-icons/fi';

export default function SettingsPage() {
    const navigate = useNavigate();
    const [restaurant, setRestaurant] = useState(null);
    const [form, setForm] = useState({ name: '', phone: '', address: '' });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        async function loadRestaurant() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return navigate('/login');
            const { data } = await supabase.from('restaurants').select('*').eq('owner_id', user.id).single();
            if (data) {
                setRestaurant(data);
                setForm({ name: data.name || '', phone: data.phone || '', address: data.address || '' });
            }
        }
        loadRestaurant();
    }, [navigate]);

    async function handleSave() {
        if (!restaurant) return;

        // Basic validation
        if (!form.name.trim()) return alert('Restaurant Name is required');
        if (form.phone && !/^\d{10}$/.test(form.phone)) {
            return alert('Contact Number must be exactly 10 digits');
        }

        setSaving(true);
        try {
            await supabase.from('restaurants').update({
                name: form.name.trim(),
                phone: form.phone.trim(),
                address: form.address.trim()
            }).eq('id', restaurant.id);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleLogoUpload(file) {
        if (!restaurant) return;

        // Basic validation
        if (file.size > 2 * 1024 * 1024) {
            return alert('File size must be less than 2MB');
        }

        try {
            setSaving(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${restaurant.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload image to supabase storage
            const { error: uploadError } = await supabase.storage
                .from('dish-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('dish-images')
                .getPublicUrl(filePath);

            // Update restaurant record
            const { error: updateError } = await supabase
                .from('restaurants')
                .update({ logo_url: publicUrl })
                .eq('id', restaurant.id);

            if (updateError) throw updateError;

            // Update local state to reflect new logo instantly
            setRestaurant({ ...restaurant, logo_url: publicUrl });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);

        } catch (err) {
            alert('Error uploading logo: ' + err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleLogout() {
        await supabase.auth.signOut();
        navigate('/login', { replace: true });
    }

    return (
        <div className="min-h-screen bg-background-light flex">
            <Sidebar active="Settings" />
            <div className="flex-1 flex flex-col min-w-0">
                <TopNav title="Restaurant Settings" activeLink="Settings" />
                <main className="flex-1 p-6 lg:p-10 max-w-4xl">
                    <h1 className="text-3xl font-black tracking-tight mb-2">Restaurant Settings</h1>
                    <p className="text-slate-500 mb-8">Manage your digital presence, store hours, and contact details.</p>

                    {/* General Info */}
                    <div className="card mb-6">
                        <div className="flex items-center gap-2 mb-6">
                            <span className="text-lg">ℹ️</span>
                            <h2 className="text-lg font-bold tracking-tight">General Information</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Restaurant Name</label>
                                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="input-field" placeholder="e.g. Green Bistro & Deli" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Contact Number</label>
                                <input type="tel" value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                    className="input-field" placeholder="10-digit mobile number" maxLength={10} />
                            </div>
                        </div>
                        <div className="mt-6">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Store Address</label>
                            <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                                className="input-field" placeholder="123 Main Street, City" />
                        </div>
                        <div className="mt-6">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Restaurant Logo</label>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
                                    {restaurant?.logo_url ? (
                                        <img src={restaurant.logo_url} alt="Logo" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-primary text-2xl font-black">{form.name?.[0] || 'R'}</span>
                                    )}
                                </div>
                                <label className="btn-primary text-sm !py-2.5 flex items-center gap-2 cursor-pointer">
                                    <FiUpload className="w-4 h-4" /> Upload New
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            handleLogoUpload(e.target.files[0]);
                                        }
                                    }} />
                                </label>
                                <p className="text-xs text-slate-400">JPG, PNG or SVG. Max 2MB.</p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                        <button onClick={handleLogout} className="btn-danger text-sm flex items-center gap-2">
                            Sign Out
                        </button>
                        <div className="flex items-center gap-3">
                            {saved && (
                                <span className="text-primary text-sm font-semibold animate-fade-in">✓ Saved!</span>
                            )}
                            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
                                {saving ? (
                                    <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                                ) : (
                                    <><FiSave className="w-4 h-4" /> Save Changes</>
                                )}
                            </button>
                        </div>
                    </div>
                </main>
            </div>
            <div className="fixed top-0 right-0 -z-10 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
        </div>
    );
}
