// src/plugins/metrics.js
import fp from 'fastify-plugin';
import client from 'prom-client';

const collectDefaultMetrics = client.collectDefaultMetrics;

// Start collecting default Node.js metrics
collectDefaultMetrics();

export default fp(async function metricsPlugin(fastify) {
  // Use the default global registry
  const register = client.register;

  // Define a histogram for request durations
  const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.05, 0.1, 0.5, 1, 3, 5, 10],
  });

  // Hook into the response lifecycle to measure timing
  fastify.addHook('onResponse', (req, reply, done) => {
    const route = req.routerPath || req.url;
    const duration = reply.elapsedTime ? reply.elapsedTime / 1000 : 0;

    httpRequestDuration.observe(
      {
        method: req.method,
        route,
        status_code: reply.statusCode,
      },
      duration
    );

    done();
  });

  // Expose a /metrics endpoint
  fastify.get('/metrics', async (req, reply) => {
    reply.header('Content-Type', register.contentType);
    return register.metrics();
  });
});
