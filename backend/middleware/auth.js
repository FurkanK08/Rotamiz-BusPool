const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('⚠️  UYARI: JWT_SECRET ortam değişkeni tanımlı değil! Lütfen .env dosyasına JWT_SECRET ekleyin.');
    // In production, you might want to: process.exit(1);
}

// Middleware to verify JWT token
const authMiddleware = (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ msg: 'No token, authorization denied' });
        }

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

// Generate JWT token
const generateToken = (userId, role) => {
    const payload = {
        user: {
            id: userId,
            role: role
        }
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

module.exports = { authMiddleware, generateToken };
