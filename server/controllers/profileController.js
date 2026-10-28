const {
    findUserWithProfile, upsertStudentProfile, listActiveHousingByOwner, haveChatted, haveTenancy,
} = require('../models/profileModels.js');
const { ratingSummary } = require('../models/reviewModels.js');
const { validateStudentProfile, missingProfileFields, ageFrom } = require('../lib/profileValidation');
const { SHOW_HOUSING_NEEDS } = require('../lib/profileOptions');
const { toStudentProfileDto, toHousingDto, personDto } = require('../lib/dto');
const { toId } = require('../lib/parse');

function ownProfileResponse(user, profile) {
    const missing = missingProfileFields(user, profile);
    return {
        profile: toStudentProfileDto(profile || {}, { details: true, needs: true, own: true, ageFrom }),
        missing,
        complete: missing.length === 0,
        housing_needs_public: SHOW_HOUSING_NEEDS,
    };
}

function onlyStudents(user, res) {
    if (!user) {
        res.status(404).json({ error: 'Account not found' });
        return false;
    }
    if (user.role !== 'student' && user.role !== 'admin') {
        res.status(400).json({ error: 'Student profiles are for student accounts.' });
        return false;
    }
    return true;
}

async function getMyStudentProfile(req, res) {
    try {
        const user = await findUserWithProfile(req.user.id);
        if (!onlyStudents(user, res)) return;
        res.json(ownProfileResponse(user, user.studentProfile));
    } catch (err) {
        req.log.error({ err }, 'failed to load student profile');
        res.status(500).json({ error: 'Could not load your profile' });
    }
}

async function updateMyStudentProfile(req, res) {
    const { data, errors } = validateStudentProfile(req.body);
    if (Object.keys(errors).length) {
        return res.status(400).json({ error: 'Please fix the highlighted fields', fields: errors });
    }

    try {
        const user = await findUserWithProfile(req.user.id);
        if (!onlyStudents(user, res)) return;
        const profile = await upsertStudentProfile(user.id, data);
        req.log.info({ userId: user.id }, 'student profile saved');
        res.json({ message: 'Profile saved', ...ownProfileResponse(user, profile) });
    } catch (err) {
        req.log.error({ err }, 'failed to save student profile');
        res.status(500).json({ error: 'Could not save your profile. Please try again.' });
    }
}

// What one user may see about another. Exported for tests.
async function profileAccess(viewer, target, { chatted, tenancy }) {
    if (!viewer || !target) return { details: false, needs: false };
    const own = viewer.id === target.id;
    const admin = viewer.role === 'admin';
    const connected = await chatted() || await tenancy();
    return {
        details: own || admin || connected,
        needs: own || admin || (SHOW_HOUSING_NEEDS && connected),
        own,
    };
}

async function getPublicProfile(req, res) {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid user' });

    try {
        const [target, viewer] = await Promise.all([
            findUserWithProfile(id),
            findUserWithProfile(req.user.id),
        ]);
        if (!target) return res.status(404).json({ error: 'User not found' });

        const access = await profileAccess(viewer, target, {
            chatted: () => haveChatted(viewer.id, target.id),
            tenancy: () => haveTenancy(viewer.id, target.id),
        });

        const [rating, housing] = await Promise.all([
            ratingSummary({ reviewee_id: target.id }),
            listActiveHousingByOwner(target.id),
        ]);

        const isStudent = target.role === 'student';
        res.json({
            ...personDto(target),
            bio: target.bio,
            member_since: target.created_at,
            rating,
            is_me: access.own,
            details_visible: access.details,
            student_profile: isStudent
                ? toStudentProfileDto(target.studentProfile, { details: access.details, needs: access.needs, ageFrom })
                : null,
            profile_complete: isStudent ? missingProfileFields(target, target.studentProfile).length === 0 : null,
            housing_listings: housing.map(toHousingDto),
        });
    } catch (err) {
        req.log.error({ err, userId: id }, 'failed to load public profile');
        res.status(500).json({ error: 'Could not load this profile' });
    }
}

module.exports = { getMyStudentProfile, updateMyStudentProfile, getPublicProfile, profileAccess };
