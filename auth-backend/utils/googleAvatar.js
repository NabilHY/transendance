const { Client } = require('minio');
const https = require('https');
const http = require('http');
const fileType = require('file-type');
const { randomBytes } = require('crypto');

/**
 * Parse MinIO endpoint from env vars (same logic as usr-manag plugin)
 */
function parseEndpoint({ endpoint, useSSL, port }) {
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

/**
 * Download image from URL
 */
function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      response.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Download Google profile picture and upload to MinIO
 * @param {string} googlePictureUrl - Google profile picture URL
 * @param {number} userId - User ID
 * @param {object} log - Fastify logger instance
 * @returns {Promise<string|null>} - Object key or null if failed
 */
async function uploadGoogleAvatar(googlePictureUrl, userId, log) {
  if (!googlePictureUrl) {
    return null;
  }

  try {
    // Get MinIO config from env (same as usr-manag)
    const {
      S3_ENDPOINT,
      S3_ACCESS_KEY,
      S3_SECRET_KEY,
      S3_BUCKET,
      S3_REGION,
      MINIO_ENDPOINT,
      MINIO_PORT,
      MINIO_USE_SSL,
    } = process.env;

    const bucket = S3_BUCKET || 'avatars';
    const region = S3_REGION || 'us-east-1';
    const accessKey = S3_ACCESS_KEY || process.env.MINIO_ROOT_USER;
    const secretKey = S3_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD;

    if (!accessKey || !secretKey) {
      log.warn('MinIO credentials missing, skipping avatar upload');
      return null;
    }

    const resolved = parseEndpoint({
      endpoint: S3_ENDPOINT || MINIO_ENDPOINT,
      port: MINIO_PORT ? Number(MINIO_PORT) : undefined,
      useSSL: MINIO_USE_SSL !== undefined ? (MINIO_USE_SSL === 'true' || MINIO_USE_SSL === '1') : undefined,
    });

    const client = new Client({
      endPoint: resolved.endPoint,
      port: resolved.port,
      useSSL: resolved.useSSL,
      accessKey,
      secretKey,
    });

    // Download image from Google
    log.info({ googlePictureUrl }, 'Downloading Google profile picture');
    const imageBuffer = await downloadImage(googlePictureUrl);

    // Detect file type
    const detected = await fileType.fromBuffer(imageBuffer);
    if (!detected) {
      log.warn('Unable to detect file type from Google picture');
      return null;
    }

    // Only allow image types
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimes.includes(detected.mime)) {
      log.warn({ mime: detected.mime }, 'Invalid file type from Google picture');
      return null;
    }

    // Generate unique object key: avatars/{userId}/{timestamp}-{random}.{ext}
    const timestamp = Date.now();
    const random = randomBytes(8).toString('hex');
    const ext = detected.ext || 'jpg';
    const objectKey = `avatars/${userId}/${timestamp}-${random}.${ext}`;

    // Ensure bucket exists
    const bucketExists = await client.bucketExists(bucket);
    if (!bucketExists) {
      await client.makeBucket(bucket, region);
      log.info({ bucket }, 'Created MinIO bucket');
    }

    // Upload to MinIO
    await client.putObject(
      bucket,
      objectKey,
      imageBuffer,
      imageBuffer.length,
      {
        'Content-Type': detected.mime,
      }
    );

    log.info({ objectKey, userId }, 'Uploaded Google avatar to MinIO');
    return objectKey;
  } catch (error) {
    log.error({ error, userId, googlePictureUrl }, 'Failed to upload Google avatar to MinIO');
    return null;
  }
}

module.exports = { uploadGoogleAvatar };

