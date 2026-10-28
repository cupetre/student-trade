// The rules for tenancies, kept separate from the database so they're easy to test.

// Who can do what:
//   student:  confirm / decline a pending invite, mark a confirmed stay as ended
//   landlord: cancel a pending (or declined) invite, mark a confirmed stay as ended
// Returns { data } to update, { delete: true }, or null when not allowed.
function nextTenancyState(status, action, role, now = new Date()) {
    if (role === 'student') {
        if (action === 'confirm' && status === 'pending') return { data: { status: 'confirmed', confirmed_at: now } };
        if (action === 'decline' && status === 'pending') return { data: { status: 'declined' } };
    }
    if (role === 'landlord') {
        if (action === 'cancel' && (status === 'pending' || status === 'declined')) return { delete: true };
    }
    if (action === 'end' && status === 'confirmed' && (role === 'student' || role === 'landlord')) {
        return { data: { status: 'ended', ended_at: now } };
    }
    return null;
}

// Who a review on this tenancy is about. The tenant reviews the landlord
// (and so the place); the landlord reviews the tenant.
function reviewTarget(tenancy, userId) {
    const isStudent = tenancy.student_id === userId;
    const isLandlord = tenancy.landlord_id === userId;
    if (!isStudent && !isLandlord) return { status: 404, error: 'Not found' };
    if (tenancy.status !== 'confirmed' && tenancy.status !== 'ended') {
        return { status: 400, error: 'You can leave a review once the stay is confirmed by both sides.' };
    }
    return { revieweeId: isStudent ? tenancy.landlord_id : tenancy.student_id };
}

module.exports = { nextTenancyState, reviewTarget };
