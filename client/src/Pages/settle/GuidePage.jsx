import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SettleLayout from './SettleLayout.jsx';
import { TOPICS, PHASES, guideText, formatDay, todayIso } from './settleShared';
import TopicIcon from './TopicIcon.jsx';
import { apiRequest } from '../../lib/api';
import { isLoggedIn } from '../../lib/auth';
import { rememberReturn } from '../../lib/returnTo';
import { useT } from '../../lib/i18n';

const ASK_DATE_LABELS = {
    permit_date: 'When did you get your residence permit?',
    arrival_date: 'When did you arrive?',
};

// What to bring: ticks are remembered in this browser only, per guide
function useBringTicks(slug) {
    const key = `settle-bring:${slug}`;
    const [ticks, setTicks] = useState(() => {
        try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
    });
    const toggle = (i) => setTicks((prev) => {
        const next = prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i];
        try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* private window: fine */ }
        return next;
    });
    return [ticks, toggle];
}

// The checklist box on the right: this step's status for the logged-in student
function StepBox({ slug }) {
    const t = useT();
    const [state, setState] = useState({ loading: true, item: null, hasProfile: false });
    const [asking, setAsking] = useState(false);
    const [day, setDay] = useState(todayIso());
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        const { ok, data } = await apiRequest('/api/settle/checklist');
        setState({ loading: false, item: ok ? data.items.find(i => i.slug === slug) || null : null, hasProfile: Boolean(ok && data.profile) });
    }, [slug]);
    useEffect(() => { load(); }, [load]);

    const save = async (status, date) => {
        setBusy(true);
        setError('');
        const { ok, data } = await apiRequest(`/api/settle/checklist/${slug}`, { method: 'PUT', body: { status, date } });
        setBusy(false);
        if (!ok) { setError(data.error); return; }
        setAsking(false);
        load();
    };

    if (state.loading) return null;
    if (!state.hasProfile) {
        return (
            <div className="si-card si-box">
                <strong>{t('Your checklist')}</strong>
                <p>{t('Answer four questions and get the steps that apply to you, with deadlines.')}</p>
                <Link to="/settle-in" className="si-btn si-btn--small">{t('Build my checklist')}</Link>
            </div>
        );
    }
    if (!state.item) {
        return (
            <div className="si-card si-box">
                <strong>{t('Your checklist')}</strong>
                <p>{t('This step isn’t on your checklist, based on your answers.')}</p>
                <Link to="/settle-in" className="si-link">{t('Back to my checklist')}</Link>
            </div>
        );
    }

    const item = state.item;
    return (
        <div className="si-card si-box">
            <strong>{t('Your checklist')}</strong>
            {item.status === 'done' && <p className="si-box-done">{t('Done {date}', { date: formatDay(item.done_at, t.lang) })}</p>}
            {item.status === 'skipped' && <p>{t('You marked this as not for you.')}</p>}
            {item.status === 'todo' && item.deadline && <p className={item.days_left <= 7 ? 'si-box-urgent' : ''}>{t('Due {date}', { date: formatDay(item.deadline, t.lang) })}</p>}

            {item.status === 'todo' && !asking && (
                <button type="button" className="si-btn si-btn--small" disabled={busy} onClick={() => (item.asks_date ? setAsking(true) : save('done'))}>{t('Mark as done')}</button>
            )}
            {asking && (
                <div className="si-ask si-ask--stack">
                    <label>
                        <span>{t(ASK_DATE_LABELS[item.asks_date])}</span>
                        <input type="date" value={day} max={todayIso()} onChange={e => setDay(e.target.value)} />
                    </label>
                    <div className="si-row-actions">
                        <button type="button" className="si-btn si-btn--small" disabled={busy || !day} onClick={() => save('done', day)}>{t('Save')}</button>
                        <button type="button" className="si-linkbtn" onClick={() => setAsking(false)}>{t('Cancel')}</button>
                    </div>
                </div>
            )}
            {item.status !== 'todo' && <button type="button" className="si-linkbtn" disabled={busy} onClick={() => save('todo')}>{t('Undo')}</button>}
            {error && <p className="si-error" role="alert">{error}</p>}
        </div>
    );
}

