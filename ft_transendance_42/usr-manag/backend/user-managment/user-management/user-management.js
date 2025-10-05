const bcrypt = require('bcrypt');
const crypto = require('crypto');
const {
  AddFriendSchema,
  UpdateProfileSchema,
  BlockUserSchema,
  UpdatePasswordSchema,
  DeleteUserSchema,
  GetUserSchema,
  GetCurrentUserSchema,
  SearchUsersSchema,
} = require('./schemas/user.schema.js');

const userManagement = async (fastify) => {
  fastify.get('/users', { preHandler: [fastify.authenticate], schema: SearchUsersSchema }, async (request, reply) => {
    const { search } = request.query;
    if (search) {
      const stmt = fastify.db.prepare(
        'SELECT id, username, email, created_at FROM users WHERE username LIKE ? COLLATE NOCASE'
      );
      const users = stmt.all(`%${search}%`);
      return users;
    } else {
      const stmt = fastify.db.prepare(
        'SELECT id, username, email, created_at FROM users'
      );
      const users = stmt.all();
      return users;
    }
  });

  fastify.get('/me', { preHandler: [fastify.authenticate], schema: GetCurrentUserSchema }, async (request, reply) => {
    const userId = request.user.id;
    const stmt = fastify.db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?');
    const user = stmt.get(userId);
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }
    return reply.send(user);
  });

  fastify.get('/users/:id', { preHandler: [fastify.authenticate], schema: GetUserSchema }, async (request, reply) => {
    const { id } = request.params;
    const stmt = fastify.db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?');
    const user = stmt.get(id);
    if (!user) return reply.code(404).send({ error: 'User not found' });
    return reply.send(user);
  });

  fastify.patch('/me/status', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { is_online } = request.body;
    const userId = request.user.id;
    const stmt = fastify.db.prepare('UPDATE users SET is_online = ? WHERE id = ?');
    const result = stmt.run(is_online ? 1 : 0, userId);
    if (result.changes === 0) {
      return reply.code(404).send({ error: 'User not found' });
    }
    return { success: true, is_online };
  });

  fastify.delete('/me', { preHandler: [fastify.authenticate], schema: DeleteUserSchema }, async (request, reply) => {
    const userId = request.user.id;
    const stmt = fastify.db.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(userId);
    if (result.changes === 0) {
      return reply.code(404).send({ error: 'User not found' });
    }
    return reply.code(200).send({ success: true, message: 'User deleted' });
  });

  fastify.patch('/me/password', { preHandler: [fastify.authenticate], schema: UpdatePasswordSchema }, async (request, reply) => {
    const { old_password, new_password } = request.body;
    const userId = request.user.id;
    const stmt = fastify.db.prepare('SELECT password_hash FROM users WHERE id = ?');
    const user = stmt.get(userId);
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }
    const isMatch = await bcrypt.compare(old_password, user.password_hash);
    if (!isMatch) {
      return reply.code(400).send({ error: 'old password is incorrect' });
    }
    const hashedPassword = await bcrypt.hash(new_password, 10);
    const updateStmt = fastify.db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    updateStmt.run(hashedPassword, userId);
    return reply.send({ success: true, message: 'Password updated' });
  });

  fastify.patch('/me', { preHandler: [fastify.authenticate], schema: UpdateProfileSchema }, async (request, reply) => {
    const userId = request.user.id;
    const { firstname, lastname, email, profile_pic, username } = request.body;
    const fields = [];
    const values = [];
    if (firstname) { fields.push('firstname = ?'); values.push(firstname); }
    if (lastname) { fields.push('lastname = ?'); values.push(lastname); }
    if (email) { fields.push('email = ?'); values.push(email); }
    if (profile_pic) { fields.push('profile_pic = ?'); values.push(profile_pic); }
    if (username) { fields.push('username = ?'); values.push(username); }
    if (fields.length === 0) {
      return reply.code(400).send({ error: 'No fields to update' });
    }
    values.push(userId);
    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    const stmt = fastify.db.prepare(query);
    stmt.run(...values);
    const selectStmt = fastify.db.prepare(
      'SELECT id, firstname, lastname, email, profile_pic, username, created_at FROM users WHERE id = ?'
    );
    const updatedUser = selectStmt.get(userId);
    return reply.code(200).send(updatedUser);
  });

  fastify.post('/users/:id/friend', { preHandler: [fastify.authenticate], schema: AddFriendSchema }, async (request, reply) => {
    const { id } = request.params;
    const userId = request.user.id;
    if (id === userId) {
      return reply.code(400).send({ error: 'You cannot friend yourself' });
    }
    const targetUserStmt = fastify.db.prepare('SELECT id FROM users WHERE id = ?');
    const targetUser = targetUserStmt.get(id);
    if (!targetUser) {
      return reply.code(404).send({ error: 'Target user not found' });
    }
    const existingStmt = fastify.db.prepare('SELECT * FROM friends WHERE user_id = ? AND friend_id = ?');
    const existing = existingStmt.get(userId, id);
    if (existing) {
      if (existing.status === 'pending') {
        return reply.code(400).send({ error: 'Friend request already sent' });
      }
      if (existing.status === 'accepted') {
        return reply.code(400).send({ error: 'You are already friends' });
      }
      if (existing.status === 'blocked') {
        return reply.code(403).send({ error: 'You cannot friend this user' });
      }
    }
    const insertStmt = fastify.db.prepare(
      'INSERT INTO friends (id, user_id, friend_id, status, created_at) VALUES (?, ?, ?, ?, datetime(\'now\'))'
    );
    const uuid = crypto.randomUUID();
    insertStmt.run(uuid, userId, id, 'pending');
    return reply.code(201).send({ success: true, message: 'Friend request sent', requestId: uuid });
  });

  fastify.post('/users/:id/block', { preHandler: [fastify.authenticate], schema: BlockUserSchema }, async (request, reply) => {
    const { id } = request.params;
    const userId = request.user.id;
    if (id === userId) return reply.code(400).send({ error: 'You cannot block yourself' });
    const targetUserStmt = fastify.db.prepare('SELECT id FROM users WHERE id = ?');
    const targetUser = targetUserStmt.get(id);
    if (!targetUser) return reply.code(404).send({ error: 'Target user not found' });
    const existingStmt = fastify.db.prepare('SELECT * FROM friends WHERE user_id = ? AND friend_id = ?');
    const existing = existingStmt.get(userId, id);
    if (existing) {
      if (existing.status === 'blocked') {
        return reply.code(400).send({ error: 'User already blocked' });
      }
      const updateStmt = fastify.db.prepare('UPDATE friends SET status = \'blocked\' WHERE id = ?');
      updateStmt.run(existing.id);
      return reply.send({ success: true, message: 'User blocked' });
    }
    const insertStmt = fastify.db.prepare(
      'INSERT INTO friends (id, user_id, friend_id, status, created_at) VALUES (?, ?, ?, \'blocked\', datetime(\'now\'))'
    );
    const uuid = crypto.randomUUID();
    insertStmt.run(uuid, userId, id);
    return reply.code(201).send({ success: true, message: 'User blocked' });
  });
};

module.exports = userManagement;


