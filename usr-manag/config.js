module.exports = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT || 4000,
    AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || 'http://localhost:8005',
    DATABASE_PATH: process.env.DATABASE_PATH || './database.sqlite',
    
    // CORS settings
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:8080',
    
    // Service discovery
    SERVICE_NAME: 'usr-manag',
    SERVICE_VERSION: '1.0.0',
};
