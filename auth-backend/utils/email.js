const nodemailer = require('nodemailer');

// Check which email service to use
// const useSendGrid = process.env.USE_SENDGRID === 'true';
const useSendGrid = false;

let transporter;

if (useSendGrid) {
    // SendGrid SMTP configuration
    transporter = nodemailer.createTransport({
        host: process.env.SENDGRID_SMTP_HOST,
        port: Number(process.env.SENDGRID_SMTP_PORT || 587),
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SENDGRID_SMTP_USER, 
            pass: process.env.SENDGRID_SMTP_PASS,
        },
    });
    
    console.log(`✓ SendGrid configured for ${process.env.SENDGRID_SMTP_HOST || 'smtp.sendgrid.net'}`);
} else {
    // Fallback to regular SMTP (for development with Mailpit)
    const host = process.env.SMTP_HOST || 'mailpit';
    const port = Number(process.env.SMTP_PORT || 1025);
    const user = process.env.SMTP_USER || '';
    const pass = process.env.SMTP_PASS || '';

    transporter = nodemailer.createTransport({
        host,
        port,
        secure: false,
        auth: user && pass ? { user, pass } : undefined,
    });
    
    console.log(`✓ SMTP configured for host: ${host}:${port}`);
}

module.exports = { transporter };