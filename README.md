# Call Audit Web Application

A comprehensive full-stack web application for managing, reviewing, and auditing call recordings.

## 📋 Project Structure

```
├── frontend/          # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── utils/          # Utility functions
│   │   ├── hooks/          # Custom React hooks
│   │   └── App.js          # Main app component
│   ├── public/             # Static files
│   └── package.json
│
├── backend/           # Node.js/Express backend
│   ├── routes/             # API routes
│   ├── controllers/        # Route controllers
│   ├── models/             # MongoDB models
│   ├── middleware/         # Custom middleware
│   ├── config/             # Configuration files
│   ├── server.js           # Entry point
│   └── package.json
│
└── README.md
```

## 🚀 Features

### Authentication
- Admin-only login system
- JWT token-based authentication
- Secure password hashing

### Dashboard
- Summary statistics (Total, Pending, Audited calls)
- Quick navigation
- Real-time data updates

### Call Management
- View all uploaded calls
- Call details (ID, Agent, Customer, Date)
- Audio playback with controls
- Status tracking (Pending/Audited)

### Audio Player
- Play/Pause controls
- Skip forward/backward (+/- 10 seconds)
- Progress bar with time display
- Popup modal interface

### Audit System
- Customizable audit parameters
- Score evaluation (1-5 scale)
- Remarks/notes section
- Overall score calculation
- Audit history

### UI/UX
- Modern gradient design
- Responsive layout
- Clean component-based architecture
- Tailwind CSS styling

## 🛠 Tech Stack

### Frontend
- React 18
- React Router v6
- Axios for API calls
- Tailwind CSS for styling
- React Icons

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose ODM
- JWT Authentication
- Bcryptjs for password hashing

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- MongoDB Atlas account or local MongoDB

### Steps

1. **Clone the repository**
   ```bash
   cd "f:\ReactJs\Call Audit"
   ```

2. **Backend Setup**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your MongoDB credentials
   npm install
   npm run dev
   ```

3. **Frontend Setup** (in a new terminal)
   ```bash
   cd frontend
   cp .env.example .env
   npm install
   npm start
   ```

## 🔧 Configuration

### Backend (.env)
```
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?appName=Cluster0
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new admin
- `POST /api/auth/login` - Admin login

### Calls
- `GET /api/calls` - Get all calls
- `GET /api/calls/:id` - Get call by ID
- `POST /api/calls` - Create new call
- `GET /api/calls/stats` - Get dashboard statistics

### Audits
- `POST /api/audits/submit` - Submit audit
- `GET /api/audits` - Get all audits
- `GET /api/audits/call/:callId` - Get audit by call ID

## 🎨 UI Components

### Sidebar
- Navigation menu
- Logout button
- Responsive toggle

### Header
- User profile display
- Logout button
- App title

### AudioPlayer
- Modal popup interface
- Playback controls
- Progress tracking

### Dashboard
- Statistics cards
- Quick action buttons
- Recent activity

## 🔐 Security Features
- JWT token-based authentication
- Password hashing with bcryptjs
- Admin-only access control
- Protected API routes

## 📝 Development

### Frontend Development
- Component-based architecture
- CSS modules for styling
- Custom hooks for logic reuse
- Axios interceptors for API calls

### Backend Development
- MVC architecture
- Middleware-based request handling
- RESTful API design
- Database validation

## 🚢 Deployment

### Frontend
- Build: `npm run build`
- Deploy to Vercel, Netlify, or AWS

### Backend
- Deploy to Heroku, Railway, or AWS
- Set environment variables in production
- Use MongoDB Atlas for database

## 📞 Support

For issues or questions, please refer to the documentation or create an issue in the repository.

## 📄 License

ISC
