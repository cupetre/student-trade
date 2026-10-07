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
    verification_sent_at     TIMESTAMP
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
