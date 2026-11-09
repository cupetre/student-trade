import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppNav from '../components/AppNav.jsx';
import Avatar from '../components/Avatar.jsx';
import ReviewList from '../components/ReviewList.jsx';
import { RatingSummary } from '../components/Stars.jsx';
import { apiRequest } from '../lib/api';
import { resolveMediaUrl } from '../lib/media';
import { updateCurrentUser, isLandlord } from '../lib/useCurrentUser';
import './housing/Housing.css';
import './profile/Profile.css';
import './ProfilePage.css';

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO_MB = 5;
const MAX_BIO = 1000;

function memberSince(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

const Chevron = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="mp-chevron"><path d="M9 6l6 6-6 6" /></svg>
);

// My profile (/profilepage): name, photo and bio, reviews about me, and
// shortcuts to everything else that's mine. Same look as the housing pages.
const ProfilePage = () => {
    const [me, setMe] = useState(null);
    const [loadError, setLoadError] = useState('');
    const [reviews, setReviews] = useState([]);
    const [counts, setCounts] = useState({ items: null, places: null });
    const [rentalComplete, setRentalComplete] = useState(null);

    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ fullname: '', bio: '' });
    const [photo, setPhoto] = useState(null); // { file, url }
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);
    const [flash, setFlash] = useState('');

    useEffect(() => {
        let cancelled = false;
        apiRequest('/api/users/fetch_profile').then(({ ok, data }) => {
            if (cancelled) return;
            if (!ok) { setLoadError(data.error); return; }
            setMe(data);
            const landlord = isLandlord(data);

            // Everything else loads alongside; a failure just leaves that part out
            apiRequest('/api/rr/get_reviews').then(r => { if (!cancelled && r.ok) setReviews(r.data); });
            apiRequest('/api/housing/mine').then(r => { if (!cancelled && r.ok) setCounts(c => ({ ...c, places: r.data.length })); });
            if (!landlord) {
                apiRequest('/api/listings/fetch_my_listings').then(r => { if (!cancelled && r.ok) setCounts(c => ({ ...c, items: r.data.length })); });
                apiRequest('/api/users/me/student-profile').then(r => { if (!cancelled && r.ok) setRentalComplete(Boolean(r.data.complete)); });
            }
        });
        return () => { cancelled = true; };
    }, []);

    // Free the photo preview when it's replaced or the page closes
    useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);

    const startEditing = () => {
        setForm({ fullname: me.fullname || '', bio: me.bio || '' });
        setPhoto(null);
        setErrors({});
        setFormError('');
        setFlash('');
        setEditing(true);
    };

    const cancel = () => { setEditing(false); setPhoto(null); };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
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

    const save = async (e) => {
        e.preventDefault();
        const name = form.fullname.trim();
        if (name.length < 2) { setErrors({ fullname: 'Enter your full name.' }); return; }

        const data = new FormData();
        data.append('fullname', name);
        data.append('bio', form.bio.trim());
        if (photo) data.append('profilePicture', photo.file);

        setSaving(true);
        setFormError('');
        const { ok, data: result } = await apiRequest('/api/users/edit_profile', { method: 'PUT', formData: data });
        setSaving(false);
        if (!ok) {
            if (result.field) setErrors({ [result.field]: result.error });
            else setFormError(result.error);
            return;
        }

        setMe(prev => ({
            ...prev,
            fullname: name,
            bio: form.bio.trim(),
            profile_picture: result.result?.profile_picture || prev.profile_picture,
        }));
        // the top bar shows the new name and photo straight away
        updateCurrentUser({
            fullname: name,
            bio: form.bio.trim(),
            ...(result.result?.profile_picture ? { profile_picture: result.result.profile_picture } : {}),
        });
        setEditing(false);
        setPhoto(null);
        setFlash('Your profile was saved.');
    };

    if (loadError || !me) {
        return (
            <div className="hs-shell">
                <AppNav />
                <main className="hs-page">
                    {loadError ? <div className="hs-alert hs-alert--error" role="alert">{loadError}</div> : <p className="hs-muted">Loading…</p>}
                </main>
            </div>
        );
    }

    const landlord = isLandlord(me);
    const currentPhoto = photo?.url || resolveMediaUrl(me.profile_picture);
    const rating = reviews.length
        ? { count: reviews.length, average: reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length }
        : null;

    const roleTag = landlord
        ? (me.landlord_status === 'approved' ? <span className="hs-tag hs-tag--good">Verified landlord</span> : <span className="hs-tag">Landlord · being reviewed</span>)
        : <span className="hs-tag hs-tag--good">Verified student</span>;

    return (
        <div className="hs-shell">
            <AppNav />
            <main className="hs-page mp-page">
                <header className="hs-head">
                    <h1>My profile</h1>
                </header>

                {flash && <div className="hs-alert hs-alert--success" role="status">{flash}</div>}

                <div className="mp-grid">
                    <div className="mp-main">
                        {/* ---- about you ---- */}
                        {!editing ? (
                            <section className="mp-card mp-about" aria-label="About you">
                                <Avatar src={currentPhoto} name={me.fullname} size={104} className="mp-avatar" />
                                <div className="mp-about-info">
                                    <div className="mp-about-top">
                                        <h2>{me.fullname}</h2>
                                        <button type="button" className="hs-btn hs-btn--small hs-btn--ghost" onClick={startEditing}>Edit profile</button>
                                    </div>
                                    <div className="mp-tags">
                                        {roleTag}
                                        {me.created_at && <span className="hs-muted">Member since {memberSince(me.created_at)}</span>}
                                    </div>
                                    <p className="mp-email">{me.email}</p>
                                    {me.bio
                                        ? <p className="mp-bio">{me.bio}</p>
                                        : (
                                            <p className="mp-bio mp-bio--empty">
                                                No bio yet. <button type="button" className="hs-link-btn" onClick={startEditing}>Add a few words</button> about
                                                {landlord ? ' you or your agency' : ' what you study and where you’re from'}. It helps people trust you.
                                            </p>
                                        )}
                                </div>
                            </section>
                        ) : (
                            <form className="mp-card mp-edit" onSubmit={save} noValidate aria-label="Edit your profile">
                                <h2>Edit profile</h2>
                                {formError && <div className="hs-alert hs-alert--error" role="alert">{formError}</div>}

                                <div className="mp-photo">
                                    <Avatar src={currentPhoto} name={form.fullname || me.fullname} size={88} className="mp-avatar" />
                                    <div>
                                        <div className="mp-photo-actions">
                                            <label className="hs-btn hs-btn--small hs-btn--ghost mp-upload">
                                                <input type="file" accept={PHOTO_TYPES.join(',')} onChange={handleFile} />
                                                {currentPhoto ? 'Change photo' : 'Add a photo'}
                                            </label>
                                            {photo && <button type="button" className="hs-link-btn" onClick={() => setPhoto(null)}>Undo</button>}
                                        </div>
                                        <p className="hs-hint">A clear photo of your face. JPG, PNG or WebP, up to {MAX_PHOTO_MB} MB.</p>
                                        {errors.photo && <p className="hs-field-error" role="alert">{errors.photo}</p>}
                                    </div>
                                </div>

                                <div className={`hs-field ${errors.fullname ? 'has-error' : ''}`}>
                                    <label htmlFor="mp-name">Full name</label>
                                    <input id="mp-name" name="fullname" type="text" maxLength={100} value={form.fullname} onChange={handleChange}
                                        aria-invalid={Boolean(errors.fullname)} aria-describedby={errors.fullname ? 'mp-name-error' : undefined} />
                                    {errors.fullname && <p className="hs-field-error" id="mp-name-error">{errors.fullname}</p>}
                                </div>

                                <div className="hs-field">
                                    <label htmlFor="mp-email">Email</label>
                                    <input id="mp-email" type="email" value={me.email} readOnly disabled aria-describedby="mp-email-hint" />
                                    <p className="hs-hint" id="mp-email-hint">
                                        {landlord ? 'Your login email can’t be changed here.' : 'Your verified university email can’t be changed.'}
                                    </p>
                                </div>

                                <div className="hs-field">
                                    <label htmlFor="mp-bio">Bio <span className="hs-optional">(optional)</span></label>
                                    <textarea id="mp-bio" name="bio" rows="4" maxLength={MAX_BIO} value={form.bio} onChange={handleChange} aria-describedby="mp-bio-hint" />
                                    <p className="hs-hint" id="mp-bio-hint">
                                        {landlord ? 'Who you are and what you rent out.' : 'What you study, where you’re from, what you’re into.'} {form.bio.length}/{MAX_BIO}
                                    </p>
                                </div>

                                <div className="hs-form-nav">
                                    <button type="button" className="hs-btn hs-btn--ghost" onClick={cancel}>Cancel</button>
                                    <button type="submit" className="hs-btn" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
                                </div>
                            </form>
                        )}

                        {/* ---- reviews ---- */}
                        <section className="mp-reviews" aria-labelledby="mp-reviews-title">
                            <div className="mp-section-head">
                                <h2 id="mp-reviews-title">Reviews about you</h2>
                                {rating && <RatingSummary rating={rating} />}
                            </div>
                            <ReviewList reviews={reviews}
                                emptyText={landlord
                                    ? 'No reviews yet. Tenants can review you once they’ve stayed in one of your places.'
                                    : 'No reviews yet. After you buy, sell or rent through Anchor, people can review you from your conversation.'} />
                        </section>
                    </div>

                    {/* ---- shortcuts ---- */}
                    <aside className="mp-side" aria-label="Your things on Anchor">
                        {!landlord && (
                            <Link to="/profile/student" className={`mp-card mp-rental ${rentalComplete ? 'is-done' : ''}`}>
                                <span className="mp-rental-text">
                                    <strong>Rental profile</strong>
                                    <span>
                                        {rentalComplete === null ? 'What landlords see when you message them.'
                                            : rentalComplete ? 'Complete. Landlords see it when you message them.'
                                                : 'Not finished. Complete it before you message landlords.'}
                                    </span>
                                </span>
                                {rentalComplete !== null && (
                                    <span className={`hs-status ${rentalComplete ? 'hs-status--live' : 'hs-status--soon'}`}>
                                        {rentalComplete ? 'Complete' : 'To do'}
                                    </span>
                                )}
                                <Chevron />
                            </Link>
                        )}

                        <nav className="mp-card mp-links" aria-label="Shortcuts">
                            {!landlord && (
                                <Link to="/marketplace/mine">
                                    <span>My items</span>
                                    {counts.items !== null && <span className="mp-count">{counts.items}</span>}
                                    <Chevron />
                                </Link>
                            )}
                            <Link to="/housing/mine">
                                <span>My places</span>
                                {counts.places !== null && <span className="mp-count">{counts.places}</span>}
                                <Chevron />
                            </Link>
                            {!landlord && <Link to="/housing/saved"><span>Saved places</span><Chevron /></Link>}
                            {!landlord && <Link to="/housing/stays"><span>My stays</span><Chevron /></Link>}
                            <Link to="/chatpage"><span>Messages</span><Chevron /></Link>
                        </nav>

                        <Link to={`/users/${me.id}`} className="mp-card mp-preview">
                            <span>
                                <strong>How others see you</strong>
                                <span>Your public page, the way students and landlords see it.</span>
                            </span>
                            <Chevron />
                        </Link>
                    </aside>
                </div>
            </main>
        </div>
    );
};

export default ProfilePage;
