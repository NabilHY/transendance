const fastify = require('fastify')( { logger: true } );
const PORT = 8005

fastify.setErrorHandler(function (err, req, reply) {
    // Handle validation errors with custom messages
    if (err.validation) {
        const messages = err.validation.map(validationErr => {
            if (validationErr.keyword === 'minLength' && validationErr.instancePath === '/password') {
                return 'Password must be at least 12 characters long';
            }
            if (validationErr.keyword === 'maxLength' && validationErr.instancePath === '/password') {
                return 'Password must be no more than 128 characters long';
            }
            if (validationErr.keyword === 'format' && validationErr.instancePath === '/email') {
                return 'Email must be a valid email address';
            }
            if (validationErr.keyword === 'required') {
                return `${validationErr.params.missingProperty} is required`;
            }
            return `${validationErr.instancePath} ${validationErr.message}`;
        });
        
        return reply.code(400).send({
            error: 'Validation failed',
            details: messages
        });
    }
    
    // Preserve the original status code if it exists, otherwise default to 500
    const statusCode = err.statusCode || 500;
    reply.code(statusCode).send({
        error: err.message || 'Internal server error'
    });
});

fastify.register(require('@fastify/cookie'));
fastify.register(require('@fastify/cors'), {
  origin: ['http://localhost:8080'],
  credentials: true
});

fastify.register(require('../plugins/db'));
fastify.register(require('../plugins/schemas'));
fastify.register(require('../plugins/rate-limit'));
fastify.register(require('../plugins/jwt'));
fastify.register(require('../plugins/swagger'));
fastify.register(require('../routes/auth'), { prefix: '/api/auth' });
fastify.register(require('../plugins/csrf'));
fastify.register(require('../routes/csrf-token'), { prefix: '/api' });
fastify.register(require('../plugins/account-lockout'));
fastify.register(require('../routes/forgot-password'), { prefix: '/api/auth' });

fastify.register(require('../routes/service-auth'), { prefix: '/api/auth'});

fastify.get('/health', async (_req, reply) => {
    return reply.send({ status: 'ok' });
});

const start = async () => {
    try {
        await fastify.listen({ port: PORT, host: '0.0.0.0' });
        fastify.log.info(`Server is running on ${fastify.server.address().port}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}

start();