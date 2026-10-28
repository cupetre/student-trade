const logger = require('./logger');

const log = logger.createLogger('email');

// Sends email through Amazon SES (v2 API).
//
// Dev mode: if EMAIL_FROM isn't set in .env, nothing is sent. The email
// (including any links in it) is printed to the server log instead, so you
// can test the whole sign-up flow before SES is set up.

let sesClient = null;

function getClient() {
    if (!sesClient) {
        // Required here instead of at the top so the server still starts
        // before @aws-sdk/client-sesv2 is installed (dev mode doesn't need it).
        const { SESv2Client } = require('@aws-sdk/client-sesv2');
        sesClient = new SESv2Client({
            region: process.env.SES_REGION || process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
        });
    }
    return sesClient;
}

async function sendEmail({ to, subject, html, text }) {
    const from = process.env.EMAIL_FROM;

    if (!from) {
        log.warn({ to, subject, text }, `Dev mode (no EMAIL_FROM): NOT sent to ${to}. The email is below, open its link to continue.`);
        return { delivered: false };
    }

    const { SendEmailCommand } = require('@aws-sdk/client-sesv2');
    await getClient().send(new SendEmailCommand({
        FromEmailAddress: from,
        Destination: { ToAddresses: [to] },
        Content: {
            Simple: {
                Subject: { Data: subject, Charset: 'UTF-8' },
                Body: {
                    Html: { Data: html, Charset: 'UTF-8' },
                    Text: { Data: text, Charset: 'UTF-8' },
                },
            },
        },
    }));

    return { delivered: true };
}

module.exports = { sendEmail };
