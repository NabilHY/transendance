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
 * Download image from URL (with limited redirect support)
 *
 * Google profile picture URLs sometimes respond with redirects (3xx) before
 * serving the actual image. This helper follows a small number of redirects
 * to robustly fetch the final image bytes.
 */
function downloadImage(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const visited = new Set();

    function doRequest(currentUrl, redirectsLeft) {
      if (!redirectsLeft) {
        return reject(new Error(`Too many redirects while downloading image from ${currentUrl}`));
      }

      if (visited.has(currentUrl)) {
        return reject(new Error(`Redirect loop detected while downloading image from ${currentUrl}`));
      }
      visited.add(currentUrl);

      const protocol = currentUrl.startsWith('https:') ? https : http;

      const req = protocol.get(currentUrl, (response) => {
        const { statusCode, headers } = response;

        // Handle redirects (3xx)
        if (statusCode >= 300 && statusCode < 400 && headers.location) {
          const location = headers.location;
          // Support relative redirects by resolving against the current URL
          const nextUrl = new URL(location, currentUrl).toString();
          response.resume(); // Discard response data
          return doRequest(nextUrl, redirectsLeft - 1);
        }

        if (statusCode !== 200) {
          response.resume(); // Discard response data
          return reject(new Error(`Failed to download image: HTTP ${statusCode} for ${currentUrl}`));
        }

        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
        response.on('error', reject);
      });

      req.on('error', reject);
    }

    doRequest(url, maxRedirects);
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

    // Generate unique object key: {userId}/{timestamp}-{random}.{ext}
    // NOTE: Do not include bucket name in the object key itself; the bucket is
    // specified separately. This matches the behaviour in usr-manag /media routes.
    const timestamp = Date.now();
    const random = randomBytes(8).toString('hex');
    const ext = detected.ext || 'jpg';
    const objectKey = `${userId}/${timestamp}-${random}.${ext}`;

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

