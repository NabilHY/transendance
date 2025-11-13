const { register } = require('./registry.js');
const ipRangeCheck = require('ip-range-check');
const allowedCidrs = ['10.0.0.0/8', '192.168.0.0/16'];

function registerMetricsEndpoint(fastify) {
  fastify.get(
    '/metrics',
    {
      schema: {
        response: {
          200: { type: 'string', description: 'Prometheus metrics' },
          403: { type: 'string', description: 'Forbidden' },
        },
      },
      preHandler : (req, rep, done) => {
        const clientIp = req.ip;
        if (!ipRangeCheck(clientIp, allowedCidrs)) {
          return rep.code(403).send('Forbidden');
        }
        done();
      }
    },
    async (_req, reply) => {
    reply.header('Content-Type', register.contentType);
    return register.metrics();
  });
}

module.exports = { registerMetricsEndpoint };