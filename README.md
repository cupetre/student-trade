# Student Trade

Student Trade is a full-stack student marketplace built for students who need a safer and easier way to buy, sell, and trade everyday items with other students.

The project focuses on a common student problem: moving to a new dorm, apartment, city, university, or country usually means needing furniture, electronics, study materials, kitchen items, and other essentials quickly. Most students rely on public marketplaces or social media groups, where listings can be messy, overpriced, unreliable, or unsafe.

Student Trade creates a more focused environment: students can post items, browse available listings, contact sellers, manage their profiles, leave reviews, and report suspicious content.

## What The Project Has

- User registration and login
- Password hashing with Bcrypt
- JWT-based authentication
- Profile page with editable personal information
- Profile picture upload
- Listing creation with title, description, price, date, and image
- Marketplace feed showing listings from other users
- Personal listing management for editing and deleting posts
- Direct chat creation between buyer and seller
- Message history for existing chats
- Backend Socket.IO support for live message events
- Review system with rating and description
- Report system for suspicious or inappropriate listings

## Main User Workflow

The app is built around a simple student-to-student exchange flow:

1. A student creates an account and logs in.
2. The student enters the marketplace feed.
3. They can browse items posted by other users.
4. They can post their own item with an image, price, and description.
5. If interested in an item, they open the listing and start a chat with the seller.
6. After communication or a trade, users can leave reviews.
7. If something looks suspicious, users can report the listing.
8. Each user can manage their own profile, reviews, and listings.

This workflow keeps the platform centered on trust, direct communication, and student needs.

## How It Is Built

Student Trade is split into two main parts:

```text
client/   React frontend
server/   Express backend, database queries, auth, uploads, and messaging
```

The frontend handles the user interface: login, registration, marketplace browsing, listing modals, profile editing, chat screens, review forms, and report forms.

The backend handles the platform logic: user accounts, authentication, listing storage, profile updates, chat creation, message saving, reviews, reports, and image upload handling.

PostgreSQL stores the main application data, including users, listings, chats, messages, reviews, and reports. AWS S3 is used for uploaded listing and profile images.

## Dependencies And Their Role

### Frontend

- **React**: builds the user interface and manages page state.
- **Vite**: runs and builds the frontend quickly during development.
- **React Router**: handles navigation between the marketplace, login, register, profile, and chat pages.
- **Socket.IO Client**: supports real-time communication features from the browser side.

### Backend

- **Express**: creates the REST API used by the frontend.
- **PostgreSQL (`pg`)**: connects the backend to the database.
- **Bcrypt**: hashes user passwords before storing them.
- **JSON Web Token (`jsonwebtoken`)**: protects private routes after login.
- **Multer**: processes uploaded files from forms.
- **Multer S3**: sends uploaded images to AWS S3.
- **AWS SDK S3 Client**: connects the backend to the S3 bucket.
- **Socket.IO**: supports live message delivery between connected users.
- **CORS**: allows the frontend and backend to communicate during development/deployment.
- **Dotenv**: loads local environment configuration for the server.

## Core Backend Areas

The backend is organized by responsibility:

- `routes/` defines API endpoints.
- `controllers/` handles request logic.
- `models/` contains the SQL queries.
- `configs/` contains authentication, upload, and S3 configuration.
- `index.js` starts the Express server and Socket.IO server.

This keeps the code separated into routes, business logic, database access, and configuration.

## Core Frontend Pages

- `App.jsx`: main marketplace feed, listing creation, listing details, messaging entry, and reports.
- `LoginPage.jsx`: user login.
- `RegisterPage.jsx`: account creation.
- `ProfilePage.jsx`: profile editing, personal listings, reviews, listing edit/delete.
- `ChatPage.jsx`: chat history, message view, message sending, and review submission.

## Trust And Safety Features

Student Trade is designed around trust between students:

- accounts are authenticated
- passwords are hashed
- private routes require valid tokens
- users control only their own profiles and listings
- reports allow the community to flag bad content
- reviews help build reputation after interactions
- messaging keeps negotiation inside the platform

The business direction adds stronger student verification and moderation, especially for the future housing module.

## Business Direction

The current version focuses on student item exchange. The larger business plan expands the project into a student mobility platform with two connected modules:

- **Student Essentials Marketplace**: furniture, electronics, household items, books, and relocation goods.
- **Verified Housing Module**: a future accommodation system with verified listings, landlord checks, structured listing requirements, and safer communication.

The goal is to support students at the moment they need help most: when relocating, settling into a new place, and trying to save money.

## Project Documents

- `Student Trade.pdf`: original concept, requirements, feasibility study, and database design.
- `Student_Trade_Report .pdf`: implementation report covering the developed features.
- `BusinessPlanStudentTrade.pdf`: business plan, market positioning, growth model, and future direction.

## Author

Created by Hristijan Chupetreski for the Systems III project at UP FAMNIT, Koper, Slovenia.
