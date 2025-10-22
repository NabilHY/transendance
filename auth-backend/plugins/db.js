const fp = require('fastify-plugin');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

module.exports = fp(async function (fastify) {
    const dbPath = process.env.DB_FILE || path.join(__dirname, '..', 'db', 'sqlite.db');
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });

    let db;
    try {
        db = new sqlite3.Database(dbPath);
        db.run('PRAGMA journal_mode = WAL');
    } catch (err) {
        if (String(err && err.message).includes('file is not a database')) {
            try { fs.unlinkSync(dbPath); } catch (_) {}
            db = new sqlite3.Database(dbPath);
            db.run('PRAGMA journal_mode = WAL');
        } else {
            throw err;
        }
    }

    console.log('✅ Auth service connected to shared database');

    fastify.decorate('db', db);
    fastify.addHook('onClose', async () => db.close());
});
