import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../../lib/api';
import { REQUIRED_LABELS, STAY_LENGTHS } from '../../lib/profileOptions';
import { toDateInput } from '../../lib/housingOptions';

// What a student can say they're interested in. The server has the same list
// (server/lib/housingInterest.js) and writes the first message from it.
const RENTING_LABELS = { rental: 'Renting it', sublet: 'Taking over the sublet', roommate: 'Moving in as a flatmate' };

function interestOptions(listing) {
    const open = listing.spots_open ?? listing.spots_total ?? 1;
    return [
        { key: 'viewing', label: 'Seeing the place' },
        { key: 'renting', label: RENTING_LABELS[listing.listing_type] || RENTING_LABELS.rental },
        ...(open >= 2 ? [{ key: 'with_friend', label: 'Moving in with a friend' }] : []),
        { key: 'questions', label: 'Asking questions first' },
    ];
}

const todayInput = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const MAX_NOTE = 1000;

/*
  "Interested?" in the Contact tab of a listing: the student ticks what they want,
  picks a move-in date and length of stay (filled in from their rental profile)
  and can add a note. Sending opens the chat with the owner and posts it as
  the first message. With nothing chosen, it just opens the chat.
*/
const InterestPanel = ({ listing }) => {
    const navigate = useNavigate();
    const ownerName = listing.owner?.fullname?.split(' ')[0] || 'the owner';
    const today = todayInput();

    const [interests, setInterests] = useState([]);
    const [moveIn, setMoveIn] = useState('');
    const [stay, setStay] = useState('');
    const [note, setNote] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [profileGate, setProfileGate] = useState(null);

    // Start from what the student already said in their rental profile
    // (landlords get a 400 here and start empty)
    useEffect(() => {
        let cancelled = false;
        apiRequest('/api/users/me/student-profile').then(({ ok, data }) => {
            if (cancelled || !ok || !data.profile) return;
            const wanted = toDateInput(data.profile.move_in_date);
            const available = toDateInput(listing.available_from);
            const start = [wanted, available].filter(d => d && d >= today).sort().pop() || '';
            setMoveIn(prev => prev || start);
            if (STAY_LENGTHS[data.profile.stay_length]) setStay(prev => prev || data.profile.stay_length);
        });
        return () => { cancelled = true; };
    }, [listing.available_from, today]);

    const toggle = (key) => setInterests(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
    const hasContent = interests.length > 0 || note.trim() !== '';

    const send = async (e) => {
        e.preventDefault();
        if (sending) return;
        setSending(true);
        setError('');
        // Only send the date and stay when there's a message to put them in
        const body = hasContent
            ? { interests, move_in: moveIn || null, stay_length: stay || null, note: note.trim() }
            : {};
        const { ok, data } = await apiRequest(`/api/housing/listings/${listing.id}/contact`, { method: 'POST', body });
        setSending(false);
        if (ok) { navigate(`/chatpage?chatId=${data.chat_id}`); return; }
        if (data.code === 'PROFILE_INCOMPLETE') { setProfileGate(data.missing || []); return; }
        setError(data.error || 'Could not send. Please try again.');
    };

    return (
        <form className="hs-interest" onSubmit={send} aria-labelledby="hs-interest-title">
            <h2 id="hs-interest-title" className="hs-interest-title">Interested?</h2>

            <fieldset className="hs-interest-group">
                <legend>I’d like</legend>
                <div className="hs-chips">
                    {interestOptions(listing).map(option => (
                        <button
                            key={option.key}
                            type="button"
                            className={`hs-chip hs-chip--toggle ${interests.includes(option.key) ? 'is-on' : ''}`}
                            aria-pressed={interests.includes(option.key)}
                            onClick={() => toggle(option.key)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </fieldset>

            <div className="hs-interest-row">
                <div className="hs-field">
                    <label htmlFor="hs-move-in">Move in</label>
                    <input id="hs-move-in" type="date" min={today} value={moveIn} onChange={(e) => setMoveIn(e.target.value)} />
                </div>
                <div className="hs-field">
                    <label htmlFor="hs-stay">How long</label>
                    <select id="hs-stay" value={stay} onChange={(e) => setStay(e.target.value)}>
                        <option value="">Not sure</option>
                        {Object.entries(STAY_LENGTHS).map(([value, option]) => <option key={value} value={value}>{option.label}</option>)}
                    </select>
                </div>
            </div>

            <div className="hs-field">
                <label htmlFor="hs-note">Note</label>
                <textarea
                    id="hs-note"
                    rows={3}
                    maxLength={MAX_NOTE}
                    placeholder={`Anything ${ownerName} should know?`}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                />
            </div>

            {error && <div className="hs-alert hs-alert--error" role="alert">{error}</div>}
            {profileGate && (
                <div className="hs-alert hs-alert--info" role="status">
                    <strong>Finish your rental profile first.</strong>
                    {profileGate.length > 0 && <> Missing: {profileGate.map(f => REQUIRED_LABELS[f] || f).join(', ')}.</>}
                    {' '}<Link to={`/profile/student?next=${encodeURIComponent(`/housing/${listing.id}`)}`}>Complete it now</Link>
                </div>
            )}

            <div className="hs-interest-send">
                <button type="submit" className="hs-btn" disabled={sending}>
                    {sending ? 'Sending…' : hasContent ? `Send to ${ownerName}` : `Message ${ownerName}`}
                </button>
            </div>
        </form>
    );
};

export default InterestPanel;
