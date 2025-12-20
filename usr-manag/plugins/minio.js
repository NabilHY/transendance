const fp = require('fastify-plugin');
const { Client } = require('minio');

function parseBool(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  return String(value).toLowerCase() === 'true' || String(value) === '1';
}

function parseEndpoint({ endpoint, useSSL, port }) {
  // Accept either full URL (e.g. http://minio:9000) or host (e.g. minio)
  if (!endpoint) {
    return {
      endPoint: 'minio',
      port: 9000,
      useSSL: false,
    };
  }

  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    const url = new URL(endpoint);
    const derivedPort = url.port ? Number(url.port) : (url.protocol === 'https:' ? 443 : 80);
    return {
      endPoint: url.hostname,
      port: port ?? derivedPort,
      useSSL: useSSL ?? (url.protocol === 'https:'),
    };
  }

  return {
    endPoint: endpoint,
    port: port ?? 9000,
    useSSL: useSSL ?? false,
  };
}

async function ensureBucketExists(client, { bucket, region }, log) {
  const exists = await client.bucketExists(bucket);
  if (exists) return;

  log.info({ bucket, region }, 'MinIO bucket missing; creating');
  await client.makeBucket(bucket, region);
  log.info({ bucket }, 'MinIO bucket created');
}

module.exports = fp(
  async function minioPlugin(fastify) {
    const {
      S3_ENDPOINT,
      S3_ACCESS_KEY,
      S3_SECRET_KEY,
      S3_BUCKET,
      S3_REGION,
      // Optional overrides (handy outside docker-compose)
      MINIO_ENDPOINT,
      MINIO_PORT,
      MINIO_USE_SSL,
    } = process.env;

    const bucket = S3_BUCKET || 'avatars';
    const region = S3_REGION || 'us-east-1';

    const accessKey = S3_ACCESS_KEY || process.env.MINIO_ROOT_USER;
    const secretKey = S3_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD;

    if (!accessKey || !secretKey) {
      throw new Error('MinIO credentials missing: set S3_ACCESS_KEY/S3_SECRET_KEY (or MINIO_ROOT_USER/MINIO_ROOT_PASSWORD)');
    }

    const resolved = parseEndpoint({
      endpoint: S3_ENDPOINT || MINIO_ENDPOINT,
      port: MINIO_PORT ? Number(MINIO_PORT) : undefined,
      useSSL: MINIO_USE_SSL !== undefined ? parseBool(MINIO_USE_SSL) : undefined,
    });

    const client = new Client({
      endPoint: resolved.endPoint,
      port: resolved.port,
      useSSL: resolved.useSSL,
      accessKey,
      secretKey,
    });

    // Fail fast on bad endpoint/credentials
    await client.listBuckets();

    await ensureBucketExists(client, { bucket, region }, fastify.log);

    fastify.decorate('minio', client);
    fastify.decorate('minioBucket', bucket);
  },
  {
    name: 'minio',
  }
);


