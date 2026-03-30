import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { supabase } from '../supabaseClient';
import { compressImage } from '../lib/imageUtils';
import { FiSave, FiUpload } from 'react-icons/fi';
import ErrorDialog from '../components/ErrorDialog';

export default function SettingsPage() {
    const navigate = useNavigate();
    const [restaurant, setRestaurant] = useState(null);
    const [form, setForm] = useState({ name: '', phone: '', address: '', description: '', city: '' });
    const [isAccepting, setIsAccepting] = useState(true);
    const [whatsappReceipts, setWhatsappReceipts] = useState(false);
    const [checkoutFields, setCheckoutFields] = useState({ name: true, phone: true, table: false });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [errorDialog, setErrorDialog] = useState({ isOpen: false, title: '', message: '' });

    const showError = (title, message) => setErrorDialog({ isOpen: true, title, message });

    useEffect(() => {
        async function loadRestaurant() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return navigate('/login');
            const { data } = await supabase.from('restaurants').select('*').eq('owner_id', user.id).single();
            if (data) {
                setRestaurant(data);
                setForm({
                    name: data.name || '',
                    phone: data.phone || '',
                    address: data.address || '',
                    description: data.description || '',
                    city: data.city || '',
                });
                setIsAccepting(data.is_accepting_orders ?? true);
                setWhatsappReceipts(data.whatsapp_receipts_enabled ?? false);
                setCheckoutFields(data.checkout_fields ?? { name: true, phone: true, table: false });
                setLogoPreview(data.logo_url || null);
            }
        }
        loadRestaurant();
    }, [navigate]);

    const handleLogoChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) return showError('File Too Large', 'Logo must be under 2MB.');
        setLogoFile(file);
        setLogoPreview(URL.createObjectURL(file));
    };

    const uploadLogo = async () => {
        if (!logoFile) return restaurant?.logo_url || null;
        setUploadingLogo(true);
        try {
            const compressed = await compressImage(logoFile, { maxWidthOrHeight: 800 });
            const ext = compressed.name.split('.').pop() || 'jpg';
            const filePath = `logos/${restaurant.id}.${ext}`;
            const { error: uploadErr } = await supabase.storage.from('menu-images').upload(filePath, compressed, { upsert: true });
            if (uploadErr) throw uploadErr;
            const { data: urlData } = supabase.storage.from('menu-images').getPublicUrl(filePath);
            return urlData?.publicUrl || null;
        } catch (err) {
            showError('Upload Failed', 'Failed to upload logo: ' + err.message);
            return restaurant?.logo_url || null;
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!restaurant) return;
        if (!form.name.trim()) return showError('Validation Error', 'Restaurant Name is required.');
        if (form.phone && !/^\d{10}$/.test(form.phone)) return showError('Validation Error', 'Contact Number must be exactly 10 digits.');

        setSaving(true);
        const logoUrl = await uploadLogo();

        const { error } = await supabase.from('restaurants').update({
            name: form.name.trim(),
            phone: form.phone.trim(),
            address: form.address.trim(),
            description: form.description.trim(),
            city: form.city.trim(),
            logo_url: logoUrl,
            whatsapp_receipts_enabled: whatsappReceipts,
            checkout_fields: checkoutFields,
            updated_at: new Date().toISOString(),
        }).eq('id', restaurant.id);

        setSaving(false);
        if (error) return showError('Save Failed', error.message);
        setRestaurant(prev => ({ ...prev, ...form, logo_url: logoUrl, whatsapp_receipts_enabled: whatsappReceipts, checkout_fields: checkoutFields }));
        setLogoFile(null);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const handleToggleAccepting = async () => {
        const newVal = !isAccepting;
        setIsAccepting(newVal);
        const { error } = await supabase.from('restaurants').update({ is_accepting_orders: newVal }).eq('id', restaurant.id);
        if (error) {
            setIsAccepting(!newVal);
            showError('Update Failed', 'Could not update order status. Please try again.');
        }
    };

    async function handleLogout() {
        await supabase.auth.signOut();
        navigate('/login', { replace: true });
    }

    const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

    return (
        <MainLayout activeLink="Settings" title="Restaurant Settings">
            <main className="flex-1 p-6 lg:p-10 max-w-4xl">
                <h1 className="text-3xl font-black tracking-tight mb-2">Restaurant Settings</h1>
                <p className="text-slate-500 mb-8">Manage your restaurant profile, branding, and order preferences.</p>

                {/* General Info */}
                <div className="card mb-6">
                    <div className="flex items-center gap-2 mb-6">
                        <span className="text-lg">ℹ️</span>
                        <h2 className="text-lg font-bold tracking-tight">General Information</h2>
                    </div>
                    <form onSubmit={handleSave} className="space-y-6">
                        {/* Logo */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Restaurant Logo</label>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden border border-slate-100 cursor-pointer relative group" onClick={() => document.getElementById('logo-upload').click()}>
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-primary text-2xl font-black">{form.name?.[0] || 'R'}</span>
                                    )}
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                                        <FiUpload className="text-white w-4 h-4" />
                                    </div>
                                </div>
                                <label className="btn-primary text-sm !py-2.5 flex items-center gap-2 cursor-pointer">
                                    <FiUpload className="w-4 h-4" />
                                    {uploadingLogo ? 'Uploading...' : 'Upload New'}
                                    <input id="logo-upload" type="file" className="hidden" accept="image/*" onChange={handleLogoChange} />
                                </label>
                                <p className="text-xs text-slate-400">JPG, PNG. Max 2MB.</p>
                            </div>
                        </div>

                        {/* Name & Phone */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Restaurant Name *</label>
                                <input type="text" value={form.name} onChange={e => set('name', e.target.value)} required className="input-field" placeholder="e.g. Green Bistro & Deli" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Contact Number</label>
                                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} className="input-field" placeholder="10-digit mobile number" maxLength={10} />
                            </div>
                        </div>

                        {/* City & Address */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">City</label>
                                <input type="text" value={form.city} onChange={e => set('city', e.target.value)} className="input-field" placeholder="e.g. Mumbai" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Store Address</label>
                                <input type="text" value={form.address} onChange={e => set('address', e.target.value)} className="input-field" placeholder="123 Main Street, City" />
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                            <textarea rows="3" value={form.description} onChange={e => set('description', e.target.value)} className="input-field resize-none" placeholder="Tell your customers about your restaurant..." />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <button type="button" onClick={handleLogout} className="btn-danger text-sm">Sign Out</button>
                            <div className="flex items-center gap-3">
                                {saved && <span className="text-primary text-sm font-semibold">✓ Saved!</span>}
                                <button type="submit" disabled={saving || uploadingLogo} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
                                    {(saving || uploadingLogo) ? <div className="w-4 h-4 border-2 border-charcoal/30 border-t-charcoal rounded-full animate-spin" /> : <FiSave className="w-4 h-4" />}
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Accepting Orders Toggle */}
                <div className="card mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isAccepting ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                <span className="material-symbols-outlined">{isAccepting ? 'storefront' : 'store'}</span>
                            </div>
                            <div>
                                <h3 className={`font-bold ${isAccepting ? 'text-green-600' : 'text-slate-500'}`}>
                                    {isAccepting ? 'Accepting Orders' : 'Orders Paused'}
                                </h3>
                                <p className="text-xs text-slate-400">Customers can {isAccepting ? '' : 'not '}place orders from the QR menu</p>
                            </div>
                        </div>
                        <button
                            onClick={handleToggleAccepting}
                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${isAccepting ? 'bg-green-500' : 'bg-slate-300'}`}
                        >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${isAccepting ? 'translate-x-[22px]' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>

                {/* WhatsApp Receipts Toggle */}
                <div className="card mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${whatsappReceipts ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                            </div>
                            <div>
                                <h3 className={`font-bold ${whatsappReceipts ? 'text-green-600' : 'text-slate-500'}`}>
                                    WhatsApp Receipts
                                </h3>
                                <p className="text-xs text-slate-400">Allow customers to share order receipts via WhatsApp after checkout</p>
                            </div>
                        </div>
                        <button
                            onClick={async () => {
                                const newVal = !whatsappReceipts;
                                setWhatsappReceipts(newVal);
                                await supabase.from('restaurants').update({ whatsapp_receipts_enabled: newVal }).eq('id', restaurant.id);
                            }}
                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${whatsappReceipts ? 'bg-green-500' : 'bg-slate-300'}`}
                        >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${whatsappReceipts ? 'translate-x-[22px]' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>

                {/* Customer Checkout Fields */}
                <div className="card mb-6">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-lg">📝</span>
                        <h2 className="text-lg font-bold tracking-tight">Customer Checkout Fields</h2>
                    </div>
                    <p className="text-sm text-slate-400 mb-5">Choose which fields to ask customers during checkout.</p>
                    <div className="space-y-4">
                        {[
                            { key: 'name', label: 'Customer Name', desc: 'Ask for customer\'s name' },
                            { key: 'phone', label: 'Phone Number', desc: 'Ask for mobile number' },
                            { key: 'table', label: 'Table Number', desc: 'Ask which table they are sitting at' },
                        ].map(field => (
                            <div key={field.key} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                                <div>
                                    <h4 className="text-sm font-bold text-charcoal">{field.label}</h4>
                                    <p className="text-xs text-slate-400">{field.desc}</p>
                                </div>
                                <button
                                    onClick={async () => {
                                        const updated = { ...checkoutFields, [field.key]: !checkoutFields[field.key] };
                                        setCheckoutFields(updated);
                                        await supabase.from('restaurants').update({ checkout_fields: updated }).eq('id', restaurant.id);
                                    }}
                                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${checkoutFields[field.key] ? 'bg-green-500' : 'bg-slate-300'}`}
                                >
                                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${checkoutFields[field.key] ? 'translate-x-[22px]' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
            <div className="fixed top-0 right-0 -z-10 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
            <ErrorDialog
                isOpen={errorDialog.isOpen}
                title={errorDialog.title}
                message={errorDialog.message}
                onClose={() => setErrorDialog({ ...errorDialog, isOpen: false })}
            />
        </MainLayout>
    );
}
