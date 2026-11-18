import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SettleLayout from './SettleLayout.jsx';
import { TOPICS, PHASES, formatDay } from './settleShared';
import TopicIcon from './TopicIcon.jsx';
import { apiRequest } from '../../lib/api';
import { useT } from '../../lib/i18n';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Settle In → Guides (/settle-in/guides). Open to guests.
// Topic and search live in the address: ?topic=documents&q=permit
const GuidesPage = () => {
    const t = useT();
    const [params, setParams] = useSearchParams();
    const topic = params.get('topic') || '';
    const q = params.get('q') || '';
    const [state, setState] = useState({ loading: true, error: '', guides: [] });

    useEffect(() => {
        apiRequest('/api/settle/guides').then(({ ok, data }) => {
            setState({ loading: false, error: ok ? '' : data.error, guides: ok ? data.guides : [] });
        });
    }, []);

    const setParam = (key, value) => {
        const next = new URLSearchParams(params);
        if (value) next.set(key, value); else next.delete(key);
        setParams(next, { replace: true });
    };

    const topicsInUse = useMemo(() => Object.keys(TOPICS).filter(k => state.guides.some(g => g.topic === k)), [state.guides]);
    const shown = state.guides.filter((g) => {
        if (topic && g.topic !== topic) return false;
        if (!q) return true;
        const text = g.text[t.lang] || g.text.en || {};
        const en = g.text.en || {};
        return norm(`${text.title} ${text.summary} ${en.title} ${en.summary}`).includes(norm(q));
    });

    return (
        <SettleLayout wide>
            <div className="si-guides">
                <h1>{t('Guides')}</h1>
                <div className="si-guides-tools">
                    <input
                        type="search"
                        className="si-search"
                        value={q}
                        onChange={e => setParam('q', e.target.value)}
                        placeholder={t('Search: permit, tax number, boni…')}
                        aria-label={t('Search the guides')}
                    />
                    <div className="si-chips" role="group" aria-label={t('Topic')}>
                        <button type="button" className={`si-chip${!topic ? ' is-on' : ''}`} aria-pressed={!topic} onClick={() => setParam('topic', '')}>{t('All')}</button>
                        {topicsInUse.map(k => (
                            <button key={k} type="button" className={`si-chip${topic === k ? ' is-on' : ''}`} aria-pressed={topic === k} onClick={() => setParam('topic', topic === k ? '' : k)}>
                                {t(TOPICS[k])}
                            </button>
                        ))}
                    </div>
                </div>

                {state.loading && <p className="si-muted">{t('Loading…')}</p>}
                {state.error && <p className="si-error" role="alert">{state.error}</p>}
                {!state.loading && !state.error && shown.length === 0 && (
                    <div className="si-card si-empty">
                        <h2>{t('No guide matches')}</h2>
                        <p>{t('Try another word, or show all topics.')}</p>
                    </div>
                )}

                <ul className="si-guide-grid">
                    {shown.map((g) => {
                        const text = g.text[t.lang] || g.text.en || {};
                        return (
                            <li key={g.slug}>
                                <Link to={`/settle-in/guides/${g.slug}`} className="si-guide-card">
                                    <span className="si-guide-card-top">
                                        <TopicIcon topic={g.topic} />
                                        <span className="si-guide-card-meta">{t(TOPICS[g.topic] || 'Guide')} · {t(PHASES[g.phase] || '')}</span>
                                    </span>
                                    <strong>{text.title}</strong>
                                    <span>{text.summary}</span>
                                    <small>{g.city ? `${g.city} · ` : ''}{t('Checked {date}', { date: formatDay(g.last_checked, t.lang) })}</small>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </SettleLayout>
    );
};

export default GuidesPage;
