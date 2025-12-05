const fp = require('fastify-plugin');

async function oauthPlugin(fastify) {
    fastify.decorate('connectedAccounts', {
        async getConnectedAccounts(userId) {
            const user = await new Promise((resolve, reject) => {
                fastify.db.get(
                    'SELECT google_id, email FROM users WHERE id = ?',
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
                    email: user.email,
                });
            }
            return accounts;
        },

        async disconnectedAccount(userId, provider) {
            if (provider === 'google') {
                await new Promise((resolve, reject) => {
                    fastify.db.run(
                        'UPDATE users SET google_id = NULL WHERE id = ?',
                        [userId],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
            }
        }
    });
}

module.exports = fp(oauthPlugin);