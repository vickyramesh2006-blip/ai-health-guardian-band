require('dotenv').config();
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Twilio Client Initialization
const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

/**
 * POST /send-sms
 * Coordinates the sending of emergency SMS alerts.
 */
app.post('/send-sms', async (req, res) => {
    const { to, message } = req.body;

    if (!to || !message) {
        return res.status(400).json({ 
            success: false, 
            message: 'Recipient number and message are required.' 
        });
    }

    try {
        console.log(`Attempting to send SMS to ${to}...`);
        
        const response = await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: to
        });

        console.log(`SMS Sent successfully: ${response.sid}`);
        
        res.status(200).json({ 
            success: true, 
            sid: response.sid,
            message: 'SMS delivered successfully!' 
        });

    } catch (error) {
        console.error('Twilio Error:', error);
        
        // Return a user-friendly error from Twilio
        let errorMsg = 'Failed to send SMS via Twilio.';
        if (error.code === 21211) errorMsg = 'The phone number is invalid.';
        if (error.code === 21608) errorMsg = 'Your Twilio trial account only allows sending to verified numbers.';
        if (error.status === 401) errorMsg = 'Invalid Twilio credentials in .env file.';

        res.status(error.status || 500).json({ 
            success: false, 
            message: errorMsg,
            details: error.message 
        });
    }
});

app.listen(port, () => {
    console.log(`🚀 HealthGuard Backend running at http://localhost:${port}`);
});
