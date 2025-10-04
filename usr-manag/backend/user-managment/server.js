
const Fastify = require('fastify');
const Database = require('better-sqlite3');
const userManagement = require('./user-management/user-management.js');
const jwt = require('@fastify/jwt');

const PORT = Number(process.env.PORT) || 4000;
const DATABASE = process.env.DATABASE_PATH || './database.sqlite';

const fastify = Fastify({ logger: true });

const db = new Database(DATABASE);

fastify.decorate('db', db);

fastify.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
});

fastify.register(require('@fastify/swagger'), {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: 'Your API',
      description: 'API documentation',
      version: '1.0.0'
    },
    externalDocs: undefined,
    servers: [
      {
        url: 'http://localhost:4000',
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
    },
    uiConfig: {
      displayRequestDuration: true,
      url: undefined
    }
  }
});

fastify.register(require('@fastify/swagger-ui'), {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'full',
    deepLinking: false
  }
});

fastify.register(userManagement);

fastify.register(jwt, {
  secret: 'supersecret'
});

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log('Server listening on port ' + PORT);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();


