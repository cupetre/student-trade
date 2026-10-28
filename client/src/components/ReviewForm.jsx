import React, { useState } from 'react';
import { StarInput } from './Stars.jsx';
import './Reviews.css';

const MAX = 1000;

// Stars + comment. onSubmit({ rating, description }) must resolve to { ok, error }.
const ReviewForm = ({ initial, onSubmit, onCancel, prompt = 'How was it?', placeholder = 'What went well, what could be better?' }) => {
    const [rating, setRating] = useState(initial?.rating || 0);
    const [description, setDescription] = useState(initial?.description || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!rating) { setError('Choose a rating first'); return; }
        setSaving(true);
        setError('');
        const result = await onSubmit({ rating, description: description.trim() });
        setSaving(false);
        if (!result.ok) setError(result.error || 'Could not save the review');
    };

    return (
        <form className="rv-form" onSubmit={handleSubmit}>
            <p className="rv-form-prompt">{prompt}</p>
            <StarInput value={rating} onChange={(n) => { setRating(n); setError(''); }} />
            <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={MAX}
                rows={3}
                placeholder={placeholder}
                aria-label="Comment"
            />
            <div className="rv-form-foot">
                <span className="rv-count">{description.length} / {MAX}</span>
                <div className="rv-form-actions">
                    {onCancel && <button type="button" className="rv-btn rv-btn--ghost" onClick={onCancel}>Cancel</button>}
                    <button type="submit" className="rv-btn" disabled={saving}>{saving ? 'Saving…' : initial ? 'Update review' : 'Post review'}</button>
                </div>
            </div>
            {error && <p className="rv-error" role="alert">{error}</p>}
        </form>
    );
};

export default ReviewForm;
