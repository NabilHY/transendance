const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');
const config = require('../config');
const { default: fastifyRateLimit } = require('@fastify/rate-limit');
const { uploadGoogleAvatar } = require('../utils/googleAvatar');

/**
    Route starts the google oauth2.0 login flow
    visiting /google 
        generates a random state for csrf protection
        stores that state in a secure cookie
        bulid google oauth login url
        redirects the user to google consent screen
*/

module.exports = async function (fastify) {
    const client = new OAuth2Client(
        config.GOOGLE_CLIENT_ID,
        config.GOOGLE_CLIENT_SECRET,
        config.GOOGLE_REDIRECT_URI
    );
    
    // Helper function to build redirect URI from request headers
    function buildRedirectUri(req) {
        // Determine protocol from X-Forwarded-Proto header (set by nginx) or request protocol
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const secureProtocol = protocol === 'https' ? 'https' : 'https'; // Always use HTTPS for OAuth
        
        // Get host from X-Forwarded-Host (preferred) or Host header
        let host = req.headers['x-forwarded-host'] || req.headers.host || '';
        
        // Remove port number if present (ngrok URLs should not have port in redirect URI)
        host = host.split(':')[0];
        
        // Construct redirect URI without port
        const redirectUri = `${secureProtocol}://${host}/api/auth/google/callback`;
        
        return redirectUri;
    }
    
    fastify.get('/google', {
        schema: {
            description: 'Initiate Google OAuth2.0 login flow. Generates CSRF state token and redirects to Google consent screen.',
            tags: ['OAuth'],
            summary: 'Google OAuth Login',
            response: {
                302: {
                    description: 'Redirect to Google OAuth consent screen',
                    headers: {
                        Location: {
                            type: 'string',
                            description: 'Google OAuth authorization URL'
                        },
                        'Set-Cookie': {
                            type: 'string',
                            description: 'Sets oauth_state cookie for CSRF protection'
                        }
                    }
                },
                500: {
                    description: 'Internal server error during OAuth initialization',
                    type: 'object',
                    properties: {
                        error: {
                            type: 'string',
                            description: 'Error message',
                            example: 'Failed to initialize OAuth flow'
                        }
                    },
                    required: ['error']
                }
            }
        }
    }, async (req, rep) => {
    
        const state = crypto.randomBytes(16).toString('hex');
        const connectMode = req.query.connect === 'true';
        
        // Build redirect URI dynamically from request
        const redirectUri = buildRedirectUri(req);
        
        // Check if request is behind a proxy using HTTPS (via X-Forwarded-Proto header)
        const isSecure = req.headers['x-forwarded-proto'] === 'https' || 
                        req.protocol === 'https' || 
                        config.NODE_ENV === 'production';
        
        rep.setCookie('oauth_state', state, {
            httpOnly: true,
            secure: isSecure,  // true when behind HTTPS proxy or in production
            sameSite: 'lax',       // lax allows cookies on cross-site redirects (OAuth flow)
            maxAge: 600,           // 10 minutes
            path: '/',
            // Don't set domain - let browser use default (current domain)
        });
        
        rep.setCookie('oauth_mode', connectMode ? 'connect' : 'login', {
            httpOnly: true,
            secure: isSecure,
            sameSite: 'lax',
            maxAge: 600,
            path: '/'
        });
        
        // Generate auth URL with dynamically constructed redirect URI
        const authUrl = client.generateAuthUrl({
            access_type: 'offline',
            scope: ['profile', 'email'],
            state: state,
            redirect_uri: redirectUri, // Override with dynamic redirect URI
        });
        
        console.log(' ++++++ google stuff ++++++ : redirectUri', redirectUri);
        console.log(' ++++++ google stuff ++++++ : authUrl', authUrl);
        
        return rep.redirect(authUrl);
    });
    
    fastify.get('/google/callback', {
        schema: {
            description: 'Handle Google OAuth2.0 callback. Verifies state parameter, exchanges code for tokens, and creates/updates user account.',
            tags: ['OAuth'],
            summary: 'Google OAuth Callback',
            querystring: { $ref: 'OAuthCallbackQuery#' },
            response: {
                302: {
                    description: 'Redirect to frontend with success or error status',
                    headers: {
                        Location: {
                            type: 'string',
                            description: 'Frontend URL with login status'
                        },
                        'Set-Cookie': {
                            type: 'string',
                            description: 'Sets accessToken and refreshToken cookies on success'
                        }
                    }
                },
                400: {
                    description: 'Invalid state parameter or OAuth error',
                    type: 'object',
                    properties: {
                        error: {
                            type: 'string',
                            description: 'Error message',
                            example: 'Invalid state parameter'
                        }
                    },
                    required: ['error']
                },
                500: {
                    description: 'Internal server error during OAuth processing',
                    type: 'object',
                    properties: {
                        error: {
                            type: 'string',
                            description: 'Error message',
                            example: 'OAuth processing failed'
                        }
                    },
                    required: ['error']
                }
            },
        },
    }, async (req, reply) => {
        const { code, state, error } = req.query;
        const mode = req.cookies.oauth_mode;
        
        if (mode === 'connect') {
            const accessToken = req.cookies.accessToken;
            if (!accessToken) {
                reply.clearCookie('oauth_mode', { path: '/' });
                return reply.redirect(`${config.FRONTEND_URL}/login?error=access_token_required`);
            }

            try {
                // 1) Verify current user (must be logged in)
                req.headers.authorization = `Bearer ${accessToken}`;
                await req.jwtVerify();
                const currentUserId = req.user.sub;

                // 2) CSRF state check
                const storedState = req.cookies.oauth_state;
                if (!state || !storedState || state !== storedState) {
                    fastify.log.warn({ 
                        state: state || 'missing', 
                        storedState: storedState || 'missing',
                        mode: 'connect'
                    }, 'Invalid state parameter in OAuth connect callback');
                    reply.clearCookie('oauth_state', { path: '/' });
                    reply.clearCookie('oauth_mode', { path: '/' });
                    return reply.redirect(`${config.FRONTEND_URL}/login?error=invalid_state`);
                }

                reply.clearCookie('oauth_state', { path: '/' });
                reply.clearCookie('oauth_mode', { path: '/' });

                // 3) Exchange code + get Google user
                const { tokens } = await fastify.trackExternal('google-oauth', () => client.getToken(code));
                client.setCredentials(tokens);

                const ticket = await fastify.trackExternal('google-oauth', () =>
                    client.verifyIdToken({
                        idToken: tokens.id_token,
                        audience: config.GOOGLE_CLIENT_ID,
                    })
                );

                const payload = ticket.getPayload();
                const googleUser = {
                    googleId: payload.sub,
                    email: payload.email,
                    picture: payload.picture, // Google profile picture URL
                };

                // 4) Make sure this Google ID is not already used by someone else
                const googleIdTaken = await new Promise((res, rej) => {
                    fastify.db.get(
                        'SELECT id FROM users WHERE google_id = ? AND id != ?',
                        [googleUser.googleId, currentUserId],
                        (err, row) => {
                            if (err) rej(err);
                            else res(!!row);
                        }
                    );
                });

                if (googleIdTaken) {
                    fastify.log.error(
                        {
                            googleId: googleUser.googleId,
                            userId: currentUserId,
                            attemptedEmail: googleUser.email,
                        },
                        'Attempted to link Google account already linked to another user'
                    );
                    return reply.redirect(
                        `${config.FRONTEND_URL}/settings/security-settings?error=google_account_already_linked`
                    );
                }

                // 5) Get current user's existing google_id (if any)
                const currentUser = await new Promise((res, rej) => {
                    fastify.db.get(
                        'SELECT google_id FROM users WHERE id = ?',
                        [currentUserId],
                        (err, row) => {
                            if (err) rej(err);
                            else res(row);
                        }
                    );
                });

                if (!currentUser) {
                    return reply.redirect(`${config.FRONTEND_URL}/login?error=user_not_found`);
                }

                // 6) If same Google already linked → just success, nothing to change
                if (currentUser.google_id && currentUser.google_id === googleUser.googleId) {
                    return reply.redirect(
                        `${config.FRONTEND_URL}/settings/security-settings?connected=google_success`
                    );
                }

                // 7) Otherwise, set / switch google_id to the new Google account and remember Google email for display
                const result = await new Promise((resolve, reject) => {
                    fastify.db.run(
                        'UPDATE users SET google_id = ?, google_email = ? WHERE id = ?',
                        [googleUser.googleId, googleUser.email, currentUserId],
                        function (err) {
                            if (err) {
                                if (err.code === 'SQLITE_CONSTRAINT') {
                                    reject(new Error('Google account already linked to another user'));
                                } else {
                                    reject(err);
                                }
                            } else {
                                // Verify the update
                                fastify.db.get(
                                    'SELECT google_id FROM users WHERE id = ?',
                                    [currentUserId],
                                    (verifyErr, verifyRow) => {
                                        if (verifyErr) {
                                            reject(verifyErr);
                                        } else if (
                                            verifyRow &&
                                            verifyRow.google_id === googleUser.googleId
                                        ) {
                                            resolve({ changes: this.changes, verified: true });
                                        } else {
                                            fastify.log.error(
                                                {
                                                    userId: currentUserId,
                                                    googleId: googleUser.googleId,
                                                },
                                                'Link verification failed in connect flow'
                                            );
                                            reject(new Error('Link verification failed'));
                                        }
                                    }
                                );
                            }
                        }
                    );
                });

                if (result.changes === 0) {
                    return reply.redirect(
                        `${config.FRONTEND_URL}/settings/security-settings?error=link_failed`
                    );
                }

                // Update avatar from Google if user doesn't have one (non-blocking)
                if (googleUser.picture) {
                    const userProfile = await new Promise((resolve, reject) => {
                        fastify.db.get(
                            'SELECT profile_pic FROM users WHERE id = ?',
                            [currentUserId],
                            (err, row) => {
                                if (err) reject(err);
                                else resolve(row);
                            }
                        );
                    });

                    // Only update if user doesn't have an avatar
                    if (!userProfile || !userProfile.profile_pic) {
                        uploadGoogleAvatar(googleUser.picture, currentUserId, fastify.log)
                            .then(async (objectKey) => {
                                if (objectKey) {
                                    const avatarUpdatedAt = Date.now();
                                    await new Promise((resolve, reject) => {
                                        fastify.db.run(
                                            'UPDATE users SET profile_pic = ?, avatar_updated_at = ? WHERE id = ?',
                                            [objectKey, avatarUpdatedAt, currentUserId],
                                            function(err) {
                                                if (err) {
                                                    fastify.log.error({ err, userId: currentUserId, objectKey }, 'Failed to update user avatar in database (connect flow)');
                                                    reject(err);
                                                } else {
                                                    fastify.log.info({ userId: currentUserId, objectKey }, 'Updated user avatar from Google (connect flow)');
                                                    resolve();
                                                }
                                            }
                                        );
                                    });
                                }
                            })
                            .catch((err) => {
                                fastify.log.error({ err, userId: currentUserId }, 'Error uploading Google avatar in connect flow (non-blocking)');
                            });
                    }
                }

                fastify.log.info(
                    {
                        userId: currentUserId,
                        googleId: googleUser.googleId,
                        googleEmail: googleUser.email,
                    },
                    'Google account linked successfully'
                );

                return reply.redirect(
                    `${config.FRONTEND_URL}/settings/security-settings?connected=google_success`
                );
            } catch (err) {
                reply.clearCookie('oauth_state', { path: '/' });
                reply.clearCookie('oauth_mode', { path: '/' });
                fastify.log.error(
                    { error: err.message, stack: err.stack },
                    'Error in OAuth connect flow'
                );

                if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
                    return reply.redirect(
                        `${config.FRONTEND_URL}/settings/security-settings?error=session_expired`
                    );
                }

                return reply.redirect(
                    `${config.FRONTEND_URL}/settings/security-settings?error=connect_failed`
                );
            }
        }
        
        // Handle OAuth errors from Google
        if (error) {
            fastify.log.warn({ error }, 'OAuth error from Google');
            reply.clearCookie('oauth_state', { path: '/' });
            reply.clearCookie('oauth_mode', { path: '/' });
            return reply.redirect(`${config.FRONTEND_URL}/login?error=oauth_cancelled`);
        }
        
        // Verify state parameter (CSRF protection) for login mode
        const storedState = req.cookies.oauth_state;
        if (!state || !storedState || state !== storedState) {
            fastify.log.warn({ 
                state: state || 'missing', 
                storedState: storedState || 'missing',
                mode: 'login'
            }, 'Invalid state parameter in OAuth login callback');
            reply.clearCookie('oauth_state', { path: '/' });
            reply.clearCookie('oauth_mode', { path: '/' });
            return reply.redirect(`${config.FRONTEND_URL}/login?error=invalid_state`);
        }
        
        reply.clearCookie('oauth_state', { path: '/' });
        
        try {
            const { tokens } = await fastify.trackExternal('google-oauth', () => client.getToken(code));
            client.setCredentials(tokens);

            const ticket = await fastify.trackExternal('google-oauth', () => client.verifyIdToken({
                idToken: tokens.id_token,
                audience: config.GOOGLE_CLIENT_ID
            }));
            
            const payload = ticket.getPayload();
            
            const googleUser = {
                googleId: payload.sub,
                email: payload.email,
                picture: payload.picture,
            };
            
            const existingUserByGoogleId = await new Promise((res, rej) => {
                fastify.db.get(
                    'SELECT id, email, google_id, password_hash, twofa_enabled, twofa_confirmed, is_verified FROM users WHERE google_id = ?',
                    [googleUser.googleId],
                    (err, row) => {
                        if (err) rej(err);
                        else res(row);
                    }
                )
            });
            
            let existingUser = existingUserByGoogleId;
            
            if (!existingUser) {
                existingUser = await new Promise((res, rej) => {
                    fastify.db.get(
                        'SELECT id, email, google_id, password_hash, twofa_enabled, twofa_confirmed, is_verified FROM users WHERE email = ?',
                        [googleUser.email],
                        (err, row) => {
                            if (err) rej(err);
                            else res(row);
                        }
                    )
                });
            }
            
            let userId;

            if (existingUser) {
                // User exists - link Google ID if not already linked
                userId = existingUser.id;
                
                // Check if Google account is already linked
                if (existingUser.google_id && existingUser.google_id === googleUser.googleId) {
                    // Already linked with same Google ID - proceed with login
                    // This is fine, continue with OAuth login flow
                } else if (existingUser.google_id && existingUser.google_id !== googleUser.googleId) {
                    // User has a different Google ID linked - don't auto-link
                    fastify.log.warn({
                        userId,
                        existingGoogleId: existingUser.google_id,
                        attemptedGoogleId: googleUser.googleId
                    }, 'User has different Google account linked');
                    return reply.redirect(`${config.FRONTEND_URL}/login?error=google_account_mismatch`);
                } else {
                    // No Google ID linked - only auto-link if user has no password (to prevent lockout)
                    // If user has password, require explicit "Connect" action
                    if (existingUser.password_hash) {
                        // User has password - don't auto-link, require explicit connect
                        fastify.log.info({
                            userId,
                            email: existingUser.email
                        }, 'User with password attempted OAuth login - require explicit connect');
                        return reply.redirect(`${config.FRONTEND_URL}/login?error=oauth_requires_connect`);
                    }
                    
                    // User has no password - safe to auto-link to prevent lockout
                    const googleIdTaken = await new Promise((resolve, reject) => {
                        fastify.db.get(
                            'SELECT id FROM users WHERE google_id = ? AND id != ?',
                            [googleUser.googleId, userId],
                            (err, row) => {
                                if (err) reject(err);
                                else resolve(!!row);
                            }
                        );
                    });
                
                    if (googleIdTaken) {
                        fastify.log.error({
                            googleId: googleUser.googleId,
                            userId,
                            attemptedEmail: existingUser.email
                        }, 'Attempted to link Google account already linked to another user');
                        return reply.redirect(`${config.FRONTEND_URL}/login?error=google_account_already_linked`);
                    }
                
                    // Now safely link and store Google email for display
                    const result = await new Promise((resolve, reject) => {
                        fastify.db.run(
                            'UPDATE users SET google_id = ?, google_email = ? WHERE id = ?',
                            [googleUser.googleId, googleUser.email, userId],
                            function(err) {
                                if (err) {
                                    if (err.code === 'SQLITE_CONSTRAINT') {
                                        reject(new Error('Google account already linked to another user'));
                                    } else {
                                        reject(err);
                                    }
                                } else {
                                    // Add verification to ensure it was actually updated
                                    fastify.db.get(
                                        'SELECT google_id FROM users WHERE id = ?',
                                        [userId],
                                        (verifyErr, verifyRow) => {
                                            if (verifyErr) {
                                                reject(verifyErr);
                                            } else if (verifyRow && verifyRow.google_id === googleUser.googleId) {
                                                resolve({ changes: this.changes, verified: true });
                                            } else {
                                                fastify.log.error({ userId, googleId: googleUser.googleId }, 'Link verification failed');
                                                reject(new Error('Link verification failed'));
                                            }
                                        }
                                    );
                                }
                            }
                        );
                    });
                
                    if (result.changes === 0) {
                        return reply.redirect(`${config.FRONTEND_URL}/login?error=link_failed`);
                    }

                    // Update avatar from Google if user doesn't have one (non-blocking)
                    if (googleUser.picture) {
                        // Check if user already has an avatar
                        const userProfile = await new Promise((resolve, reject) => {
                            fastify.db.get(
                                'SELECT profile_pic FROM users WHERE id = ?',
                                [userId],
                                (err, row) => {
                                    if (err) reject(err);
                                    else resolve(row);
                                }
                            );
                        });

                        // Only update if user doesn't have an avatar
                        if (!userProfile || !userProfile.profile_pic) {
                            uploadGoogleAvatar(googleUser.picture, userId, fastify.log)
                                .then(async (objectKey) => {
                                    if (objectKey) {
                                        const avatarUpdatedAt = Date.now();
                                        await new Promise((resolve, reject) => {
                                            fastify.db.run(
                                                'UPDATE users SET profile_pic = ?, avatar_updated_at = ? WHERE id = ?',
                                                [objectKey, avatarUpdatedAt, userId],
                                                function(err) {
                                                    if (err) {
                                                        fastify.log.error({ err, userId, objectKey }, 'Failed to update user avatar in database');
                                                        reject(err);
                                                    } else {
                                                        fastify.log.info({ userId, objectKey }, 'Updated existing user avatar from Google');
                                                        resolve();
                                                    }
                                                }
                                            );
                                        });
                                    }
                                })
                                .catch((err) => {
                                    fastify.log.error({ err, userId }, 'Error uploading Google avatar for existing user (non-blocking)');
                                });
                        }
                    }
                }

                // Continue with existing login flow...
                if (existingUser && !existingUser.password_hash) {
                    const token = fastify.jwt.sign({ 
                        sub: existingUser.id, 
                        email: existingUser.email,
                        scope: 'set_password' 
                    }, { expiresIn: config.JWT_ACCESS_EXPIRES_IN });
                    
                    return reply.redirect(`${config.FRONTEND_URL}/set-password?token=${token}`);
                }
                
                // User has password, continue with normal OAuth flow
            } else {
                // Double-check email doesn't exist (edge case: race condition or unlinked account)
                const emailCheck = await new Promise((resolve, reject) => {
                    fastify.db.get(
                        'SELECT id, password_hash, google_id FROM users WHERE email = ?',
                        [googleUser.email],
                        (err, row) => {
                            if (err) reject(err);
                            else resolve(row);
                        }
                    );
                });
                
                if (emailCheck) {
                    fastify.log.warn({
                        email: googleUser.email,
                        existingUserId: emailCheck.id,
                        hasPassword: !!emailCheck.password_hash,
                        hasGoogleId: !!emailCheck.google_id
                    }, 'Email found during new user creation - possible race condition or unlinked account');
                    
                    // If user has password, require explicit connect
                    if (emailCheck.password_hash) {
                        return reply.redirect(`${config.FRONTEND_URL}/login?error=email_already_registered`);
                    }
                    
                    // No password - try to link to prevent lockout, and remember Google email for display
                    const linkResult = await new Promise((resolve, reject) => {
                        fastify.db.run(
                            'UPDATE users SET google_id = ?, google_email = ? WHERE id = ? AND google_id IS NULL',
                            [googleUser.googleId, googleUser.email, emailCheck.id],
                            function(err) {
                                if (err) reject(err);
                                else resolve({ changes: this.changes });
                            }
                        );
                    });
                    
                    if (linkResult.changes > 0) {
                        const token = fastify.jwt.sign({ 
                            sub: emailCheck.id, 
                            email: googleUser.email,
                            scope: 'set_password' 
                        }, { expiresIn: config.JWT_ACCESS_EXPIRES_IN });
                        
                        return reply.redirect(`${config.FRONTEND_URL}/set-password?token=${token}`);
                    }
                    
                    return reply.redirect(`${config.FRONTEND_URL}/login?error=email_already_registered`);
                }
            
                // New user - create account and redirect to set-password
                let userId;
                try {
                    userId = await new Promise((resolve, reject) => {
                        fastify.db.run(
                            'INSERT INTO users (email, google_id, is_verified, google_email) VALUES (?, ?, 1, ?)',
                            [googleUser.email, googleUser.googleId, googleUser.email],
                            function(err) {
                                if (err) {
                                    // Handle constraint violations
                                    if (err.code === 'SQLITE_CONSTRAINT' || err.message.includes('UNIQUE constraint') || err.message.includes('email')) {
                                        reject(new Error('EMAIL_ALREADY_EXISTS'));
                                    } else {
                                        reject(err);
                                    }
                                } else {
                                    resolve(this.lastID);
                                }
                            }
                        );
                    });
                } catch (insertError) {
                    // Handle email constraint violation
                    if (insertError.message === 'EMAIL_ALREADY_EXISTS' || 
                        (insertError.code === 'SQLITE_CONSTRAINT' && insertError.message.includes('email'))) {
                        fastify.log.warn({
                            email: googleUser.email,
                            error: insertError.message
                        }, 'Email constraint violation during user creation');
                        
                        return reply.redirect(`${config.FRONTEND_URL}/login?error=email_already_registered`);
                    }
                
                    throw insertError;
                }

                // Download and upload Google profile picture to MinIO (non-blocking)
                if (googleUser.picture) {
                    uploadGoogleAvatar(googleUser.picture, userId, fastify.log)
                        .then(async (objectKey) => {
                            if (objectKey) {
                                const avatarUpdatedAt = Date.now();
                                await new Promise((resolve, reject) => {
                                    fastify.db.run(
                                        'UPDATE users SET profile_pic = ?, avatar_updated_at = ? WHERE id = ?',
                                        [objectKey, avatarUpdatedAt, userId],
                                        function(err) {
                                            if (err) {
                                                fastify.log.error({ err, userId, objectKey }, 'Failed to update user avatar in database');
                                                reject(err);
                                            } else {
                                                fastify.log.info({ userId, objectKey }, 'Updated user avatar from Google');
                                                resolve();
                                            }
                                        }
                                    );
                                });
                            }
                        })
                        .catch((err) => {
                            fastify.log.error({ err, userId }, 'Error uploading Google avatar (non-blocking)');
                        });
                }
                
                const token = fastify.jwt.sign({
                    sub: userId, 
                    email: googleUser.email,
                    scope: 'set_password' 
                }, { expiresIn: config.JWT_ACCESS_EXPIRES_IN });

                return reply.redirect(`${config.FRONTEND_URL}/set-password?token=${token}`);
            }
            
            // Check if user has 2FA enabled and requires verification
            if (existingUser && existingUser.twofa_enabled && existingUser.twofa_confirmed) {
                console.log('🔐 [OAuth Debug] User has 2FA enabled and requires verification');
                console.log('🔐 [OAuth Debug] User ID:', userId, '2FA Enabled:', existingUser.twofa_enabled, '2FA Confirmed:', existingUser.twofa_confirmed);
                
                // User has 2FA enabled - require 2FA verification
                const pre2faExpiresIn = 5 * 60; // 5 minutes
                const pre2faToken = fastify.jwt.sign({ sub: userId, scope: 'needs_2fa' }, { expiresIn: pre2faExpiresIn });

                console.log('🔐 [OAuth Debug] Setting pre2faToken cookie for user:', userId);
                reply.setCookie('pre2faToken', pre2faToken, {
                    httpOnly: true,
                    secure: config.NODE_ENV === 'production',
                    sameSite: 'lax',  // Must be 'lax' for cross-origin OAuth redirects
                    maxAge: pre2faExpiresIn,
                    path: '/'
                });

                console.log('🔐 [OAuth Debug] Redirecting to:', `${config.FRONTEND_URL}/twofa?oauth=true`);
                return reply.redirect(`${config.FRONTEND_URL}/twofa?oauth=true`);
            }

            if (existingUser && !existingUser.is_verified) {
                return reply.redirect(`${config.FRONTEND_URL}/login?error=email_not_verified`);
            }

            // Check if user has 2FA enabled but not confirmed (incomplete setup)
            if (existingUser && existingUser.twofa_enabled && !existingUser.twofa_confirmed) {
                return reply.redirect(`${config.FRONTEND_URL}/login?error=2fa_setup_required`);
            }
            
            // Use existingUser email if available, otherwise use googleUser email (for new users)
            const userEmail = existingUser?.email || googleUser.email;
            const accessToken = fastify.jwt.sign(
                { sub: userId, email: userEmail },
                { expiresIn: config.JWT_ACCESS_EXPIRES_IN }
            );
            const refreshToken = fastify.jwt.sign(
                { sub: userId, email: userEmail },
                { expiresIn: config.JWT_REFRESH_EXPIRES_IN }
            );
            
            const refreshExpirySeconds = config.JWT_REFRESH_EXPIRES_IN
                ? parseInt(config.JWT_REFRESH_EXPIRES_IN) * 24 * 60 * 60
                : 7 * 24 * 60 * 60; // Default to 7 days in seconds
            const expiresAt = Math.floor(Date.now() / 1000) + refreshExpirySeconds;
            
            await new Promise((resolve, reject) => {
                fastify.db.run('INSERT INTO refresh_tokens(user_id, token, expires_at) VALUES (?, ?, ?)', 
                    [userId, refreshToken, expiresAt], 
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
            
             // Set cookies
            const accessTokenExpiry = config.JWT_ACCESS_EXPIRES_IN
                ? parseInt(config.JWT_ACCESS_EXPIRES_IN) * 60
                : 15 * 60; // Default to 15 minutes in seconds

            const refreshTokenExpiry = config.JWT_REFRESH_EXPIRES_IN
                ? parseInt(config.JWT_REFRESH_EXPIRES_IN) * 24 * 60 * 60
                : 7 * 24 * 60 * 60; // Default to 7 days in seconds

            reply
                .setCookie('accessToken', accessToken, {
                    httpOnly: true,
                    secure: config.NODE_ENV === 'production',
                    // Lax is required so the cookie is sent on OAuth redirects (Google → backend)
                    sameSite: 'lax',
                    maxAge: accessTokenExpiry,
                    path: '/'
                })
                .setCookie('refreshToken', refreshToken, {
                    httpOnly: true,
                    secure: config.NODE_ENV === 'production',
                    sameSite: 'lax',
                    maxAge: refreshTokenExpiry,
                    path: '/'
                });
        
            return reply.redirect(`${config.FRONTEND_URL}?login=success`);

        } catch (error) {
            fastify.log.error({ error: error.message, stack: error.stack }, 'Google OAuth error');
            reply.clearCookie('oauth_state', { path: '/' });
            reply.clearCookie('oauth_mode', { path: '/' });
            return reply.redirect(`${config.FRONTEND_URL}/login?error=oauth_failed`);
        }
    })
};