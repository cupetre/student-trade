import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SettleLayout from './settle/SettleLayout.jsx';
import { PHASES, ACCOMMODATION, CITY_SUGGESTIONS, formatDay, todayIso } from './settle/settleShared';
import TopicIcon from './settle/TopicIcon.jsx';
import { apiRequest } from '../lib/api';
import { isLoggedIn } from '../lib/auth';
import { rememberReturn } from '../lib/returnTo';
import { useT } from '../lib/i18n';
import { countryOptions, countryName, UNIVERSITY_SUGGESTIONS } from '../lib/profileOptions';

/*
  Settle In → Start (/settle-in)
  - Guests: what Settle In is, the guides, and sign up.
  - First visit: four questions (where your passport is from, city,
    university, where you'll live, when you arrive) build the checklist.
  - After that: progress, the next step, and the checklist by phase.
  The checklist itself is worked out on the server (lib/settleRules.js).
*/

const ANCHOR_LABELS = {
    permit_date: 'Counts from the day you get your residence permit',
    arrival_date: 'Counts from the day you arrive',
};

const ASK_DATE_LABELS = {
    permit_date: 'When did you get your residence permit?',
    arrival_date: 'When did you arrive?',
};

// ---------- the four questions ----------

function SetupForm({ initial, onSaved, onCancel }) {
    const t = useT();
    const [form, setForm] = useState(() => ({
        passport_country: '', city: '', university: '', accommodation: 'not_yet', arrival_date: '',
        ...initial,
    }));
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target ? e.target.value : e }));

    const submit = async (e) => {
        e.preventDefault();
        const missing = {};
        if (!form.passport_country) missing.passport_country = t('Pick a country.');
        if (!form.city.trim()) missing.city = t('This field is required.');
        setErrors(missing);
        if (Object.keys(missing).length) return;

        setSaving(true);
        setError('');
        const { ok, data } = await apiRequest('/api/settle/profile', { method: 'PUT', body: form });
        setSaving(false);
        if (!ok) {
            if (data.field) setErrors({ [data.field]: data.error });
            else setError(data.error);
            return;
        }
        onSaved(data.profile);
    };

    return (
        <form className="si-card si-setup" onSubmit={submit} noValidate>
            <h2>{initial?.passport_country ? t('Your answers') : t('Four questions to build your checklist')}</h2>
            <p className="si-muted">{t('We use them to show only the steps that apply to you. You can change them any time.')}</p>

            <div className="si-setup-grid">
                <label className="si-field">
                    <span>{t('Where is your passport from?')}</span>
                    <select value={form.passport_country} onChange={set('passport_country')} aria-invalid={Boolean(errors.passport_country)}>
                        <option value="">{t('Choose a country')}</option>
                        {countryOptions(t.lang).map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                    {errors.passport_country && <em className="si-error">{errors.passport_country}</em>}
                </label>

                <label className="si-field">
                    <span>{t('Which city do you study in?')}</span>
                    <input list="si-cities" value={form.city} onChange={set('city')} placeholder="Koper" aria-invalid={Boolean(errors.city)} />
                    <datalist id="si-cities">{CITY_SUGGESTIONS.map(c => <option key={c} value={c} />)}</datalist>
                    {errors.city && <em className="si-error">{errors.city}</em>}
                </label>

                <label className="si-field">
                    <span>{t('University')} <small>{t('optional')}</small></span>
                    <input list="si-unis" value={form.university} onChange={set('university')} />
                    <datalist id="si-unis">{UNIVERSITY_SUGGESTIONS.map(u => <option key={u} value={u} />)}</datalist>
                </label>

                <label className="si-field">
                    <span>{t('When do you arrive?')} <small>{t('optional')}</small></span>
                    <input type="date" value={form.arrival_date || ''} onChange={set('arrival_date')} aria-invalid={Boolean(errors.arrival_date)} />
                    {errors.arrival_date && <em className="si-error">{errors.arrival_date}</em>}
                </label>
            </div>

            <fieldset className="si-field si-choices">
                <legend>{t('Where will you live?')}</legend>
                {Object.entries(ACCOMMODATION).map(([value, label]) => (
                    <label key={value} className={`si-choice${form.accommodation === value ? ' is-on' : ''}`}>
                        <input type="radio" name="accommodation" value={value} checked={form.accommodation === value} onChange={set('accommodation')} />
                        {t(label)}
                    </label>
                ))}
            </fieldset>

            {error && <p className="si-error" role="alert">{error}</p>}
            <div className="si-row-actions">
                <button type="submit" className="si-btn" disabled={saving}>{saving ? t('Saving…') : initial?.passport_country ? t('Save') : t('Build my checklist')}</button>
                {onCancel && <button type="button" className="si-btn si-btn--quiet" onClick={onCancel}>{t('Cancel')}</button>}
            </div>
        </form>
    );
}

