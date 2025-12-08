const fp = require('fastify-plugin');

async function deletePlugin(fastify) {
    fastify.decorate('deleteUser', async function(userId) {
        return new Promise(async (res, rej) => {
            try {
                const user = await new Promise((res, rej) => {
                    fastify.db.get('SELECT email FROM users WHERE id=?', [userId], (err, row) => {
                        if (err) rej(err);
                        else res(row);
                    });
                });
                
                if (!user) {
                    return rej(new Error('User Not Found'));
                };
                
                await new Promise((res, rej) => {
                    fastify.db.run('DELETE FROM refresh_tokens WHERE user_id=?', [userId], (err) => {
                        if (err) rej(err) ;
                        else res();
                    });
                });
                
                await new Promise((resolve, reject) => {
                    fastify.db.run('DELETE FROM email_verification_tokens WHERE user_id = ?', [userId], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                await new Promise((resolve, reject) => {
                    fastify.db.run('DELETE FROM password_reset_tokens WHERE user_id = ?', [userId], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                // Delete account lockouts (identifier is the email)
                await new Promise((resolve, reject) => {
                    fastify.db.run('DELETE FROM account_lockouts WHERE identifier = ?', [user.email], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                // Delete friends relationships (both directions)
                await new Promise((resolve, reject) => {
                    fastify.db.run('DELETE FROM friends WHERE user_id = ? OR friend_id = ?', [userId, userId], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                // Delete chat data
                await new Promise((resolve, reject) => {
                    fastify.db.run('DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?', [userId, userId], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                await new Promise((resolve, reject) => {
                    fastify.db.run('DELETE FROM channel_members WHERE user_id = ?', [userId], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                await new Promise((resolve, reject) => {
                    fastify.db.run('DELETE FROM blocked_users WHERE user_id = ? OR blocked_user_id = ?', [userId, userId], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                await new Promise((resolve, reject) => {
                    fastify.db.run('DELETE FROM friendships WHERE user_id = ? OR friend_id = ?', [userId, userId], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                // Delete channels created by user (cascades to channel_members and messages)
                await new Promise((resolve, reject) => {
                    fastify.db.run('DELETE FROM channels WHERE created_by = ?', [userId], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                // Delete user record (should be last)
                await new Promise((resolve, reject) => {
                    fastify.db.run('DELETE FROM users WHERE id = ?', [userId], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                
                res({ success: true });
                
            } catch (e) {
                rej(e);
            }
        });
    });
}

module.exports = fp(deletePlugin);