import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import SettleLayout from './SettleLayout.jsx';
import { euros, formatDay } from './settleShared';
import { apiRequest } from '../../lib/api';
import { useT } from '../../lib/i18n';

/*
  Settle In → Cost of living (/settle-in/cost). Open to guests.
  Rent comes from live listings on Sidro (the median for that city and kind of
  room); everything else from numbers an admin entered with a source. Where we
  have no number, the student types their own. Every choice lives in the address,
  so "send this to my parents" is just the link.
*/

const CATEGORIES = [
    { key: 'rent', label: 'Where you live', options: [
        { key: 'room', label: 'Own room in a shared flat' },
        { key: 'shared_room', label: 'Shared room' },
        { key: 'studio', label: 'Studio or flat' },
        { key: 'dorm', label: 'Student dorm' },
    ] },
    { key: 'food', label: 'How you eat', options: [
        { key: 'boni', label: 'Boni most days' },
        { key: 'mixed', label: 'Boni and cooking' },
        { key: 'cook', label: 'Mostly cooking' },
    ] },
    { key: 'transport', label: 'How you get around', options: [
        { key: 'walk', label: 'Walk or bike' },
        { key: 'bus', label: 'City bus' },
        { key: 'train_home', label: 'Bus plus a trip home each month' },
    ] },
    { key: 'phone', label: 'Phone', options: [{ key: 'basic', label: 'A phone plan' }] },
    { key: 'extras', label: 'Extras', multi: true, options: [
        { key: 'gym', label: 'Gym or sport' },
        { key: 'going_out', label: 'Going out' },
        { key: 'trips', label: 'Trips' },
    ] },
];

// One colour per category, from the palette (ink, steel blue, a lighter blue, beige tones)
const COLORS = { rent: 'var(--c-ink)', food: 'var(--c-blue)', transport: '#8DB0C8', phone: '#B7A88E', extras: 'var(--c-stone)' };

