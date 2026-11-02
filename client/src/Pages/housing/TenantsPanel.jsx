import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../../components/Avatar.jsx';
import ReviewForm from '../../components/ReviewForm.jsx';
import { Stars } from '../../components/Stars.jsx';
import { apiRequest } from '../../lib/api';
import { resolveMediaUrl } from '../../lib/media';
import { TENANCY_STATUS } from '../../lib/housingOptions';


// Owner's view of who lives at one listing. Adding a tenant needs the
// tenant to confirm; after that both sides can review each other.
const TenantsPanel = ({ listing }) => {
    const [tenants, setTenants] = useState([]);
    const [candidates, setCandidates] = useState([]);
    const [selected, setSelected] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [reviewingId, setReviewingId] = useState(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        const [t, c] = await Promise.all([
            apiRequest(`/api/housing/listings/${listing.id}/tenants`),
            apiRequest(`/api/housing/listings/${listing.id}/tenant-candidates`),
        ]);
        setLoading(false);
        if (!t.ok) { setError(t.data.error); return; }
        setTenants(t.data);
        setCandidates(c.ok ? c.data : []);
    }, [listing.id]);

    useEffect(() => { load(); }, [load]);

    const addTenant = async () => {
        if (!selected || busy) return;
        setBusy(true);
        setError('');
        const { ok, data } = await apiRequest(`/api/housing/listings/${listing.id}/tenants`, { method: 'POST', body: { student_id: Number(selected) } });
        setBusy(false);
        if (!ok) { setError(data.error); return; }
        setSelected('');
        setNotice(data.message);
        load();
    };

    const change = async (tenancy, action) => {
        setBusy(true);
        setError('');
        const { ok, data } = await apiRequest(`/api/housing/tenancies/${tenancy.id}`, { method: 'PATCH', body: { action } });
        setBusy(false);
        if (!ok) { setError(data.error); return; }
        setNotice('');
        load();
    };

    const review = async (tenancy, input) => {
        const { ok, data } = await apiRequest(`/api/housing/tenancies/${tenancy.id}/review`, { method: 'POST', body: input });
        if (!ok) return { ok, error: data.error };
        setReviewingId(null);
        setNotice('Review saved.');
        load();
        return { ok };
    };

    return (
        <div className="hs-tenants">
            <h3>Tenants</h3>
            <p className="hs-hint">Add the people who live here. Once they confirm, you can review each other: tenants review you and the place, you review them.</p>

            {error && <div className="hs-alert hs-alert--error" role="alert">{error}</div>}
            {notice && <div className="hs-alert hs-alert--success" role="status">{notice}</div>}
            {loading && <p className="hs-muted">Loading…</p>}

            {tenants.length > 0 && (
                <ul className="hs-tenant-list">
                    {tenants.map(t => {
                        const status = TENANCY_STATUS[t.status] || { label: t.status, tone: 'muted' };
                        return (
                            <li key={t.id}>
                                <div className="hs-tenant-row">
                                    <Link to={`/users/${t.student.id}`} className="hs-tenant-person">
                                        <Avatar src={resolveMediaUrl(t.student.profile_picture)} name={t.student.fullname} size={34} />
                                        <strong>{t.student.fullname}</strong>
                                    </Link>
                                    <span className={`hs-status hs-status--${status.tone}`}>{status.label}</span>
                                    {t.my_review && <span className="hs-tenant-myreview"><Stars value={t.my_review.rating} size={13} /> your review</span>}
                                    <div className="hs-tenant-actions">
                                        {t.can_review && (
                                            <button type="button" className="hs-btn hs-btn--small hs-btn--ghost" onClick={() => setReviewingId(reviewingId === t.id ? null : t.id)}>
                                                {t.my_review ? 'Edit review' : 'Review tenant'}
                                            </button>
                                        )}
                                        {t.status === 'confirmed' && (
                                            <button type="button" className="hs-btn hs-btn--small hs-btn--ghost" disabled={busy} onClick={() => change(t, 'end')}>Moved out</button>
                                        )}
                                        {(t.status === 'pending' || t.status === 'declined') && (
                                            <button type="button" className="hs-btn hs-btn--small hs-btn--text" disabled={busy} onClick={() => change(t, 'cancel')}>Remove</button>
                                        )}
                                    </div>
                                </div>
                                {reviewingId === t.id && (
                                    <ReviewForm
                                        initial={t.my_review}
                                        prompt={`How was ${t.student.fullname.split(' ')[0]} as a tenant?`}
                                        placeholder="Paid on time? Took care of the place? Easy to live with?"
                                        onCancel={() => setReviewingId(null)}
                                        onSubmit={(input) => review(t, input)}
                                    />
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            <div className="hs-tenant-add">
                {candidates.length > 0 ? (
                    <>
                        <label htmlFor={`tenant-${listing.id}`} className="hs-label">Add a tenant</label>
                        <div className="hs-tenant-add-row">
                            <select id={`tenant-${listing.id}`} value={selected} onChange={(e) => setSelected(e.target.value)}>
                                <option value="">Choose someone you’ve talked to…</option>
                                {candidates.map(p => <option key={p.id} value={p.id}>{p.fullname}</option>)}
                            </select>
                            <button type="button" className="hs-btn hs-btn--small" disabled={!selected || busy} onClick={addTenant}>Add</button>
                        </div>
                    </>
                ) : !loading && (
                    <p className="hs-hint">People appear here once you’ve chatted with them in Kampus.</p>
                )}
            </div>
        </div>
    );
};

export default TenantsPanel;
