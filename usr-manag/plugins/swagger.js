const fp = require('fastify-plugin');

async function swaggerPlugin(fastify) {
    const config = require('../config');
    
    // Register Swagger
    await fastify.register(require('@fastify/swagger'), {
        openapi: {
            openapi: '3.0.0',
            info: {
                title: 'User Management Service',
                description: 'Microservice for user profiles and relationships',
                version: config.SERVICE_VERSION
            },
            servers: [
                {
                    url: `http://localhost:${config.PORT}`,
                    description: 'Development server'
                }
            ],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT'
                    }
                }
            }
        }
    });

    // Register Swagger UI
    await fastify.register(require('@fastify/swagger-ui'), {
        routePrefix: '/docs',
        uiConfig: {
            docExpansion: 'full',
            deepLinking: false
        }
    });
    
    console.log('Swagger plugin registered');
}

module.exports = fp(swaggerPlugin);
