// Shapes database records into what the frontend pages read.
// Prisma returns related users nested (listing.owner, chat.user1 / chat.user2);
// the pages were written against the old flat SQL field names, so we map here
// in one place instead of in every controller.

// Marketplace item. Like housing, the exact pick-up pin (exact_location) only
// goes back to the seller; everyone else gets `location`, the point 80-200 m off.
// (options is an object so that list.map(toListingDto) can't pass the index as a viewer)
function toListingDto(listing, options) {
    if (!listing) return listing;
    const viewerId = options && typeof options === 'object' ? options.viewerId : undefined;
    const { owner, latitude, longitude, public_latitude, public_longitude, ...rest } = listing;
    const isOwner = viewerId !== undefined && viewerId === listing.owner_id;
    return {
        ...rest,
        price: rest.price === undefined || rest.price === null ? rest.price : Number(rest.price),
        location: public_latitude != null && public_longitude != null
            ? { latitude: public_latitude, longitude: public_longitude, approximate: true }
            : null,
        ...(isOwner ? { exact_location: latitude != null && longitude != null ? { latitude, longitude } : null } : {}),
        owner_name: owner?.fullname ?? null,
        owner_profile_picture: owner?.profile_picture ?? null,
    };
}

// The seller as the item window shows them: name, photo, where they study and
// their age (never the birth date). `ageFrom` turns a birth date into an age.
function toSellerDto(owner, { ageFrom, rating } = {}) {
    if (!owner) return null;
    const profile = owner.studentProfile || null;
    return {
        id: owner.id,
        fullname: owner.fullname,
        profile_picture: owner.profile_picture,
        is_student: owner.role === 'student',
        university: profile?.university || null,
        faculty: profile?.faculty || null,
        age: profile?.birth_date && ageFrom ? ageFrom(profile.birth_date) : null,
        rating: rating || null,
    };
}

// A chat has two members. For the chat list we only want "the other person".
function toChatSummary(chat, myId) {
    const other = chat.user1_id === myId ? chat.user2 : chat.user1;
    return {
        chat_id: chat.id,
        owner_of_post_id: other?.id ?? null,
        owner_of_post_fullname: other?.fullname ?? null,
        owner_of_post_photo: other?.profile_picture ?? null,
        chat_created_at: chat.date,
        last_message: chat.messages?.[0] ?? null,
        last_activity: chat.messages?.[0]?.sent_at ?? chat.date,
    };
}

function numberOrNull(value) {
    return value === null || value === undefined ? null : Number(value);
}

// Housing listing as the pages read it. Prisma's Decimal values become plain
// numbers, the owner only exposes public fields (never email or phone), and
// is_saved tells the page whether to fill the heart.
// `viewerId`: the exact pin (exact_location) is only included for the owner.
// Everyone else gets `location`, the public point that's 80-200 m off.
// (options is an object so that list.map(toHousingDto) can't pass the index as a viewer)
function toHousingDto(listing, options) {
    if (!listing) return listing;
    const viewerId = options && typeof options === 'object' ? options.viewerId : undefined;
    const {
        savedBy, owner, latitude, longitude, public_latitude, public_longitude, location_source, ...rest
    } = listing;
    const isOwner = viewerId !== undefined && viewerId === listing.owner_id;
    return {
        ...rest,
        location: public_latitude != null && public_longitude != null
            ? { latitude: public_latitude, longitude: public_longitude, approximate: true }
            : null,
        ...(isOwner ? {
            exact_location: latitude != null && longitude != null ? { latitude, longitude, source: location_source || null } : null,
        } : {}),
        rent_per_person: Number(listing.rent_per_person),
        deposit: numberOrNull(listing.deposit),
        utilities_estimate: numberOrNull(listing.utilities_estimate),
        photos: (listing.photos || []).map(photo => ({ id: photo.id, url: photo.url, position: photo.position })),
        owner: owner ? {
            id: owner.id,
            fullname: owner.fullname,
            profile_picture: owner.profile_picture,
            verified_landlord: owner.role === 'landlord' && owner.landlord_status === 'approved',
            is_student: owner.role === 'student',
        } : null,
        is_saved: Array.isArray(savedBy) && savedBy.length > 0,
    };
}

function personDto(user) {
    if (!user) return null;
    return {
        id: user.id,
        fullname: user.fullname,
        profile_picture: user.profile_picture,
        role: user.role,
        verified_landlord: user.role === 'landlord' && user.landlord_status === 'approved',
    };
}

function toReviewDto(review) {
    return {
        id: review.id,
        rating: review.rating,
        description: review.description,
        context: review.context || 'marketplace',
        listing_title: review.listing_title || null,
        housing_listing_id: review.housing_listing_id || null,
        created_at: review.created_at,
        updated_at: review.updated_at,
        reviewer: review.reviewer ? personDto(review.reviewer) : undefined,
    };
}

// Student profile in three layers:
//  - basics: anyone logged in (where they study)
//  - details: the student, admins, and people they've talked to or lived with
//  - what they're looking for: the student, admins, and landlords they've contacted (SHOW_HOUSING_NEEDS)
// birth_date itself only goes back to its owner; everyone else sees the age.
// Earlier names of two choices (see OLD_STAY_LENGTHS in lib/profileOptions.js)
const STAY_RENAMED = { open: 'indefinite', other: 'negotiable' };

// Profiles saved before the multiple-choice length had a number of months
function stayFromMonths(months) {
    if (!months) return null;
    if (months === 12) return 'year';
    return months <= 6 ? 'short' : 'long';
}

function toStudentProfileDto(profile, { details = false, needs = false, own = false, ageFrom } = {}) {
    if (!profile) return null;
    const dto = {
        university: profile.university,
        faculty: profile.faculty,
        study_level: profile.study_level,
        student_type: profile.student_type,
    };
    if (details) {
        Object.assign(dto, {
            study_programme: profile.study_programme,
            study_year: profile.study_year,
            home_country: profile.home_country,
            home_city: profile.home_city,
            languages: profile.languages || [],
            age: ageFrom ? ageFrom(profile.birth_date) : null,
            smoker: profile.smoker,
            has_pets: profile.has_pets,
            lifestyle: profile.lifestyle || [],
        });
    }
    if (needs) {
        Object.assign(dto, {
            budget_max: profile.budget_max,
            move_in_date: profile.move_in_date,
            preferred_city: profile.preferred_city,
            stay_length: STAY_RENAMED[profile.stay_length] || profile.stay_length || stayFromMonths(profile.stay_months),
        });
    }
    if (own) dto.birth_date = profile.birth_date;
    return dto;
}

module.exports = { toListingDto, toSellerDto, toChatSummary, toHousingDto, toReviewDto, toStudentProfileDto, personDto };