const CostPage = () => {
    const t = useT();
    const [params, setParams] = useSearchParams();
    const [state, setState] = useState({ loading: true, error: '', data: null });
    const [copied, setCopied] = useState(false);
    const city = params.get('city') || '';

    useEffect(() => {
        let cancelled = false;
        setState(s => ({ ...s, loading: true }));
        apiRequest(`/api/settle/cost${city ? `?city=${encodeURIComponent(city)}` : ''}`).then(({ ok, data }) => {
            if (!cancelled) setState({ loading: false, error: ok ? '' : data.error, data: ok ? data : null });
        });
        return () => { cancelled = true; };
    }, [city]);

    const set = (changes) => {
        const next = new URLSearchParams(params);
        for (const [k, v] of Object.entries(changes)) {
            if (v === '' || v == null) next.delete(k); else next.set(k, v);
        }
        setParams(next, { replace: true });
    };

    const data = state.data;
    const choice = (cat) => {
        if (cat.multi) return (params.get(cat.key) || '').split(',').filter(Boolean);
        return params.get(cat.key) || cat.options[0].key;
    };

    // Our number for one option: rent from listings first, then the admin's numbers
    const ourNumber = useMemo(() => (category, option) => {
        if (!data) return null;
        if (category === 'rent' && data.rents && data.rents[option] && data.rents[option].median != null) {
            const r = data.rents[option];
            return { typical: r.median, low: r.low, high: r.high, note: t('Median of {n} live listings on Sidro', { n: r.count }) };
        }
        const item = data.items.find(i => i.category === category && i.option === option);
        if (!item) return null;
        return { typical: item.typical, low: item.low, high: item.high, note: item.source_title, url: item.source_url, checked: item.last_checked };
    }, [data, t]);

    const rows = CATEGORIES.map((cat) => {
        const picked = choice(cat);
        const own = params.get(`${cat.key}_eur`);
        let ours = null;
        if (cat.multi) {
            const parts = picked.map(o => ourNumber(cat.key, o)).filter(Boolean);
            ours = parts.length === picked.length && picked.length ? { typical: parts.reduce((s, p) => s + p.typical, 0) } : null;
        } else {
            ours = ourNumber(cat.key, picked);
        }
        const nothingPicked = cat.multi && picked.length === 0;
        const amount = own !== null && own !== '' ? Number(own) : nothingPicked ? 0 : ours ? ours.typical : null;
        return { cat, picked, own, ours, amount, nothingPicked };
    });

    const total = rows.reduce((s, r) => s + (Number.isFinite(r.amount) ? r.amount : 0), 0);
    const missing = rows.filter(r => r.amount == null);
    const minimum = data?.permit_minimum?.amount;

    const toggleExtra = (cat, option) => {
        const picked = choice(cat);
        const next = picked.includes(option) ? picked.filter(o => o !== option) : [...picked, option];
        set({ [cat.key]: next.join(','), [`${cat.key}_eur`]: '' });
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            window.prompt(t('Copy this link'), window.location.href);
        }
    };

    const sources = data ? data.items.filter(i => rows.some(r => (r.cat.multi ? r.picked.includes(i.option) : r.picked === i.option) && r.cat.key === i.category && r.own == null)) : [];

    return (
        <SettleLayout wide>
            <div className="si-cost">
                <div className="si-cost-main">
                    <h1>{t('Cost of living')}</h1>

                    <label className="si-field si-cost-city">
                        <span>{t('City')}</span>
                        <select value={data?.city || city} onChange={e => set({ city: e.target.value })} disabled={!data}>
                            {(data?.cities || []).map(c => <option key={c} value={c}>{c}</option>)}
                            {data && city && !data.cities.includes(data.city) && <option value={city}>{city}</option>}
                        </select>
                    </label>

                    {state.loading && !data && <p className="si-muted">{t('Loading…')}</p>}
                    {state.error && <p className="si-error" role="alert">{state.error}</p>}

                    {data && rows.map(({ cat, picked, own, ours, amount, nothingPicked }) => (
                        <section key={cat.key} className="si-cost-row">
                            <div className="si-cost-row-head">
                                <h2>{t(cat.label)}</h2>
                                <label className="si-cost-amount">
                                    <span className="si-visually-hidden">{t('{label}, euros a month', { label: t(cat.label) })}</span>
                                    <input
                                        type="number"
                                        min="0"
                                        max="5000"
                                        inputMode="numeric"
                                        value={own ?? (amount ?? '')}
                                        placeholder="–"
                                        onChange={e => set({ [`${cat.key}_eur`]: e.target.value })}
                                    />
                                    <span aria-hidden="true">€</span>
                                </label>
                            </div>
                            {cat.options.length > 1 && (
                                <div className="si-chips" role="group" aria-label={t(cat.label)}>
                                    {cat.options.map(o => {
                                        const on = cat.multi ? picked.includes(o.key) : picked === o.key;
                                        return (
                                            <button
                                                key={o.key}
                                                type="button"
                                                className={`si-chip${on ? ' is-on' : ''}`}
                                                aria-pressed={on}
                                                onClick={() => (cat.multi ? toggleExtra(cat, o.key) : set({ [cat.key]: o.key, [`${cat.key}_eur`]: '' }))}
                                            >
                                                {t(o.label)}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            <p className="si-cost-note">
                                {own != null && own !== ''
                                    ? <>{t('Your own number.')} <button type="button" className="si-linkbtn" onClick={() => set({ [`${cat.key}_eur`]: '' })}>{t('Use ours')}</button></>
                                    : nothingPicked ? t('Nothing picked.')
                                    : ours ? <>{ours.low != null && ours.high != null && ours.low !== ours.high ? `${t('{low}–{high} a month', { low: euros(ours.low, t.lang), high: euros(ours.high, t.lang) })} · ` : ''}{ours.note}</>
                                    : t('We don’t have a number for this yet. Type your own estimate.')}
                            </p>
                        </section>
                    ))}
                </div>

                {data && (
                    <aside className="si-cost-side">
                        <div className="si-card si-cost-total">
                            <p className="si-eyebrow">{t('A month in {city}', { city: data.city || city })}</p>
                            <p className="si-cost-sum">{euros(total, t.lang)}</p>
                            {missing.length > 0 && <p className="si-muted">{t('Plus what you haven’t filled in: {list}', { list: missing.map(m => t(m.cat.label).toLowerCase()).join(', ') })}</p>}

                            {total > 0 && (
                                <>
                                    <div className="si-cost-bar" aria-hidden="true">
                                        {rows.filter(r => r.amount > 0).map(r => (
                                            <span key={r.cat.key} style={{ width: `${(r.amount / total) * 100}%`, background: COLORS[r.cat.key] }} />
                                        ))}
                                    </div>
                                    <ul className="si-cost-legend">
                                        {rows.filter(r => r.amount > 0).map(r => (
                                            <li key={r.cat.key}><i style={{ background: COLORS[r.cat.key] }} />{t(r.cat.label)}<span>{euros(r.amount, t.lang)}</span></li>
                                        ))}
                                    </ul>
                                </>
                            )}

                            {minimum && (
                                <p className="si-cost-permit">
                                    {t('The residence permit asks non-EU students to show {amount} a month.', { amount: `${minimum.toLocaleString(t.lang === 'sl' ? 'sl-SI' : 'en-GB', { minimumFractionDigits: 2 })} €` })}
                                    {' '}<a href={data.permit_minimum.source} target="_blank" rel="noopener noreferrer" className="si-link">{t('Source')}</a>
                                </p>
                            )}

                            <button type="button" className="si-btn si-btn--quiet si-btn--small" onClick={copyLink}>{copied ? t('Link copied') : t('Copy a link to this estimate')}</button>
                        </div>

                        {sources.length > 0 && (
                            <div className="si-card si-box si-cost-sources">
                                <strong>{t('Where our numbers come from')}</strong>
                                <ul>
                                    {sources.map(s => (
                                        <li key={s.id}><a href={s.source_url} target="_blank" rel="noopener noreferrer">{s.source_title}</a> <span className="si-muted">· {t('checked {date}', { date: formatDay(s.last_checked, t.lang) })}</span></li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </aside>
                )}
            </div>
        </SettleLayout>
    );
};

export default CostPage;
