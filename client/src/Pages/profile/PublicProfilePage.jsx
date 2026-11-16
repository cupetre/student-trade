import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppNav from '../../components/AppNav.jsx';
import Avatar from '../../components/Avatar.jsx';
import HousingCard from '../../components/HousingCard.jsx';
import ReviewList from '../../components/ReviewList.jsx';
import { RatingSummary } from '../../components/Stars.jsx';
import { apiRequest } from '../../lib/api';
import { useCurrentUser } from '../../lib/useCurrentUser';
import { resolveMediaUrl } from '../../lib/media';
import { formatDate } from '../../lib/housingOptions';
import { countryName, LANGUAGES, STUDY_LEVELS, STUDENT_TYPES, LIFESTYLE, stayLabel } from '../../lib/profileOptions';
import { useT } from '../../lib/i18n';
import '../housing/Housing.css';
import './Profile.css';

const Fact = ({ label, children }) => (children || children === 0 ? <div><dt>{label}</dt><dd>{children}</dd></div> : null);

function yesNo(value, yes, no) {
    if (value === true) return yes;
    if (value === false) return no;
    return null;
}

const PublicProfilePage = () => {
    const t = useT();
    const { id } = useParams();
    const { user: me } = useCurrentUser();
    const [person, setPerson] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        Promise.all([
            apiRequest(`/api/users/${id}/public`),
            apiRequest(`/api/rr/users/${id}/reviews`),
        ]).then(([profile, list]) => {
            if (cancelled) return;
            setLoading(false);
            if (!profile.ok) { setError(profile.status === 404 ? t('This person doesn’t exist.') : profile.data.error); return; }
            setPerson(profile.data);
            setReviews(list.ok ? list.data.reviews : []);
        });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const handleDelete = async (review) => {
        const { ok, data } = await apiRequest(`/api/rr/reviews/${review.id}`, { method: 'DELETE' });
        if (ok) setReviews(prev => prev.filter(r => r.id !== review.id));
        else setError(data.error);
    };

    if (loading) return <div className="hs-shell"><AppNav /><main className="hs-page"><p className="hs-muted">{t('Loading…')}</p></main></div>;
    if (!person) {
        return (
            <div className="hs-shell">
                <AppNav />
                <main className="hs-page">
                    <div className="hs-empty"><h1>{t('Profile not found')}</h1><p>{error}</p><Link to="/" className="hs-btn">{t('Home')}</Link></div>
                </main>
            </div>
        );
    }

    const sp = person.student_profile;
    const isStudent = person.role === 'student';
    const roleTag = person.role === 'landlord'
        ? (person.verified_landlord ? <span className="hs-tag hs-tag--good">{t('Verified landlord')}</span> : <span className="hs-tag">{t('Landlord')}</span>)
        : person.role === 'admin' ? <span className="hs-tag">{t('Anchor team')}</span> : <span className="hs-tag">{t('Student')}</span>;

    return (
        <div className="hs-shell">
            <AppNav />
            <main className="hs-page">
                {error && <div className="hs-alert hs-alert--error" role="alert">{error}</div>}

                <section className="sp-hero">
                    <Avatar src={resolveMediaUrl(person.profile_picture)} name={person.fullname} size={96} />
                    <div className="sp-hero-info">
                        <h1>{person.fullname}</h1>
                        <div className="sp-hero-badges">
                            {roleTag}
                            {isStudent && person.profile_complete && <span className="hs-tag hs-tag--good">{t('Profile complete')}</span>}
                            <RatingSummary rating={person.rating} />
                        </div>
                        <p>
                            {isStudent && sp?.university ? `${sp.university} · ` : ''}
                            {t('Member since {date}', { date: formatDate(person.member_since, t) })}
                        </p>
                        {person.bio && <p className="sp-bio">{person.bio}</p>}
                    </div>
                    {person.is_me && (
                        <div className="hs-panel-actions">
                            {isStudent && <Link to="/profile/student" className="hs-btn">{t('Edit rental profile')}</Link>}
                            <Link to="/profilepage" className="hs-btn hs-btn--ghost">{t('Edit name, photo, bio')}</Link>
                        </div>
                    )}
                </section>

                {/* One row: who they are, what they're looking for, a bit more. Reviews below, full width. */}
                {isStudent && (
                    <section className="sp-card sp-section sp-about" aria-labelledby="sp-about-title">
                        <h2 id="sp-about-title">{t('About {name}', { name: person.fullname.split(' ')[0] })}</h2>
                        {sp ? (
                            <div className="sp-about-cols">
                                <div className="sp-about-col">
                                    <h3 className="sp-facts-heading">{t('Basics & studies')}</h3>
                                    <dl className="sp-facts">
                                        {person.details_visible && (
                                            <>
                                                <Fact label={t('Age')}>{sp.age}</Fact>
                                                <Fact label={t('From')}>{[sp.home_city, countryName(sp.home_country, t.lang)].filter(Boolean).join(', ')}</Fact>
                                            </>
                                        )}
                                        <Fact label={t('Studies')}>{[t(STUDY_LEVELS[sp.study_level]), sp.study_year ? t('{n}. year', { n: sp.study_year }) : null].filter(Boolean).join(', ')}</Fact>
                                        <Fact label={t('Faculty')}>{sp.faculty}</Fact>
                                        <Fact label={t('Programme')}>{sp.study_programme}</Fact>
                                        <Fact label={t('Student')}>{t(STUDENT_TYPES[sp.student_type])}</Fact>
                                    </dl>
                                </div>
                                {person.details_visible && sp.budget_max !== undefined && (
                                    <div className="sp-about-col">
                                        <h3 className="sp-facts-heading">{t('Looking for')}</h3>
                                        {(sp.budget_max || sp.move_in_date || sp.preferred_city || sp.stay_length) ? (
                                            <dl className="sp-facts">
                                                <Fact label={t('Budget')}>{sp.budget_max ? t('up to {price} / month', { price: `€${sp.budget_max}` }) : null}</Fact>
                                                <Fact label={t('Move in')}>{sp.move_in_date ? formatDate(sp.move_in_date, t) : null}</Fact>
                                                <Fact label={t('City')}>{sp.preferred_city}</Fact>
                                                <Fact label={t('Stay')}>{stayLabel(sp, t) || null}</Fact>
                                            </dl>
                                        ) : <p className="hs-muted">{t('Not added yet.')}</p>}
                                    </div>
                                )}
                                {person.details_visible && (
                                    <div className="sp-about-col">
                                        <h3 className="sp-facts-heading">{t('More about {name}', { name: person.fullname.split(' ')[0] })}</h3>
                                        {(sp.languages?.length > 0 || sp.smoker != null || sp.has_pets != null || sp.lifestyle?.length > 0) ? (
                                            <dl className="sp-facts">
                                                <Fact label={t('Speaks')}>{(sp.languages || []).map(l => t(LANGUAGES[l] || l)).join(', ')}</Fact>
                                                <Fact label={t('Smoking')}>{yesNo(sp.smoker, t('Smokes'), t('Doesn’t smoke'))}</Fact>
                                                <Fact label={t('Pets')}>{yesNo(sp.has_pets, t('Has a pet'), t('No pets'))}</Fact>
                                                {sp.lifestyle?.length > 0 && (
                                                    <div><dt>{t('Lifestyle')}</dt><dd className="hs-chips">{sp.lifestyle.map(l => <span key={l} className="hs-chip">{t(LIFESTYLE[l] || l)}</span>)}</dd></div>
                                                )}
                                            </dl>
                                        ) : <p className="hs-muted">{t('Not added yet.')}</p>}
                                    </div>
                                )}
                                {!person.details_visible && (
                                    <div className="sp-about-col">
                                        <p className="sp-locked">{t('More details (age, where they’re from, what they’re looking for) are shared only with people they’ve talked to.')}</p>
                                    </div>
                                )}
                            </div>
                        ) : <p className="hs-muted">{t('No details yet.')}</p>}
                    </section>
                )}

                <section className="sp-card sp-section" aria-labelledby="sp-reviews-title">
                    <h2 id="sp-reviews-title">{t('Reviews')}</h2>
                    <ReviewList reviews={reviews} myId={me?.id} onDelete={handleDelete}
                        emptyText={t('{name} has no reviews yet.', { name: person.fullname.split(' ')[0] })} />
                </section>

                {person.housing_listings?.length > 0 && (
                    <section className="sp-section">
                        <h2>{person.is_me ? t('Your places') : t('Places by {name}', { name: person.fullname.split(' ')[0] })}</h2>
                        <div className="hs-grid">
                            {person.housing_listings.map(listing => <HousingCard key={listing.id} listing={listing} />)}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
};

export default PublicProfilePage;
