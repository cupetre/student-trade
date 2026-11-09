import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AppNav from '../../components/AppNav.jsx';
import Avatar from '../../components/Avatar.jsx';
import { apiRequest } from '../../lib/api';
import { resolveMediaUrl } from '../../lib/media';
import { updateCurrentUser } from '../../lib/useCurrentUser';
import { CITY_SUGGESTIONS, toDateInput } from '../../lib/housingOptions';
import {
    COUNTRY_OPTIONS, LANGUAGES, STUDY_LEVELS, STUDENT_TYPES, LIFESTYLE, UNIVERSITY_SUGGESTIONS, REQUIRED_LABELS, STAY_LENGTHS,
} from '../../lib/profileOptions';
import '../housing/Housing.css';
import './Profile.css';

const EMPTY = {
    birth_date: '', home_country: '', home_city: '',
    university: '', faculty: '', study_programme: '', study_level: '', study_year: '', student_type: '',
    budget_max: '', move_in_date: '', preferred_city: '', stay_length: '',
    languages: [], smoker: '', has_pets: '', lifestyle: [],
};
const TOTAL_REQUIRED = Object.keys(REQUIRED_LABELS).length;
const MAX_LIFESTYLE = 6;
const MAX_BIO = 1000;
const MAX_PHOTO_MB = 5;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function toForm(profile) {
    const form = { ...EMPTY };
    if (!profile) return form;
    for (const key of Object.keys(EMPTY)) {
        const value = profile[key];
        if (Array.isArray(EMPTY[key])) form[key] = Array.isArray(value) ? value : [];
        else if (typeof value === 'boolean') form[key] = value ? 'true' : 'false';
        else form[key] = value === null || value === undefined ? '' : String(value);
    }
    form.birth_date = toDateInput(profile.birth_date);
    form.move_in_date = toDateInput(profile.move_in_date);
    return form;
}

// Only allow going back to a page on this site (never to another website)
function safeNext(value) {
    return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '';
}

// Yes / No only (no "Rather not say": leaving it empty means not saying).
// "Clear" takes an answer back.
const YesNo = ({ name, value, onChange, label, editing }) => (
    <div className="sp-yesno">
        <div className="sp-segment" role="radiogroup" aria-label={label}>
            {[['true', 'Yes'], ['false', 'No']].map(([v, text]) => (
                <label key={v} className={value === v ? 'is-on' : ''}>
                    <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(name, v)} />
                    {text}
                </label>
            ))}
        </div>
        {editing && value !== '' && <button type="button" className="hs-link-btn" onClick={() => onChange(name, '')}>Clear</button>}
    </div>
);

