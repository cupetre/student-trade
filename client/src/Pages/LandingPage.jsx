import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { postJson } from '../lib/api';
import { copy } from './landingCopy';
import PublicNav from '../components/PublicNav.jsx';
import Logo from '../components/Logo.jsx';
import SideArt from '../components/SideArt.jsx';
import { BRAND } from '../lib/brand';
import { useLanguage } from '../lib/language';
import housingImg from '../assets/landing/housing.svg';
import marketImg from '../assets/landing/market.svg';
import settleImg from '../assets/landing/settle.svg';
import './LandingPage.css';

// The three columns at the top. Each one is a "door" into one part of the platform.
// Guests who open Housing or the Marketplace are asked to log in first (RequireAuth).
const COLUMNS = [
    { key: 'housing', num: '01', img: housingImg, to: '/housing' },
    { key: 'market', num: '02', img: marketImg, to: '/marketplace' },
    { key: 'settle', num: '03', img: settleImg, anchor: '#inside' },
];

// What is actually available today, per row of the "What's inside" lanes.
// Keep this honest: flip a row to 'live' only when the feature ships.
const LANE_STATUS = {
    housing: ['live', 'live', 'live', 'live'],
    market: ['live', 'live', 'live', 'soon'],
    settle: ['soon', 'soon', 'soon', 'soon'],
};

// Organisations that have agreed to be shown as partners: { name, logo, url }.
// While this is empty, the logo wall is hidden and only the "become a partner" band shows.
const PARTNERS = [];

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emptyForm = { type: 'homeowner', name: '', email: '', phone: '', city: '', message: '', consent: false };

function prefersReducedMotion() {
    try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
        return false;
    }
}

const Check = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="lp-check"><path d="M5 12l4 4 10-10" /></svg>
);

/* ---------- Messaging demo ---------- */

