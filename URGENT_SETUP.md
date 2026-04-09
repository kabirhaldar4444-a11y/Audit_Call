# 🔴 CRITICAL: Backend Setup Issue

## ⚠️ THE PROBLEM

Your `backend/.env` file still has the placeholder password:

```
MONGODB_URI=mongodb+srv://kabirhaldar4444_db_user:<db_password>@...
                                                   ^^^^^^^^^^^^
                                                   NOT REPLACED!
```

This means:
- ❌ Cannot connect to MongoDB
- ❌ Database operations fail
- ❌ Login/Registration fails

---

## ✅ FIX IT IMMEDIATELY

### Step 1: Get Your MongoDB Password

1. Go to: https://cloud.mongodb.com/
2. Login to your account
3. Go to **Database Access** → **Users**
4. Find user: `kabirhaldar4444_db_user`
5. Click **Edit** → **Show Password** (or generate new one)
6. Copy the password

### Step 2: Update backend/.env

Open `f:\ReactJs\Call Audit\backend\.env` and replace:

```
BEFORE:
MONGODB_URI=mongodb+srv://kabirhaldar4444_db_user:<db_password>@cluster0.uzfncp6.mongodb.net/?appName=Cluster0

AFTER:
MONGODB_URI=mongodb+srv://kabirhaldar4444_db_user:YOUR_PASSWORD_HERE@cluster0.uzfncp6.mongodb.net/?appName=Cluster0
```

**Example (DO NOT use this):**
```
MONGODB_URI=mongodb+srv://kabirhaldar4444_db_user:MySecurePassword123@cluster0.uzfncp6.mongodb.net/?appName=Cluster0
```

### Step 3: Restart Backend

Kill the backend server (Ctrl+C) and run again:

```bash
cd backend
npm run dev
```

You should see:
```
✅ Server running on port 5000
✅ MongoDB Connected: cluster0.uzfncp6.mongodb.net
```

---

## 🧪 Test It

### Option 1: Create Test User (Automatic)

```
http://localhost:5000/api/debug/create-test-user
```

This will automatically create a test account:
- **Username:** testadmin
- **Password:** testadmin123

Then use these to login in the frontend.

### Option 2: Register in Frontend

1. Go to http://localhost:3000
2. Click **"Don't have an account? Register"**
3. Fill in your details
4. Register
5. Login with same credentials

---

## 📋 Troubleshooting

### Still "Error logging in"?

**Check Backend Terminal** for these messages:

✅ Good:
```
✅ Server running on port 5000
✅ MongoDB Connected: cluster0.uzfncp6.mongodb.net
✅ User registered: username
✅ Login successful: username
```

❌ Bad:
```
❌ MongoDB Connection Error: connect ENOTFOUND cluster0
Error: MONGODB_URI is not set
```

### MongoDB Error?

1. ✅ Correct password in `.env`?
2. ✅ IP whitelisted in MongoDB Atlas?
3. ✅ Cluster is running (active)?
4. ✅ Connection string copied correctly?

### Can't Find Password?

1. Go to MongoDB Atlas
2. Click **Cluster** → **Connect**
3. Choose "Connect your application"
4. Copy connection string
5. Replace `<password>` with your actual password

---

## 🚀 Quick Start After Fix

**Terminal 1:**
```bash
cd backend && npm run dev
```

**Terminal 2:**
```bash
cd frontend && npm start
```

**Then either:**
- Visit: http://localhost:5000/api/debug/create-test-user (creates test account)
- Or register in the frontend: http://localhost:3000

---

## 🆘 Still Stuck?

1. **Check backend terminal** - copy full error message
2. **Verify MongoDB password** - make sure no extra spaces
3. **Check IP whitelist** - add your IP in MongoDB Atlas
4. **Restart everything** - kill both terminals and restart

Your `.env` should look like:
```
PORT=5000
MONGODB_URI=mongodb+srv://kabirhaldar4444_db_user:YOURPASSWORD@cluster0.uzfncp6.mongodb.net/?appName=Cluster0
JWT_SECRET=call_audit_secret_key_2026
NODE_ENV=development
```
