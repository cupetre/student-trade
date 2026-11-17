import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppNav from '../../components/AppNav.jsx';
import SceneBackdrop from '../../components/SceneBackdrop.jsx';
import { apiRequest } from '../../lib/api';
import { resolveMediaUrl } from '../../lib/media';
import { useCurrentUser } from '../../lib/useCurrentUser';
import MarketCard from './MarketCard.jsx';
import { MAX_TITLE, MAX_DESCRIPTION, MAX_PHOTO_MB, MAX_ITEM_PHOTOS, MAX_PICKUP, CATEGORIES, CONDITIONS, CONTACT_PREFERENCES } from './marketOptions';
import { CITY_SUGGESTIONS } from '../../lib/housingOptions';
import { useT } from '../../lib/i18n';

// Leaflet is big, so the pick-up map loads after the form
const AreaPicker = lazy(() => import('../../components/AreaPicker.jsx'));
import '../housing/Housing.css';
import './Market.css';

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const Field = ({ id, label, error, hint, optional, children }) => {
    const t = useT();
    return (
        <div className={`hs-field ${error ? 'has-error' : ''}`}>
            <label htmlFor={id}>{label}{optional && <span className="hs-optional"> {t('(optional)')}</span>}</label>
            {children}
            {error ? <p className="hs-field-error" id={`${id}-error`}>{error}</p> : hint && <p className="hs-hint" id={`${id}-hint`}>{hint}</p>}
        </div>
    );
};

