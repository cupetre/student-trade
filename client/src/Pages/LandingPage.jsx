import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { postJson } from '../lib/api';
import { copy, LANGUAGES } from './landingCopy';
import './LandingPage.css';

// What's actually available today. The page says so honestly with a chip.
const STATUS = {
    market: 'live',
    chat: 'live',
    housing: 'soon',
    perks: 'soon',
    guide: 'soon',
    community: 'later',
};

const ICONS = {
    market: <path d="M5 8h14l-1.2 10.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Zm4 0V7a3 3 0 0 1 6 0v1" />,
    chat: <path d="M5 6h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-7l-4 3v-3H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" />,
    housing: <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8Z" />,
    perks: <path d="M4 12V5a1 1 0 0 1 1-1h7l8 8-8 8-8-8Zm4.5-3.5h.01" />,
    guide: <path d="M12 21s-6-5.4-6-11a6 6 0 0 1 12 0c0 5.6-6 11-6 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />,
    community: <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7 0a2.5 2.5 0 1 0 0-5M3.5 19c.6-3 3-5 5.5-5s4.9 2 5.5 5M15 14c2.3 0 4.3 1.6 5 4.5" />,
};

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readSavedLanguage() {
    try {
        const saved = localStorage.getItem('lang');
        return LANGUAGES.includes(saved) ? saved : 'sl';
    } catch {
        return 'sl';
    }
}

const emptyForm = { type: 'homeowner', name: '', email: '', phone: '', city: '', message: '', consent: false };

