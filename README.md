# Student Trade

Student Trade is a student-focused marketplace for buying, selling, and trading useful items inside a trusted student community.

The idea comes from a real student problem: moving to a new city, dorm, apartment, university, or country is expensive and stressful. Students often need furniture, electronics, books, kitchen items, and other essentials quickly, but the usual options are scattered social media groups and public marketplaces full of scams, noise, and unreliable listings.

Student Trade aims to make that simpler: one place where students can post items, contact each other, build trust through reviews, and report suspicious activity.

## What It Does

- Register and log in with a user account
- Edit profile details and profile picture
- Post item listings with title, description, price, and image
- Browse listings from other students
- Edit or delete your own listings
- Start chats with sellers
- Send and receive messages
- Leave reviews after interactions
- Report suspicious or inappropriate listings

## Vision

The current app focuses on the student essentials marketplace. The bigger business plan expands Student Trade into a student mobility platform with:

- a peer-to-peer marketplace for student essentials
- verified student accounts
- trusted profiles, reviews, and reports
- in-app communication
- a future verified housing module for student accommodation

The long-term goal is to support students during relocation by combining trust, affordability, and community in one platform.

## Tech Stack

**Frontend:** React, Vite, React Router, Socket.IO Client

**Backend:** Node.js, Express, PostgreSQL, JWT, Bcrypt, Socket.IO, Multer, AWS S3

## Project Structure

```text
StudentTrade/
|-- client/     # React frontend
|-- server/     # Express API and Socket.IO backend
|-- BusinessPlanStudentTrade.pdf
|-- Student Trade.pdf
|-- Student_Trade_Report .pdf
`-- README.md
```

## Setup

Install backend dependencies:

```bash
cd server
npm install
```

Install frontend dependencies:

```bash
cd ../client
npm install
```

Create `server/.env`:

```env
DB_HOST=your_database_host
DB_PORT=5432
DB_USER=your_database_user
DB_PASS=your_database_password
DB_NAME=your_database_name
JWT_SECRET=your_jwt_secret

AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
AWS_BUCKET_NAME=your_bucket_name
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:5151
```

Run the backend:

```bash
cd server
npm run dev
```

Run the frontend:

```bash
cd client
npm run dev
```

Backend: `http://localhost:5151`

Frontend: `http://localhost:3131`

## Database

The app expects a PostgreSQL database with these main tables:

- `"User"`
- `"ListingItem"`
- `"Chat"`
- `"Message"`
- `"Review"`
- `"Report"`

The schema is currently handled manually through the database. A future improvement would be adding SQL migrations so the project can be set up faster by new contributors.

## Main API Routes

**Users**

- `POST /api/users/register`
- `POST /api/users/login`
- `GET /api/users/fetch_profile`
- `PUT /api/users/edit_profile`

**Listings**

- `POST /api/listings/upload_listing`
- `GET /api/listings/show_listings`
- `GET /api/listings/fetch_my_listings`
- `PUT /api/listings/edit_listing`
- `DELETE /api/listings/delete_listing/:listingId`

**Messages**

- `POST /api/messages/create_chat`
- `GET /api/messages/get_history`
- `POST /api/messages/send_messages`
- `GET /api/messages/receive_messages/:chat_id`

**Reviews and Reports**

- `POST /api/rr/submit_review`
- `GET /api/rr/get_reviews`
- `POST /api/rr/submit_report`

## Project Documents

- `Student Trade.pdf`: original project idea, requirements, feasibility study, and database design
- `Student_Trade_Report .pdf`: implementation report
- `BusinessPlanStudentTrade.pdf`: business plan and growth direction

## Author

Created by Hristijan Chupetreski for the Systems III project at UP FAMNIT, Koper, Slovenia.
