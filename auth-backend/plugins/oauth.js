const fp = require('fastify-plugin');

async function oauthPlugin(fastify) {
    // Ensure we have a dedicated column to store the Google account email for display
    try {
        await new Promise((resolve, reject) => {
            fastify.db.run(
                'ALTER TABLE users ADD COLUMN google_email TEXT',
                (err) => {
                    if (err) {
                        if (err.message && err.message.includes('duplicate column name')) {
                            return resolve();
                        }
                        return reject(err);
                    }
                    resolve();
                }
            );
        });
    } catch (err) {
        fastify.log.error({ err }, 'Failed to ensure google_email column exists on users table');
    }

    fastify.decorate('connectedAccounts', {
        async getConnectedAccounts(userId) {
            const user = await new Promise((resolve, reject) => {
                fastify.db.get(
                    'SELECT google_id, email, google_email FROM users WHERE id = ?',
                    [userId],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    }
                );
            });
        
            if (!user) {
                return null;
            }
            
            const accounts = [];
            
            if (user.google_id) {
                accounts.push({
                    provider: 'google',
                    id: user.google_id,
                    // Prefer the Google account email if we have it; fall back to primary email
                    email: user.google_email || user.email,
                });
            }
            return accounts;
        },
        
        async disconnectAccount(userId, provider) {
            if (provider === 'google') {
                await new Promise((resolve, reject) => {
                    fastify.db.run(
                        'UPDATE users SET google_id = NULL WHERE id = ?',
                        [userId],
                        function(err) { 
                            if (err) reject(err);
                            else {
                                const changes = this.changes;
                                if (changes === 0) {
                                    reject(new Error('Account was not connected or already disconnected'));
                                } else {
                                    resolve({ changes });
                                }
                            }
                        }
                    );
                });
                return { success: true, message: 'Account disconnected successfully' };
            }
            throw new Error(`Unsupported provider: ${provider}`);
    }
    });
}

module.exports = fp(oauthPlugin);