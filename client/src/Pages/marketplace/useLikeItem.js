import { useCallback } from 'react';
import { apiRequest } from '../../lib/api';

// Like / un-like a marketplace item. `apply(id, isSaved)` updates the page's own
// list right away; if the server says no, it is switched back.
// Returns like(item) -> true when it worked.
export function useLikeItem(apply) {
    return useCallback(async (item) => {
        const next = !item.is_saved;
        apply(item.id, next);
        const { ok } = await apiRequest(`/api/listings/item/${item.id}/save`, { method: next ? 'POST' : 'DELETE' });
        if (!ok) apply(item.id, !next);
        return ok;
    }, [apply]);
}
