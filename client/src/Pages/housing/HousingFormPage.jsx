import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppNav from '../../components/AppNav.jsx';
import HousingCard from '../../components/HousingCard.jsx';
import { apiRequest } from '../../lib/api';
import { resolveMediaUrl } from '../../lib/media';
import { useCurrentUser, allowedListingTypes } from '../../lib/useCurrentUser';
import {
    LISTING_TYPES, PROPERTY_TYPES, FURNISHING, AMENITIES, LANGUAGES, CITY_SUGGESTIONS, MAX_PHOTOS, toDateInput,
} from '../../lib/housingOptions';
import './Housing.css';

// The map library is big, so it only loads when someone opens this form
const LocationPicker = lazy(() => import('../../components/LocationPicker.jsx'));

const MAX_PHOTO_MB = 8;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const STEPS = ['Basics', 'Price & spots', 'Address & dates', 'Rules & extras', 'Photos'];

// Which step each field lives on, so an error from the server opens the right step
const FIELD_STEP = {
    listing_type: 0, property_type: 0, title: 0, description: 0,
    rent_per_person: 1, deposit: 1, utilities_estimate: 1, spots_total: 1, spots_open: 1,
    total_rooms: 1, bathrooms: 1, area_m2: 1, furnishing: 1,
    street: 2, postal_code: 2, city: 2, neighbourhood: 2, location: 2, available_from: 2, available_until: 2, min_stay_months: 2,
    amenities: 3, languages: 3, video_tour_url: 3,
    photos: 4,
};

const EMPTY = {
    listing_type: '', property_type: '', title: '', description: '',
    rent_per_person: '', deposit: '', utilities_included: false, utilities_estimate: '',
    spots_total: '1', spots_open: '', total_rooms: '', bathrooms: '', area_m2: '', furnishing: '',
    street: '', postal_code: '', city: '', neighbourhood: '',
    available_from: '', available_until: '', min_stay_months: '',
    address_registration_allowed: false, subsidy_eligible: false, smoking_allowed: false, pets_allowed: false,
    amenities: [], languages: [], video_tour_url: '',
};

// Listing from the API -> form values (inputs want strings, not null)
function toForm(listing) {
    const form = { ...EMPTY };
    for (const key of Object.keys(EMPTY)) {
        const value = listing[key];
        if (Array.isArray(EMPTY[key])) form[key] = Array.isArray(value) ? value : [];
        else if (typeof EMPTY[key] === 'boolean') form[key] = Boolean(value);
        else form[key] = value === null || value === undefined ? '' : String(value);
    }
    form.available_from = toDateInput(listing.available_from);
    form.available_until = toDateInput(listing.available_until);
    return form;
}

// Same rules as server/lib/housingValidation.js, so most mistakes are caught
// before uploading photos. The server still checks everything again.
function validateStep(step, form, photoCount) {
    const e = {};
    const num = (v) => (v === '' ? null : Number(v));

    if (step === 0) {
        if (!form.listing_type) e.listing_type = 'Choose what kind of listing this is';
        if (!form.property_type) e.property_type = 'Choose the type of place';
        if (form.title.trim().length < 5) e.title = 'Give the listing a title of at least 5 characters';
    }
    if (step === 1) {
        const rent = num(form.rent_per_person);
        if (rent === null || !(rent >= 1 && rent <= 10000)) e.rent_per_person = 'Enter the monthly rent per person (1–10,000 €)';
        const deposit = num(form.deposit);
        if (deposit !== null && !(deposit >= 0 && deposit <= 50000)) e.deposit = 'Enter a valid deposit, or leave it empty';
        const total = num(form.spots_total);
        if (!Number.isInteger(total) || total < 1 || total > 20) e.spots_total = 'How many students is this place for? (1–20)';
        const open = num(form.spots_open);
        if (open !== null && (!Number.isInteger(open) || open < 0 || (Number.isInteger(total) && open > total))) {
            e.spots_open = 'Open spots must be between 0 and the total';
        }
        if (!form.furnishing) e.furnishing = 'Choose how the place is furnished';
    }
    if (step === 2) {
        if (form.street.trim().length < 3) e.street = 'Enter the street and house number';
        if (form.city.trim().length < 2) e.city = 'Enter the city';
        if (form.postal_code && !/^\d{4}$/.test(form.postal_code.trim())) e.postal_code = 'Slovenian postal codes have 4 digits';
        if (!form.available_from) e.available_from = 'Choose the date the place is available from';
        if (form.available_until && form.available_from && form.available_until <= form.available_from) {
            e.available_until = 'The end date must be after the start date';
        }
    }
    if (step === 3) {
        if (form.video_tour_url && !/^https:\/\/\S+$/.test(form.video_tour_url.trim())) e.video_tour_url = 'The video link must start with https://';
    }
    if (step === 4) {
        if (photoCount === 0) e.photos = 'Add at least one photo';
    }
    return e;
}

