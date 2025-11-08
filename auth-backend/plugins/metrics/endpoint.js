const { register } = require('./registry.js');

function registerMetricsEndpoint(fastify) {
  fastify.get('/metrics', async (_req, reply) => {
    reply.header('Content-Type', register.contentType);
    return register.metrics();
  });
}

module.exports = { registerMetricsEndpoint };