// Settle In → one guide (/settle-in/guides/:slug). Open to guests.
const GuidePage = () => {
    const { slug } = useParams();
    const t = useT();
    const [state, setState] = useState({ loading: true, error: '', guide: null });
    const [ticks, toggleTick] = useBringTicks(slug);

    useEffect(() => {
        let cancelled = false;
        setState({ loading: true, error: '', guide: null });
        apiRequest(`/api/settle/guides/${encodeURIComponent(slug)}`).then(({ ok, status, data }) => {
            if (cancelled) return;
            setState({ loading: false, error: ok ? '' : (status === 404 ? t('This guide doesn’t exist or isn’t published yet.') : data.error), guide: ok ? data.guide : null });
        });
        return () => { cancelled = true; };
    }, [slug, t]);

    if (state.loading) return <SettleLayout><p className="si-muted si-center">{t('Loading…')}</p></SettleLayout>;
    if (state.error) {
        return (
            <SettleLayout>
                <div className="si-card si-empty si-narrow">
                    <h2>{state.error}</h2>
                    <Link to="/settle-in/guides" className="si-btn">{t('See all guides')}</Link>
                </div>
            </SettleLayout>
        );
    }

    const g = state.guide;
    const text = guideText(g.content, t.lang);
    const guest = !isLoggedIn();

    return (
        <SettleLayout wide>
            <div className="si-guide">
                <article className="si-article">
                    <Link to="/settle-in/guides" className="si-back">{t('All guides')}</Link>
                    <p className="si-eyebrow"><TopicIcon topic={g.topic} className="si-eyebrow-icon" />{t(TOPICS[g.topic] || 'Guide')} · {t(PHASES[g.phase] || '')}{g.city ? ` · ${g.city}` : ''}</p>
                    <h1>{text.title}</h1>
                    {text.summary && <p className="si-lede">{text.summary}</p>}
                    <p className="si-checked">{t('Last checked {date}', { date: formatDay(g.last_checked, t.lang) })}</p>
                    {text.fallback && <p className="si-note">{t('This guide is in English for now.')}</p>}

                    {text.steps?.length > 0 && (
                        <section>
                            <h2>{t('Steps')}</h2>
                            <ol className="si-numbered">{text.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                        </section>
                    )}

                    {(text.cost || text.time) && (
                        <section className="si-facts">
                            {text.cost && <div><h2>{t('What it costs')}</h2><p>{text.cost}</p></div>}
                            {text.time && <div><h2>{t('How long it takes')}</h2><p>{text.time}</p></div>}
                        </section>
                    )}

                    {text.mistakes?.length > 0 && (
                        <section>
                            <h2>{t('Common mistakes')}</h2>
                            <ul className="si-mistakes">{text.mistakes.map((m, i) => <li key={i}>{m}</li>)}</ul>
                        </section>
                    )}

                    {g.sources?.length > 0 && (
                        <section className="si-sources">
                            <h2>{t('Sources')}</h2>
                            <ul>
                                {g.sources.map(s => (
                                    <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a></li>
                                ))}
                            </ul>
                            <p className="si-muted">{t('Rules and fees change. If something here is out of date, the official page wins.')}</p>
                        </section>
                    )}
                </article>

                <aside className="si-guide-side">
                    {guest ? (
                        <div className="si-card si-box">
                            <strong>{t('Your checklist')}</strong>
                            <p>{t('Sign up to get the steps that apply to you, with deadlines.')}</p>
                            <Link to="/register" className="si-btn si-btn--small si-btn--attention" onClick={() => rememberReturn(`/settle-in/guides/${slug}`)}>{t('Sign up')}</Link>
                        </div>
                    ) : <StepBox slug={slug} />}

                    {text.bring?.length > 0 && (
                        <div className="si-card si-box">
                            <strong>{t('What to bring')}</strong>
                            <ul className="si-bring">
                                {text.bring.map((b, i) => (
                                    <li key={i}>
                                        <label>
                                            <input type="checkbox" checked={ticks.includes(i)} onChange={() => toggleTick(i)} />
                                            <span>{b}</span>
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {text.where && (
                        <div className="si-card si-box">
                            <strong>{t('Where')}</strong>
                            {text.where.name && <p className="si-where-name">{text.where.name}</p>}
                            {text.where.address && <p>{text.where.address}</p>}
                            {text.where.hours && <p className="si-muted">{text.where.hours}</p>}
                            {text.where.map_url && <a href={text.where.map_url} target="_blank" rel="noopener noreferrer" className="si-link">{t('Open the map')}</a>}
                        </div>
                    )}

                    {g.topic === 'housing' && (
                        <div className="si-card si-box">
                            <strong>{t('Housing on Sidro')}</strong>
                            <p>{t('Every listing is checked by a person.')}</p>
                            <Link to="/housing" className="si-btn si-btn--small">{t('Find a place')}</Link>
                        </div>
                    )}
                </aside>
            </div>
        </SettleLayout>
    );
};

export default GuidePage;
