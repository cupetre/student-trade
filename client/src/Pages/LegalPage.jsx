import React from 'react';
import { Link } from 'react-router-dom';
import AppNav from '../components/AppNav.jsx';
import PublicNav from '../components/PublicNav.jsx';
import { isLoggedIn } from '../lib/auth';
import { useLanguage } from '../lib/language';
import { localeFor } from '../lib/i18n';
import { legalCopy } from './legalCopy';
import './LegalPage.css';

// /privacy and /terms, for visitors and logged-in people alike (the text is in legalCopy.js)
const LegalPage = ({ kind }) => {
    const [lang] = useLanguage();
    const copy = legalCopy[lang] || legalCopy.en;
    const page = copy[kind];
    const updated = new Date(copy.updated).toLocaleDateString(localeFor(lang), { day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div className="lg-shell">
            {isLoggedIn() ? <AppNav /> : <PublicNav />}
            <main className="lg-page">
                <article className="lg-card">
                    <h1>{page.title}</h1>
                    <p className="lg-updated">{copy.updatedLabel}: {updated}</p>
                    <p className="lg-intro">{page.intro}</p>
                    {page.sections.map(section => (
                        <section key={section.h}>
                            <h2>{section.h}</h2>
                            {(section.p || []).map(text => <p key={text}>{text}</p>)}
                            {section.list && <ul>{section.list.map(text => <li key={text}>{text}</li>)}</ul>}
                            {(section.after || []).map(text => <p key={text}>{text}</p>)}
                        </section>
                    ))}
                    <p className="lg-other">
                        {kind === 'privacy'
                            ? <Link to="/terms">{copy.otherTerms} →</Link>
                            : <Link to="/privacy">{copy.otherPrivacy} →</Link>}
                    </p>
                </article>
            </main>
        </div>
    );
};

export default LegalPage;
