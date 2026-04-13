# Data Persistence Fix Documentation

## Problem Identified
Yesterday's uploaded Excel/CSV data was not showing today after restarting the application because:
1. **MongoDB Connection Failure**: The database IP whitelist was not configured
2. **No Fallback Storage**: The application had no way to save data if MongoDB was unavailable
3. **No Date Filtering**: Users couldn't access data by date/time range effectively

## Solution Implemented

### 1. **Offline Mode with Local File Storage**
The backend now automatically switches to offline mode with local file-based storage when MongoDB is unavailable:

- **File Location**: `backend/data/calls.json`
- **Automatic Fallback**: When MongoDB connection fails, data is automatically saved to local JSON file
- **Persistent**: Data survives application restarts
- **Seamless**: Users don't need to do anything - it works transparently

### 2. **Data Persistence**
- New module: `backend/utils/dataPersistence.js` handles both MongoDB and file storage
- Every upload attempt saves to BOTH:
  - MongoDB (if connected)
  - Local JSON file (as backup/offline storage)
- On retrieval, the application tries MongoDB first, then falls back to local file

### 3. **Date & Time Filtering**
#### New API Endpoints:
- `GET /api/calls?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD` - Filter calls by date range
- `GET /api/calls/by-date?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` - Dedicated date range endpoint

#### Frontend Features:
- **Date Range Picker**: Select start and end dates
- **Quick Filters**: 
  - "Last 30 Days" button for quick access to recent data
  - "Clear Dates" button to remove date filters
- **Status Indicator**: Shows current database mode (Online/Offline)

### 4. **Data Indexing**
Added database indexes on the Call model:
- `date` - Index for fast date queries
- `agentName` - Index for agent searches
- `process` - Index for process/department searches
- `status` - Index for status filtering
- Compound index on `(date, isActive, status)` for optimized queries

## Database Modes

### Online Mode ✅
```
Database Mode: ONLINE (MongoDB)
- Data saved to MongoDB Atlas
- Persistent cloud storage
- All features available
- Faster queries
```

### Offline Mode ⚠️
```
Database Mode: OFFLINE (using local file storage)
- Data saved to backend/data/calls.json
- Local storage only
- All features available
- Application still works normally
- Data preserved across restarts
```

## How to Fix MongoDB Connection (If Desired)

If you want to use MongoDB instead of local storage:

1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Log in to your account
3. Navigate to: **Security → Network Access**
4. Click **"+ ADD IP ADDRESS"**
5. Select **"ALLOW ACCESS FROM ANYWHERE"** (for development)
   - OR add your specific IP address
6. Click **Confirm**
7. Restart the application

## API Response Indicators

All API responses now include `databaseMode` field:

```json
{
  "message": "Calls retrieved successfully",
  "data": [...],
  "pagination": {...},
  "databaseMode": "offline"  // or "online"
}
```

## Data Access Features

### 1. **By Date Range**
- Use the date picker in the Calls page
- Select from date and to date
- View calls within that range only

### 2. **By Agent Name**
- Search/filter calls by agent name
- Works in both online and offline modes

### 3. **By Process**
- Filter calls by process/department
- Supports partial matches

### 4. **By Status**
- Filter pending vs audited calls
- Combine with date filters for better results

### 5. **Combined Filters**
- Combine multiple filters simultaneously
- Date + Agent + Process + Status all at once
- Real-time search with 500ms debounce

## Dashboard Statistics

Updated dashboard shows:
- Total Calls
- Pending Calls
- Audited Calls
- **NEW**: Calls in Last 7 Days
- Database Mode indicator

## Testing the Fix

### Test 1: Upload and Restart
1. Upload Excel/CSV file with call data
2. Restart the application
3. **Expected**: Data should still be visible (proving persistence)

### Test 2: Date Filtering
1. Go to "Call Browse" page
2. Use date picker to select date range
3. Click "Last 30 Days" shortcut
4. **Expected**: Only calls within selected date range appear

### Test 3: Offline Mode
1. Verify backend shows "Database Mode: OFFLINE" on startup
2. Upload new data
3. View data in frontend
4. **Expected**: All features work normally

## File Structure

```
backend/
├── data/
│   └── calls.json                 # Local file storage (created on first upload)
├── utils/
│   └── dataPersistence.js         # NEW: Handles offline/online storage
├── controllers/
│   └── callController.js          # UPDATED: Uses dataPersistence
├── models/
│   └── Call.js                    # UPDATED: Added indexes for date queries
├── routes/
│   ├── callRoutes.js              # UPDATED: Added date filtering
│   └── syncRoutes.js              # NEW: Sync endpoint for future use
└── config/
    ├── database.js                # UPDATED: Graceful fallback to offline mode
    └── seed.js                    # UPDATED: Skips init in offline mode

frontend/src/pages/
└── Calls.js                       # UPDATED: Date range filtering UI
```

## Troubleshooting

### Issue: Data not appearing after upload
**Solution**: Check database mode in header - if offline, ensure local file has correct permissions

### Issue: Slow date filtering queries
**Solution**: Database indexes are now in place. The first query creates indexes, subsequent queries are fast

### Issue: Cannot upload files
**Solution**: 
- Check file format (Excel, CSV)
- Ensure file is not too large
- Backend should show upload progress in logs

## Future Enhancements

1. **Automatic MongoDB Sync**: When connection restored, auto-sync local data
2. **Data Export**: Export filtered results to CSV/Excel
3. **Bulk Date Operations**: Archive/delete by date range
4. **Advanced Analytics**: Calls by date/agent/process charts
5. **Real-time Sync**: WebSocket-based data updates

## Support Information

- Backend logs show: `Database Mode: ONLINE` or `Database Mode: OFFLINE`
- All data operations log to console
- Upload success/failure details shown in UI
- Date queries use indexed fields for optimal performance

---

**Last Updated**: April 11, 2026
**Version**: 2.0 (with offline persistence)
