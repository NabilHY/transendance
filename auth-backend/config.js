module.exports = {
	PORT: process.env.AUTH_PORT || 8005,
	SERVICE_NAME: process.env.TARGET_1 || 'auth-backend',
	NODE_ENV: process.env.NODE_ENV,
	JWT_SECRET: process.env.JWT_SECRET,
	JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN,
	JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN,
	
	GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
	GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
	FRONTEND_URL: process.env.FRONTEND_URL,
	USR_MANAG_URL: process.env.USR_MANAG_SERVICE_URL || 'http://localhost:4000',
	
	// Public-facing backend URL for email links (should be accessible from user's browser)
	// Defaults to localhost for development, should be set to public URL in production
	BACKEND_URL: process.env.AUTH_BACKEND_URL || process.env.PUBLIC_AUTH_BACKEND_URL || `http://localhost:${process.env.AUTH_PORT || 8005}`,
	
	// Email Configuration
	EMAIL_FROM: process.env.EMAIL_FROM,
	SMTP_FROM: process.env.SMTP_FROM,
	
	// SendGrid Configuration
	USE_SENDGRID: process.env.USE_SENDGRID === 'true',
	SENDGRID_SMTP_HOST: process.env.SENDGRID_SMTP_HOST,
	SENDGRID_SMTP_PORT: process.env.SENDGRID_SMTP_PORT || 587,
	SENDGRID_SMTP_USER: process.env.SENDGRID_SMTP_USER,
	SENDGRID_SMTP_PASS: process.env.SENDGRID_SMTP_PASS,
	
	// Generic SMTP Configuration (for Mailpit or other SMTP servers)
	SMTP_HOST: process.env.SMTP_HOST,
	SMTP_PORT: process.env.SMTP_PORT,
	SMTP_USER: process.env.SMTP_USER,
	SMTP_PASSWORD: process.env.SMTP_PASSWORD,
	SMTP_PASS: process.env.SMTP_PASS,
	
	INTERNAL_SERVICE_KEY: process.env.INTERNAL_SERVICE_KEY,
};