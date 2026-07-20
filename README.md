# ESS Meeting Room Booking System (ESS-MRBS) - Backend

## Project Description

The ESS Meeting Room Booking System (ESS-MRBS) is a web-based application developed for the Ethiopian Statistical Service (ESS). The system enables administrators to schedule meeting rooms and manage users, while registered users can view available schedules and book meeting rooms.

---

## Technologies Used

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- bcryptjs
- Cookie Parser
- CORS
- Dotenv

---

## Tech Stack

### Backend
- Node.js
- Express.js

### Database
- MongoDB

### Authentication
- JWT (JSON Web Token)

### API Testing
- Postman

### Development Tools
| Tool | Purpose |
|------|---------|
| Visual Studio Code | Code editor |
| Postman | API testing |
| Git | Version control |
| GitHub | Remote repository |
---
## Project Structure

backend/
│
├── src/
│ ├── config/
│ ├── controllers/
│ ├── middleware/
│ ├── models/
│ ├── routes/
│ ├── utils/
│ └── server.js
│
├── package.json
├── package-lock.json
---

## Installation

Clone the repository

git clone https://github.com/tsegayetadesse558-lgtm/ESS-MRBS-Backend.git

Go to the backend folder

cd backend

Install dependencies

npm install

Create a .env file

PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/ess_mrbs
JWT_SECRET=your_secret_key

Start the server

npm run dev

## API Endpoints

Authentication

- POST /api/auth/login
- POST /api/auth/register

Users

- GET /api/users
- POST /api/users

Rooms

- GET /api/rooms
- POST /api/rooms

Bookings

- GET /api/bookings
- POST /api/bookings

Schedules

- GET /api/schedules
- POST /api/schedules

---

## Developers
Haramaya University students: 
- Fediwak belay, 
- Tsagaye Tadase, 
- Lalise Jira, 
- Babso Batu,
  
Developed for Ethiopian Statistical Service (ESS)

2026
