const fp = require('fastify-plugin');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

module.exports = fp(async function (fastify) {
    const config = require('../config');
    const dbPath = config.DATABASE_PATH;
    
    // Create directory if it doesn't exist
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    let db;
    try {
        db = new Database(dbPath);
        db.pragma('journal_mode = WAL');
    } catch (err) {
        if (String(err && err.message).includes('file is not a database')) {
            try { fs.unlinkSync(dbPath); } catch (_) {}
            db = new Database(dbPath);
            db.pragma('journal_mode = WAL');
        } else {
            throw err;
        }
    }

    console.log('✅ User management service connected to shared database');

    fastify.decorate('db', db);
    fastify.addHook('onClose', async () => db.close());
});
