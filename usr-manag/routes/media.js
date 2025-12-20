const fileType = require('file-type');
const { randomBytes } = require('crypto');

module.exports = async function (fastify) {
  // Register multipart plugin for this route scope
  await fastify.register(require('@fastify/multipart'), {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max
    },
  });

  // Upload avatar
  fastify.post('/me/avatar', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Media'],
      summary: 'Upload user avatar',
      security: [{ bearerAuth: [] }],
      consumes: ['multipart/form-data'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            objectKey: { type: 'string' },
            avatar_updated_at: { type: 'integer' },
          },
        },
        400: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        401: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request, reply) => {
    const userId = request.user.id;
    const data = await request.file();

    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' });
    }

    // Read file buffer for magic-byte detection
    const buffer = await data.toBuffer();
    const detected = await fileType.fromBuffer(buffer);

    if (!detected) {
      return reply.code(400).send({ error: 'Unable to detect file type' });
    }

    // Only allow image types
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimes.includes(detected.mime)) {
      return reply.code(400).send({
        error: `Invalid file type: ${detected.mime}. Allowed: ${allowedMimes.join(', ')}`,
      });
    }

    // Generate unique object key: {userId}/{timestamp}-{random}.{ext}
    // Note: Don't include bucket name in object key, bucket is already 'avatars'
    const timestamp = Date.now();
    const random = randomBytes(8).toString('hex');
    const ext = detected.ext || 'jpg';
    const objectKey = `${userId}/${timestamp}-${random}.${ext}`;

    // Upload to MinIO
    try {
      await fastify.minio.putObject(
        fastify.minioBucket,
        objectKey,
        buffer,
        buffer.length,
        {
          'Content-Type': detected.mime,
        }
      );
    } catch (err) {
      fastify.log.error({ err }, 'Failed to upload avatar to MinIO');
      return reply.code(500).send({ error: 'Failed to upload avatar' });
    }

    // Update database: store object key (not URL) and timestamp (unix ms)
    const avatarUpdatedAt = Date.now();
    const changes = fastify.db.prepare(`
      UPDATE users SET
        profile_pic = ?,
        avatar_updated_at = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(objectKey, avatarUpdatedAt, userId).changes;

    if (changes === 0) {
      return reply.code(404).send({ error: 'User not found' });
    }

    return {
      success: true,
      objectKey,
      avatar_updated_at: avatarUpdatedAt,
    };
  });

  // Get current user's avatar (presigned URL)
  fastify.get('/me/avatar', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Media'],
      summary: 'Get current user avatar URL',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            url: { type: 'string', nullable: true },
            objectKey: { type: 'string', nullable: true },
          },
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request, reply) => {
    const userId = request.user.id;

    const user = fastify.db.prepare(`
      SELECT profile_pic FROM users WHERE id = ?
    `).get(userId);

    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    if (!user.profile_pic) {
      return { url: null, objectKey: null };
    }

    // Generate presigned URL (valid for 1 hour)
    try {
      const url = await fastify.minio.presignedGetObject(
        fastify.minioBucket,
        user.profile_pic,
        3600 // 1 hour
      );

      // Use Next.js proxy to avoid CORS issues
      // Extract path and query from presigned URL and route through Next.js
      const urlObj = new URL(url);
      const pathWithQuery = urlObj.pathname + urlObj.search;
      const publicUrl = process.env.S3_PUBLIC_ENDPOINT 
        ? `${process.env.S3_PUBLIC_ENDPOINT}${pathWithQuery}`
        : `/media/minio${pathWithQuery}`;

      return {
        url: publicUrl,
        objectKey: user.profile_pic,
      };
    } catch (err) {
      fastify.log.error({ err, objectKey: user.profile_pic }, 'Failed to generate presigned URL');
      return reply.code(500).send({ error: 'Failed to generate avatar URL' });
    }
  });

  // Get any user's avatar by ID (presigned URL)
  fastify.get('/users/:id/avatar', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Media'],
      summary: 'Get user avatar URL by user ID',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'integer' } },
        required: ['id'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            url: { type: 'string', nullable: true },
            objectKey: { type: 'string', nullable: true },
          },
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params;

    const user = fastify.db.prepare(`
      SELECT profile_pic, avatar_updated_at FROM users WHERE id = ?
    `).get(id);

    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    if (!user.profile_pic) {
      return { url: null, objectKey: null };
    }

    // Generate presigned URL (valid for 1 hour)
    try {
      const url = await fastify.minio.presignedGetObject(
        fastify.minioBucket,
        user.profile_pic,
        3600 // 1 hour
      );

      // Use Next.js proxy to avoid CORS issues
      const urlObj = new URL(url);
      const pathWithQuery = urlObj.pathname + urlObj.search;
      const publicUrl = process.env.S3_PUBLIC_ENDPOINT 
        ? `${process.env.S3_PUBLIC_ENDPOINT}${pathWithQuery}`
        : `/media/minio${pathWithQuery}`;

      return {
        url: publicUrl,
        objectKey: user.profile_pic,
        avatarUpdatedAt: user.avatar_updated_at,
      };
    } catch (err) {
      fastify.log.error({ err, objectKey: user.profile_pic }, 'Failed to generate presigned URL');
      return reply.code(500).send({ error: 'Failed to generate avatar URL' });
    }
  });
};