// ---------- one step on the checklist ----------

function StepRow({ item, onChange, isNext, urgent, titles }) {
    const t = useT();
    const [asking, setAsking] = useState(false);
    const [day, setDay] = useState(todayIso());
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const text = item.text[t.lang] || item.text.en || {};
    const done = item.status === 'done';
    const skipped = item.status === 'skipped';

    const save = async (status, date) => {
        setBusy(true);
        setError('');
        const { ok, data } = await apiRequest(`/api/settle/checklist/${item.slug}`, { method: 'PUT', body: { status, date } });
        setBusy(false);
        if (!ok) { setError(data.error); return; }
        setAsking(false);
        onChange();
    };

    const toggle = () => {
        if (done) return save('todo');
        if (item.asks_date) return setAsking(a => !a);
        return save('done');
    };

    let when = null;
    if (item.overdue) when = <span className={`si-due${urgent ? ' is-urgent' : ''}`}>{t('{n} days late', { n: -item.days_left })}</span>;
    else if (item.days_left === 0) when = <span className={`si-due${urgent ? ' is-urgent' : ''}`}>{t('Due today')}</span>;
    else if (item.days_left != null && item.days_left <= 14) when = <span className={`si-due${urgent ? ' is-urgent' : ''}`}>{item.days_left === 1 ? t('Due tomorrow') : t('Due in {n} days', { n: item.days_left })}</span>;
    else if (item.deadline) when = <span className="si-due">{t('Due {date}', { date: formatDay(item.deadline, t.lang, { year: false }) })}</span>;

    return (
        <li className={`si-step${done ? ' is-done' : ''}${skipped ? ' is-skipped' : ''}${isNext ? ' is-next' : ''}`}>
            <button
                type="button"
                className="si-tick"
                role="checkbox"
                aria-checked={done}
                aria-label={done ? t('Mark “{title}” as not done', { title: text.title }) : t('Mark “{title}” as done', { title: text.title })}
                onClick={toggle}
                disabled={busy || skipped}
            >
                {done && <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
            </button>

            <div className="si-step-body">
                <div className="si-step-top">
                    <Link to={`/settle-in/guides/${item.slug}`} className="si-step-title">{text.title}</Link>
                    {!done && !skipped && when}
                    {done && item.done_at && <span className="si-step-meta">{t('Done {date}', { date: formatDay(item.done_at, t.lang, { year: false }) })}</span>}
                </div>
                {!done && !skipped && text.summary && <p className="si-step-summary">{text.summary}</p>}
                {!done && !skipped && item.waiting_for && <p className="si-step-note">{t(ANCHOR_LABELS[item.waiting_for])}</p>}
                {!done && !skipped && item.blocked_by.length > 0 && (
                    <p className="si-step-note">{t('After: {steps}', { steps: item.blocked_by.map(s => titles[s] || s).join(', ') })}</p>
                )}

                {asking && (
                    <div className="si-ask">
                        <label>
                            <span>{t(ASK_DATE_LABELS[item.asks_date])}</span>
                            <input type="date" value={day} max={todayIso()} onChange={e => setDay(e.target.value)} />
                        </label>
                        <button type="button" className="si-btn si-btn--small" disabled={busy || !day} onClick={() => save('done', day)}>{t('Save')}</button>
                        <button type="button" className="si-linkbtn" onClick={() => setAsking(false)}>{t('Cancel')}</button>
                    </div>
                )}
                {error && <p className="si-error" role="alert">{error}</p>}
            </div>

            <div className="si-step-side">
                {skipped
                    ? <><span className="si-step-meta">{t('Not for me')}</span><button type="button" className="si-linkbtn" onClick={() => save('todo')} disabled={busy}>{t('Undo')}</button></>
                    : !done && <button type="button" className="si-linkbtn si-linkbtn--quiet" onClick={() => save('skipped')} disabled={busy}>{t('Not for me')}</button>}
            </div>
        </li>
    );
}

// ---------- the next step, large ----------

function NextStep({ item }) {
    const t = useT();
    const text = item.text[t.lang] || item.text.en || {};
    return (
        <section className="si-next" aria-labelledby="si-next-title">
            <div className="si-next-icon"><TopicIcon topic={item.topic} /></div>
            <div className="si-next-body">
                <p className="si-eyebrow">{t('Next step')}{item.deadline ? ` · ${t('Due {date}', { date: formatDay(item.deadline, t.lang, { year: false }) })}` : ''}</p>
                <h2 id="si-next-title">{text.title}</h2>
                {text.summary && <p>{text.summary}</p>}
                <Link to={`/settle-in/guides/${item.slug}`} className="si-btn">{t('Open the guide')}</Link>
            </div>
        </section>
    );
}

// ---------- side column ----------

function SideColumn() {
    const t = useT();
    return (
        <aside className="si-side">
            <Link to="/settle-in/cost" className="si-card si-side-card si-side-link">
                <strong>{t('Cost of living')}</strong>
                <span>{t('What a month costs in your city, from real rents on Sidro.')}</span>
            </Link>
            <div className="si-card si-side-card">
                <strong>{t('Coming to Settle In')}</strong>
                <ul className="si-coming">
                    <li><span>{t('Student deals')}</span><span className="si-soon">{t('Soon')}</span></li>
                    <li><span>{t('Questions and answers')}</span><span className="si-soon">{t('Soon')}</span></li>
                    <li><span>{t('Events from student organisations')}</span><span className="si-soon">{t('Soon')}</span></li>
                    <li><span>{t('Your faculty’s board')}</span><span className="si-soon">{t('Soon')}</span></li>
                </ul>
            </div>
        </aside>
    );
}

// ---------- guests ----------

function GuestStart() {
    const t = useT();
    const [guides, setGuides] = useState([]);
    useEffect(() => {
        apiRequest('/api/settle/guides').then(({ ok, data }) => { if (ok) setGuides(data.guides); });
    }, []);
    const here = '/settle-in';

    return (
        <div className="si-guest">
            <p className="si-eyebrow">{t('Settle In')}</p>
            <h1>{t('Your first months in Slovenia, step by step')}</h1>
            <p className="si-lede">{t('Residence permit, address, health insurance, tax number, student work and boni: a checklist made for you, with deadlines and a guide for every step.')}</p>
            <div className="si-row-actions si-row-actions--center">
                <Link to="/register" className="si-btn si-btn--attention" onClick={() => rememberReturn(here)}>{t('Sign up to get your checklist')}</Link>
                <Link to="/login" state={{ from: here }} className="si-btn si-btn--quiet" onClick={() => rememberReturn(here)}>{t('Log in')}</Link>
            </div>

            {guides.length > 0 && (
                <section className="si-guest-guides">
                    <h2>{t('Read the guides')}</h2>
                    <ul className="si-guide-grid">
                        {guides.map(g => {
                            const text = g.text[t.lang] || g.text.en || {};
                            return (
                                <li key={g.slug}>
                                    <Link to={`/settle-in/guides/${g.slug}`} className="si-guide-card">
                                        <TopicIcon topic={g.topic} />
                                        <strong>{text.title}</strong>
                                        <span>{text.summary}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                    <p className="si-center"><Link to="/settle-in/cost" className="si-link">{t('Work out what a month costs')}</Link></p>
                </section>
            )}
        </div>
    );
}

// ---------- the page ----------

const SettleInPage = () => {
    const t = useT();
    const guest = !isLoggedIn();
    const [state, setState] = useState({ loading: !guest, error: '', data: null });
    const [editing, setEditing] = useState(false);
    const [prefill, setPrefill] = useState(null);

    const load = useCallback(async () => {
        const { ok, data } = await apiRequest('/api/settle/checklist');
        setState({ loading: false, error: ok ? '' : data.error, data: ok ? data : null });
        return ok ? data : null;
    }, []);

    useEffect(() => {
        if (guest) return;
        load().then((data) => {
            // First visit: fill in what the rental profile already knows
            if (data && !data.profile) {
                apiRequest('/api/users/me/student-profile').then(({ ok, data: sp }) => {
                    const p = ok ? sp.profile || {} : {};
                    setPrefill({ passport_country: p.home_country || '', university: p.university || '', city: p.preferred_city || '' });
                });
            }
        });
    }, [guest, load]);

    const data = state.data;
    const titles = useMemo(() => {
        const out = {};
        for (const it of data?.items || []) out[it.slug] = (it.text[t.lang] || it.text.en || {}).title;
        return out;
    }, [data, t.lang]);

    if (guest) return <SettleLayout><GuestStart /></SettleLayout>;

    if (state.loading) return <SettleLayout><p className="si-muted si-center">{t('Loading…')}</p></SettleLayout>;
    if (state.error) return <SettleLayout><p className="si-error si-center" role="alert">{state.error}</p></SettleLayout>;

    const profile = data.profile;
    if (!profile || editing) {
        return (
            <SettleLayout>
                <div className="si-narrow">
                    {!profile && (
                        <>
                            <p className="si-eyebrow">{t('Settle In')}</p>
                            <h1>{t('Your first months, step by step')}</h1>
                        </>
                    )}
                    {(profile || prefill) && (
                        <SetupForm
                            key={profile ? 'edit' : 'new'}
                            initial={profile ? { ...profile, university: profile.university || '', arrival_date: profile.arrival_date || '' } : prefill}
                            onSaved={() => { setEditing(false); load(); }}
                            onCancel={profile ? () => setEditing(false) : null}
                        />
                    )}
                </div>
            </SettleLayout>
        );
    }

    const next = data.items.find(i => i.slug === data.next);
    // The one raspberry thing on the page: the open step with the nearest deadline
    const urgentSlug = [...data.items]
        .filter(i => i.status === 'todo' && i.days_left != null && i.days_left <= 7)
        .sort((a, b) => a.days_left - b.days_left)[0]?.slug;
    const phases = Object.keys(PHASES)
        .map(phase => ({ phase, items: data.items.filter(i => i.phase === phase) }))
        .filter(g => g.items.length);
    const pct = data.progress.total ? Math.round((data.progress.done / data.progress.total) * 100) : 0;
    const answers = [
        countryName(profile.passport_country, t.lang),
        profile.city,
        t(ACCOMMODATION[profile.accommodation]),
        profile.arrival_date && t('arriving {date}', { date: formatDay(profile.arrival_date, t.lang) }),
    ].filter(Boolean).join(' · ');

    return (
        <SettleLayout wide>
            <div className="si-start">
                <div className="si-main">
                    <header className="si-head">
                        <h1>{t('Your first months')}</h1>
                        <p className="si-answers">{answers} <button type="button" className="si-linkbtn" onClick={() => setEditing(true)}>{t('Change')}</button></p>
                        <div className="si-progress" role="progressbar" aria-valuemin={0} aria-valuemax={data.progress.total} aria-valuenow={data.progress.done} aria-label={t('Progress')}>
                            <span style={{ width: `${pct}%` }} />
                        </div>
                        <p className="si-progress-text">{t('{done} of {total} done', { done: data.progress.done, total: data.progress.total })}</p>
                    </header>

                    {next ? <NextStep item={next} /> : data.items.length > 0 && (
                        <section className="si-next si-next--done">
                            <div className="si-next-body">
                                <h2>{t('All done for now')}</h2>
                                <p>{t('New guides appear here when they apply to you.')}</p>
                            </div>
                        </section>
                    )}

                    {data.items.length === 0 && (
                        <div className="si-card si-empty">
                            <h2>{t('No steps for you yet')}</h2>
                            <p>{t('We’re writing guides for more cities and countries. Meanwhile, read the ones we have.')}</p>
                            <Link to="/settle-in/guides" className="si-btn">{t('See all guides')}</Link>
                        </div>
                    )}

                    {phases.map(({ phase, items }) => (
                        <section key={phase} className="si-phase">
                            <h2>{t(PHASES[phase])}</h2>
                            <ul className="si-steps">
                                {items.map(item => (
                                    <StepRow key={item.slug} item={item} onChange={load} isNext={item.slug === data.next} urgent={item.slug === urgentSlug} titles={titles} />
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
                <SideColumn />
            </div>
        </SettleLayout>
    );
};

export default SettleInPage;
