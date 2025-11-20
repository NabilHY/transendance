const fp = require('fastify-plugin');
const { validatePassword } = require('../utils/passwordPolicy');
const { hashPassword } = require('../utils/hash');
const config  = require('../config');
const { transporter } = require('../utils/email');
const crypto = require('crypto');

async function accountSecurityPlugin(fastify) {
    fastify.decorate('accountSecurity', {
        getUserId(req) {
            if (!req.user || !req.user.sub) {
                throw new Error('User ID not found');
            }
            return req.user.sub;
        },
        async getUserData(userId) {
            return new Promise((resolve, reject) => {
                fastify.db.get('SELECT id, email, password_hash, account_locked, is_verified, twofa_enabled, google_id, last_password_changed_at FROM users WHERE id = ?',
                    [userId], 
                    (err, res) => {
                        if (err) reject(err);
                        else if (!res) reject(new Error('User not found'));
                        else resolve(res);
                    });
            });
        },
        async updatePassword(userId, newPassword) {
            const validation = validatePassword(newPassword);
            if (!validation.isValid) {
                throw new Error(validation.errors[0]);
            }
            const passwordHash = await hashPassword(newPassword);
            await new Promise((resolve, reject) => {
                fastify.db.run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId], 
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
            });
        },
        async resetEmailValidation(userId, newEmail) {
            if (!newEmail || !newEmail.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
                throw new Error('Invalid email address');
            }
            const existing = await new Promise ((res, rej) => {
                fastify.db.get('SELECT id FROM users WHERE email = ?', [newEmail], (err, row) => {
                    if (err) rej(err);
                    else res(row ? true : false);
                });
            });

            if (existing) {
                throw new Error('Email already in use');
            }

            const emailVerificationToken = crypto.randomBytes(32).toString('hex');
            const emailVerificationTokenExpiresAt = Math.floor(Date.now() / 1000) + 3600;
            await new Promise((resolve, reject) => {
                fastify.db.run('INSERT INTO email_verification_tokens(token, user_id, expires_at, new_email) VALUES (?, ?, ?, ?)', [emailVerificationToken, userId, emailVerificationTokenExpiresAt, newEmail], 
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

            const link = `${config.FRONTEND_URL}/verify-email?token=${emailVerificationToken}`;
            await fastify.trackExternal('smtp', () => transporter.sendMail({
                from: config.SMTP_FROM,
                to: newEmail,
                subject: 'Email Verification',
                text: `Click the link to verify your email: ${link}`,
                html: `<p>Click the link to verify your email: <a href="${link}">${link}</a></p>`
            }));

            return emailVerificationToken;
        },
        resetEmail(userId, newEmail) {
            return new Promise((resolve, reject) => {
                fastify.db.run('UPDATE users SET email = ? WHERE id = ?', [newEmail, userId], 
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
            });
        },
        async resetPassword(userId, newPassword) {
            const validation = validatePassword(newPassword);
            if (!validation.isValid) {
                throw new Error(validation.errors[0]);
            }
            const passwordHash = await hashPassword(newPassword);
            await new Promise((resolve, reject) => {
                fastify.db.run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId], 
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
            });
        }
    })
}

module.exports = fp(accountSecurityPlugin, {
    name: 'accountSecurityPlugin',
    dependencies: ['db', 'trackExternal']
});