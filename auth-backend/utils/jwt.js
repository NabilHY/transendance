const jwt = require('@fastify/jwt');
require('dotenv').config();

function verifyRefreshToken(fastify, refreshToken) {
    try {
        const decoded = fastify.jwt.verify(refreshToken);
        return decoded;
    } catch (err) {
        return null;
    }
}

/**
 * Parse JWT expiry string (e.g., "2h", "15m", "7d") into seconds
 * @param {string} timeStr - Time string in format like "15m", "2h", "7d", "30s"
 * @returns {number|null} - Number of seconds, or null if invalid
 */
function parseExpiry(timeStr) {
    if (!timeStr) return null;
    const match = timeStr.match(/^(\d+)([smhd])$/);
    if (!match) return null;
    const value = parseInt(match[1]);
    const unit = match[2];
    switch(unit) {
        case 's': return value;
        case 'm': return value * 60;
        case 'h': return value * 60 * 60;
        case 'd': return value * 24 * 60 * 60;
        default: return null;
    }
}

module.exports = {
    verifyRefreshToken,
    parseExpiry
};