const LandingPage = () => {
    const [lang, setLang] = useState(readSavedLanguage);
    const t = copy[lang];

    const formRef = useRef(null);
    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState({});
    const [sendState, setSendState] = useState('idle'); // idle | sending | sent
    const [serverError, setServerError] = useState('');

    useEffect(() => {
        document.documentElement.lang = lang;
        try { localStorage.setItem('lang', lang); } catch { /* storage blocked: language just won't be remembered */ }
    }, [lang]);

    const goToForm = (type) => {
        if (type) setForm(prev => ({ ...prev, type }));
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
        if (serverError) setServerError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (sendState === 'sending') return;

        const found = {};
        if (form.name.trim().length < 2) found.name = t.form.errors.name;
        if (!EMAIL_FORMAT.test(form.email.trim())) found.email = t.form.errors.email;
        if (!form.consent) found.consent = t.form.errors.consent;
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        setSendState('sending');
        const { ok, data } = await postJson('/api/public/interest', { ...form, language: lang });

        if (ok) {
            setSendState('sent');
            setForm(emptyForm);
            return;
        }
        setSendState('idle');
        setServerError(data.error);
    };

    return (
        <div className="lp">
            <header className="lp-header">
                <div className="lp-container lp-header-inner">
                    <span className="lp-logo">Student Trade</span>
                    <nav className="lp-nav" aria-label="Main">
                        <div className="lp-lang" role="group" aria-label="Language">
                            {LANGUAGES.map(code => (
                                <button
                                    key={code}
                                    type="button"
                                    className={code === lang ? 'is-active' : ''}
                                    aria-pressed={code === lang}
                                    onClick={() => setLang(code)}
                                >
                                    {code.toUpperCase()}
                                </button>
                            ))}
                        </div>
                        <Link to="/login" className="lp-link">{t.nav.login}</Link>
                        <Link to="/register" className="lp-btn lp-btn--small">{t.nav.signup}</Link>
                    </nav>
                </div>
            </header>

            <main>
                {/* HERO */}
                <section className="lp-hero">
                    <div className="lp-container lp-hero-inner">
                        <div className="lp-hero-text">
                            <span className="lp-eyebrow">{t.hero.eyebrow}</span>
                            <h1>{t.hero.title}</h1>
                            <p className="lp-lede">{t.hero.text}</p>
                            <div className="lp-actions">
                                <Link to="/register" className="lp-btn">{t.hero.student}</Link>
                                <button type="button" className="lp-btn lp-btn--ghost" onClick={() => goToForm('homeowner')}>
                                    {t.hero.owner}
                                </button>
                            </div>
                            <p className="lp-open">{t.hero.open}</p>
                        </div>

                        <div className="lp-hero-preview" aria-label={t.hero.examples}>
                            <span className="lp-preview-label">{t.hero.examples}</span>
                            <div className="lp-mini lp-mini--market">
                                <span className="lp-mini-icon"><svg viewBox="0 0 24 24" aria-hidden="true">{ICONS.market}</svg></span>
                                <div><strong>{t.hero.card1.title}</strong><span>{t.hero.card1.meta}</span></div>
                                <em>{t.hero.card1.price}</em>
                            </div>
                            <div className="lp-mini lp-mini--housing">
                                <span className="lp-mini-icon"><svg viewBox="0 0 24 24" aria-hidden="true">{ICONS.housing}</svg></span>
                                <div><strong>{t.hero.card2.title}</strong><span>{t.hero.card2.meta}</span></div>
                                <em>{t.hero.card2.price}</em>
                            </div>
                            <div className="lp-mini lp-mini--perks">
                                <span className="lp-mini-icon"><svg viewBox="0 0 24 24" aria-hidden="true">{ICONS.perks}</svg></span>
                                <div><strong>{t.hero.card3.title}</strong><span>{t.hero.card3.meta}</span></div>
                                <em>{t.hero.card3.price}</em>
                            </div>
                        </div>
                    </div>
                </section>

                {/* WHAT'S INSIDE */}
                <section className="lp-section">
                    <div className="lp-container">
                        <h2>{t.features.title}</h2>
                        <div className="lp-features">
                            {t.features.items.map(item => (
                                <article key={item.key} className="lp-feature">
                                    <div className="lp-feature-top">
                                        <span className="lp-feature-icon"><svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[item.key]}</svg></span>
                                        <span className={`lp-chip lp-chip--${STATUS[item.key]}`}>{t.features[STATUS[item.key]]}</span>
                                    </div>
                                    <h3>{item.title}</h3>
                                    <p>{item.text}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                {/* HOW IT WORKS: a real sequence, so it is numbered */}
                <section className="lp-section lp-section--tint">
                    <div className="lp-container">
                        <h2>{t.steps.title}</h2>
                        <ol className="lp-steps">
                            {t.steps.items.map(step => (
                                <li key={step.title}>
                                    <h3>{step.title}</h3>
                                    <p>{step.text}</p>
                                </li>
                            ))}
                        </ol>
                        <Link to="/register" className="lp-btn">{t.steps.cta}</Link>
                    </div>
                </section>

                {/* HOMEOWNERS + FORM */}
                <section className="lp-section" id="homeowners" ref={formRef}>
                    <div className="lp-container lp-owners">
                        <div className="lp-owners-text">
                            <span className="lp-eyebrow">{t.owners.eyebrow}</span>
                            <h2>{t.owners.title}</h2>
                            <p className="lp-lede">{t.owners.text}</p>
                            <ul className="lp-points">
                                {t.owners.points.map(point => <li key={point}>{point}</li>)}
                            </ul>
                            <p className="lp-owners-signup">
                                {t.owners.signupText} <Link to="/register/landlord">{t.owners.signupLink} →</Link>
                            </p>
                        </div>

                        <div className="lp-form-card">
                            {sendState === 'sent' ? (
                                <div className="lp-success" role="status">
                                    <span className="lp-success-mark" aria-hidden="true">&#10003;</span>
                                    <p>{t.form.success}</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} noValidate>
                                    <p className="lp-form-title">{t.form.title}</p>

                                    {serverError && <div className="lp-alert" role="alert">{serverError}</div>}

                                    <div className="lp-field">
                                        <label htmlFor="lead-type">{t.form.type}</label>
                                        <select id="lead-type" name="type" value={form.type} onChange={handleChange}>
                                            {Object.entries(t.form.types).map(([value, label]) => (
                                                <option key={value} value={value}>{label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="lp-field-row">
                                        <div className="lp-field">
                                            <label htmlFor="lead-name">{t.form.name}</label>
                                            <input id="lead-name" name="name" type="text" autoComplete="name" value={form.name} onChange={handleChange}
                                                className={errors.name ? 'has-error' : ''} aria-invalid={Boolean(errors.name)} />
                                            {errors.name && <span className="lp-field-error">{errors.name}</span>}
                                        </div>
                                        <div className="lp-field">
                                            <label htmlFor="lead-email">{t.form.email}</label>
                                            <input id="lead-email" name="email" type="email" autoComplete="email" value={form.email} onChange={handleChange}
                                                className={errors.email ? 'has-error' : ''} aria-invalid={Boolean(errors.email)} />
                                            {errors.email && <span className="lp-field-error">{errors.email}</span>}
                                        </div>
                                    </div>

                                    <div className="lp-field-row">
                                        <div className="lp-field">
                                            <label htmlFor="lead-phone">{t.form.phone}</label>
                                            <input id="lead-phone" name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={handleChange} />
                                        </div>
                                        <div className="lp-field">
                                            <label htmlFor="lead-city">{t.form.city}</label>
                                            <input id="lead-city" name="city" type="text" autoComplete="address-level2" value={form.city} onChange={handleChange} />
                                        </div>
                                    </div>

                                    <div className="lp-field">
                                        <label htmlFor="lead-message">{t.form.message}</label>
                                        <textarea id="lead-message" name="message" rows="3" value={form.message} onChange={handleChange} />
                                    </div>

                                    <label className={`lp-consent ${errors.consent ? 'has-error' : ''}`}>
                                        <input type="checkbox" name="consent" checked={form.consent} onChange={handleChange} />
                                        <span>{t.form.consent}</span>
                                    </label>
                                    {errors.consent && <span className="lp-field-error">{errors.consent}</span>}

                                    <button type="submit" className="lp-btn lp-btn--full" disabled={sendState === 'sending'}>
                                        {sendState === 'sending' ? t.form.sending : t.form.submit}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </section>

                {/* PARTNERS */}
                <section className="lp-partners">
                    <div className="lp-container lp-partners-inner">
                        <div>
                            <h2>{t.partners.title}</h2>
                            <p>{t.partners.text}</p>
                        </div>
                        <button type="button" className="lp-btn lp-btn--light" onClick={() => goToForm('partner')}>
                            {t.partners.cta}
                        </button>
                    </div>
                </section>
            </main>

            <footer className="lp-footer">
                <div className="lp-container lp-footer-inner">
                    <span className="lp-logo lp-logo--small">Student Trade</span>
                    <span>{t.footer.made}</span>
                    <span className="lp-footer-links">
                        <Link to="/login">{t.nav.login}</Link>
                        <Link to="/register">{t.nav.signup}</Link>
                    </span>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
