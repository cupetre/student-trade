import React, { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import SettleLayout from './SettleLayout.jsx';
import { PHASES, TOPICS, formatDay, todayIso } from './settleShared';
import { apiRequest } from '../../lib/api';
import { useT } from '../../lib/i18n';
import { useCurrentUser } from '../../lib/useCurrentUser';

/*
  Settle In → Editor (/settle-in/admin). Admins only.
  Guides are the checklist steps: write them here, keep them checked, set
  them live. Cost numbers feed the calculator; each one needs a source.
  The editor is for us, so it stays in English.
*/

const LANG_NAMES = { en: 'English', sl: 'Slovenian', mk: 'Macedonian' };
const AUDIENCE_HELP = 'One per line, all must hold: eu, non_eu, foreign (anyone not Slovenian), slovenian, private, dorm, not_yet, country:MK';
const lines = (arr) => (arr || []).join('\n');

const EMPTY_TEXT = { title: '', summary: '', bring: '', steps: '', cost: '', time: '', mistakes: '', where: { name: '', address: '', hours: '', map_url: '' } };

function toForm(g) {
    const content = {};
    for (const lang of Object.keys(LANG_NAMES)) {
        const c = g?.content?.[lang] || {};
        content[lang] = {
            ...EMPTY_TEXT,
            ...c,
            bring: lines(c.bring), steps: lines(c.steps), mistakes: lines(c.mistakes),
            where: { ...EMPTY_TEXT.where, ...(c.where || {}) },
            cost: c.cost || '', time: c.time || '',
        };
    }
    return {
        slug: g?.slug || '',
        topic: g?.topic || 'documents',
        phase: g?.phase || 'before',
        position: g?.position ?? 0,
        city: g?.city || '',
        applies_to: lines(g?.applies_to),
        depends_on: lines(g?.depends_on),
        deadline_anchor: g?.deadline_anchor || '',
        deadline_days: g?.deadline_days ?? '',
        asks_date: g?.asks_date || '',
        status: g?.status || 'draft',
        last_checked: g?.last_checked || todayIso(),
        sources: g?.sources?.length ? g.sources : [{ title: '', url: '' }],
        content,
    };
}

function GuideEditor({ guide, onDone }) {
    const t = useT();
    const [form, setForm] = useState(() => toForm(guide));
    const [lang, setLang] = useState('en');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));
    const setText = (key) => (e) => setForm(f => ({ ...f, content: { ...f.content, [lang]: { ...f.content[lang], [key]: e.target.value } } }));
    const setWhere = (key) => (e) => setForm(f => ({ ...f, content: { ...f.content, [lang]: { ...f.content[lang], where: { ...f.content[lang].where, [key]: e.target.value } } } }));
    const setSource = (i, key) => (e) => setForm(f => ({ ...f, sources: f.sources.map((s, j) => (j === i ? { ...s, [key]: e.target.value } : s)) }));

    const save = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        const body = { ...form, sources: form.sources.filter(s => s.url.trim()) };
        const { ok, data } = await apiRequest(guide ? `/api/settle/admin/guides/${guide.id}` : '/api/settle/admin/guides', { method: guide ? 'PUT' : 'POST', body });
        setSaving(false);
        if (!ok) {
            setError(data);
            if (data.field && data.field.startsWith('content.')) setLang(data.field.split('.')[1]);
            return;
        }
        onDone(`Saved “${data.guide.text.en.title}”.`);
    };

    const remove = async () => {
        const { ok, data } = await apiRequest(`/api/settle/admin/guides/${guide.id}`, { method: 'DELETE' });
        if (!ok) { setError(data); return; }
        onDone('Guide deleted.');
    };

    const c = form.content[lang];
    const err = (field) => (error?.field === field ? <em className="si-error">{error.error}</em> : null);

    return (
        <form className="si-card si-editor" onSubmit={save} noValidate>
            <div className="si-editor-head">
                <h2>{guide ? `Edit: ${guide.text.en?.title}` : 'New guide'}</h2>
                <button type="button" className="si-linkbtn" onClick={() => onDone(null)}>{t('Cancel')}</button>
            </div>

            <div className="si-editor-grid">
                <label className="si-field"><span>Address (slug)</span><input value={form.slug} onChange={set('slug')} placeholder="residence-permit" />{err('slug')}</label>
                <label className="si-field"><span>Status</span>
                    <select value={form.status} onChange={set('status')}><option value="draft">Draft (hidden)</option><option value="live">Live</option></select>{err('status')}
                </label>
                <label className="si-field"><span>Topic</span>
                    <select value={form.topic} onChange={set('topic')}>{Object.entries(TOPICS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                </label>
                <label className="si-field"><span>When</span>
                    <select value={form.phase} onChange={set('phase')}>{Object.entries(PHASES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                </label>
                <label className="si-field"><span>Order in that phase</span><input type="number" value={form.position} onChange={set('position')} />{err('position')}</label>
                <label className="si-field"><span>City (empty = everywhere)</span><input value={form.city} onChange={set('city')} />{err('city')}</label>
                <label className="si-field"><span>Who it’s for</span><textarea rows={3} value={form.applies_to} onChange={set('applies_to')} /><small>{AUDIENCE_HELP}</small>{err('applies_to')}</label>
                <label className="si-field"><span>Comes after (slugs, one per line)</span><textarea rows={3} value={form.depends_on} onChange={set('depends_on')} />{err('depends_on')}</label>
                <label className="si-field"><span>Deadline counts from</span>
                    <select value={form.deadline_anchor} onChange={set('deadline_anchor')}><option value="">No deadline</option><option value="arrival_date">Arrival date</option><option value="permit_date">Residence permit date</option></select>{err('deadline_anchor')}
                </label>
                <label className="si-field"><span>Days after that</span><input type="number" value={form.deadline_days} onChange={set('deadline_days')} disabled={!form.deadline_anchor} />{err('deadline_days')}</label>
                <label className="si-field"><span>When ticked, ask for</span>
                    <select value={form.asks_date} onChange={set('asks_date')}><option value="">Nothing</option><option value="arrival_date">Arrival date</option><option value="permit_date">Residence permit date</option></select>
                </label>
                <label className="si-field"><span>Last checked</span><input type="date" value={form.last_checked} onChange={set('last_checked')} />{err('last_checked')}</label>
            </div>

            <div className="si-chips si-editor-langs" role="tablist" aria-label="Language">
                {Object.entries(LANG_NAMES).map(([k, v]) => (
                    <button key={k} type="button" role="tab" aria-selected={lang === k} className={`si-chip${lang === k ? ' is-on' : ''}`} onClick={() => setLang(k)}>
                        {v}{form.content[k].title ? '' : ' (empty)'}
                    </button>
                ))}
            </div>
            <p className="si-muted">{lang === 'en' ? 'English title and summary are required.' : 'Leave everything empty to skip this language. Missing parts show in English.'}</p>

            <div className="si-editor-text">
                <label className="si-field"><span>Title</span><input value={c.title} onChange={setText('title')} />{err(`content.${lang}.title`)}</label>
                <label className="si-field"><span>Summary (one or two sentences)</span><textarea rows={2} value={c.summary} onChange={setText('summary')} />{err(`content.${lang}.summary`)}</label>
                <label className="si-field"><span>What to bring (one per line)</span><textarea rows={5} value={c.bring} onChange={setText('bring')} />{err(`content.${lang}.bring`)}</label>
                <label className="si-field"><span>Steps (one per line, in order)</span><textarea rows={7} value={c.steps} onChange={setText('steps')} />{err(`content.${lang}.steps`)}</label>
                <label className="si-field"><span>What it costs</span><input value={c.cost} onChange={setText('cost')} />{err(`content.${lang}.cost`)}</label>
                <label className="si-field"><span>How long it takes</span><input value={c.time} onChange={setText('time')} />{err(`content.${lang}.time`)}</label>
                <fieldset className="si-editor-where">
                    <legend>Where</legend>
                    <label className="si-field"><span>Name</span><input value={c.where.name} onChange={setWhere('name')} /></label>
                    <label className="si-field"><span>Address</span><input value={c.where.address} onChange={setWhere('address')} /></label>
                    <label className="si-field"><span>Opening hours</span><input value={c.where.hours} onChange={setWhere('hours')} /></label>
                    <label className="si-field"><span>Map link</span><input value={c.where.map_url} onChange={setWhere('map_url')} placeholder="https://" />{err(`content.${lang}.where.map_url`)}</label>
                </fieldset>
                <label className="si-field"><span>Common mistakes (one per line)</span><textarea rows={4} value={c.mistakes} onChange={setText('mistakes')} />{err(`content.${lang}.mistakes`)}</label>
            </div>

            <fieldset className="si-editor-sources">
                <legend>Sources (a live guide needs at least one)</legend>
                {form.sources.map((s, i) => (
                    <div key={i} className="si-editor-source">
                        <input value={s.title} onChange={setSource(i, 'title')} placeholder="Title" aria-label={`Source ${i + 1} title`} />
                        <input value={s.url} onChange={setSource(i, 'url')} placeholder="https://" aria-label={`Source ${i + 1} link`} />
                        <button type="button" className="si-linkbtn" onClick={() => setForm(f => ({ ...f, sources: f.sources.filter((_, j) => j !== i) }))}>Remove</button>
                    </div>
                ))}
                <button type="button" className="si-linkbtn" onClick={() => setForm(f => ({ ...f, sources: [...f.sources, { title: '', url: '' }] }))}>Add a source</button>
                {error?.field?.startsWith('sources') && <em className="si-error">{error.error}</em>}
            </fieldset>

            {error && !error.field && <p className="si-error" role="alert">{error.error}</p>}
            {error?.field && <p className="si-error" role="alert">Check the highlighted field: {error.error}</p>}

            <div className="si-row-actions">
                <button type="submit" className="si-btn" disabled={saving}>{saving ? 'Saving…' : 'Save guide'}</button>
                {guide && !confirmDelete && <button type="button" className="si-linkbtn si-linkbtn--danger" onClick={() => setConfirmDelete(true)}>Delete</button>}
                {confirmDelete && (
                    <span className="si-confirm">
                        Delete for good? Students lose their tick on this step.
                        <button type="button" className="si-btn si-btn--small si-btn--danger" onClick={remove}>Delete</button>
                        <button type="button" className="si-linkbtn" onClick={() => setConfirmDelete(false)}>Keep it</button>
                    </span>
                )}
            </div>
        </form>
    );
}

const EMPTY_COST = { city: '', category: 'food', option: '', low: '', typical: '', high: '', label: { en: '', sl: '' }, source_title: '', source_url: '', last_checked: todayIso() };
const COST_OPTIONS = 'rent: dorm, room, shared_room, studio · food: boni, mixed, cook · transport: walk, bus, train_home · phone: basic · extras: gym, going_out, trips';

function CostEditor({ item, onDone }) {
    const [form, setForm] = useState(() => ({ ...EMPTY_COST, ...item, city: item?.city || '', label: { en: '', sl: '', ...(item?.label || {}) } }));
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));
    const setLabel = (key) => (e) => setForm(f => ({ ...f, label: { ...f.label, [key]: e.target.value } }));
    const err = (field) => (error?.field === field ? <em className="si-error">{error.error}</em> : null);

    const save = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        const { ok, data } = await apiRequest(item?.id ? `/api/settle/admin/costs/${item.id}` : '/api/settle/admin/costs', { method: item?.id ? 'PUT' : 'POST', body: form });
        setSaving(false);
        if (!ok) { setError(data); return; }
        onDone('Number saved.');
    };

    return (
        <form className="si-card si-editor" onSubmit={save} noValidate>
            <div className="si-editor-head">
                <h2>{item?.id ? 'Edit number' : 'New number'}</h2>
                <button type="button" className="si-linkbtn" onClick={() => onDone(null)}>Cancel</button>
            </div>
            <p className="si-muted">Options the calculator uses: {COST_OPTIONS}</p>
            <div className="si-editor-grid">
                <label className="si-field"><span>City (empty = everywhere)</span><input value={form.city} onChange={set('city')} /></label>
                <label className="si-field"><span>Category</span>
                    <select value={form.category} onChange={set('category')}>{['rent', 'food', 'transport', 'phone', 'extras'].map(c => <option key={c} value={c}>{c}</option>)}</select>
                </label>
                <label className="si-field"><span>Option</span><input value={form.option} onChange={set('option')} placeholder="boni" />{err('option')}</label>
                <label className="si-field"><span>Label (English)</span><input value={form.label.en} onChange={setLabel('en')} />{err('label.en')}</label>
                <label className="si-field"><span>Label (Slovenian)</span><input value={form.label.sl} onChange={setLabel('sl')} /></label>
                <label className="si-field"><span>Low € / month</span><input type="number" value={form.low} onChange={set('low')} />{err('low')}</label>
                <label className="si-field"><span>Typical € / month</span><input type="number" value={form.typical} onChange={set('typical')} />{err('typical')}</label>
                <label className="si-field"><span>High € / month</span><input type="number" value={form.high} onChange={set('high')} />{err('high')}</label>
                <label className="si-field"><span>Source title</span><input value={form.source_title} onChange={set('source_title')} /></label>
                <label className="si-field"><span>Source link</span><input value={form.source_url} onChange={set('source_url')} placeholder="https://" />{err('source_url')}</label>
                <label className="si-field"><span>Last checked</span><input type="date" value={form.last_checked} onChange={set('last_checked')} />{err('last_checked')}</label>
            </div>
            {error && !error.field && <p className="si-error" role="alert">{error.error}</p>}
            <div className="si-row-actions"><button type="submit" className="si-btn" disabled={saving}>{saving ? 'Saving…' : 'Save number'}</button></div>
        </form>
    );
}

