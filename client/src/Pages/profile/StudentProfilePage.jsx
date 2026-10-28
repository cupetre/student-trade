import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AppNav from '../../components/AppNav.jsx';
import Avatar from '../../components/Avatar.jsx';
import { apiRequest } from '../../lib/api';
import { resolveMediaUrl } from '../../lib/media';
import { CITY_SUGGESTIONS, toDateInput } from '../../lib/housingOptions';
import {
    COUNTRY_OPTIONS, LANGUAGES, STUDY_LEVELS, STUDENT_TYPES, LIFESTYLE, UNIVERSITY_SUGGESTIONS, REQUIRED_LABELS,
} from '../../lib/profileOptions';
import '../housing/Housing.css';
import './Profile.css';

const EMPTY = {
    university: '', faculty: '', study_programme: '', study_level: '', study_year: '', student_type: '',
    home_country: '', home_city: '', languages: [],
    birth_date: '', smoker: '', has_pets: '', lifestyle: [],
    budget_max: '', move_in_date: '', preferred_city: '', stay_months: '',
};
const TOTAL_REQUIRED = Object.keys(REQUIRED_LABELS).length;
const MAX_LIFESTYLE = 6;
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

const YesNo = ({ name, value, onChange, allowUnset = false }) => (
    <div className="sp-segment" role="radiogroup">
        {[['true', 'Yes'], ['false', 'No'], ...(allowUnset ? [['', 'Rather not say']] : [])].map(([v, label]) => (
            <label key={v || 'unset'} className={value === v ? 'is-on' : ''}>
                <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(name, v)} />
                {label}
            </label>
        ))}
    </div>
);

