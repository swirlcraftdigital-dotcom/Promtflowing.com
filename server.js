require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());

// Webhook must be parsed as raw body for Stripe signature verification
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    try {
        if (endpointSecret) {
            event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        } else {
            // For local testing without CLI/secret, we just trust the payload
            event = JSON.parse(req.body);
        }
    } catch (err) {
        console.error(`Webhook signature verification failed:`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        
        // Lookup the items from our mock in-memory DB
        const purchasedItems = mockSessionDB[session.id] || {};
        const customerEmail = session.customer_details?.email || session.customer_email || purchasedItems.email || "customer@example.com";

        console.log(`Payment successful for session ${session.id}. Sending receipt to ${customerEmail}...`);
        
        // Send Receipt Email
        await sendReceiptEmail(customerEmail, purchasedItems.items || []);
    }

    res.status(200).end();
});

// For all other routes, parse JSON
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Mock DB to store items between checkout creation and webhook completion
const mockSessionDB = {};

// --- EMAIL CONFIGURATION ---
let transporter;
async function initMailer() {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
        console.log("Real Email Transporter Initialized.");
    } else {
        // Fallback to testing account if no real credentials are provided
        let testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false, 
            auth: {
                user: testAccount.user, 
                pass: testAccount.pass, 
            },
        });
        console.log("Test Email Transporter Initialized (Ethereal).");
    }
}
initMailer();

app.post('/api/signup', async (req, res) => {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    try {
        let info = await transporter.sendMail({
            from: process.env.SMTP_FROM || '"PromptFlow Welcome" <welcome@promptflowing.com>',
            to: email,
            subject: "Welcome to PromptFlow! 🚀",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2>Welcome to PromptFlow, ${name}!</h2>
                    <p>We are thrilled to have you on board. You now have access to over 22,000 elite AI prompts designed to supercharge your workflow.</p>
                    <p>If you have any questions, feel free to reply to this email.</p>
                    <br/>
                    <p>Best regards,</p>
                    <p><strong>The PromptFlow Team</strong></p>
                </div>
            `,
        });
        console.log("Welcome Email sent! Preview URL: %s", nodemailer.getTestMessageUrl(info));
        res.json({ success: true, previewUrl: nodemailer.getTestMessageUrl(info) });
    } catch (err) {
        console.error("Failed to send welcome email:", err);
        res.status(500).json({ error: "Failed to send email." });
    }
});

app.post('/api/create-checkout-session', async (req, res) => {
    try {
        if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'your_stripe_secret_key_here') {
            return res.status(500).json({ 
                error: "Stripe Secret Key not configured. Please add it to your .env file." 
            });
        }
        
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const { items, customerEmail, successUrl, cancelUrl } = req.body;

        const lineItems = items.map(item => ({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: item.title,
                    description: item.type,
                },
                unit_amount: Math.round(item.price * 100), 
            },
            quantity: 1,
        }));

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            customer_email: customerEmail,
            success_url: successUrl,
            cancel_url: cancelUrl,
        });

        // Store items in memory so the webhook can retrieve them
        mockSessionDB[session.id] = { email: customerEmail, items: items };

        res.json({ id: session.id, url: session.url });
    } catch (error) {
        console.error('Stripe error:', error);
        res.status(500).json({ error: error.message });
    }
});

async function sendReceiptEmail(email, items) {
    if (!transporter) return;
    
    const promptsHtml = items.map(item => `
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
            <h3 style="margin-top: 0; color: #1e293b;">${item.title} (${item.type})</h3>
            <pre style="background-color: #1e293b; color: #f8fafc; padding: 15px; border-radius: 6px; overflow-x: auto; font-family: monospace; font-size: 14px; white-space: pre-wrap;">${item.previewPrompt}</pre>
        </div>
    `).join('');

    try {
        let info = await transporter.sendMail({
            from: process.env.SMTP_FROM || '"PromptFlow Orders" <orders@promptflowing.com>',
            to: email,
            subject: "Your PromptFlow Receipt & Access Details",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; max-w: 600px; margin: 0 auto; color: #333;">
                    <h2 style="color: #2563eb;">Thank you for your purchase!</h2>
                    <p>Your payment was successful. Below are the premium prompts you purchased:</p>
                    ${promptsHtml}
                    <p style="margin-top: 30px; font-size: 14px; color: #64748b;">
                        These prompts have also been added to your Dashboard Vault. 
                    </p>
                </div>
            `,
        });
        console.log("Receipt Email sent! Preview URL: %s", nodemailer.getTestMessageUrl(info));
    } catch (err) {
        console.error("Failed to send receipt email:", err);
    }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
