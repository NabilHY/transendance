const client = require('prom-client');

let registryInitialized = false;

function setupRegistry() {
  if (registryInitialized) return;

  client.collectDefaultMetrics({ eventLoopMonitoringPrecision: 10 });

  client.register.setDefaultLabels({
    service: 'game-backend',
  });

  registryInitialized = true;
}

const register = client.register;

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

module.exports = {
  setupRegistry,
  register,
  client,
  getOrCreateHistogram,
  getOrCreateGauge,
};