// Rental profile (/profile/student), four cards in a 2 × 2 grid:
// photo & basic info · studies · what you're looking for · more about you (optional).
// It opens read-only; "Edit profile" unlocks it, "Save" stores the changes and locks it again.
const StudentProfilePage = () => {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const next = safeNext(params.get('next'));

    const [saved, setSaved] = useState({ form: EMPTY, bio: '' }); // what's stored, for Cancel
    const [form, setForm] = useState(EMPTY);
    const [bio, setBio] = useState('');
    const [photo, setPhoto] = useState(null); // new photo chosen while editing: { file, url }
    const [user, setUser] = useState(null);
    const [missing, setMissing] = useState([]);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(true);
    const [notAStudent, setNotAStudent] = useState(false);
    // Coming from "complete your profile to contact this landlord": open ready to edit
    const [editing, setEditing] = useState(Boolean(next) || params.get('edit') === '1'); // ?edit=1 opens it ready to change
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState('');
    const [formError, setFormError] = useState('');

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            apiRequest('/api/users/fetch_profile'),
            apiRequest('/api/users/me/student-profile'),
        ]).then(([me, profile]) => {
            if (cancelled) return;
            setLoading(false);
            const myBio = me.ok ? me.data.bio || '' : '';
            if (me.ok) { setUser(me.data); setBio(myBio); }
            if (profile.status === 400) { setNotAStudent(true); return; }
            if (!profile.ok) { setFormError(profile.data.error); return; }
            const loaded = toForm(profile.data.profile);
            setForm(loaded);
            setSaved({ form: loaded, bio: myBio });
            setMissing(profile.data.missing);
        });
        return () => { cancelled = true; };
    }, []);

    // Free the photo preview when it's replaced or the page closes
    useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);

    const set = (name, value) => {
        setForm(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
        setFormError('');
    };
    const handleChange = (e) => set(e.target.name, e.target.value);
    const toggle = (name, value, max) => {
        const list = form[name];
        if (list.includes(value)) set(name, list.filter(v => v !== value));
        else if (!max || list.length < max) set(name, [...list, value]);
    };

    const handlePhoto = (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!PHOTO_TYPES.includes(file.type)) { setErrors(prev => ({ ...prev, profile_picture: 'Use a JPG, PNG or WebP image' })); return; }
        if (file.size > MAX_PHOTO_MB * 1024 * 1024) { setErrors(prev => ({ ...prev, profile_picture: `The photo must be smaller than ${MAX_PHOTO_MB} MB` })); return; }
        setErrors(prev => ({ ...prev, profile_picture: '' }));
        setPhoto({ file, url: URL.createObjectURL(file) });
    };

    const startEditing = () => {
        setEditing(true);
        setNotice('');
    };

    const cancel = () => {
        setForm(saved.form);
        setBio(saved.bio);
        setPhoto(null);
        setErrors({});
        setFormError('');
        setEditing(false);
    };

    const showError = (message) => {
        setFormError(message);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!editing || saving) return;
        setSaving(true);
        setNotice('');

        // Photo and bio belong to the account (they're on My profile and in the
        // top bar too), so they're saved through the account first
        if (photo || bio.trim() !== saved.bio.trim()) {
            const body = new FormData();
            body.append('bio', bio.trim());
            if (photo) body.append('profilePicture', photo.file);
            const { ok, data } = await apiRequest('/api/users/edit_profile', { method: 'PUT', formData: body });
            if (!ok) {
                setSaving(false);
                setErrors(prev => ({ ...prev, [photo ? 'profile_picture' : 'bio']: data.error }));
                showError(data.error);
                return;
            }
            const newPicture = data.result?.profile_picture;
            setUser(prev => ({ ...prev, bio: bio.trim(), ...(newPicture ? { profile_picture: newPicture } : {}) }));
            setSaved(prev => ({ ...prev, bio: bio.trim() }));
            setPhoto(null);
            if (newPicture) setMissing(prev => prev.filter(f => f !== 'profile_picture'));
            updateCurrentUser({ bio: bio.trim(), ...(newPicture ? { profile_picture: newPicture } : {}) });
        }

        const body = {
            ...form,
            smoker: form.smoker === '' ? null : form.smoker === 'true',
            has_pets: form.has_pets === '' ? null : form.has_pets === 'true',
        };
        const { ok, data } = await apiRequest('/api/users/me/student-profile', { method: 'PUT', body });
        setSaving(false);

        if (!ok) {
            setErrors(data.fields || {});
            showError(data.error);
            return;
        }
        const stored = toForm(data.profile);
        setErrors({});
        setMissing(data.missing);
        setForm(stored);
        setSaved(prev => ({ ...prev, form: stored }));
        setEditing(false);
        if (data.complete && next) {
            navigate(next, { replace: true });
            return;
        }
        setNotice(data.complete ? 'Saved. Your profile is complete, so you can contact landlords.' : 'Saved. A few things are still missing (see the top of the page).');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const field = (name) => ({
        id: name, name, value: form[name], onChange: handleChange,
        'aria-invalid': Boolean(errors[name]),
    });
    const err = (name) => errors[name] && <p className="hs-field-error">{errors[name]}</p>;
    const req = (name) => missing.includes(name) && <span className="sp-req">needed</span>;
    const opt = <span className="hs-optional">(optional)</span>;
    const choose = editing ? 'Choose…' : 'Not added';

    if (loading) return <div className="hs-shell"><AppNav /><main className="hs-page"><p className="hs-muted">Loading…</p></main></div>;

    if (notAStudent) {
        return (
            <div className="hs-shell">
                <AppNav />
                <main className="hs-page">
                    <div className="hs-empty">
                        <h1>Rental profiles are for students</h1>
                        <p>Your account is a landlord account. Students fill in a rental profile so you can see who is contacting you.</p>
                        <Link to="/housing/mine" className="hs-btn">My listings</Link>
                    </div>
                </main>
            </div>
        );
    }

    const done = TOTAL_REQUIRED - missing.length;
    const shownPhoto = photo?.url || resolveMediaUrl(user?.profile_picture);

    const actions = (where) => (editing ? (
        <div className={`sp-actions sp-actions--${where}`}>
            {/* keys: new buttons, so the click on "Edit profile" can't land on "Save" */}
            <button key="cancel" type="button" className="hs-btn hs-btn--ghost" onClick={cancel} disabled={saving}>Cancel</button>
            <button key="save" type="submit" form="sp-form" className="hs-btn" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
        </div>
    ) : (
        <div className={`sp-actions sp-actions--${where}`}>
            <button key="edit" type="button" className="hs-btn" onClick={startEditing}>Edit profile</button>
        </div>
    ));

    return (
        <div className="hs-shell">
            <AppNav />
            <main className="hs-page sp-page">
                <header className="hs-head sp-head">
                    <div>
                        <h1>Your rental profile</h1>
                        <p>Landlords see this when you contact them, so they know who you are before replying. Your exact date of birth is never shown, only your age.</p>
                    </div>
                    {actions('top')}
                </header>

                <section className={`sp-progress ${missing.length ? '' : 'is-done'}`} aria-label="Profile progress">
                    <div className="sp-progress-top">
                        <strong>{missing.length ? `${done} of ${TOTAL_REQUIRED} needed things done` : 'Profile complete'}</strong>
                        {user?.id && <Link to={`/users/${user.id}`} className="hs-link">See how others see it</Link>}
                    </div>
                    <div className="sp-bar"><span style={{ width: `${(done / TOTAL_REQUIRED) * 100}%` }} /></div>
                    {missing.length > 0 && (
                        <p className="sp-missing">
                            Still needed to contact landlords: {missing.map(f => REQUIRED_LABELS[f] || f).join(', ')}. Everything else is optional.
                            {!editing && ' Press “Edit profile” to fill them in.'}
                        </p>
                    )}
                    {next && missing.length > 0 && <p className="sp-missing">When it’s complete we’ll take you back to the place you were looking at.</p>}
                </section>

                {formError && <div className="hs-alert hs-alert--error" role="alert">{formError}</div>}
                {notice && <div className="hs-alert hs-alert--success" role="status">{notice}</div>}

                <form id="sp-form" className={`sp-form ${editing ? 'is-editing' : 'is-view'}`} onSubmit={handleSubmit} noValidate>
                    {/* Read-only until "Edit profile": one switch for every field */}
                    <fieldset className="sp-grid-form" disabled={!editing || saving}>
                        <legend className="sp-sr">{editing ? 'Editing your rental profile' : 'Your rental profile (press Edit profile to change it)'}</legend>

                        {/* 1. Photo & basic info */}
                        <section className="sp-card" aria-labelledby="sp-h-basic">
                            <h2 id="sp-h-basic"><span className="sp-step">1</span>Photo & basic info</h2>
                            <div className="sp-photo">
                                <Avatar src={shownPhoto} name={user?.fullname} size={72} />
                                <div>
                                    <span className="hs-label">Photo {req('profile_picture')}</span>
                                    {editing && (
                                        <label className="hs-btn hs-btn--small hs-btn--ghost sp-upload">
                                            <input type="file" accept={PHOTO_TYPES.join(',')} onChange={handlePhoto} />
                                            {shownPhoto ? 'Change photo' : 'Add a photo'}
                                        </label>
                                    )}
                                    {editing && photo && <button type="button" className="hs-link-btn sp-undo" onClick={() => setPhoto(null)}>Undo</button>}
                                    <p className="hs-hint">{photo ? 'New photo: it’s saved when you press Save.' : 'A clear photo of your face. Also shown in the top bar and on your profile.'}</p>
                                    {err('profile_picture')}
                                </div>
                            </div>
                            <div className="hs-row">
                                <div className="hs-field">
                                    <label htmlFor="birth_date">Date of birth {req('birth_date')}</label>
                                    <input {...field('birth_date')} type="date" max={new Date().toISOString().slice(0, 10)} aria-describedby="birth_date-hint" />
                                    <p className="hs-hint" id="birth_date-hint">Only your age is shown.</p>
                                    {err('birth_date')}
                                </div>
                                <div className="hs-field">
                                    <label htmlFor="home_country">Home country {req('home_country')}</label>
                                    <select {...field('home_country')}>
                                        <option value="">{choose}</option>
                                        {COUNTRY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                                    </select>
                                    {err('home_country')}
                                </div>
                            </div>
                            <div className="hs-field">
                                <label htmlFor="home_city">Home town {opt}</label>
                                <input {...field('home_city')} maxLength={100} placeholder={editing ? 'E.g. Skopje, Split, Celje' : 'Not added'} />
                            </div>
                            <div className="hs-field">
                                <label htmlFor="sp-bio">A few words about you {opt}</label>
                                <textarea id="sp-bio" rows="3" maxLength={MAX_BIO} value={bio} placeholder={editing ? '' : 'Not added'}
                                    onChange={(e) => { setBio(e.target.value); if (errors.bio) setErrors(prev => ({ ...prev, bio: '' })); }}
                                    aria-describedby="sp-bio-hint" />
                                {editing && <p className="hs-hint" id="sp-bio-hint">Shown on your profile too. What you study, what you’re into, why you’re moving. {bio.length}/{MAX_BIO}</p>}
                                {err('bio')}
                            </div>
                        </section>

                        {/* 2. Studies */}
                        <section className="sp-card" aria-labelledby="sp-h-studies">
                            <h2 id="sp-h-studies"><span className="sp-step">2</span>Studies</h2>
                            <div className="hs-field">
                                <label htmlFor="university">University {req('university')}</label>
                                <input {...field('university')} list="sp-universities" maxLength={150} />
                                <datalist id="sp-universities">{UNIVERSITY_SUGGESTIONS.map(u => <option key={u} value={u} />)}</datalist>
                                {err('university')}
                            </div>
                            <div className="hs-row">
                                <div className="hs-field">
                                    <label htmlFor="faculty">Faculty {req('faculty')}</label>
                                    <input {...field('faculty')} maxLength={150} placeholder={editing ? 'E.g. FAMNIT, FM, FRI' : ''} />
                                    {err('faculty')}
                                </div>
                                <div className="hs-field">
                                    <label htmlFor="study_programme">Programme {opt}</label>
                                    <input {...field('study_programme')} maxLength={150} placeholder={editing ? '' : 'Not added'} />
                                </div>
                            </div>
                            <div className="hs-row">
                                <div className="hs-field">
                                    <label htmlFor="study_level">Level {req('study_level')}</label>
                                    <select {...field('study_level')}>
                                        <option value="">{choose}</option>
                                        {Object.entries(STUDY_LEVELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                    </select>
                                    {err('study_level')}
                                </div>
                                <div className="hs-field">
                                    <label htmlFor="study_year">Year {opt}</label>
                                    <select {...field('study_year')}>
                                        <option value="">{editing ? '—' : 'Not added'}</option>
                                        {[1, 2, 3, 4, 5, 6].map(y => <option key={y} value={y}>{y}.</option>)}
                                    </select>
                                    {err('study_year')}
                                </div>
                            </div>
                            <div className="hs-field">
                                <span className="hs-label">Type {opt}</span>
                                <div className="sp-segment sp-segment--stack" role="radiogroup" aria-label="Type of student">
                                    {Object.entries(STUDENT_TYPES).map(([v, l]) => (
                                        <label key={v} className={form.student_type === v ? 'is-on' : ''}>
                                            <input type="radio" name="student_type" value={v} checked={form.student_type === v} onChange={() => set('student_type', v)} />
                                            {l}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* 3. What you're looking for */}
                        <section className="sp-card" aria-labelledby="sp-h-looking">
                            <h2 id="sp-h-looking">
                                <span className="sp-step">3</span>What you’re looking for {opt}
                                <span className="sp-visibility">Landlords you contact see this</span>
                            </h2>
                            <div className="hs-row">
                                <div className="hs-field">
                                    <label htmlFor="budget_max">Max rent per month (€)</label>
                                    <input {...field('budget_max')} type="number" min="1" step="1" inputMode="numeric" placeholder={editing ? '' : 'Not added'} />
                                    {err('budget_max')}
                                </div>
                                <div className="hs-field">
                                    <label htmlFor="move_in_date">Move in from</label>
                                    <input {...field('move_in_date')} type="date" />
                                    {err('move_in_date')}
                                </div>
                            </div>
                            <div className="hs-field">
                                <label htmlFor="stay_length">How long do you want to stay?</label>
                                <select {...field('stay_length')}>
                                    <option value="">{choose}</option>
                                    {Object.entries(STAY_LENGTHS).map(([v, { label, hint }]) => (
                                        <option key={v} value={v}>{label} ({hint})</option>
                                    ))}
                                </select>
                                {err('stay_length')}
                            </div>
                            <div className="hs-field">
                                <label htmlFor="preferred_city">City</label>
                                <input {...field('preferred_city')} list="sp-cities" maxLength={100} placeholder={editing ? '' : 'Not added'} />
                                <datalist id="sp-cities">{CITY_SUGGESTIONS.map(c => <option key={c} value={c} />)}</datalist>
                            </div>
                            <p className="hs-hint">Tells a landlord at a glance whether their place fits you, so you get fewer “sorry, it’s taken” replies.</p>
                        </section>

                        {/* 4. More about you (optional) */}
                        <section className="sp-card sp-card--optional" aria-labelledby="sp-h-more">
                            <h2 id="sp-h-more"><span className="sp-step">4</span>More about you <span className="hs-optional">(all optional)</span></h2>
                            <div className="hs-field">
                                <span className="hs-label">Languages you speak</span>
                                <div className="hs-chips">
                                    {Object.entries(LANGUAGES).map(([v, l]) => (
                                        <button key={v} type="button" className={`hs-chip hs-chip--toggle ${form.languages.includes(v) ? 'is-on' : ''}`}
                                            aria-pressed={form.languages.includes(v)} onClick={() => toggle('languages', v)}>{l}</button>
                                    ))}
                                </div>
                                {err('languages')}
                            </div>
                            <div className="hs-row">
                                <div className="hs-field">
                                    <span className="hs-label">Do you smoke?</span>
                                    <YesNo name="smoker" value={form.smoker} onChange={set} label="Do you smoke?" editing={editing} />
                                    {err('smoker')}
                                </div>
                                <div className="hs-field">
                                    <span className="hs-label">Do you have a pet?</span>
                                    <YesNo name="has_pets" value={form.has_pets} onChange={set} label="Do you have a pet?" editing={editing} />
                                    {err('has_pets')}
                                </div>
                            </div>
                            <div className="hs-field">
                                <span className="hs-label">How you live {editing && <span className="hs-optional">(up to {MAX_LIFESTYLE})</span>}</span>
                                <div className="hs-chips">
                                    {Object.entries(LIFESTYLE).map(([v, l]) => {
                                        const on = form.lifestyle.includes(v);
                                        return (
                                            <button key={v} type="button" className={`hs-chip hs-chip--toggle ${on ? 'is-on' : ''}`}
                                                aria-pressed={on} disabled={!on && form.lifestyle.length >= MAX_LIFESTYLE}
                                                onClick={() => toggle('lifestyle', v, MAX_LIFESTYLE)}>{l}</button>
                                        );
                                    })}
                                </div>
                                {err('lifestyle')}
                            </div>
                        </section>
                    </fieldset>

                    {actions('bottom')}
                </form>
            </main>
        </div>
    );
};

export default StudentProfilePage;
