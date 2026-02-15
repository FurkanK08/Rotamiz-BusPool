const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '../logs/app.log');
const LOG_DIR = path.join(__dirname, '../logs');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Helper to write to log file
const writeLog = (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;

    // Write to file
    fs.appendFileSync(LOG_FILE, logMessage);

    // Also log to console
    console.log(logMessage.trim());
};

// Request logging middleware
const requestLogger = (req, res, next) => {
    const startTime = Date.now();

    // Log request (security: mask sensitive headers)
    const safeHeaders = { ...req.headers };
    if (safeHeaders.authorization) {
        safeHeaders.authorization = 'Bearer ***MASKED***';
    }
    if (safeHeaders.cookie) {
        safeHeaders.cookie = '***MASKED***';
    }

    writeLog(`━━━ INCOMING REQUEST ━━━`);
    writeLog(`Method: ${req.method}`);
    writeLog(`Path: ${req.originalUrl}`);
    writeLog(`Headers: ${JSON.stringify(safeHeaders)}`);
    writeLog(`Body: ${JSON.stringify(req.body)}`);
    writeLog(`IP: ${req.ip}`);

    // Capture response
    const originalSend = res.send;
    res.send = function (data) {
        const duration = Date.now() - startTime;

        writeLog(`━━━ RESPONSE ━━━`);
        writeLog(`Status: ${res.statusCode}`);
        writeLog(`Duration: ${duration}ms`);
        writeLog(`Body: ${typeof data === 'string' ? data.substring(0, 500) : JSON.stringify(data).substring(0, 500)}`);
        writeLog(`━━━━━━━━━━━━━━━━━━━━━\n`);

        originalSend.apply(res, arguments);
    };

    next();
};

// Error logging
const errorLogger = (err, req, res, next) => {
    writeLog(`━━━ ERROR ━━━`);
    writeLog(`Path: ${req.originalUrl}`);
    writeLog(`Error: ${err.message}`);
    writeLog(`Stack: ${err.stack}`);
    writeLog(`━━━━━━━━━━━━\n`);

    next(err);
};

// Clear log file on startup
const clearLog = () => {
    if (fs.existsSync(LOG_FILE)) {
        fs.unlinkSync(LOG_FILE);
    }
    writeLog(`━━━ APPLICATION STARTED ━━━`);
    writeLog(`Timestamp: ${new Date().toISOString()}`);
    writeLog(`Environment: ${process.env.NODE_ENV || 'development'}`);
    writeLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
};

module.exports = { requestLogger, errorLogger, clearLog, writeLog };
