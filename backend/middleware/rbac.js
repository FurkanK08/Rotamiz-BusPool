/**
 * Role-Based Access Control (RBAC) Middleware
 * Provides role checking and resource ownership verification
 */
const Service = require('../models/Service');

/**
 * Requires the authenticated user to have a specific role.
 * Must be used AFTER authMiddleware.
 * @param  {...string} roles - Allowed roles (e.g., 'DRIVER', 'PASSENGER', 'ADMIN')
 */
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ msg: 'Erişim reddedildi: Rol bilgisi bulunamadı.' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                msg: `Bu işlem için yetkiniz yok. Gerekli rol: ${roles.join(' veya ')}`
            });
        }

        next();
    };
};

/**
 * Verifies the authenticated user is the owner (driver) of the specified service.
 * Reads serviceId from req.params.id or req.body.serviceId.
 * Must be used AFTER authMiddleware.
 */
const requireServiceOwner = async (req, res, next) => {
    try {
        const serviceId = req.params.id || req.body.serviceId;

        if (!serviceId) {
            return res.status(400).json({ msg: 'Service ID gerekli.' });
        }

        const service = await Service.findById(serviceId);
        if (!service) {
            return res.status(404).json({ msg: 'Servis bulunamadı.' });
        }

        if (service.driver.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Bu servis üzerinde yetkiniz yok.' });
        }

        // Attach service to request for downstream use (avoids re-fetching)
        req.service = service;
        next();
    } catch (err) {
        console.error('RBAC ownership check error:', err.message);
        res.status(500).json({ msg: 'Yetki kontrolü sırasında hata oluştu.' });
    }
};

/**
 * Verifies the authenticated user is accessing their own resource.
 * Compares req.user.id with the :id param.
 * Must be used AFTER authMiddleware.
 */
const requireSelf = (paramName = 'id') => {
    return (req, res, next) => {
        const targetId = req.params[paramName] || req.body.userId;

        if (!targetId) {
            return res.status(400).json({ msg: 'Kullanıcı ID gerekli.' });
        }

        if (req.user.id !== targetId) {
            return res.status(403).json({ msg: 'Sadece kendi hesabınız üzerinde işlem yapabilirsiniz.' });
        }

        next();
    };
};

module.exports = { requireRole, requireServiceOwner, requireSelf };