// Marketplace › Sell an item (/marketplace/new) and Edit (/marketplace/:id/edit).
// Replaces the old "Post item" pop-up; built like the housing form, with a live card preview.
const MarketFormPage = () => {
    const t = useT();
    const { id } = useParams();
    const editing = Boolean(id);
    const navigate = useNavigate();
    const { user } = useCurrentUser();

    const [form, setForm] = useState({
        title: '', description: '', price: '',
        category: '', condition: '', city: '', pickup_area: '', contact_preference: 'message',
    });
    const [point, setPoint] = useState(null); // pick-up pin { latitude, longitude }
    // Photos: the ones already saved (editing) and new ones picked here; the first one is the cover
    const [existingPhotos, setExistingPhotos] = useState([]); // { id, url }
    const [removedIds, setRemovedIds] = useState([]);
    const [newPhotos, setNewPhotos] = useState([]); // { file, url }
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
            setExistingPhotos(Array.isArray(data.photos) ? data.photos : (data.photo ? [{ id: -1, url: data.photo }] : []));
            setOwnerId(data.owner_id);
        });
        return () => { cancelled = true; };
    }, [editing, id]);

    // Free the preview images when the page closes
    const newPhotosRef = useRef(newPhotos);
    newPhotosRef.current = newPhotos;
    useEffect(() => () => newPhotosRef.current.forEach(p => URL.revokeObjectURL(p.url)), []);

    const keptPhotos = existingPhotos.filter(p => !removedIds.includes(p.id));
    const photoCount = keptPhotos.length + newPhotos.length;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
        if (formError) setFormError('');
    };

    const handleFiles = (e) => {
        const files = Array.from(e.target.files || []);
        e.target.value = ''; // so picking the same file again still triggers onChange
        const room = MAX_ITEM_PHOTOS - photoCount;
        const problems = [];
        const accepted = [];
        for (const file of files) {
            if (!PHOTO_TYPES.includes(file.type)) { problems.push(t('{file}: only JPG, PNG or WebP', { file: file.name })); continue; }
            if (file.size > MAX_PHOTO_MB * 1024 * 1024) { problems.push(t('{file}: larger than {n} MB', { file: file.name, n: MAX_PHOTO_MB })); continue; }
            if (accepted.length >= room) { problems.push(t('Only {n} photos per item', { n: MAX_ITEM_PHOTOS })); break; }
            accepted.push({ file, url: URL.createObjectURL(file) });
        }
        setNewPhotos(prev => [...prev, ...accepted]);
        setErrors(prev => ({ ...prev, photo: problems.join(' · ') }));
    };
    const removeNewPhoto = (index) => {
        setNewPhotos(prev => {
            URL.revokeObjectURL(prev[index].url);
            return prev.filter((_, i) => i !== index);
        });
    };
    const toggleExistingPhoto = (photoId) => {
        setRemovedIds(prev => (prev.includes(photoId) ? prev.filter(x => x !== photoId) : [...prev, photoId]));
    };

    const validate = () => {
        const e = {};
        if (!form.title.trim()) e.title = t('Give your item a name.');
        const price = Number(form.price);
        if (form.price === '' || Number.isNaN(price) || price < 0) e.price = t('Enter a price (0 if you’re giving it away).');
        if (!form.category) e.category = t('Choose a category, so people can find it.');
        if (!form.condition) e.condition = t('Say how much it has been used.');
        if (!form.city.trim()) e.city = t('Which city can people pick it up in?');
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
        if (editing && removedIds.length) data.append('remove_photo_ids', removedIds.join(','));
        newPhotos.forEach(p => data.append('photos', p.file));

        setSubmitting(true);
        const { ok, data: result } = await apiRequest(
            editing ? '/api/listings/edit_listing' : '/api/listings/upload_listing',
            { method: editing ? 'PUT' : 'POST', formData: data },
        );
        setSubmitting(false);

        if (!ok) { setFormError(result.error); return; }
        navigate('/marketplace/mine', {
            state: { flash: editing ? t('“{title}” was updated.', { title: form.title.trim() }) : t('“{title}” is now on the marketplace.', { title: form.title.trim() }) },
        });
    };

    if (loading) {
        return <div className="hs-shell mk-shell"><AppNav /><SceneBackdrop /><main className="hs-page mk-page mk-form-page"><p className="hs-muted">{t('Loading…')}</p></main></div>;
    }
    if (editing && (loadError || (user && ownerId && ownerId !== user.id))) {
        return (
            <div className="hs-shell mk-shell">
                <AppNav /><SceneBackdrop />
                <main className="hs-page mk-page mk-form-page">
                    <div className="hs-empty">
                        <h1>{loadError ? t('Item not found') : t('This isn’t your item')}</h1>
                        <p>{loadError || t('You can only edit items you posted yourself.')}</p>
                        <Link to="/marketplace/mine" className="hs-btn">{t('My items')}</Link>
                    </div>
                </main>
            </div>
        );
    }

    const previewPhoto = keptPhotos[0] ? resolveMediaUrl(keptPhotos[0].url) : newPhotos[0]?.url;
    const preview = { ...form, owner_name: user?.fullname, owner_profile_picture: user?.profile_picture, date: new Date().toISOString() };

    return (
        <div className="hs-shell mk-shell">
            <AppNav /><SceneBackdrop />
            <main className="hs-page mk-page mk-form-page">
                <Link to={editing ? `/marketplace/${id}` : '/marketplace'} className="hs-back">← {editing ? t('Back to the item') : t('Back to the marketplace')}</Link>
                <header className="hs-head">
                    <h1>{editing ? t('Edit your item') : t('Sell an item')}</h1>
                </header>

                <div className="hs-form-layout">
                    <form className="hs-form" onSubmit={handleSubmit} noValidate>
                        {formError && <div className="hs-alert hs-alert--error" role="alert">{formError}</div>}

                        <fieldset>
                            <legend>{t('Your item')}</legend>
                            <Field id="title" label={t('What are you selling?')} error={errors.title} hint={t('For example: Desk chair, IKEA, barely used')}>
                                <input id="title" name="title" type="text" maxLength={MAX_TITLE} value={form.title} onChange={handleChange}
                                    aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'title-error' : 'title-hint'} />
                            </Field>

                            <div className="hs-row">
                                <Field id="category" label={t('Category')} error={errors.category}>
                                    <select id="category" name="category" value={form.category} onChange={handleChange}
                                        aria-invalid={Boolean(errors.category)} aria-describedby={errors.category ? 'category-error' : undefined}>
                                        <option value="">{t('Choose…')}</option>
                                        {Object.entries(CATEGORIES).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
                                    </select>
                                </Field>
                                <Field id="price" label={t('Price (€)')} error={errors.price} hint={t('Use 0 if you’re giving it away.')}>
                                    <input id="price" name="price" type="number" min="0" step="0.5" inputMode="decimal" value={form.price} onChange={handleChange}
                                        aria-invalid={Boolean(errors.price)} aria-describedby={errors.price ? 'price-error' : 'price-hint'} />
                                </Field>
                            </div>

                            <div className={`hs-field ${errors.condition ? 'has-error' : ''}`} role="radiogroup" aria-labelledby="condition-label">
                                <span id="condition-label" className="hs-label">{t('How much has it been used?')}</span>
                                <div className="hs-choice-grid mk-choice-grid">
                                    {Object.entries(CONDITIONS).map(([value, c]) => (
                                        <label key={value} className={`hs-choice ${form.condition === value ? 'is-selected' : ''}`}>
                                            <input type="radio" name="condition" value={value} checked={form.condition === value} onChange={handleChange} />
                                            <strong>{t(c.label)}</strong>
                                            <span>{t(c.hint)}</span>
                                        </label>
                                    ))}
                                </div>
                                {errors.condition && <p className="hs-field-error">{errors.condition}</p>}
                            </div>

                            <Field id="description" label={t('Description')} optional hint={t('Size, brand, what’s included, anything a buyer should know.')}>
                                <textarea id="description" name="description" rows="5" maxLength={MAX_DESCRIPTION} value={form.description} onChange={handleChange} aria-describedby="description-hint" />
                            </Field>
                        </fieldset>

                        <fieldset>
                            <legend>{t('Pick-up')}</legend>
                            <div className="hs-row">
                                <Field id="city" label={t('City')} error={errors.city}>
                                    <input id="city" name="city" type="text" list="mk-cities" maxLength={100} value={form.city} onChange={handleChange}
                                        aria-invalid={Boolean(errors.city)} aria-describedby={errors.city ? 'city-error' : undefined} />
                                    <datalist id="mk-cities">{CITY_SUGGESTIONS.map(c => <option key={c} value={c} />)}</datalist>
                                </Field>
                                <Field id="pickup_area" label={t('Where in the city')} optional hint={t('For example: Študentski dom Koper, near FAMNIT')}>
                                    <input id="pickup_area" name="pickup_area" type="text" maxLength={MAX_PICKUP} value={form.pickup_area} onChange={handleChange} aria-describedby="pickup_area-hint" />
                                </Field>
                            </div>
                            <Suspense fallback={<div className="mk-area-map mk-area-loading">{t('Loading map…')}</div>}>
                                <AreaPicker city={form.city} value={point} onChange={setPoint} />
                            </Suspense>
                        </fieldset>

                        <fieldset>
                            <legend>{t('How should buyers contact you?')}</legend>
                            <div className="hs-choice-grid" role="radiogroup" aria-label={t('How should buyers contact you?')}>
                                {Object.entries(CONTACT_PREFERENCES).map(([value, c]) => (
                                    <label key={value} className={`hs-choice ${form.contact_preference === value ? 'is-selected' : ''}`}>
                                        <input type="radio" name="contact_preference" value={value} checked={form.contact_preference === value} onChange={handleChange} />
                                        <strong>{t(c.label)}</strong>
                                        <span>{t(c.hint)}</span>
                                    </label>
                                ))}
                            </div>
                            <p className="hs-hint hs-hint--block">{t('Your phone number is never shown on the item.')}</p>
                        </fieldset>

                        <fieldset>
                            <legend>{t('Photos')}</legend>
                            <p className="hs-hint hs-hint--block">{t('Up to {max} photos (JPG, PNG or WebP, max {n} MB each). The first one is the cover. Items with photos sell much faster.', { max: MAX_ITEM_PHOTOS, n: MAX_PHOTO_MB })}</p>
                            <div className="hs-photo-grid">
                                {existingPhotos.map(p => {
                                    const removed = removedIds.includes(p.id);
                                    return (
                                        <div key={p.id} className={`hs-photo ${removed ? 'is-removed' : ''}`}>
                                            <img src={resolveMediaUrl(p.url)} alt="" />
                                            <button type="button" onClick={() => toggleExistingPhoto(p.id)}>{removed ? t('Undo') : t('Remove')}</button>
                                        </div>
                                    );
                                })}
                                {newPhotos.map((p, index) => (
                                    <div key={p.url} className="hs-photo hs-photo--new">
                                        <img src={p.url} alt="" />
                                        <button type="button" onClick={() => removeNewPhoto(index)}>{t('Remove')}</button>
                                    </div>
                                ))}
                                {photoCount < MAX_ITEM_PHOTOS && (
                                    <label className="hs-photo-add">
                                        <input type="file" accept={PHOTO_TYPES.join(',')} multiple onChange={handleFiles} />
                                        <span>{photoCount ? t('+ Add photos') : t('+ Add a photo')}</span>
                                        <small>{photoCount} / {MAX_ITEM_PHOTOS}</small>
                                    </label>
                                )}
                            </div>
                            {errors.photo && <p className="hs-field-error" role="alert">{errors.photo}</p>}
                        </fieldset>

                        <div className="hs-form-nav">
                            <Link to={editing ? `/marketplace/${id}` : '/marketplace'} className="hs-btn hs-btn--ghost">{t('Cancel')}</Link>
                            <button type="submit" className="hs-btn" disabled={submitting}>
                                {submitting ? t('Saving…') : editing ? t('Save changes') : t('Put it on the marketplace')}
                            </button>
                        </div>
                    </form>

                    <aside className="hs-form-preview" aria-label={t('Preview')}>
                        <p className="hs-label">{t('Preview')}</p>
                        <MarketCard item={preview} preview photoUrl={previewPhoto} />
                        <p className="hs-hint">{t('This is how your item appears on the marketplace.')}</p>
                    </aside>
                </div>
            </main>
        </div>
    );
};

export default MarketFormPage;
