// src/plugins/metrics/metrics.js
import fp from 'fastify-plugin';
import client from 'prom-client';

const collectDefaultMetrics = client.collectDefaultMetrics;

// Start collecting default Node.js metrics
collectDefaultMetrics();

// Set default labels for this service
client.register.setDefaultLabels({ service: 'auth-backend' });

export default fp(async function metricsPlugin(fastify) {
  const register = client.register;

  // Expose a /metrics endpoint
  fastify.get('/metrics', async (_req, reply) => {
    reply.header('Content-Type', register.contentType);
    return register.metrics();
  });
});


