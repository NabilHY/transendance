// src/plugins/metrics.js
import fp from 'fastify-plugin';
import client from 'prom-client';

const collectDefaultMetrics = client.collectDefaultMetrics;

// Start collecting default Node.js metrics
collectDefaultMetrics();

client.register.setDefaultLabels({ service: 'auth-backend' });

export default fp(async function metricsPlugin(fastify) {
  // Use the default global registry
  const register = client.register;

  // Helper to get or create a metric by name to avoid duplicate registration during reloads
  function getOrCreateHistogram(opts) {
    const existing = register.getSingleMetric(opts.name);
    if (existing) return existing;
    return new client.Histogram(opts);
  }

  function getOrCreateGauge(opts) {
    const existing = register.getSingleMetric(opts.name);
    if (existing) return existing;
    return new client.Gauge(opts);
  }

  // Define a histogram for request durations
  const httpRequestDuration = getOrCreateHistogram({
    name: 'http_request_duration_seconds',
    help: 'Request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.05, 0.1, 0.5, 1, 3, 5, 10],
  });

  // Define a gauge for in-flight requests
  const httpRequestsInFlight = getOrCreateGauge({
    name: 'http_requests_in_flight',
    help: 'In-flight HTTP requests',
    labelNames: ['method', 'route'],
  });

  // Define histograms for request and response sizes (bytes)
  const sizeBuckets = [
    200, 500,
    1024, 2048, 5120,
    10240, 51200, 102400,
    524288, 1048576, 5242880,
  ];

  const httpRequestSize = getOrCreateHistogram({
    name: 'http_request_size_bytes',
    help: 'HTTP request size in bytes',
    labelNames: ['method', 'route'],
    buckets: sizeBuckets,
  });

  const httpResponseSize = getOrCreateHistogram({
      name: 'http_response_size_bytes',
      help: 'HTTP response size in bytes',
      labelNames: ['method', 'route', 'status_code'],
      buckets: sizeBuckets,
  });
  
  // define once near other metrics
  const httpRequestErrors = client.register.getSingleMetric('http_request_errors_total')
  || new client.Counter({
    name: 'http_request_errors_total',
    help: 'HTTP error responses',
    labelNames: ['method', 'route', 'status_code'],
  });
  
  

  fastify.addHook('onRequest', (req, _reply, done) => {
    const route = req.routerPath || req.url || 'unknown';
    req.__metrics = req.__metrics || {};
    req.__metrics.route = route;
    req.__metrics.method = req.method;
    req.startTimeNs = process.hrtime.bigint();

    // In-flight increment
    httpRequestsInFlight.inc({ method: req.method, route });

    // Best-effort request size from Content-Length header
    const cl = req.headers && (req.headers['content-length'] || req.headers['Content-Length']);
    const clNum = cl ? parseInt(Array.isArray(cl) ? cl[0] : cl, 10) : NaN;
    if (Number.isFinite(clNum)) {
      req.__metrics.requestSizeBytes = clNum;
    }
    done();
  });

  // After body is parsed, if Content-Length missing, estimate size from body
  fastify.addHook('preHandler', (req, _reply, done) => {
    if (!req.__metrics) req.__metrics = {};
    if (typeof req.__metrics.requestSizeBytes !== 'number') {
      let size = 0;
      try {
        if (typeof req.body === 'string') {
          size = Buffer.byteLength(req.body);
        } else if (req.body !== undefined && req.body !== null) {
          size = Buffer.byteLength(JSON.stringify(req.body));
        }
      } catch {}
      req.__metrics.requestSizeBytes = size;
    }
    done();
  });


  // Capture response payload size as a fallback if Content-Length is unavailable
  fastify.addHook('onSend', (req, reply, payload, done) => {
    try {
      let size = 0;
      if (payload !== undefined && payload !== null) {
        if (Buffer.isBuffer(payload)) {
          size = payload.length;
        } else if (typeof payload === 'string') {
          size = Buffer.byteLength(payload);
        } else {
          size = Buffer.byteLength(JSON.stringify(payload));
        }
      }
      if (!req.__metrics) req.__metrics = {};
      req.__metrics.responseSizeBytes = size;
    } finally {
      done();
    }
  });

  // Hook into the response lifecycle to measure timing and sizes; also decrement in-flight
  fastify.addHook('onResponse', (req, reply, done) => {
    try {
      const route = (req.__metrics && req.__metrics.route) || req.routerPath || req.url || 'unknown';
      const method = (req.__metrics && req.__metrics.method) || req.method;
      const endNs = process.hrtime.bigint();
      const duration = Number(endNs - (req.startTimeNs || endNs)) / 1e9;
      httpRequestDuration.observe(
        { method, route, status_code: reply.statusCode },
        duration
      );

      // Decrement in-flight
      httpRequestsInFlight.dec({ method, route });

      // Observe request size
      const reqSize = (req.__metrics && typeof req.__metrics.requestSizeBytes === 'number')
        ? req.__metrics.requestSizeBytes
        : 0;
      httpRequestSize.observe({ method, route }, reqSize);

      // Determine response size: prefer Content-Length header, else fallback captured size
      const cl = reply.getHeader && reply.getHeader('content-length');
      const clNum = cl ? parseInt(Array.isArray(cl) ? cl[0] : String(cl), 10) : NaN;
      const respSize = Number.isFinite(clNum)
        ? clNum
        : ((req.__metrics && typeof req.__metrics.responseSizeBytes === 'number') ? req.__metrics.responseSizeBytes : 0);
      httpResponseSize.observe({ method, route, status_code: reply.statusCode }, respSize);
      
      // Initialize error counter labelset with 0 and increment on errors
      const errLabels = { method, route, status_code: reply.statusCode };
      const incValue = reply.statusCode >= 400 ? 1 : 0;
      httpRequestErrors.inc(errLabels, incValue);
    } finally {
      done();
    }
  });

  // Expose a /metrics endpoint
  fastify.get('/metrics', async (req, reply) => {
    reply.header('Content-Type', register.contentType);
    return register.metrics();
  });
});
