import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { FiArrowLeft, FiUpload, FiSave, FiX } from 'react-icons/fi';
import TopNav from '../components/TopNav';

const CATEGORIES = [
    // Indian
    'North Indian', 'South Indian', 'Chinese', 'Mughlai', 'Punjabi', 'Bengali', 'Gujarati', 'Rajasthani', 'Tandoor', 'Biryani',
    // Global
    'Italian', 'Mediterranean', 'Mexican', 'Thai', 'Japanese', 'Korean', 'Continental', 'French', 'American', 'Middle Eastern', 'Lebanese', 'Spanish', 'Greek', 'Turkish', 'Vietnamese',
    // Types
    'Fast Food', 'Street Food', 'Bakery', 'Sweets', 'Healthy', 'Seafood', 'BBQ & Grilled', 'Steak', 'Pizza', 'Burgers & Sandwiches', 'Pasta', 'Sushi', 'Salads', 'Soups', 'Snacks',
    // Course
    'Starters / Appetizers', 'Main Course', 'Breads', 'Rice', 'Desserts', 'Beverages', 'Mocktails', 'Shakes', 'Coffee & Tea',
    'Chef\'s Special', 'Platters', 'Combos', 'Kids Menu', 'Other'
];

export default function DishForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = Boolean(id);

    const [form, setForm] = useState({
        name: '', category: 'Main Course', type: 'veg', price: '', description: '',
        is_vegan: false, is_gluten_free: false, has_egg: false, is_spicy: false,
        is_available: true
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [existingImageUrl, setExistingImageUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(isEdit);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isEdit) fetchDish();
        // eslint-disable-next-line
    }, [id]);

    async function fetchDish() {
        try {
            setFetchLoading(true);
            const { data, error: fetchErr } = await supabase
                .from('menu_items').select('*').eq('id', id).single();
            if (fetchErr) throw fetchErr;
            setForm({
                name: data.name, category: data.category, type: data.type,
                price: data.price.toString(), description: data.description || '',
                is_vegan: data.is_vegan || false,
                is_gluten_free: data.is_gluten_free || false,
                has_egg: data.has_egg || false,
                is_spicy: data.is_spicy || false,
                is_available: data.is_available ?? true
            });
            if (data.image_url) setExistingImageUrl(data.image_url);
        } catch (err) {
            setError(err.message);
        } finally {
            setFetchLoading(false);
        }
    }

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    function handleImageChange(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            alert('Image size must be less than 5MB');
            return;
        }
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    }

    function removeImage() {
        setImageFile(null);
        setImagePreview('');
    }

    async function uploadImage(file) {
        const ext = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
        const { error: uploadErr } = await supabase.storage
            .from('dish-images').upload(fileName, file, { cacheControl: '3600', upsert: false });
        if (uploadErr) throw uploadErr;
        const { data } = supabase.storage.from('dish-images').getPublicUrl(fileName);
        return data.publicUrl;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');
            const { data: rest } = await supabase
                .from('restaurants').select('id').eq('owner_id', user.id).single();
            if (!rest) throw new Error('No restaurant found');

            let imageUrl = existingImageUrl;
            if (imageFile) imageUrl = await uploadImage(imageFile);

            // Core dish data (always safe columns)
            const coreDish = {
                name: form.name.trim(), category: form.category, type: form.type,
                price: parseFloat(form.price), description: form.description.trim(),
                image_url: imageUrl, restaurant_id: rest.id,
                is_available: form.is_available
            };

            // Try to include dietary tags — gracefully skip if columns missing
            const dietaryFields = {};
            if (form.is_vegan !== undefined) dietaryFields.is_vegan = form.is_vegan;
            if (form.is_gluten_free !== undefined) dietaryFields.is_gluten_free = form.is_gluten_free;
            if (form.has_egg !== undefined) dietaryFields.has_egg = form.has_egg;
            if (form.is_spicy !== undefined) dietaryFields.is_spicy = form.is_spicy;

            const dishData = { ...coreDish, ...dietaryFields };

            if (isEdit) {
                const { error: updateErr } = await supabase.from('menu_items').update(dishData).eq('id', id);
                if (updateErr) {
                    // Retry without dietary fields if failing
                    const { error: retryErr } = await supabase.from('menu_items').update(coreDish).eq('id', id);
                    if (retryErr) throw retryErr;
                }
            } else {
                const { error: insertErr } = await supabase.from('menu_items').insert(dishData);
                if (insertErr) {
                    // Retry without dietary fields
                    const { error: retryErr } = await supabase.from('menu_items').insert(coreDish);
                    if (retryErr) throw retryErr;
                }
            }
            navigate('/menu-manager');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    if (fetchLoading) {
        return (
            <div className="min-h-screen bg-background-light flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background-light">
            {/* Navigation with working links */}
            <TopNav title={isEdit ? 'Edit Dish' : 'Add New Dish'} activeLink="Menu" />

            <main className="max-w-[1200px] mx-auto w-full p-6 lg:p-10">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 mb-6 text-sm">
                    <button onClick={() => navigate('/dashboard')} className="text-primary font-medium hover:underline flex items-center gap-1">
                        <FiArrowLeft className="w-4 h-4" /> Dashboard
                    </button>
                    <span className="text-slate-400">›</span>
                    <span className="text-primary font-medium">Menu Editor</span>
                    <span className="text-slate-400">›</span>
                    <span className="text-slate-500 font-medium">{isEdit ? 'Edit Dish' : 'Add New Dish'}</span>
                </div>

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">{isEdit ? 'Edit Dish' : 'Add New Dish'}</h1>
                        <p className="text-slate-500 mt-1">Configure your menu item details, pricing, and dietary tags.</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-3">
                        <button onClick={() => navigate('/dashboard')} className="btn-secondary text-sm !py-2.5">Discard</button>
                        <button onClick={handleSubmit} disabled={loading} className="btn-primary text-sm !py-2.5 flex items-center gap-2">
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                            ) : (
                                <><FiSave className="w-4 h-4" /> Save Dish</>
                            )}
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Left Column: Image & Status */}
                        <div className="lg:col-span-4 flex flex-col gap-6">
                            <div className="card">
                                <h3 className="section-title mb-4">DISH PHOTO</h3>
                                {(imagePreview || existingImageUrl) ? (
                                    <div className="relative rounded-xl overflow-hidden aspect-square bg-slate-100">
                                        <img src={imagePreview || existingImageUrl} alt="Preview" className="w-full h-full object-cover" />
                                        <button type="button" onClick={removeImage}
                                            className="absolute top-3 right-3 p-1.5 rounded-full bg-white/90 text-slate-600 hover:bg-red-50 hover:text-red-500 transition-colors shadow-sm">
                                            <FiX className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="relative group cursor-pointer">
                                        <div className="w-full aspect-square rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 
                                    flex flex-col items-center justify-center p-6 text-center
                                    hover:border-primary/50 transition-colors">
                                            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                                                <FiUpload className="w-6 h-6 text-primary" />
                                            </div>
                                            <p className="text-sm font-semibold text-slate-600">Drag & drop food photo</p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                or <span className="text-primary font-medium">browse files</span> from your computer
                                            </p>
                                            <div className="flex gap-2 mt-3">
                                                {['JPG', 'PNG', 'MAX 5MB'].map(t => (
                                                    <span key={t} className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{t}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                    </label>
                                )}
                                <p className="text-[11px] text-slate-400 mt-3 italic">
                                    Tip: High-quality images with good lighting increase orders by up to 25%.
                                </p>
                            </div>

                            {/* Availability */}
                            <div className="card">
                                <h3 className="section-title mb-4">INVENTORY STATUS</h3>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-semibold">Currently in stock</p>
                                        <p className="text-xs text-slate-500">Item will be visible to customers</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={form.is_available} onChange={() => setForm({...form, is_available: !form.is_available})} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer 
                                    peer-checked:after:translate-x-full peer-checked:after:border-white 
                                    after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                                    after:bg-white after:border-gray-300 after:border after:rounded-full 
                                    after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Form Fields */}
                        <div className="lg:col-span-8 flex flex-col gap-6">
                            <div className="card !p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Dish Name */}
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">DISH NAME</label>
                                        <input type="text" name="name" value={form.name} onChange={handleChange} required
                                            placeholder="e.g. Signature Truffle Carbonara"
                                            className="input-field" />
                                    </div>

                                    {/* Category */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">CATEGORY</label>
                                        <select name="category" value={form.category} onChange={handleChange}
                                            className="input-field appearance-none cursor-pointer">
                                            {CATEGORIES.map((cat) => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Price */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">PRICE (₹)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                                            <input type="number" name="price" value={form.price} onChange={handleChange}
                                                required min="0" step="0.01" placeholder="0.00"
                                                className="input-field pl-8" />
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">DESCRIPTION</label>
                                        <textarea name="description" value={form.description} onChange={handleChange}
                                            rows={4} placeholder="Describe the flavors, key ingredients, and portion size..."
                                            className="w-full rounded-lg border-slate-200 bg-slate-50 focus:border-primary focus:ring-primary p-4 transition-all placeholder:text-slate-400 text-sm resize-none" />
                                    </div>

                                    {/* Dietary labels */}
                                    <div className="md:col-span-2 pt-2">
                                        <h3 className="section-title mb-4">DIETARY LABELS & PREFERENCES</h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {[
                                                { value: 'veg', label: '🌱 Veg', sub: 'PURE VEG' },
                                                { value: 'non-veg', label: '🍖 Non-Veg', sub: 'MEAT/POULTRY' },
                                            ].map((t) => (
                                                <button key={t.value} type="button"
                                                    onClick={() => setForm({ ...form, type: t.value })}
                                                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer
                            ${form.type === t.value
                                                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                            : 'border-slate-100 hover:bg-slate-50'}`}>
                                                    <span className="text-sm font-medium text-slate-700">{t.label}</span>
                                                    <span className="text-[10px] text-slate-400 uppercase">{t.sub}</span>
                                                </button>
                                            ))}
                                        </div>

                                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            {[
                                                { key: 'is_vegan', label: '🌿 Vegan' },
                                                { key: 'is_gluten_free', label: '🌾 Gluten Free' },
                                                { key: 'has_egg', label: '🥚 Contains Egg' },
                                                { key: 'is_spicy', label: '🌶️ Spicy' }
                                            ].map((tag) => (
                                                <button key={tag.key} type="button"
                                                    onClick={() => setForm({ ...form, [tag.key]: !form[tag.key] })}
                                                    className={`flex items-center justify-center p-2.5 rounded-lg border transition-all cursor-pointer text-xs font-semibold
                                                        ${form[tag.key]
                                                            ? 'bg-charcoal text-white border-charcoal'
                                                            : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'}`}>
                                                    {tag.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 animate-fade-in">
                                    {error}
                                </div>
                            )}

                            {/* Mobile submit */}
                            <div className="flex sm:hidden items-center gap-3">
                                <button type="button" onClick={() => navigate('/dashboard')} className="flex-1 btn-secondary">Discard Changes</button>
                                <button type="submit" disabled={loading} className="flex-1 btn-primary flex items-center justify-center gap-2">
                                    {loading ? (
                                        <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                                    ) : (
                                        <><FiSave className="w-4 h-4" /> Save Item</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </main>

            {/* Background decoration */}
            <div className="fixed top-0 right-0 -z-10 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="fixed bottom-0 left-0 -z-10 w-[300px] h-[300px] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
        </div>
    );
}
