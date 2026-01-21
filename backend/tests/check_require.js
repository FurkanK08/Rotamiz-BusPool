try {
    console.log('Attempting to require notificationService...');
    const ns = require('../services/notificationService');
    console.log('✅ Success! notificationService loaded.');
} catch (e) {
    console.error('❌ Failed to load notificationService:');
    console.error(e);
}
