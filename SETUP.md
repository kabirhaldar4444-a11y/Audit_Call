# Setup Instructions

## Prerequisites
- Node.js v14+ ([Download](https://nodejs.org/))
- npm (comes with Node.js)
- MongoDB Atlas account or local MongoDB running

## Quick Start

### Step 1: Setup Backend

```bash
cd backend
cp .env.example .env
```

**Edit `backend/.env` with your MongoDB credentials:**
```
PORT=5000
MONGODB_URI=mongodb+srv://kabirhaldar4444_db_user:YOUR_PASSWORD@cluster0.uzfncp6.mongodb.net/?appName=Cluster0
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
```

**Install dependencies:**
```bash
npm install
```

**Run backend:**
```bash
npm run dev
```

✅ Backend should run on `http://localhost:5000`

---

### Step 2: Setup Frontend (New Terminal Window)

```bash
cd frontend
cp .env.example .env
```

**Install dependencies:**
```bash
npm install
```

**Run frontend:**
```bash
npm start
```

✅ Frontend will open at `http://localhost:3000`

---

## 🔐 Default Test Account

To test the application, first register an admin account:

1. Go to `http://localhost:3000`
2. On the login page, you'll need to register first
3. The app will automatically log you in after registration

Or use this test account (if created):
- **Username:** admin
- **Email:** admin@callaudit.com
- **Password:** admin123

---

## Troubleshooting

### npm install fails
```bash
# Clear npm cache
npm cache clean --force

# Try installing again
npm install
```

### Port 3000 or 5000 already in use
```bash
# Change React port
set PORT=3001  (Windows)
export PORT=3001  (Mac/Linux)
npm start

# Change backend port - edit backend/.env
PORT=5001
```

### MongoDB connection error
- Check your MongoDB URI in `.env`
- Ensure MongoDB cluster is active
- Verify whitelist IP in MongoDB Atlas

### Module not found errors
```bash
rm -rf node_modules package-lock.json  (or on Windows: rmdir node_modules /s, del package-lock.json)
npm install
```

---

## Running Both Services

### Option 1: Separate Terminals
Terminal 1:
```bash
cd backend && npm run dev
```

Terminal 2:
```bash
cd frontend && npm start
```

### Option 2: From Root (if using npm workspaces)
```bash
npm run dev
```

---

## API Health Check

Once backend is running, check:
```
http://localhost:5000/api/health
```

Should return:
```json
{ "message": "Server is running" }
```

---

## File Structure Reference

```
Call Audit/
├── frontend/
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   └── utils/         # Utilities
│   ├── package.json
│   └── .env.example
├── backend/
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   ├── middleware/
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── README.md
```

---

## Environment Variables

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
```

### Backend (.env)
```
PORT=5000
MONGODB_URI=<your_mongodb_connection_string>
JWT_SECRET=<your_secret_key>
NODE_ENV=development
```

---

Need help? Check error messages carefully or reinstall dependencies!
