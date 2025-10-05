const fp = require('fastify-plugin');

async function swagger(fastify, options) {
    // Register Swagger
    await fastify.register(require('@fastify/swagger'), {
        swagger: {
            info: {
                title: 'ft_transendance_42 Authentication API',
                description: 'Secure authentication microservice with JWT, CSRF protection, and rate limiting',
                version: '1.0.0',
                contact: {
                    name: 'ft_transendance_42 Team',
                    email: 'team@ft_transendance_42.com'
                },
                license: {
                    name: 'MIT',
                    url: 'https://opensource.org/licenses/MIT'
                }
            },
            host: 'localhost:8005',
            schemes: ['http', 'https'],
            consumes: ['application/json'],
            produces: ['application/json'],
            tags: [
                {
                    name: 'Authentication',
                    description: 'User authentication endpoints including login, register, refresh, and logout'
                },
                {
                    name: 'Two-Factor',
                    description: '2FA setup, verification, and management endpoints'
                },
                {
                    name: 'Security',
                    description: 'CSRF and security endpoints'
                },
                {
                    name: 'User Management',
                    description: 'User profile and management endpoints'
                },
                {
                    name: 'OAuth',
                    description: 'Google OAuth 2.0 authentication endpoints'
                }
            ],
            securityDefinitions: {
                Bearer: {
                    type: 'apiKey',
                    name: 'Authorization',
                    in: 'header',
                    description: 'JWT Bearer token for authentication'
                },
                CSRF: {
                    type: 'apiKey',
                    name: 'X-CSRF-Token',
                    in: 'header',
                    description: 'CSRF token for state-changing requests'
                }
            },
            security: [
                {
                    Bearer: [],
                    CSRF: []
                }
            ]
        }
    });

    // Register Swagger UI
    await fastify.register(require('@fastify/swagger-ui'), {
        routePrefix: '/documentation',
        uiConfig: {
            docExpansion: 'full',
            deepLinking: true
        },
        uiHooks: {
            onRequest: function (request, reply, next) {
                next();
            },
            preHandler: function (request, reply, next) {
                next();
            }
        },
        staticCSP: true,
        transformStaticCSP: (header) => header,
        transformSpecification: (swaggerObject, request, reply) => {
            return swaggerObject;
        }
    });

    // Add route for raw OpenAPI spec
    fastify.get('/api-docs', async (request, reply) => {
        return fastify.swagger();
    });
}

module.exports = fp(swagger);

