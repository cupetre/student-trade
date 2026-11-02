// Shared bits for the marketplace pages (browse, item, sell, my items)
export { formatEuro } from '../../lib/housingOptions';

// "Today", "Yesterday", "3 days ago", "2 weeks ago", else the date
export function postedAgo(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const days = Math.floor((Date.now() - date.getTime()) / 86400000);
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 35) {
        const weeks = Math.round(days / 7);
        return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    }
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const SORTS = {
    newest: 'Newest',
    price_asc: 'Cheapest first',
    price_desc: 'Most expensive first',
};

export const REPORT_REASONS = ['Scam', 'Inappropriate', 'Spam', 'Misleading', 'Other'];

export const MAX_TITLE = 255;
export const MAX_DESCRIPTION = 5000;
export const MAX_PHOTO_MB = 10;
