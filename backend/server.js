import express from "express";
import api from './routes/index.js'
import authRoutes from './routes/auth.js'
import timeTracking from './routes/time-tracking.js'
import timeReport from './routes/time-report.js'
import dotenv from 'dotenv'
import mongoose from "mongoose";
import cors from "cors";

dotenv.config()

// Improved MongoDB connection with error handling
mongoose.connect(process.env.MONGODB_PATH)
    .then(() => console.log('Successfully connected to MongoDB'))
    .catch((err) => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

const PORT = 9001 // Fixed port to avoid conflicts

const app = express()

// Basic CORS setup - allow all origins in development
app.use(cors());

// Add headers before the routes are defined
app.use(function (req, res, next) {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Pass to next layer of middleware
    next();
});

// Body parsing middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api', api)
app.use('/auth', authRoutes)
app.use('/api/time', timeTracking)
app.use('/api', timeReport)

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Handle 404 routes
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('CORS enabled for all origins in development mode');
});