const ChatDemo = ({ t }) => {
    const sectionRef = useRef(null);
    const [scenario, setScenario] = useState('market');
    const [shown, setShown] = useState(1);
    const [started, setStarted] = useState(false);
    const [reduced] = useState(prefersReducedMotion);

    const sc = t.scenarios[scenario];
    const total = sc.msgs.length;

    // Only start playing once the section is on screen
    useEffect(() => {
        const node = sectionRef.current;
        if (!node || typeof IntersectionObserver === 'undefined') {
            setStarted(true);
            return undefined;
        }
        const observer = new IntersectionObserver((entries) => {
            if (entries.some(e => e.isIntersecting)) {
                setStarted(true);
                observer.disconnect();
            }
        }, { threshold: 0.3 });
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    // Show the next message every 1.7 seconds (or all at once for reduced motion)
    useEffect(() => {
        if (!started) return undefined;
        if (reduced) {
            setShown(total);
            return undefined;
        }
        if (shown >= total) return undefined;
        const timer = setTimeout(() => setShown(n => n + 1), 1700);
        return () => clearTimeout(timer);
    }, [started, reduced, shown, total]);

    const pick = (key) => {
        setScenario(key);
        setShown(1);
    };

    const visible = sc.msgs.slice(0, Math.min(shown, total));
    const next = sc.msgs[shown];
    const typing = started && !reduced && next && next[0] !== 'system';

    return (
        <section className="lp-section lp-chat" id="messages" ref={sectionRef}>
            <div className="lp-container lp-chat-inner">
                <div className="lp-chat-text">
                    <p className="lp-eyebrow lp-eyebrow--dark">{t.eyebrow}</p>
                    <h2 className="lp-h2">{t.title}</h2>
                    <p className="lp-lede">{t.text}</p>
                    <div className="lp-chat-tabs" role="group" aria-label={t.tabsLabel}>
                        {Object.keys(t.scenarios).map(key => (
                            <button
                                key={key}
                                type="button"
                                className={key === scenario ? 'is-active' : ''}
                                aria-pressed={key === scenario}
                                onClick={() => pick(key)}
                            >
                                {t.scenarios[key].label}
                            </button>
                        ))}
                    </div>
                    <ul className="lp-ticks">
                        {t.points.map(point => <li key={point}><Check />{point}</li>)}
                    </ul>
                </div>

                <div className="lp-chat-demo">
                    <div className="lp-chat-window">
                        <div className="lp-chat-head">
                            <span className="lp-chat-thumb" aria-hidden="true">
                                <svg viewBox="0 0 24 24">
                                    {scenario === 'market'
                                        ? <path d="M5 8h14l-1.2 10.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Zm4 0V7a3 3 0 0 1 6 0v1" />
                                        : <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8Z" />}
                                </svg>
                            </span>
                            <div className="lp-chat-listing">
                                <strong>{sc.title}</strong>
                                <span>{sc.meta}</span>
                            </div>
                            <span className="lp-chip">{sc.tag}</span>
                        </div>

                        <div className="lp-chat-body" aria-live="polite">
                            {visible.map(([from, text], i) => (
                                from === 'system' ? (
                                    <div key={`${scenario}-${i}`} className="lp-msg-row lp-msg-row--system">
                                        <span className="lp-msg-system">{text}</span>
                                    </div>
                                ) : (
                                    <div key={`${scenario}-${i}`} className={`lp-msg-row ${from === 'me' ? 'lp-msg-row--me' : ''}`}>
                                        <div className="lp-msg">
                                            <span className="lp-msg-who">{from === 'me' ? sc.me : sc.them}</span>
                                            <span className="lp-msg-bubble">{text}</span>
                                        </div>
                                    </div>
                                )
                            ))}
                            {typing && (
                                <div className={`lp-msg-row ${next[0] === 'me' ? 'lp-msg-row--me' : ''}`}>
                                    <span className="lp-typing">
                                        <span className="lp-dots" aria-hidden="true"><i /><i /><i /></span>
                                        {t.typing(next[0] === 'me' ? sc.me : sc.them)}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="lp-chat-foot">
                            <label htmlFor="lp-demo-msg" className="lp-sr-only">{t.placeholder}</label>
                            <input id="lp-demo-msg" type="text" placeholder={t.placeholder} disabled />
                            <button type="button" aria-label={t.send} disabled>
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l16-8-6 16-2-7-8-1Z" /></svg>
                            </button>
                        </div>
                    </div>
                    <button type="button" className="lp-replay" onClick={() => setShown(1)}>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4" /></svg>
                        {t.replay}
                    </button>
                </div>
            </div>
        </section>
    );
};

/* ---------- "Find your side of the story": student / landlord ---------- */

const SIDE_HASH = { student: '#for-students', landlord: '#for-landlords' };

const Arrow = ({ dir }) => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="lp-arrow">
        {dir === 'left' && <path d="M19 12H5M11 6l-6 6 6 6" />}
        {dir === 'right' && <path d="M5 12h14M13 6l6 6-6 6" />}
        {dir === 'down' && <path d="M12 5v14M6 13l6 6 6-6" />}
    </svg>
);

// Full-screen explainer for one side. Slides in from the left (students) or right (landlords).
const SideView = ({ role, t, onClose, onSwitch }) => {
    const v = t.views[role];
    const heads = (role === 'landlord' && t.sectionsFormal) || t.sections;
    const other = role === 'student' ? 'landlord' : 'student';
    const titleRef = useRef(null);

    useEffect(() => {
        titleRef.current?.focus();
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = previous;
            document.removeEventListener('keydown', onKey);
        };
    }, [role, onClose]);

    return (
        <div className={`lp-view lp-view--${role}`} role="dialog" aria-modal="true" aria-labelledby="lp-view-title">
            <div className="lp-view-bar">
                <button type="button" className="lp-view-back" onClick={onClose}>
                    <Arrow dir="left" />{t.backLong}
                </button>
                <span className="lp-view-tag">{v.eyebrow}</span>
            </div>

            <div className="lp-view-inner">
                <header className="lp-view-head">
                    <SideArt kind={role} />
                    <p className="lp-eyebrow">{v.eyebrow}</p>
                    <h2 id="lp-view-title" className="lp-h2" tabIndex={-1} ref={titleRef}>{v.title}</h2>
                    <p className="lp-lede">{v.intro}</p>
                </header>

                <section className="lp-view-part">
                    <h3><span>01</span>{heads.can}</h3>
                    <div className="lp-view-can">
                        {v.can.map(([title, text]) => (
                            <div key={title}>
                                <strong>{title}</strong>
                                <p>{text}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="lp-view-pair">
                    <section className="lp-view-part">
                        <h3><span>02</span>{heads.account}</h3>
                        <ul className="lp-ticks">
                            {v.account.map(item => <li key={item}><Check />{item}</li>)}
                        </ul>
                    </section>
                    <section className="lp-view-part">
                        <h3><span>03</span>{heads.benefits}</h3>
                        <ul className="lp-view-benefits">
                            {v.benefits.map(item => <li key={item}><span className="lp-dot" aria-hidden="true" />{item}</li>)}
                        </ul>
                    </section>
                </div>

                <section className="lp-view-part">
                    <h3><span>04</span>{heads.steps}</h3>
                    <ol className="lp-view-steps">
                        {v.steps.map(([title, text], i) => (
                            <li key={title}>
                                <span className="lp-view-step-num" aria-hidden="true">{i + 1}</span>
                                <div>
                                    <strong>{title}</strong>
                                    <p>{text}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </section>

                <div className="lp-view-foot">
                    <button type="button" className="lp-view-back" onClick={onClose}>
                        <Arrow dir="left" />{t.back}
                    </button>
                    <p>
                        {v.switchText}{' '}
                        <button type="button" className="lp-view-switch" onClick={() => onSwitch(other)}>
                            {other === 'student' && <Arrow dir="left" />}
                            {v.switchLink}
                            {other === 'landlord' && <Arrow dir="right" />}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

/* ---------- Page ---------- */

const LandingPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [lang] = useLanguage();
    const t = copy[lang];

    // The student / landlord views live in the address (#for-students, #for-landlords),
    // so the browser's back button closes them and the views can be linked to.
    const view = Object.keys(SIDE_HASH).find(role => SIDE_HASH[role] === location.hash) || null;
    const openedHere = useRef(false);
    const panelRefs = useRef({});
    const lastView = useRef(null);

    const openSide = (role) => {
        openedHere.current = true;
        navigate({ hash: SIDE_HASH[role] });
    };
    const switchSide = (role) => navigate({ hash: SIDE_HASH[role] }, { replace: true });
    const closeSide = useCallback(() => {
        if (openedHere.current) {
            openedHere.current = false;
            navigate(-1);
        } else {
            navigate({ hash: '' }, { replace: true });
        }
    }, [navigate]);

    // When a view closes, put keyboard focus back on the panel that opened it
    useEffect(() => {
        if (!view && lastView.current) panelRefs.current[lastView.current]?.focus({ preventScroll: true });
        lastView.current = view;
    }, [view]);

    // Arriving from another page with a section in the address (for example /#lane-housing
    // from the log-in page's top bar): scroll there once the page has slid in.
    useEffect(() => {
        const id = location.hash.slice(1);
        if (!id || view) return;
        document.getElementById(id)?.scrollIntoView({ block: 'start' });
    }, [location.hash, view]);

    const scrollToStory = (e) => {
        e.preventDefault();
        document.getElementById('story')?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    };

    const [active, setActive] = useState(null);
    const [studentEmail, setStudentEmail] = useState('');

    const formRef = useRef(null);
    const [formOpen, setFormOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState({});
    const [sendState, setSendState] = useState('idle'); // idle | sending | sent
    const [serverError, setServerError] = useState('');

    // Scroll to the contact form whenever it is opened
    useEffect(() => {
        if (formOpen) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, [formOpen]);

    const openForm = (type) => {
        setForm(prev => ({ ...prev, type }));
        if (sendState === 'sent') setSendState('idle');
        setFormOpen(true);
        if (formOpen) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

    // The register page picks the email up and fills it in
    const handleStudentJoin = (e) => {
        e.preventDefault();
        navigate('/register', { state: { email: studentEmail.trim() } });
    };

    return (
        <div className="lp">
            {/* STATIC TOP NAVBAR */}
            <PublicNav />

            <main>
                {/* 1 · THREE COLUMNS */}
                <section id="top" className="lp-cols" aria-label={BRAND} onMouseLeave={() => setActive(null)}>
                    {COLUMNS.map(col => {
                        const c = t.columns[col.key];
                        const state = active === col.key ? 'is-active' : (active ? 'is-dimmed' : '');
                        return (
                            <article
                                key={col.key}
                                className={`lp-col ${state}`}
                                onMouseEnter={() => setActive(col.key)}
                                onFocus={() => setActive(col.key)}
                            >
                                <img src={col.img} alt="" className="lp-col-img" />
                                <div className="lp-col-veil" aria-hidden="true" />
                                <div className="lp-col-content">
                                    <span className="lp-col-kicker">{col.num} · {c.kicker}</span>
                                    <h2 className="lp-col-title">{c.title}</h2>
                                    <p className="lp-col-tagline">{c.tagline}</p>
                                    <div className="lp-col-more">
                                        <p>{c.desc}</p>
                                        <ul>
                                            {c.points.map(point => <li key={point}>{point}</li>)}
                                        </ul>
                                    </div>
                                    {col.to
                                        ? <Link to={col.to} className="lp-btn">{c.cta}</Link>
                                        : <a href={col.anchor} className="lp-btn">{c.cta}</a>}
                                </div>
                            </article>
                        );
                    })}
                </section>

                {/* 2 · FIND YOUR SIDE: students and landlords */}
                <section className="lp-sides" aria-labelledby="lp-sides-title">
                    <div className="lp-container">
                        <h2 id="lp-sides-title" className="lp-h2 lp-center">{t.sides.title}</h2>
                        <p className="lp-lede lp-sides-intro">{t.sides.intro}</p>
                        <div className="lp-sides-row">
                            {['student', 'landlord'].map(role => {
                                const c = t.sides[role];
                                return (
                                    <button
                                        key={role}
                                        type="button"
                                        className={`lp-side lp-side--${role}`}
                                        aria-haspopup="dialog"
                                        ref={(node) => { panelRefs.current[role] = node; }}
                                        onClick={() => openSide(role)}
                                    >
                                        <SideArt kind={role} />
                                        <span className="lp-side-title">{c.title}</span>
                                        <span className="lp-side-text">{c.text}</span>
                                        <span className="lp-side-tags">
                                            {c.tags.map(tag => <span key={tag}>{tag}</span>)}
                                        </span>
                                        <span className="lp-side-more">
                                            {role === 'student' && <Arrow dir="left" />}
                                            {c.more}
                                            {role === 'landlord' && <Arrow dir="right" />}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <a href="#story" className="lp-story-link" onClick={scrollToStory}>
                            {t.sides.story}
                            <Arrow dir="down" />
                        </a>
                    </div>
                </section>

                {/* trust strip */}
                <ul className="lp-trust">
                    {t.trust.map(item => <li key={item}><span className="lp-dot" aria-hidden="true" />{item}</li>)}
                </ul>

                {/* 3 · THE PROBLEM (the story) */}
                <section className="lp-section lp-problem" id="story">
                    <div className="lp-container">
                        <p className="lp-eyebrow">{t.problem.eyebrow}</p>
                        <h2 className="lp-h2 lp-h2--narrow">{t.problem.title}</h2>
                        <div className="lp-problem-grid">
                            {t.problem.items.map(item => (
                                <div key={item.title} className="lp-problem-item">
                                    <span className="lp-square" aria-hidden="true" />
                                    <div>
                                        <h3>{item.title}</h3>
                                        <p>{item.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 3 · WHAT'S INSIDE */}
                <section className="lp-section" id="inside">
                    <div className="lp-container">
                        <div className="lp-inside-head">
                            <div>
                                <p className="lp-eyebrow">{t.inside.eyebrow}</p>
                                <h2 className="lp-h2">{t.inside.title}</h2>
                            </div>
                            <p className="lp-legend">
                                <span><span className="lp-status lp-status--live">{t.inside.live}</span>{t.inside.liveText}</span>
                                <span><span className="lp-status lp-status--soon">{t.inside.soon}</span>{t.inside.soonText}</span>
                            </p>
                        </div>
                        <div className="lp-lanes">
                            {COLUMNS.map(col => (
                                <div key={col.key} className="lp-lane" id={`lane-${col.key}`}>
                                    <h3><span>{col.num}</span>{t.columns[col.key].title}</h3>
                                    <ul>
                                        {t.inside.lanes[col.key].map(([name, text], i) => {
                                            const status = LANE_STATUS[col.key][i];
                                            return (
                                                <li key={name}>
                                                    <div>
                                                        <strong>{name}</strong>
                                                        <span>{text}</span>
                                                    </div>
                                                    <span className={`lp-status lp-status--${status}`}>
                                                        {status === 'live' ? t.inside.live : t.inside.soon}
                                                    </span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 4 · MESSAGING DEMO */}
                <ChatDemo t={t.chat} />

                {/* 5 · PARTNERS */}
                <section className="lp-section" id="partners">
                    <div className="lp-container">
                        {PARTNERS.length > 0 && (
                            <>
                                <div className="lp-center">
                                    <p className="lp-eyebrow">{t.partners.eyebrow}</p>
                                    <h2 className="lp-h2">{t.partners.title}</h2>
                                    <p className="lp-lede">{t.partners.text}</p>
                                </div>
                                <ul className="lp-logos">
                                    {PARTNERS.map(p => (
                                        <li key={p.name}>
                                            <a href={p.url} target="_blank" rel="noreferrer"><img src={p.logo} alt={p.name} /></a>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                        <div className="lp-partner-band">
                            <div>
                                <h3>{t.partners.bandTitle}</h3>
                                <ul>
                                    {t.partners.points.map(point => <li key={point}><span className="lp-dot" aria-hidden="true" />{point}</li>)}
                                </ul>
                            </div>
                            <button type="button" className="lp-btn lp-btn--attention" onClick={() => openForm('partner')}>
                                {t.partners.cta}
                            </button>
                        </div>
                    </div>
                </section>

                {/* 6 · JOIN */}
                <section className="lp-section lp-join" id="join">
                    <div className="lp-container">
                        <h2 className="lp-h2 lp-center">{t.join.title}</h2>
                        <div className="lp-join-split">
                            <div className="lp-join-students">
                                <p className="lp-eyebrow lp-eyebrow--onblue">{t.join.students.eyebrow}</p>
                                <h3>{t.join.students.title}</h3>
                                <p>{t.join.students.text}</p>
                                <form className="lp-join-form" onSubmit={handleStudentJoin}>
                                    <label htmlFor="lp-join-email" className="lp-sr-only">{t.join.students.emailLabel}</label>
                                    <input
                                        id="lp-join-email"
                                        type="email"
                                        autoComplete="email"
                                        placeholder={t.join.students.placeholder}
                                        value={studentEmail}
                                        onChange={(e) => setStudentEmail(e.target.value)}
                                    />
                                    <button type="submit" className="lp-btn lp-btn--attention">{t.join.students.button}</button>
                                </form>
                                <p className="lp-join-note">{t.join.students.note}</p>
                            </div>
                            <div className="lp-join-landlords">
                                <p className="lp-eyebrow">{t.join.landlords.eyebrow}</p>
                                <h3>{t.join.landlords.title}</h3>
                                <ul className="lp-ticks">
                                    {t.join.landlords.points.map(point => <li key={point}><Check />{point}</li>)}
                                </ul>
                                <div className="lp-join-actions">
                                    <Link to="/register/landlord" className="lp-btn lp-btn--ink">{t.join.landlords.cta}</Link>
                                    <button type="button" className="lp-link-btn" onClick={() => openForm('homeowner')}>
                                        {t.join.landlords.details}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <p className="lp-join-business">
                            {t.join.business}{' '}
                            <button type="button" className="lp-link-btn" onClick={() => openForm('partner')}>{t.join.businessLink}</button>
                        </p>

                        {/* Contact form for landlords, agencies and partners (opens on demand) */}
                        {formOpen && (
                            <div className="lp-form-card" ref={formRef}>
                                {sendState === 'sent' ? (
                                    <div className="lp-success" role="status">
                                        <span className="lp-success-mark" aria-hidden="true">&#10003;</span>
                                        <p>{t.form.success}</p>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} noValidate>
                                        <div className="lp-form-top">
                                            <p className="lp-form-title">{t.form.title}</p>
                                            <button type="button" className="lp-link-btn" onClick={() => setFormOpen(false)}>{t.form.close}</button>
                                        </div>

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
                        )}
                    </div>
                </section>
            </main>

            {view && <SideView key={view} role={view} t={t.sides} onClose={closeSide} onSwitch={switchSide} />}

            <footer className="lp-footer">
                <div className="lp-footer-inner">
                    <span className="lp-footer-logo"><Logo size={28} /></span>
                    <span>{t.footer.made}</span>
                    <span className="lp-footer-links">
                        <a href="#lane-housing">{t.nav.housing}</a>
                        <a href="#lane-market">{t.nav.market}</a>
                        <a href="#lane-settle">{t.nav.settle}</a>
                        <a href="#partners">{t.nav.partners}</a>
                        <Link to="/login">{t.nav.login}</Link>
                    </span>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
