const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for MVP
        methods: ["GET", "POST"]
    }
});

const { requestLogger, errorLogger, clearLog, writeLog } = require('./middleware/logger');

// Clear log on startup
clearLog();

const PORT = process.env.PORT || 5000;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:8081', 'http://localhost:19006', 'http://10.0.2.2:8081'];

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, curl)
        if (!origin) return callback(null, true);

        if (ALLOWED_ORIGINS.indexOf(origin) === -1) {
            const msg = 'CORS policy does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true
}));
app.use(express.json());

// Add request logging middleware
app.use(requestLogger);

// MongoDB Connection
// TODO: Replace with User's MongoDB URI
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/servis-takip';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.log('❌ MongoDB Connection Error:', err));

// Socket.io Logic
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join a specific service room (e.g., service ID)
    socket.on('joinService', (serviceId) => {
        socket.join(serviceId);
        console.log(`User ${socket.id} joined service: ${serviceId}`);
    });

    socket.on('stopService', ({ serviceId }) => {
        io.to(serviceId).emit('serviceStopped');
        console.log(`Service ${serviceId} stopped`);
    });

    // Driver sends location to all passengers in service
    socket.on('sendLocation', ({ serviceId, location }) => {
        io.to(serviceId).emit('receiveLocation', location);
        console.log(`Location sent to service ${serviceId}:`, location);
    });

    // Driver requests passenger locations
    socket.on('requestPassengerLocation', ({ serviceId }) => {
        io.to(serviceId).emit('shareLocationRequest');
        console.log(`Location request sent to service ${serviceId}`);
    });

    // Passenger shares location with driver
    socket.on('passengerLocation', ({ serviceId, passengerId, location }) => {
        socket.to(serviceId).emit('driverReceivePassengerLocation', { passengerId, location });
        console.log(`Passenger ${passengerId} shared location in service ${serviceId}`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/services', require('./routes/services'));
app.use('/api/users', require('./routes/users'));

app.get('/', (req, res) => {
    res.send('Service Tracking API is Running 🚀');
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