const Field = ({ id, label, error, hint, children, optional }) => (
    <div className={`hs-field ${error ? 'has-error' : ''}`}>
        <label htmlFor={id}>{label}{optional && <span className="hs-optional"> (optional)</span>}</label>
        {children}
        {error ? <p className="hs-field-error" id={`${id}-error`}>{error}</p> : hint && <p className="hs-hint">{hint}</p>}
    </div>
);

const HousingFormPage = () => {
    const { id } = useParams();
    const editing = Boolean(id);
    const navigate = useNavigate();
    const { user, loading: userLoading } = useCurrentUser();

    const [form, setForm] = useState(EMPTY);
    const [step, setStep] = useState(0);
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState('');
    const [loading, setLoading] = useState(editing);
    const [submitting, setSubmitting] = useState(false);

    // Photos: the ones already uploaded (when editing) and the new files picked now
    const [existingPhotos, setExistingPhotos] = useState([]);
    const [removedIds, setRemovedIds] = useState([]);
    const [newPhotos, setNewPhotos] = useState([]); // { file, url }
    const [pin, setPin] = useState(null); // { latitude, longitude, source } on the map
    const pickerRef = useRef(null);

    const allowedTypes = allowedListingTypes(user);
    const landlordPending = user?.role === 'landlord' && user.landlord_status !== 'approved';

    useEffect(() => {
        if (!editing) return undefined;
        let cancelled = false;
        apiRequest(`/api/housing/listings/${id}`).then(({ ok, data }) => {
            if (cancelled) return;
            setLoading(false);
            if (!ok) { setFormError(data.error); return; }
            setForm(toForm(data));
            setExistingPhotos(data.photos || []);
            // The owner gets the exact pin back; everyone else only the area
            if (data.exact_location) setPin(data.exact_location);
        });
        return () => { cancelled = true; };
    }, [editing, id]);

    // With only one allowed type (e.g. landlords -> rental), pick it automatically
    const onlyType = allowedTypes.length === 1 ? allowedTypes[0] : '';
    useEffect(() => {
        if (!editing && onlyType) {
            setForm(prev => (prev.listing_type ? prev : { ...prev, listing_type: onlyType }));
        }
    }, [editing, onlyType]);

    // Free the preview URLs when the page closes (a ref, so the cleanup
    // sees the latest list instead of the one from the first render)
    const newPhotosRef = useRef(newPhotos);
    newPhotosRef.current = newPhotos;
    useEffect(() => () => newPhotosRef.current.forEach(p => URL.revokeObjectURL(p.url)), []);

    const keptPhotos = existingPhotos.filter(p => !removedIds.includes(p.id));
    const photoCount = keptPhotos.length + newPhotos.length;

    const preview = useMemo(() => ({
        ...form,
        rent_per_person: form.rent_per_person,
        spots_total: Number(form.spots_total) || 0,
        spots_open: form.spots_open === '' ? Number(form.spots_total) || 0 : Number(form.spots_open),
    }), [form]);
    const previewPhoto = keptPhotos[0] ? resolveMediaUrl(keptPhotos[0].url) : newPhotos[0]?.url;

    const set = (name, value) => {
        setForm(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
        if (formError) setFormError('');
    };
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        set(name, type === 'checkbox' ? checked : value);
    };
    const toggleInList = (name, value) => {
        set(name, form[name].includes(value) ? form[name].filter(v => v !== value) : [...form[name], value]);
    };

    const handleFiles = (e) => {
        const files = Array.from(e.target.files || []);
        e.target.value = ''; // so picking the same file again still triggers onChange
        const room = MAX_PHOTOS - photoCount;
        const problems = [];
        const accepted = [];

        for (const file of files) {
            if (!PHOTO_TYPES.includes(file.type)) { problems.push(`${file.name}: only JPG, PNG or WebP`); continue; }
            if (file.size > MAX_PHOTO_MB * 1024 * 1024) { problems.push(`${file.name}: larger than ${MAX_PHOTO_MB} MB`); continue; }
            if (accepted.length >= room) { problems.push(`Only ${MAX_PHOTOS} photos per listing`); break; }
            accepted.push({ file, url: URL.createObjectURL(file) });
        }

        setNewPhotos(prev => [...prev, ...accepted]);
        setErrors(prev => ({ ...prev, photos: problems.join(' · ') }));
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

    const goTo = (target) => {
        // Moving forward checks the current step first; going back is always allowed
        if (target > step) {
            for (let s = step; s < target; s += 1) {
                const stepErrors = validateStep(s, form, photoCount);
                if (Object.keys(stepErrors).length) {
                    setErrors(stepErrors);
                    setStep(s);
                    return;
                }
            }
        }
        setErrors({});
        setStep(target);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (step < STEPS.length - 1) { goTo(step + 1); return; }
        if (submitting) return;

        for (let s = 0; s < STEPS.length; s += 1) {
            const stepErrors = validateStep(s, form, photoCount);
            if (Object.keys(stepErrors).length) { setErrors(stepErrors); setStep(s); return; }
        }

        const payload = { ...form };
        if (editing) payload.remove_photo_ids = removedIds;
        if (pin) { payload.latitude = pin.latitude; payload.longitude = pin.longitude; }

        const body = new FormData();
        body.append('listing', JSON.stringify(payload));
        newPhotos.forEach(p => body.append('photos', p.file));

        setSubmitting(true);
        setFormError('');
        const { ok, data } = await apiRequest(editing ? `/api/housing/listings/${id}` : '/api/housing/listings', {
            method: editing ? 'PUT' : 'POST',
            formData: body,
        });
        setSubmitting(false);

        if (ok) {
            navigate('/housing/mine', { state: { flash: data.message || 'Saved.' } });
            return;
        }

        if (data.fields) {
            setErrors(data.fields);
            const steps = Object.keys(data.fields).map(f => FIELD_STEP[f]).filter(s => s !== undefined);
            if (steps.length) setStep(Math.min(...steps));
        }
        setFormError(data.error);
    };

    // ---------- states before the form ----------

    if (userLoading || loading) {
        return <div className="hs-shell"><AppNav /><main className="hs-page"><p className="hs-muted">Loading…</p></main></div>;
    }

    if (landlordPending) {
        return (
            <div className="hs-shell">
                <AppNav />
                <main className="hs-page">
                    <div className="hs-empty">
                        <h1>Your landlord account is being reviewed</h1>
                        <p>We check every landlord before their places go live, to keep students safe from scams. You’ll get an email as soon as you can post.</p>
                        <Link to="/housing" className="hs-btn hs-btn--ghost">Look around housing</Link>
                    </div>
                </main>
            </div>
        );
    }

    if (editing && formError && !form.title) {
        return (
            <div className="hs-shell">
                <AppNav />
                <main className="hs-page">
                    <div className="hs-empty">
                        <h1>Can’t edit this listing</h1>
                        <p>{formError}</p>
                        <Link to="/housing/mine" className="hs-btn">My listings</Link>
                    </div>
                </main>
            </div>
        );
    }

    const typeOptions = editing && !allowedTypes.includes(form.listing_type) && form.listing_type
        ? [...allowedTypes, form.listing_type]
        : allowedTypes;

    const inputProps = (name) => ({
        id: name,
        name,
        value: form[name],
        onChange: handleChange,
        'aria-invalid': Boolean(errors[name]),
        'aria-describedby': errors[name] ? `${name}-error` : undefined,
    });

    // ---------- the form ----------

    return (
        <div className="hs-shell">
            <AppNav />
            <main className="hs-page">
                <Link to={editing ? `/housing/${id}` : '/housing'} className="hs-back">← {editing ? 'Back to the listing' : 'Back to housing'}</Link>
                <header className="hs-head">
                    <h1>{editing ? 'Edit your listing' : 'Post a place'}</h1>
                    <p>
                        {user?.role === 'landlord'
                            ? 'Rent a room or a whole place to students. Prices are per person, so students can compare fairly.'
                            : 'Moving out, or looking for a flatmate? Post it here and students will message you.'}
                    </p>
                </header>

                <ol className="hs-steps" aria-label="Steps">
                    {STEPS.map((label, index) => (
                        <li key={label} className={index === step ? 'is-current' : index < step ? 'is-done' : ''}>
                            <button type="button" onClick={() => goTo(index)} aria-current={index === step ? 'step' : undefined}>
                                <span className="hs-step-num">{index + 1}</span>
                                <span className="hs-step-label">{label}</span>
                            </button>
                        </li>
                    ))}
                </ol>

                <div className="hs-form-layout">
                    <form className="hs-form" onSubmit={handleSubmit} noValidate>
                        {formError && <div className="hs-alert hs-alert--error" role="alert">{formError}</div>}

                        {step === 0 && (
                            <fieldset>
                                <legend>What are you posting?</legend>
                                <div className={`hs-field ${errors.listing_type ? 'has-error' : ''}`}>
                                    <span className="hs-label">Listing type</span>
                                    <div className="hs-choice-grid">
                                        {typeOptions.map(value => (
                                            <label key={value} className={`hs-choice ${form.listing_type === value ? 'is-selected' : ''}`}>
                                                <input type="radio" name="listing_type" value={value} checked={form.listing_type === value} onChange={handleChange} disabled={!allowedTypes.includes(value)} />
                                                <strong>{LISTING_TYPES[value].label}</strong>
                                                <span>{LISTING_TYPES[value].help}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {errors.listing_type && <p className="hs-field-error">{errors.listing_type}</p>}
                                    {user?.role === 'student' && (
                                        <p className="hs-hint">Renting out a place as the owner or an agency? <Link to="/register/landlord">Create a landlord account</Link>.</p>
                                    )}
                                </div>

                                <Field id="property_type" label="Type of place" error={errors.property_type}>
                                    <select {...inputProps('property_type')}>
                                        <option value="">Choose…</option>
                                        {Object.entries(PROPERTY_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                    </select>
                                </Field>

                                <Field id="title" label="Title" error={errors.title} hint="E.g. “Bright room 5 min from the Faculty of Management”">
                                    <input {...inputProps('title')} maxLength={120} />
                                </Field>

                                <Field id="description" label="Description" optional hint="The room, the flatmates, the neighbourhood, how far it is from campus.">
                                    <textarea {...inputProps('description')} rows={6} maxLength={5000} />
                                </Field>
                            </fieldset>
                        )}

                        {step === 1 && (
                            <fieldset>
                                <legend>Price and spots</legend>
                                <div className="hs-row">
                                    <Field id="rent_per_person" label="Rent per person / month (€)" error={errors.rent_per_person}>
                                        <input {...inputProps('rent_per_person')} type="number" min="1" step="1" inputMode="decimal" />
                                    </Field>
                                    <Field id="deposit" label="Deposit (€)" optional error={errors.deposit}>
                                        <input {...inputProps('deposit')} type="number" min="0" step="1" inputMode="decimal" />
                                    </Field>
                                </div>

                                <label className="hs-check">
                                    <input type="checkbox" name="utilities_included" checked={form.utilities_included} onChange={handleChange} />
                                    Bills (electricity, heating, water, internet) are included in the rent
                                </label>
                                {!form.utilities_included && (
                                    <Field id="utilities_estimate" label="Bills per person / month, roughly (€)" optional error={errors.utilities_estimate}>
                                        <input {...inputProps('utilities_estimate')} type="number" min="0" step="1" inputMode="decimal" />
                                    </Field>
                                )}

                                <div className="hs-row">
                                    <Field id="spots_total" label="How many students live here" error={errors.spots_total} hint="Spots you rent out, not counting yourself.">
                                        <input {...inputProps('spots_total')} type="number" min="1" max="20" step="1" />
                                    </Field>
                                    <Field id="spots_open" label="Spots still free" optional error={errors.spots_open} hint="Leave empty if all are free.">
                                        <input {...inputProps('spots_open')} type="number" min="0" max="20" step="1" />
                                    </Field>
                                </div>

                                <div className="hs-row hs-row--3">
                                    <Field id="total_rooms" label="Rooms" optional error={errors.total_rooms}>
                                        <input {...inputProps('total_rooms')} type="number" min="1" max="30" step="1" />
                                    </Field>
                                    <Field id="bathrooms" label="Bathrooms" optional error={errors.bathrooms}>
                                        <input {...inputProps('bathrooms')} type="number" min="0" max="10" step="1" />
                                    </Field>
                                    <Field id="area_m2" label="Size (m²)" optional error={errors.area_m2}>
                                        <input {...inputProps('area_m2')} type="number" min="5" max="1000" step="1" />
                                    </Field>
                                </div>

                                <Field id="furnishing" label="Furnishing" error={errors.furnishing}>
                                    <select {...inputProps('furnishing')}>
                                        <option value="">Choose…</option>
                                        {Object.entries(FURNISHING).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                    </select>
                                </Field>
                            </fieldset>
                        )}

                        {step === 2 && (
                            <fieldset>
                                <legend>Address and dates</legend>
                                <p className="hs-hint hs-hint--block">The address is shown on the listing so students can check the commute. Only real places get posted.</p>
                                <div onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) pickerRef.current?.findIfEmpty(); }}>
                                <Field id="street" label="Street and number" error={errors.street}>
                                    <input {...inputProps('street')} autoComplete="street-address" />
                                </Field>
                                <div className="hs-row">
                                    <Field id="postal_code" label="Postal code" optional error={errors.postal_code}>
                                        <input {...inputProps('postal_code')} inputMode="numeric" maxLength={4} autoComplete="postal-code" />
                                    </Field>
                                    <Field id="city" label="City" error={errors.city}>
                                        <input {...inputProps('city')} list="hs-form-cities" autoComplete="address-level2" />
                                        <datalist id="hs-form-cities">
                                            {CITY_SUGGESTIONS.map(city => <option key={city} value={city} />)}
                                        </datalist>
                                    </Field>
                                </div>
                                </div>
                                <Field id="neighbourhood" label="Neighbourhood" optional hint="E.g. Bežigrad, Semedela, Tabor">
                                    <input {...inputProps('neighbourhood')} maxLength={100} />
                                </Field>
                                <Suspense fallback={<p className="hs-muted">Loading the map…</p>}>
                                <LocationPicker
                                    ref={pickerRef}
                                    street={form.street}
                                    city={form.city}
                                    postalCode={form.postal_code}
                                    value={pin}
                                    onChange={(next) => { setPin(next); if (errors.location) setErrors(prev => ({ ...prev, location: '' })); }}
                                    error={errors.location}
                                />
                                </Suspense>
                                <div className="hs-row">
                                    <Field id="available_from" label="Available from" error={errors.available_from}>
                                        <input {...inputProps('available_from')} type="date" />
                                    </Field>
                                    <Field id="available_until" label="Available until" optional error={errors.available_until} hint="For sublets and fixed-term leases.">
                                        <input {...inputProps('available_until')} type="date" min={form.available_from || undefined} />
                                    </Field>
                                </div>
                                <Field id="min_stay_months" label="Minimum stay (months)" optional error={errors.min_stay_months}>
                                    <input {...inputProps('min_stay_months')} type="number" min="1" max="60" step="1" />
                                </Field>
                            </fieldset>
                        )}

                        {step === 3 && (
                            <fieldset>
                                <legend>Rules and extras</legend>
                                <div className="hs-check-grid">
                                    <label className="hs-check">
                                        <input type="checkbox" name="address_registration_allowed" checked={form.address_registration_allowed} onChange={handleChange} />
                                        <span><strong>Students can register their address here</strong><br /><small>Foreign students need this within 8 days of arriving.</small></span>
                                    </label>
                                    <label className="hs-check">
                                        <input type="checkbox" name="subsidy_eligible" checked={form.subsidy_eligible} onChange={handleChange} />
                                        <span><strong>Student housing subsidy possible</strong><br /><small>A written lease and registered address are needed for the state subsidy.</small></span>
                                    </label>
                                    <label className="hs-check">
                                        <input type="checkbox" name="smoking_allowed" checked={form.smoking_allowed} onChange={handleChange} />
                                        Smoking allowed
                                    </label>
                                    <label className="hs-check">
                                        <input type="checkbox" name="pets_allowed" checked={form.pets_allowed} onChange={handleChange} />
                                        Pets allowed
                                    </label>
                                </div>

                                <div className="hs-field">
                                    <span className="hs-label">What’s included</span>
                                    <div className="hs-chips">
                                        {Object.entries(AMENITIES).map(([value, label]) => (
                                            <button key={value} type="button" className={`hs-chip hs-chip--toggle ${form.amenities.includes(value) ? 'is-on' : ''}`}
                                                aria-pressed={form.amenities.includes(value)} onClick={() => toggleInList('amenities', value)}>
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="hs-field">
                                    <span className="hs-label">Languages you speak</span>
                                    <p className="hs-hint">Helps international students know they can talk to you.</p>
                                    <div className="hs-chips">
                                        {Object.entries(LANGUAGES).map(([value, label]) => (
                                            <button key={value} type="button" className={`hs-chip hs-chip--toggle ${form.languages.includes(value) ? 'is-on' : ''}`}
                                                aria-pressed={form.languages.includes(value)} onClick={() => toggleInList('languages', value)}>
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <Field id="video_tour_url" label="Video tour link" optional error={errors.video_tour_url} hint="A YouTube or Google Drive link. Great for students who can’t visit before arriving.">
                                    <input {...inputProps('video_tour_url')} type="url" placeholder="https://" />
                                </Field>
                            </fieldset>
                        )}

                        {step === 4 && (
                            <fieldset>
                                <legend>Photos</legend>
                                <p className="hs-hint hs-hint--block">Up to {MAX_PHOTOS} photos (JPG, PNG or WebP, max {MAX_PHOTO_MB} MB each). The first one is the cover. Show the room, kitchen and bathroom.</p>

                                <div className="hs-photo-grid">
                                    {existingPhotos.map(photo => {
                                        const removed = removedIds.includes(photo.id);
                                        return (
                                            <div key={photo.id} className={`hs-photo ${removed ? 'is-removed' : ''}`}>
                                                <img src={resolveMediaUrl(photo.url)} alt="" />
                                                <button type="button" onClick={() => toggleExistingPhoto(photo.id)}>
                                                    {removed ? 'Undo' : 'Remove'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                    {newPhotos.map((photo, index) => (
                                        <div key={photo.url} className="hs-photo hs-photo--new">
                                            <img src={photo.url} alt="" />
                                            <button type="button" onClick={() => removeNewPhoto(index)}>Remove</button>
                                        </div>
                                    ))}
                                    {photoCount < MAX_PHOTOS && (
                                        <label className="hs-photo-add">
                                            <input type="file" accept={PHOTO_TYPES.join(',')} multiple onChange={handleFiles} />
                                            <span>+ Add photos</span>
                                            <small>{photoCount} / {MAX_PHOTOS}</small>
                                        </label>
                                    )}
                                </div>
                                {errors.photos && <p className="hs-field-error">{errors.photos}</p>}
                            </fieldset>
                        )}

                        <div className="hs-form-nav">
                            {step > 0
                                ? <button type="button" className="hs-btn hs-btn--ghost" onClick={() => goTo(step - 1)}>Back</button>
                                : <span />}
                            <button type="submit" className="hs-btn" disabled={submitting}>
                                {step < STEPS.length - 1
                                    ? 'Next'
                                    : submitting ? 'Saving…' : editing ? 'Save changes' : 'Publish listing'}
                            </button>
                        </div>
                    </form>

                    <aside className="hs-form-preview" aria-label="Preview">
                        <p className="hs-label">Preview</p>
                        <HousingCard listing={preview} preview photoUrl={previewPhoto} />
                        <p className="hs-hint">This is how your place appears in search.</p>
                    </aside>
                </div>
            </main>
        </div>
    );
};

export default HousingFormPage;
