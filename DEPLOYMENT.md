# Deployment Guide

This guide explains how to build and deploy the React frontend to be served by the Express backend.

## Prerequisites

- Node.js installed
- npm or yarn installed

## Steps to Deploy

### 1. Build the React Application

Navigate to the frontend directory and build the React app:

```bash
cd frontend
npm install
npm run build
```

This will create a `build` folder in the `frontend` directory with all the optimized production files.

### 2. Start the Backend Server

The backend is already configured to serve the React build folder. Simply start the backend:

```bash
cd backend
npm install
npm start
```

The server will:
- Serve the React app from `frontend/build` folder
- Handle all API routes at `/api/*`
- Serve the React app for all other routes (for React Router)

### 3. Access the Application

Once the server is running, access the application at:
- **http://localhost:3060** (or your configured PORT)

The React app will be served from the root URL, and all API calls will be made to `/api/*` endpoints.

## Development vs Production

### Development Mode

For development, you can run both servers separately:
- Frontend: `cd frontend && npm start` (runs on port 3000)
- Backend: `cd backend && npm start` (runs on port 3060)

The frontend will proxy API calls to the backend.

### Production Mode

For production:
1. Build the React app: `cd frontend && npm run build`
2. Start only the backend: `cd backend && npm start`
3. The backend serves both the API and the React app

## Environment Variables

### Backend (.env)

Create a `.env` file in the `backend` directory:

```
PORT=3060
SERPER_API_KEY=your_api_key_here
```

### Frontend (Optional)

You can create a `.env` file in the `frontend` directory to override the API URL:

```
REACT_APP_API_URL=http://localhost:3060/api
```

If not set, it defaults to `/api` (relative URL, works when served from the same server).

## File Structure After Build

```
google-lead/
├── backend/
│   ├── index.js
│   ├── package.json
│   └── data/
├── frontend/
│   ├── build/          ← React build output (created after npm run build)
│   │   ├── index.html
│   │   ├── static/
│   │   └── ...
│   ├── src/
│   └── package.json
```

## Troubleshooting

### React app not loading

- Make sure you've run `npm run build` in the frontend directory
- Check that the `frontend/build` folder exists
- Verify the backend is looking for the build folder at the correct path

### API calls failing

- Check that the backend server is running
- Verify CORS is enabled (already configured)
- Check browser console for errors

### React Router routes not working

- The catch-all route in `backend/index.js` should handle this
- Make sure the catch-all route is after all API routes

