const config = require('../config');

module.exports = async function (fastify) {
    fastify.post('/clear', {

    }, async (req, reply) => {
        try {
        
            const runAsync = (sql, params = []) => new Promise((resolve, reject) => {
                fastify.db.run(sql, params, function(err) {
                    if (err) return reject(err);
                    resolve(this?.changes ?? 0);
                });
            });

            const tablesInDeleteOrder = [
                'refresh_tokens',
                'password_reset_tokens',
                'email_verification_tokens',
                'account_lockouts',
                'users'
            ];

            await runAsync('BEGIN TRANSACTION');
            try {
                for (const table of tablesInDeleteOrder) {
                    await runAsync(`DELETE FROM ${table}`);
                }

                await runAsync(
                    `DELETE FROM sqlite_sequence WHERE name IN (${tablesInDeleteOrder.map(() => '?').join(', ')})`,
                    tablesInDeleteOrder
                );

                await runAsync('COMMIT');
            } catch (err) {
                await runAsync('ROLLBACK').catch(() => {});
                throw err;
            }

            fastify.log.info('All user data cleared successfully');
            return reply.code(200).send({ message: 'Data cleared successfully' });
        } catch (error) {
            fastify.log.error({ err: error }, 'Failed to clear data');
            reply.code(500).send({ error: 'Internal server error' });
        }
    });
}