const SettleAdminPage = () => {
    const { user, loading } = useCurrentUser();
    const [guides, setGuides] = useState(null);
    const [costs, setCosts] = useState(null);
    const [editing, setEditing] = useState(null);   // { kind: 'guide' | 'cost', item }
    const [flash, setFlash] = useState('');
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        const [g, c] = await Promise.all([apiRequest('/api/settle/admin/guides'), apiRequest('/api/settle/admin/costs')]);
        if (!g.ok) setError(g.data.error);
        setGuides(g.ok ? g.data.guides : []);
        setCosts(c.ok ? c.data.items : []);
    }, []);

    useEffect(() => { if (user?.role === 'admin') load(); }, [user, load]);

    if (loading) return null;
    if (user?.role !== 'admin') return <Navigate to="/settle-in" replace />;

    const done = (message) => {
        setEditing(null);
        if (message) { setFlash(message); load(); }
        window.scrollTo({ top: 0 });
    };
    const removeCost = async (id) => {
        const { ok, data } = await apiRequest(`/api/settle/admin/costs/${id}`, { method: 'DELETE' });
        if (ok) { setFlash('Number deleted.'); load(); } else setError(data.error);
    };

    if (editing?.kind === 'guide') return <SettleLayout wide><GuideEditor guide={editing.item} onDone={done} /></SettleLayout>;
    if (editing?.kind === 'cost') return <SettleLayout wide><CostEditor item={editing.item} onDone={done} /></SettleLayout>;

    return (
        <SettleLayout wide>
            <div className="si-admin">
                <div className="si-editor-head">
                    <h1>Settle In editor</h1>
                    <button type="button" className="si-btn" onClick={() => setEditing({ kind: 'guide', item: null })}>New guide</button>
                </div>
                {flash && <p className="si-flash" role="status">{flash}</p>}
                {error && <p className="si-error" role="alert">{error}</p>}

                <section>
                    <h2>Guides</h2>
                    {guides === null ? <p className="si-muted">Loading…</p> : (
                        <div className="si-table-wrap">
                            <table className="si-table">
                                <thead><tr><th>Guide</th><th>Status</th><th>When</th><th>For</th><th>City</th><th>Checked</th><th /></tr></thead>
                                <tbody>
                                    {guides.map(g => (
                                        <tr key={g.id}>
                                            <td><Link to={`/settle-in/guides/${g.slug}`}>{g.text.en?.title}</Link><small>{g.slug}</small></td>
                                            <td><span className={`si-status si-status--${g.status}`}>{g.status === 'live' ? 'Live' : 'Draft'}</span></td>
                                            <td>{PHASES[g.phase]}</td>
                                            <td>{g.applies_to.join(' + ') || 'Everyone'}</td>
                                            <td>{g.city || 'All'}</td>
                                            <td>{formatDay(g.last_checked, 'en')}</td>
                                            <td><button type="button" className="si-linkbtn" onClick={() => setEditing({ kind: 'guide', item: g })}>Edit</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <section>
                    <div className="si-editor-head">
                        <h2>Cost numbers</h2>
                        <button type="button" className="si-btn si-btn--quiet si-btn--small" onClick={() => setEditing({ kind: 'cost', item: null })}>Add a number</button>
                    </div>
                    <p className="si-muted">Rent comes from live housing listings (3 or more in a city). Add numbers here for dorms and everything else.</p>
                    {costs === null ? <p className="si-muted">Loading…</p> : costs.length === 0 ? <p>No numbers yet.</p> : (
                        <div className="si-table-wrap">
                            <table className="si-table">
                                <thead><tr><th>Choice</th><th>City</th><th>€ / month</th><th>Source</th><th>Checked</th><th /></tr></thead>
                                <tbody>
                                    {costs.map(c => (
                                        <tr key={c.id}>
                                            <td>{c.label.en}<small>{c.category}: {c.option}</small></td>
                                            <td>{c.city || 'All'}</td>
                                            <td>{c.low}–{c.high} (typ. {c.typical})</td>
                                            <td><a href={c.source_url} target="_blank" rel="noopener noreferrer">{c.source_title}</a></td>
                                            <td>{formatDay(c.last_checked, 'en')}</td>
                                            <td>
                                                <button type="button" className="si-linkbtn" onClick={() => setEditing({ kind: 'cost', item: c })}>Edit</button>
                                                <button type="button" className="si-linkbtn si-linkbtn--danger" onClick={() => removeCost(c.id)}>Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </SettleLayout>
    );
};

export default SettleAdminPage;
