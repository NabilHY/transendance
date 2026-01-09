const fp = require('fastify-plugin');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const promClient = require('prom-client');

const register = promClient.register;
const dbQueryDuration = register.getSingleMetric('db_query_duration_seconds') || new promClient.Histogram({
    name: 'db_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['service', 'op'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5, 10],
});
const dbQueriesTotal = register.getSingleMetric('db_queries_total') || new promClient.Counter({
    name: 'db_queries_total',
    help: 'Total number of database queries',
    labelNames: ['service', 'op'],
});
const dbQueryErrors = register.getSingleMetric('db_query_errors_total') || new promClient.Counter({
    name: 'db_query_errors_total',
    help: 'Total number of database query errors',
    labelNames: ['service', 'op'],
});
const dbQueriesInFlight = register.getSingleMetric('db_queries_in_flight') || new promClient.Gauge({
    name: 'db_queries_in_flight',
    help: 'Current number of in-flight database operations',
    labelNames: ['service', 'op'],
});
const dbPoolConnectionsInUse = register.getSingleMetric('db_pool_connections_in_use') || new promClient.Gauge({
    name: 'db_pool_connections_in_use',
    help: 'Current number of database connections in use',
    labelNames: ['service'],
});
const dbPoolConnectionsMax = register.getSingleMetric('db_pool_connections_max') || new promClient.Gauge({
    name: 'db_pool_connections_max',
    help: 'Maximum number of database connections allowed',
    labelNames: ['service'],
});

module.exports = fp(async function (fastify) {
    const config = require('../config');
    const dbPath = config.DATABASE_PATH;
    const serviceName = config.SERVICE_NAME || 'usr-manag';
    
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

    // Track total in-flight queries for pool metrics
    let totalInFlightQueries = 0;

    // Instrument better-sqlite3 prepare() method to wrap prepared statements
    const originalPrepare = db.prepare.bind(db);
    db.prepare = function(sql) {
        const stmt = originalPrepare(sql);
        const op = String(sql || '').trim().toLowerCase().split(' ')[0] || 'unknown';

        // Wrap the statement methods (get, all, run)
        const originalGet = stmt.get.bind(stmt);
        const originalAll = stmt.all.bind(stmt);
        const originalRun = stmt.run.bind(stmt);

        const wrapQuery = (originalMethod, op) => {
            return function(...args) {
                const labels = { service: serviceName, op };
                const start = process.hrtime.bigint();
                dbQueriesInFlight.inc(labels);
                dbQueriesTotal.inc(labels);
                totalInFlightQueries++;
                dbPoolConnectionsInUse.set({ service: serviceName }, totalInFlightQueries);

                try {
                    const result = originalMethod(...args);
                    const duration = Number(process.hrtime.bigint() - start) / 1e9;
                    dbQueryDuration.observe(labels, duration);
                    dbQueriesInFlight.dec(labels);
                    totalInFlightQueries = Math.max(0, totalInFlightQueries - 1);
                    dbPoolConnectionsInUse.set({ service: serviceName }, totalInFlightQueries);
                    return result;
                } catch (err) {
                    const duration = Number(process.hrtime.bigint() - start) / 1e9;
                    dbQueryDuration.observe(labels, duration);
                    dbQueriesInFlight.dec(labels);
                    dbQueryErrors.inc(labels);
                    totalInFlightQueries = Math.max(0, totalInFlightQueries - 1);
                    dbPoolConnectionsInUse.set({ service: serviceName }, totalInFlightQueries);
                    throw err;
                }
            };
        };

        stmt.get = wrapQuery(originalGet, op);
        stmt.all = wrapQuery(originalAll, op);
        stmt.run = wrapQuery(originalRun, op);

        return stmt;
    };

    // Set initial DB pool metrics (SQLite doesn't have a real pool, but we set reasonable defaults)
    dbPoolConnectionsMax.set({ service: serviceName }, 10);
    dbPoolConnectionsInUse.set({ service: serviceName }, 0);

    console.log('✅ User management service connected to shared database with metrics');

    fastify.decorate('db', db);
    fastify.addHook('onClose', async () => {
        dbPoolConnectionsInUse.set({ service: serviceName }, 0);
        db.close();
    });
});
