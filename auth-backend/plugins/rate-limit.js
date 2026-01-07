const fp = require('fastify-plugin');

async function rateLimitPlugin(fastify) {
    await fastify.register(require('@fastify/rate-limit'), {
        global: true,
        max: 100,
        timeWindow: '1m',

        errorResponseBuilder: function (request, context) {
            return {
                code: 429,
                error: 'Too Many Requests',
                message: `Rate limit exceeded, retry in ${context.after}`,
                retryAfter: context.after,
            };
        },
        
        keyGenerator: function (request) {
            return request.ip;
        },
        
        skip: function (request) {
            // Skip rate limiting for health checks and frequently called endpoints
            const skipUrls = [
                '/health',
                '/api/csrf-token',
                '/api/auth/me',
                '/metrics'
            ];
            
            // Check if the URL matches any skip pattern
            return skipUrls.some(url => request.url === url || request.url.startsWith(url));
        }
    });
}

module.exports = fp(rateLimitPlugin, {
    name: 'rate-limit-plugin',
});
