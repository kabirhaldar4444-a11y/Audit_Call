# ⚠️ QUICK FIX FOR LOGIN ERROR

## The Problem
You're getting "Error logging in" because either:
1. ❌ Backend server is NOT running
2. ❌ MongoDB connection is failing
3. ❌ Environment variables are not set correctly

---

## ✅ FIX IT NOW

### Step 1: Configure Backend (.env file)

Open `backend/.env` and update the MongoDB password:

```
PORT=5000
MONGODB_URI=mongodb+srv://kabirhaldar4444_db_user:YOUR_ACTUAL_PASSWORD@cluster0.uzfncp6.mongodb.net/?appName=Cluster0
JWT_SECRET=call_audit_secret_key_2026
NODE_ENV=development
```

⚠️ **Important:** Replace `YOUR_ACTUAL_PASSWORD` with your actual MongoDB password

---

### Step 2: Start Backend Server

Open **Terminal 1** and run:

```bash
cd backend
npm run dev
```

**You should see:**
```
✅ Server running on port 5000
📝 Environment: development
🔗 API: http://localhost:5000/api
✅ MongoDB Connected: cluster0.uzfncp6.mongodb.net
```

If you see MongoDB errors:
- Check your MongoDB password in `.env`
- Make sure MongoDB cluster is active at MongoDB Atlas
- Check if your IP is whitelisted in MongoDB Atlas security

---

### Step 3: Start Frontend

Open **Terminal 2** and run:

```bash
cd frontend
npm start
```

**Frontend will open at:** `http://localhost:3000`

---

## 🔐 Now What?

### First Time User
1. Click **"Don't have an account? Register"**
2. Fill in: Username, Email, Password
3. Click **Register**
4. You'll be automatically logged in

### Existing User
1. Enter your username/email and password
2. Click **Login**

---

## 🧪 Test Backend Connection

Check if backend is working:
```
http://localhost:5000/api/health
```

Should return:
```json
{ "message": "Server is running" }
```

---

## 📋 Checklist Before Starting

- [ ] Updated MongoDB password in `backend/.env`
- [ ] Backend terminal running and shows "✅ Server running..."
- [ ] Frontend terminal running and shows "Compiled successfully"
- [ ] Frontend shows "✅ Server connected" on login page

---

## 🆘 Still Getting Errors?

1. **Check Terminal Output** - Look at what's printed in the terminal
2. **MongoDB Error?** - Verify password and whitelist IP
3. **Network Error?** - Make sure backend is running before frontend
4. **Port in use?** - Change PORT in `.env` or kill the process using the port

---

## 💡 Pro Tips

- Keep both terminals open while developing
- Backend logs will show all login attempts
- Frontend browser console (F12) shows API errors
- Check browser Network tab (F12) to see API calls
