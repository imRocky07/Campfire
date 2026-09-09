# 🔥 CAMPFIRE 2.0

## Dual Hub Anime & Gaming Community Platform

CAMPFIRE 2.0 is a full-stack community platform that combines **anime discovery, gaming exploration, social interaction, and personal media tracking** into a single web application. The platform allows users to switch seamlessly between Anime Hub and Gaming Hub while managing watchlists, game libraries, discussions, friends, and personalized profiles.

---

## Features

* 🎌 **Dual Hub System** — Anime Hub & Gaming Hub
* 🎴 **Hourly Tinder-Style Swipe Deck** for discovering new content
* ⭐ **Watchlist & Game Library** with 1–5 star ratings
* 👥 **Mutual Friends Network** with live activity indicators
* 💬 **Threaded Community Discussion Boards**
* 🖼️ **Profile Customization** with avatar and image cropper
* 📊 **Personal Analytics Dashboard**
* 🔐 **JWT Authentication** with secure password hashing
* 📚 **FAQ & Help Support** module
* ⚙️ **Admin Panel** for moderation and content management

---

## Tech Stack

| Layer          | Technology                      |
| -------------- | ------------------------------- |
| Frontend       | HTML5, CSS3, Vanilla JavaScript |
| Backend        | Node.js, Express.js             |
| Database       | MongoDB + Mongoose              |
| Authentication | JWT, bcrypt                     |
| APIs           | RAWG API, Anime API (Jikan)     |

---

## Project Structure

```text
campfire-2.0/
│
├── client/
│   ├── css/
│   ├── js/
│   ├── images/
│   └── index.html
│
├── server/
│   ├── routes/
│   ├── models/
│   ├── controllers/
│   ├── middleware/
│   └── app.js
│
├── database/
├── docs/
├── .env
├── package.json
└── README.md
```

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/campfire-2.0.git
cd campfire-2.0
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Create a `.env` file:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection
JWT_SECRET=your_secret_key
RAWG_API_KEY=your_rawg_key
```

### 4. Start the server

```bash
npm start
```

Open your browser:

```text
http://localhost:5000
```

---

## Core Modules

* **Authentication** – Login & Registration
* **Anime Hub** – Browse 300+ anime titles
* **Gaming Hub** – Explore 300+ games
* **Swipe Deck** – Hourly personalized recommendations
* **Watchlist & Library** – Track progress and ratings
* **Community** – Forums, comments & discussions
* **Friends** – Requests and live presence
* **Profile** – Avatar, banner & preferences
* **Analytics** – User statistics dashboard

---

## Future Improvements

* Real-time chat using Socket.IO
* AI-based recommendation engine
* Mobile PWA support
* Achievement & badge system
* Voice discussion rooms

---

## Author

**Pranav Bhandgar**

Bachelor of Technology – Computer Science & Engineering

Parul Institute of Technology, Parul University

---

## License

This project is developed for educational and academic purposes as a major project. Feel free to use it for learning and research.
