import React, { useState } from 'react';
import { StarInput } from './Stars.jsx';
import { useT } from '../lib/i18n';
import './Reviews.css';

const MAX = 1000;

// Stars + comment. onSubmit({ rating, description }) must resolve to { ok, error }.
const ReviewForm = ({ initial, onSubmit, onCancel, prompt, placeholder }) => {
    const t = useT();
    const [rating, setRating] = useState(initial?.rating || 0);
    const [description, setDescription] = useState(initial?.description || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!rating) { setError(t('Choose a rating first')); return; }
        setSaving(true);
        setError('');
        const result = await onSubmit({ rating, description: description.trim() });
        setSaving(false);
        if (!result.ok) setError(result.error || t('Could not save the review'));
    };

    return (
        <form className="rv-form" onSubmit={handleSubmit}>
            <p className="rv-form-prompt">{prompt || t('How was it?')}</p>
            <StarInput value={rating} onChange={(n) => { setRating(n); setError(''); }} />
            <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={MAX}
                rows={3}
                placeholder={placeholder || t('What went well, what could be better?')}
                aria-label={t('Comment')}
            />
            <div className="rv-form-foot">
                <span className="rv-count">{description.length} / {MAX}</span>
                <div className="rv-form-actions">
                    {onCancel && <button type="button" className="rv-btn rv-btn--ghost" onClick={onCancel}>{t('Cancel')}</button>}
                    <button type="submit" className="rv-btn" disabled={saving}>{saving ? t('Saving…') : initial ? t('Update review') : t('Post review')}</button>
                </div>
            </div>
            {error && <p className="rv-error" role="alert">{error}</p>}
        </form>
    );
};

export default ReviewForm;
