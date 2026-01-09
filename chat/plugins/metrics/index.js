import fp from 'fastify-plugin';
import { setupRegistry } from './registry.js';
import { registerHttpHooks } from './http.js';
import { registerMetricsEndpoint } from './endpoint.js';
import { registerExternalMetrics } from './external.js';

export default fp(async function metricsPlugin(fastify) {
  // Initialize registry defaults (labels, default Node.js metrics)
    setupRegistry();

  // Register HTTP-related metric hooks
    registerHttpHooks(fastify);

  // Register external metrics tracking
    registerExternalMetrics(fastify);

  // Expose metrics endpoint (keeps the same path as before)
    registerMetricsEndpoint(fastify);
});