const StudentProfilePage = () => {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const next = safeNext(params.get('next'));

    const [form, setForm] = useState(EMPTY);
    const [user, setUser] = useState(null);
    const [missing, setMissing] = useState([]);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(true);
    const [notAStudent, setNotAStudent] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
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
            if (me.ok) setUser(me.data);
            if (profile.status === 400) { setNotAStudent(true); return; }
            if (!profile.ok) { setFormError(profile.data.error); return; }
            setForm(toForm(profile.data.profile));
            setMissing(profile.data.missing);
        });
        return () => { cancelled = true; };
    }, []);

    const set = (name, value) => {
        setForm(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
        setNotice('');
        setFormError('');
    };
    const handleChange = (e) => set(e.target.name, e.target.value);
    const toggle = (name, value, max) => {
        const list = form[name];
        if (list.includes(value)) set(name, list.filter(v => v !== value));
        else if (!max || list.length < max) set(name, [...list, value]);
    };

    const handlePhoto = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!PHOTO_TYPES.includes(file.type)) { setErrors(prev => ({ ...prev, profile_picture: 'Use a JPG, PNG or WebP image' })); return; }
        if (file.size > 5 * 1024 * 1024) { setErrors(prev => ({ ...prev, profile_picture: 'The photo must be smaller than 5 MB' })); return; }

        const body = new FormData();
        body.append('profilePicture', file);
        setUploading(true);
        const { ok, data } = await apiRequest('/api/users/edit_profile', { method: 'PUT', formData: body });
        setUploading(false);
        if (!ok) { setErrors(prev => ({ ...prev, profile_picture: data.error })); return; }
        setUser(prev => ({ ...prev, profile_picture: data.result?.profile_picture }));
        setMissing(prev => prev.filter(f => f !== 'profile_picture'));
        setErrors(prev => ({ ...prev, profile_picture: '' }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
        const body = {
            ...form,
            smoker: form.smoker === '' ? null : form.smoker === 'true',
            has_pets: form.has_pets === '' ? null : form.has_pets === 'true',
        };
        const { ok, data } = await apiRequest('/api/users/me/student-profile', { method: 'PUT', body });
        setSaving(false);

        if (!ok) {
            setErrors(data.fields || {});
            setFormError(data.error);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        setErrors({});
        setMissing(data.missing);
        setForm(toForm(data.profile));
        if (data.complete && next) {
            navigate(next, { replace: true });
            return;
        }
        setNotice(data.complete ? 'Saved. Your profile is complete, so you can contact homeowners.' : 'Saved. A few things are still missing (see the top of the page).');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const field = (name) => ({
        id: name, name, value: form[name], onChange: handleChange,
        'aria-invalid': Boolean(errors[name]),
    });
    const err = (name) => errors[name] && <p className="hs-field-error">{errors[name]}</p>;
    const req = (name) => missing.includes(name) && <span className="sp-req">needed</span>;

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

    return (
        <div className="hs-shell">
            <AppNav />
            <main className="hs-page sp-page">
                <header className="hs-head">
                    <h1>Your rental profile</h1>
                    <p>Homeowners see this when you contact them, so they know who you are before replying. Your exact date of birth is never shown, only your age.</p>
                </header>

                <section className={`sp-progress ${missing.length ? '' : 'is-done'}`} aria-label="Profile progress">
                    <div className="sp-progress-top">
                        <strong>{missing.length ? `${done} of ${TOTAL_REQUIRED} done` : 'Profile complete'}</strong>
                        {user?.id && <Link to={`/users/${user.id}`} className="hs-link">See how others see it</Link>}
                    </div>
                    <div className="sp-bar"><span style={{ width: `${(done / TOTAL_REQUIRED) * 100}%` }} /></div>
                    {missing.length > 0 && (
                        <p className="sp-missing">
                            Still needed to contact homeowners: {missing.map(f => REQUIRED_LABELS[f] || f).join(', ')}.
                        </p>
                    )}
                    {next && missing.length > 0 && <p className="sp-missing">When it’s complete we’ll take you back to the place you were looking at.</p>}
                </section>

                {formError && <div className="hs-alert hs-alert--error" role="alert">{formError}</div>}
                {notice && <div className="hs-alert hs-alert--success" role="status">{notice}</div>}

                <form className="sp-form" onSubmit={handleSubmit} noValidate>
                    <section className="sp-card">
                        <h2>Photo {req('profile_picture')}</h2>
                        <div className="sp-photo">
                            <Avatar src={resolveMediaUrl(user?.profile_picture)} name={user?.fullname} size={88} />
                            <div>
                                <label className="hs-btn hs-btn--ghost sp-upload">
                                    <input type="file" accept={PHOTO_TYPES.join(',')} onChange={handlePhoto} disabled={uploading} />
                                    {uploading ? 'Uploading…' : user?.profile_picture ? 'Change photo' : 'Upload a photo'}
                                </label>
                                <p className="hs-hint">A clear photo of your face. It helps homeowners trust who they’re talking to.</p>
                                {err('profile_picture')}
                            </div>
                        </div>
                    </section>

                    <section className="sp-card">
                        <h2>Studies</h2>
                        <div className="hs-row">
                            <div className="hs-field">
                                <label htmlFor="university">University {req('university')}</label>
                                <input {...field('university')} list="sp-universities" maxLength={150} />
                                <datalist id="sp-universities">{UNIVERSITY_SUGGESTIONS.map(u => <option key={u} value={u} />)}</datalist>
                                {err('university')}
                            </div>
                            <div className="hs-field">
                                <label htmlFor="faculty">Faculty {req('faculty')}</label>
                                <input {...field('faculty')} maxLength={150} placeholder="E.g. FAMNIT, FM, FRI" />
                                {err('faculty')}
                            </div>
                        </div>
                        <div className="hs-field">
                            <label htmlFor="study_programme">Study programme <span className="hs-optional">(optional)</span></label>
                            <input {...field('study_programme')} maxLength={150} />
                        </div>
                        <div className="hs-row">
                            <div className="hs-field">
                                <label htmlFor="study_level">Level {req('study_level')}</label>
                                <select {...field('study_level')}>
                                    <option value="">Choose…</option>
                                    {Object.entries(STUDY_LEVELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                </select>
                                {err('study_level')}
                            </div>
                            <div className="hs-field">
                                <label htmlFor="study_year">Year <span className="hs-optional">(optional)</span></label>
                                <select {...field('study_year')}>
                                    <option value="">—</option>
                                    {[1, 2, 3, 4, 5, 6].map(y => <option key={y} value={y}>{y}.</option>)}
                                </select>
                                {err('study_year')}
                            </div>
                        </div>
                        <div className="hs-field">
                            <span className="hs-label">Type <span className="hs-optional">(optional)</span></span>
                            <div className="sp-segment" role="radiogroup">
                                {Object.entries(STUDENT_TYPES).map(([v, l]) => (
                                    <label key={v} className={form.student_type === v ? 'is-on' : ''}>
                                        <input type="radio" name="student_type" value={v} checked={form.student_type === v} onChange={() => set('student_type', v)} />
                                        {l}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="sp-card">
                        <h2>Where you’re from</h2>
                        <div className="hs-row">
                            <div className="hs-field">
                                <label htmlFor="home_country">Home country {req('home_country')}</label>
                                <select {...field('home_country')}>
                                    <option value="">Choose…</option>
                                    {COUNTRY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                                </select>
                                {err('home_country')}
                            </div>
                            <div className="hs-field">
                                <label htmlFor="home_city">Home town <span className="hs-optional">(optional)</span></label>
                                <input {...field('home_city')} maxLength={100} />
                            </div>
                        </div>
                        <div className="hs-field">
                            <span className="hs-label">Languages you speak {req('languages')}</span>
                            <div className="hs-chips">
                                {Object.entries(LANGUAGES).map(([v, l]) => (
                                    <button key={v} type="button" className={`hs-chip hs-chip--toggle ${form.languages.includes(v) ? 'is-on' : ''}`}
                                        aria-pressed={form.languages.includes(v)} onClick={() => toggle('languages', v)}>{l}</button>
                                ))}
                            </div>
                            {err('languages')}
                        </div>
                    </section>

                    <section className="sp-card">
                        <h2>About you</h2>
                        <div className="hs-row">
                            <div className="hs-field">
                                <label htmlFor="birth_date">Date of birth {req('birth_date')}</label>
                                <input {...field('birth_date')} type="date" max={new Date().toISOString().slice(0, 10)} />
                                <p className="hs-hint">Only your age is shown.</p>
                                {err('birth_date')}
                            </div>
                            <div className="hs-field">
                                <span className="hs-label">Do you smoke? {req('smoker')}</span>
                                <YesNo name="smoker" value={form.smoker} onChange={set} />
                                {err('smoker')}
                            </div>
                        </div>
                        <div className="hs-field">
                            <span className="hs-label">Do you have a pet? <span className="hs-optional">(optional)</span></span>
                            <YesNo name="has_pets" value={form.has_pets} onChange={set} allowUnset />
                        </div>
                        <div className="hs-field">
                            <span className="hs-label">How you live <span className="hs-optional">(up to {MAX_LIFESTYLE}, optional)</span></span>
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

                    <section className="sp-card sp-card--private">
                        <h2>What you’re looking for <span className="sp-private">Only you can see this</span></h2>
                        <p className="hs-hint hs-hint--block">We’re still deciding with students and homeowners whether this should be shared. For now it stays private and helps us suggest places later.</p>
                        <div className="hs-row">
                            <div className="hs-field">
                                <label htmlFor="budget_max">Max rent per month (€)</label>
                                <input {...field('budget_max')} type="number" min="1" step="1" inputMode="numeric" />
                                {err('budget_max')}
                            </div>
                            <div className="hs-field">
                                <label htmlFor="move_in_date">Move in from</label>
                                <input {...field('move_in_date')} type="date" />
                                {err('move_in_date')}
                            </div>
                        </div>
                        <div className="hs-row">
                            <div className="hs-field">
                                <label htmlFor="preferred_city">City</label>
                                <input {...field('preferred_city')} list="sp-cities" maxLength={100} />
                                <datalist id="sp-cities">{CITY_SUGGESTIONS.map(c => <option key={c} value={c} />)}</datalist>
                            </div>
                            <div className="hs-field">
                                <label htmlFor="stay_months">How many months</label>
                                <input {...field('stay_months')} type="number" min="1" max="72" step="1" />
                                {err('stay_months')}
                            </div>
                        </div>
                    </section>

                    <div className="sp-actions">
                        <button type="submit" className="hs-btn" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default StudentProfilePage;
