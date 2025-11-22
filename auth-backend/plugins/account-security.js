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
        try {
            if (!newEmail || !newEmail.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
                throw new Error('Invalid email address');
            }
            
            const existing = await new Promise((resolve, reject) => {
                if (!fastify.db) {
                    return reject(new Error('Database not initialized'));
                }
                fastify.db.get('SELECT id FROM users WHERE email = ?', [newEmail], (err, row) => {
                    if (err) {
                        fastify.log.error({ 
                            err, 
                            email: newEmail, 
                            errCode: err.code,
                            errMessage: err.message,
                            errStack: err.stack
                        }, 'Database error checking email');
                        return reject(err);
                    }
                    resolve(row ? true : false);
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
            if (!config.EMAIL_FROM && !config.SMTP_FROM) {
                throw new Error('Email from address not configured');
            }
            


            const link = `${config.FRONTEND_URL}/verify-email?token=${emailVerificationToken}`;
            await fastify.trackExternal('smtp', () => transporter.sendMail({
                from: config.EMAIL_FROM || config.SMTP_FROM,
                to: newEmail,
                subject: 'Email Verification',
                text: `Click the link to verify your email: ${link}`,
                html: `<p>Click the link to verify your email: <a href="${link}">${link}</a></p>`
            }));

            return emailVerificationToken;
        } catch (err) {
            fastify.log.error({ 
                err, 
                email: newEmail, 
                errCode: err.code,
                errMessage: err.message,
                errStack: err.stack
            }, 'Database error checking email');
        }
        },
        resetEmail(userId, newEmail) {
            return new Promise((resolve, reject) => {
                fastify.db.run('UPDATE users SET email = ?, google_id = NULL WHERE id = ?', [newEmail, userId], 
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
        },
        async deleteEmailVerificationToken(userId) {
            await new Promise((resolve, reject) => {
                fastify.db.run('DELETE FROM email_verification_tokens WHERE user_id = ?', [userId], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        },
        async deletePasswordResetToken(userId) {
            await new Promise((resolve, reject) => {
                fastify.db.run('DELETE FROM password_reset_tokens WHERE user_id = ?', [userId], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        },
        
        async deleteRefreshToken(userId) {
            await new Promise((resolve, reject) => {
                fastify.db.run('DELETE FROM refresh_tokens WHERE user_id = ?', [userId], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        },
        async deleteAllTokens(userId) {
            await this.deleteEmailVerificationToken(userId);
            await this.deletePasswordResetToken(userId);
            await this.deleteRefreshToken(userId);
        },
        async isLocked(userId) {
            const user = await new Promise((resolve, reject) => {
                fastify.db.get('SELECT email FROM users WHERE id = ?', [userId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            
            if (!user || !user.email) {
                return false;
            }
            return new Promise((resolve, reject) => {
                fastify.db.get('SELECT locked_until FROM account_lockouts WHERE identifier = ?', [user.email], (err, row) => {
                    if (err) reject(err);
                    else resolve(row && row.locked_until > Math.floor(Date.now() / 1000));
                });
            });
        },
    })
}

module.exports = fp(accountSecurityPlugin, {
    name: 'accountSecurityPlugin'
});