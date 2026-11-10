import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppNav from '../../components/AppNav.jsx';
import SceneBackdrop from '../../components/SceneBackdrop.jsx';
import { apiRequest } from '../../lib/api';
import { resolveMediaUrl } from '../../lib/media';
import { useCurrentUser } from '../../lib/useCurrentUser';
import MarketCard from './MarketCard.jsx';
import { MAX_TITLE, MAX_DESCRIPTION, MAX_PHOTO_MB, MAX_PICKUP, CATEGORIES, CONDITIONS, CONTACT_PREFERENCES } from './marketOptions';
import { CITY_SUGGESTIONS } from '../../lib/housingOptions';

// Leaflet is big, so the pick-up map loads after the form
const AreaPicker = lazy(() => import('../../components/AreaPicker.jsx'));
import '../housing/Housing.css';
import './Market.css';

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const Field = ({ id, label, error, hint, optional, children }) => (
    <div className={`hs-field ${error ? 'has-error' : ''}`}>
        <label htmlFor={id}>{label}{optional && <span className="hs-optional"> (optional)</span>}</label>
        {children}
        {error ? <p className="hs-field-error" id={`${id}-error`}>{error}</p> : hint && <p className="hs-hint" id={`${id}-hint`}>{hint}</p>}
    </div>
);

