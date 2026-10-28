-- Student Trade — PostgreSQL schema
-- Fresh install: run this against an empty database.
-- Matches the queries actually used in server/models/*.js as of Sept 2026.

CREATE TABLE IF NOT EXISTS "User" (
    id               SERIAL PRIMARY KEY,
    fullname         VARCHAR(255) NOT NULL,
    email            VARCHAR(255) NOT NULL UNIQUE,
    hashedpassword   VARCHAR(255) NOT NULL,
    bio              TEXT,
    profile_picture  VARCHAR(500),
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    email_verified           BOOLEAN NOT NULL DEFAULT FALSE,
    verification_token_hash  VARCHAR(64) UNIQUE,
    verification_expires_at  TIMESTAMP,
    verification_sent_at     TIMESTAMP,
    role                     VARCHAR(20) NOT NULL DEFAULT 'student',
    landlord_status          VARCHAR(20),
    phone                    VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS "ListingItem" (
    id           SERIAL PRIMARY KEY,
    owner_id     INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    title        VARCHAR(255) NOT NULL,
    description  TEXT,
    price        NUMERIC(10, 2) NOT NULL,
    photo        VARCHAR(500),
    date         TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Chat" (
    id        SERIAL PRIMARY KEY,
    user1_id  INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    user2_id  INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    date      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Message" (
    id           SERIAL PRIMARY KEY,
    chat_id      INTEGER NOT NULL REFERENCES "Chat"(id) ON DELETE CASCADE,
    sender_id    INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    receiver_id  INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    content      TEXT NOT NULL,
    sent_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Report" (
    id           SERIAL PRIMARY KEY,
    reporter_id  INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    reported_id  INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    item_id      INTEGER REFERENCES "ListingItem"(id) ON DELETE SET NULL,
    description  TEXT,
    date         TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Review" (
    id           SERIAL PRIMARY KEY,
    reviewer_id  INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    reviewee_id  INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    description  TEXT,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listingitem_owner ON "ListingItem"(owner_id);
CREATE INDEX IF NOT EXISTS idx_chat_user1 ON "Chat"(user1_id);
CREATE INDEX IF NOT EXISTS idx_chat_user2 ON "Chat"(user2_id);
CREATE INDEX IF NOT EXISTS idx_message_chat ON "Message"(chat_id);
CREATE INDEX IF NOT EXISTS idx_review_reviewee ON "Review"(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_report_reported ON "Report"(reported_id);

CREATE TABLE IF NOT EXISTS "InterestLead" (
    id          SERIAL PRIMARY KEY,
    type        VARCHAR(20) NOT NULL,
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    phone       VARCHAR(50),
    city        VARCHAR(100),
    message     TEXT,
    language    VARCHAR(5),
    contacted   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "HousingListing" (
    id                            SERIAL PRIMARY KEY,
    owner_id                      INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    listing_type                  VARCHAR(20) NOT NULL,
    property_type                 VARCHAR(30) NOT NULL,
    title                         VARCHAR(120) NOT NULL,
    description                   TEXT,
    rent_per_person               DECIMAL(10, 2) NOT NULL,
    deposit                       DECIMAL(10, 2),
    utilities_included            BOOLEAN NOT NULL DEFAULT FALSE,
    utilities_estimate            DECIMAL(10, 2),
    spots_total                   SMALLINT NOT NULL,
    spots_open                    SMALLINT NOT NULL,
    total_rooms                   SMALLINT,
    bathrooms                     SMALLINT,
    area_m2                       INTEGER,
    furnishing                    VARCHAR(20) NOT NULL,
    street                        VARCHAR(200) NOT NULL,
    city                          VARCHAR(100) NOT NULL,
    postal_code                   VARCHAR(10),
    neighbourhood                 VARCHAR(100),
    available_from                DATE NOT NULL,
    available_until               DATE,
    min_stay_months               SMALLINT,
    address_registration_allowed  BOOLEAN NOT NULL DEFAULT FALSE,
    subsidy_eligible              BOOLEAN NOT NULL DEFAULT FALSE,
    smoking_allowed               BOOLEAN NOT NULL DEFAULT FALSE,
    pets_allowed                  BOOLEAN NOT NULL DEFAULT FALSE,
    amenities                     TEXT[] NOT NULL DEFAULT '{}',
    languages                     TEXT[] NOT NULL DEFAULT '{}',
    video_tour_url                VARCHAR(500),
    status                        VARCHAR(20) NOT NULL DEFAULT 'pending_review',
    reviewed_at                   TIMESTAMP,
    created_at                    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                    TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "HousingListing_status_city_idx" ON "HousingListing"(status, city);
CREATE INDEX IF NOT EXISTS "HousingListing_owner_id_idx" ON "HousingListing"(owner_id);

CREATE TABLE IF NOT EXISTS "HousingPhoto" (
    id          SERIAL PRIMARY KEY,
    listing_id  INTEGER NOT NULL REFERENCES "HousingListing"(id) ON DELETE CASCADE,
    url         VARCHAR(500) NOT NULL,
    position    SMALLINT NOT NULL DEFAULT 0,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "HousingPhoto_listing_id_idx" ON "HousingPhoto"(listing_id);

CREATE TABLE IF NOT EXISTS "SavedListing" (
    user_id     INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    listing_id  INTEGER NOT NULL REFERENCES "HousingListing"(id) ON DELETE CASCADE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, listing_id)
);

-- ---------- Student profiles ----------
CREATE TABLE IF NOT EXISTS "StudentProfile" (
    user_id          INTEGER PRIMARY KEY REFERENCES "User"(id) ON DELETE CASCADE,
    university       VARCHAR(150),
    faculty          VARCHAR(150),
    study_programme  VARCHAR(150),
    study_level      VARCHAR(20),
    study_year       SMALLINT,
    student_type     VARCHAR(20),
    home_country     VARCHAR(2),
    home_city        VARCHAR(100),
    languages        TEXT[] NOT NULL DEFAULT '{}',
    birth_date       DATE,
    smoker           BOOLEAN,
    has_pets         BOOLEAN,
    lifestyle        TEXT[] NOT NULL DEFAULT '{}',
    budget_max       INTEGER,
    move_in_date     DATE,
    preferred_city   VARCHAR(100),
    stay_months      SMALLINT,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------- Tenancies ----------
CREATE TABLE IF NOT EXISTS "Tenancy" (
    id             SERIAL PRIMARY KEY,
    listing_id     INTEGER REFERENCES "HousingListing"(id) ON DELETE SET NULL,
    listing_title  VARCHAR(120) NOT NULL,
    landlord_id    INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    student_id     INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    status         VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    confirmed_at   TIMESTAMP,
    ended_at       TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Tenancy_listing_id_student_id_key" ON "Tenancy"(listing_id, student_id);
CREATE INDEX IF NOT EXISTS "Tenancy_student_id_idx" ON "Tenancy"(student_id);
CREATE INDEX IF NOT EXISTS "Tenancy_landlord_id_idx" ON "Tenancy"(landlord_id);

-- ---------- Review: housing context (added after the tables it points to exist) ----------
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS context VARCHAR(20) NOT NULL DEFAULT 'marketplace';
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS tenancy_id INTEGER REFERENCES "Tenancy"(id) ON DELETE SET NULL;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS housing_listing_id INTEGER REFERENCES "HousingListing"(id) ON DELETE SET NULL;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS listing_title VARCHAR(120);
CREATE UNIQUE INDEX IF NOT EXISTS "Review_tenancy_id_reviewer_id_key" ON "Review"(tenancy_id, reviewer_id);
CREATE INDEX IF NOT EXISTS "Review_reviewer_id_reviewee_id_idx" ON "Review"(reviewer_id, reviewee_id);
CREATE INDEX IF NOT EXISTS "Review_housing_listing_id_idx" ON "Review"(housing_listing_id);
