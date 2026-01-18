const crypto = require('crypto');

const generatePhoneNumber = () => {
    return `555${crypto.randomInt(1000000, 9999999)}`;
};

const generateServiceCode = () => {
    return crypto.randomInt(1000, 9999).toString();
};

module.exports = {
    generatePhoneNumber,
    generateServiceCode
};