// Marketplace › Sell an item (/marketplace/new) and Edit (/marketplace/:id/edit).
// Replaces the old "Post item" pop-up; built like the housing form, with a live card preview.
const MarketFormPage = () => {
    const { id } = useParams();
    const editing = Boolean(id);
    const navigate = useNavigate();
    const { user } = useCurrentUser();

    const [form, setForm] = useState({
        title: '', description: '', price: '',
        category: '', condition: '', city: '', pickup_area: '', contact_preference: 'message',
    });
    const [point, setPoint] = useState(null); // pick-up pin { latitude, longitude }
    const [existingPhoto, setExistingPhoto] = useState(null);
    const [photo, setPhoto] = useState(null); // { file, url }
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState('');
    const [loading, setLoading] = useState(editing);
    const [loadError, setLoadError] = useState('');
    const [ownerId, setOwnerId] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Editing: load the item first
    useEffect(() => {
        if (!editing) return undefined;
        let cancelled = false;
        apiRequest(`/api/listings/item/${id}`).then(({ ok, data }) => {
            if (cancelled) return;
            setLoading(false);
            if (!ok) { setLoadError(data.error); return; }
            setForm({
                title: data.title || '',
                description: data.description || '',
                price: String(Number(data.price)),
                category: data.category || 'other',
                condition: data.condition || '',
                city: data.city || '',
                pickup_area: data.pickup_area || '',
                contact_preference: data.contact_preference || 'message',
            });
            setPoint(data.exact_location || null);
            setExistingPhoto(resolveMediaUrl(data.photo));
            setOwnerId(data.owner_id);
        });
        return () => { cancelled = true; };
    }, [editing, id]);

    // Free the preview image when it's replaced or the page closes
    useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
        if (formError) setFormError('');
    };

    const handleFile = (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!PHOTO_TYPES.includes(file.type)) { setErrors(prev => ({ ...prev, photo: 'Use a JPG, PNG or WebP photo.' })); return; }
        if (file.size > MAX_PHOTO_MB * 1024 * 1024) { setErrors(prev => ({ ...prev, photo: `The photo can be at most ${MAX_PHOTO_MB} MB.` })); return; }
        setErrors(prev => ({ ...prev, photo: '' }));
        setPhoto({ file, url: URL.createObjectURL(file) });
    };

    const validate = () => {
        const e = {};
        if (!form.title.trim()) e.title = 'Give your item a name.';
        const price = Number(form.price);
        if (form.price === '' || Number.isNaN(price) || price < 0) e.price = 'Enter a price (0 if you’re giving it away).';
        if (!form.category) e.category = 'Choose a category, so people can find it.';
        if (!form.condition) e.condition = 'Say how much it has been used.';
        if (!form.city.trim()) e.city = 'Which city can people pick it up in?';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting || !validate()) return;

        const data = new FormData();
        if (editing) data.append('id', id);
        data.append('title', form.title.trim());
        data.append('description', form.description.trim());
        data.append('price', form.price);
        data.append('category', form.category);
        data.append('condition', form.condition);
        data.append('city', form.city.trim());
        data.append('pickup_area', form.pickup_area.trim());
        data.append('contact_preference', form.contact_preference);
        if (point) {
            data.append('latitude', String(point.latitude));
            data.append('longitude', String(point.longitude));
        }
        if (photo) data.append('photo', photo.file);

        setSubmitting(true);
        const { ok, data: result } = await apiRequest(
            editing ? '/api/listings/edit_listing' : '/api/listings/upload_listing',
            { method: editing ? 'PUT' : 'POST', formData: data },
        );
        setSubmitting(false);

        if (!ok) { setFormError(result.error); return; }
        navigate('/marketplace/mine', {
            state: { flash: editing ? `“${form.title.trim()}” was updated.` : `“${form.title.trim()}” is now on the marketplace.` },
        });
    };

    if (loading) {
        return <div className="hs-shell mk-shell"><AppNav /><SceneBackdrop /><main className="hs-page mk-page"><p className="hs-muted">Loading…</p></main></div>;
    }
    if (editing && (loadError || (user && ownerId && ownerId !== user.id))) {
        return (
            <div className="hs-shell mk-shell">
                <AppNav /><SceneBackdrop />
                <main className="hs-page mk-page">
                    <div className="hs-empty">
                        <h1>{loadError ? 'Item not found' : 'This isn’t your item'}</h1>
                        <p>{loadError || 'You can only edit items you posted yourself.'}</p>
                        <Link to="/marketplace/mine" className="hs-btn">My items</Link>
                    </div>
                </main>
            </div>
        );
    }

    const previewPhoto = photo?.url || existingPhoto;
    const preview = { ...form, owner_name: user?.fullname, owner_profile_picture: user?.profile_picture, date: new Date().toISOString() };

    return (
        <div className="hs-shell mk-shell">
            <AppNav /><SceneBackdrop />
            <main className="hs-page mk-page">
                <Link to={editing ? `/marketplace/${id}` : '/marketplace'} className="hs-back">← {editing ? 'Back to the item' : 'Back to the marketplace'}</Link>
                <header className="hs-head">
                    <h1>{editing ? 'Edit your item' : 'Sell an item'}</h1>
                </header>

                <div className="hs-form-layout">
                    <form className="hs-form" onSubmit={handleSubmit} noValidate>
                        {formError && <div className="hs-alert hs-alert--error" role="alert">{formError}</div>}

                        <fieldset>
                            <legend>Your item</legend>
                            <Field id="title" label="What are you selling?" error={errors.title} hint="For example: Desk chair, IKEA, barely used">
                                <input id="title" name="title" type="text" maxLength={MAX_TITLE} value={form.title} onChange={handleChange}
                                    aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'title-error' : 'title-hint'} />
                            </Field>

                            <div className="hs-row">
                                <Field id="category" label="Category" error={errors.category}>
                                    <select id="category" name="category" value={form.category} onChange={handleChange}
                                        aria-invalid={Boolean(errors.category)} aria-describedby={errors.category ? 'category-error' : undefined}>
                                        <option value="">Choose…</option>
                                        {Object.entries(CATEGORIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                    </select>
                                </Field>
                                <Field id="price" label="Price (€)" error={errors.price} hint="Use 0 if you’re giving it away.">
                                    <input id="price" name="price" type="number" min="0" step="0.5" inputMode="decimal" value={form.price} onChange={handleChange}
                                        aria-invalid={Boolean(errors.price)} aria-describedby={errors.price ? 'price-error' : 'price-hint'} />
                                </Field>
                            </div>

                            <div className={`hs-field ${errors.condition ? 'has-error' : ''}`} role="radiogroup" aria-labelledby="condition-label">
                                <span id="condition-label" className="hs-label">How much has it been used?</span>
                                <div className="hs-choice-grid mk-choice-grid">
                                    {Object.entries(CONDITIONS).map(([value, c]) => (
                                        <label key={value} className={`hs-choice ${form.condition === value ? 'is-selected' : ''}`}>
                                            <input type="radio" name="condition" value={value} checked={form.condition === value} onChange={handleChange} />
                                            <strong>{c.label}</strong>
                                            <span>{c.hint}</span>
                                        </label>
                                    ))}
                                </div>
                                {errors.condition && <p className="hs-field-error">{errors.condition}</p>}
                            </div>

                            <Field id="description" label="Description" optional hint="Size, brand, what’s included, anything a buyer should know.">
                                <textarea id="description" name="description" rows="5" maxLength={MAX_DESCRIPTION} value={form.description} onChange={handleChange} aria-describedby="description-hint" />
                            </Field>
                        </fieldset>

                        <fieldset>
                            <legend>Pick-up</legend>
                            <div className="hs-row">
                                <Field id="city" label="City" error={errors.city}>
                                    <input id="city" name="city" type="text" list="mk-cities" maxLength={100} value={form.city} onChange={handleChange}
                                        aria-invalid={Boolean(errors.city)} aria-describedby={errors.city ? 'city-error' : undefined} />
                                    <datalist id="mk-cities">{CITY_SUGGESTIONS.map(c => <option key={c} value={c} />)}</datalist>
                                </Field>
                                <Field id="pickup_area" label="Where in the city" optional hint="For example: Študentski dom Koper, near FAMNIT">
                                    <input id="pickup_area" name="pickup_area" type="text" maxLength={MAX_PICKUP} value={form.pickup_area} onChange={handleChange} aria-describedby="pickup_area-hint" />
                                </Field>
                            </div>
                            <Suspense fallback={<div className="mk-area-map mk-area-loading">Loading map…</div>}>
                                <AreaPicker city={form.city} value={point} onChange={setPoint} />
                            </Suspense>
                        </fieldset>

                        <fieldset>
                            <legend>How should buyers contact you?</legend>
                            <div className="hs-choice-grid" role="radiogroup" aria-label="How should buyers contact you?">
                                {Object.entries(CONTACT_PREFERENCES).map(([value, c]) => (
                                    <label key={value} className={`hs-choice ${form.contact_preference === value ? 'is-selected' : ''}`}>
                                        <input type="radio" name="contact_preference" value={value} checked={form.contact_preference === value} onChange={handleChange} />
                                        <strong>{c.label}</strong>
                                        <span>{c.hint}</span>
                                    </label>
                                ))}
                            </div>
                            <p className="hs-hint hs-hint--block">Your phone number is never shown on the item.</p>
                        </fieldset>

                        <fieldset>
                            <legend>Photo</legend>
                            <p className="hs-hint hs-hint--block">One photo (JPG, PNG or WebP, max {MAX_PHOTO_MB} MB). Items with a photo sell much faster.</p>
                            <div className="hs-photo-grid mk-photo-single">
                                {previewPhoto && (
                                    <div className="hs-photo">
                                        <img src={previewPhoto} alt="" />
                                        {photo && <button type="button" onClick={() => setPhoto(null)}>{existingPhoto ? 'Undo' : 'Remove'}</button>}
                                    </div>
                                )}
                                <label className="hs-photo-add">
                                    <input type="file" accept={PHOTO_TYPES.join(',')} onChange={handleFile} />
                                    <span>{previewPhoto ? 'Replace photo' : '+ Add a photo'}</span>
                                </label>
                            </div>
                            {errors.photo && <p className="hs-field-error" role="alert">{errors.photo}</p>}
                        </fieldset>

                        <div className="hs-form-nav">
                            <Link to={editing ? `/marketplace/${id}` : '/marketplace'} className="hs-btn hs-btn--ghost">Cancel</Link>
                            <button type="submit" className="hs-btn" disabled={submitting}>
                                {submitting ? 'Saving…' : editing ? 'Save changes' : 'Put it on the marketplace'}
                            </button>
                        </div>
                    </form>

                    <aside className="hs-form-preview" aria-label="Preview">
                        <p className="hs-label">Preview</p>
                        <MarketCard item={preview} preview photoUrl={previewPhoto} />
                        <p className="hs-hint">This is how your item appears on the marketplace.</p>
                    </aside>
                </div>
            </main>
        </div>
    );
};

export default MarketFormPage;
