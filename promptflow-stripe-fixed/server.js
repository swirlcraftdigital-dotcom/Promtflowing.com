const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
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
        
        // Lookup items from in-memory DB first, then fall back to Stripe metadata
        let purchasedItems = mockSessionDB[session.id] || {};
        
        if (!purchasedItems.items && session.metadata && session.metadata.items) {
            try {
                purchasedItems = {
                    email: session.metadata.customerEmail || session.customer_details?.email,
                    items: JSON.parse(session.metadata.items)
                };
            } catch (e) {
                console.error('Failed to parse items from metadata:', e);
            }
        }
        
        const customerEmail = session.customer_details?.email || session.customer_email || purchasedItems.email || null;

        if (customerEmail && customerEmail !== 'customer@example.com') {
            console.log(`Payment successful for session ${session.id}. Sending receipt to ${customerEmail}...`);
            await sendReceiptEmail(customerEmail, purchasedItems.items || []);
        } else {
            console.log(`Payment successful for session ${session.id}. No customer email available — skipping receipt.`);
        }
    }

    res.status(200).end();
});

// For all other routes, parse JSON
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Mock DB to store items between checkout creation and webhook completion
const mockSessionDB = {};


function buildSafeCheckoutUrls(req, requestedSuccessUrl, requestedCancelUrl) {
    const origin = `${req.protocol}://${req.get('host')}`;
    const safePath = '/';

    let successBase = origin + safePath;
    let cancelUrl = origin + '/?checkout_cancel=true';

    try {
        if (requestedSuccessUrl) {
            const parsed = new URL(requestedSuccessUrl, origin);
            if (parsed.origin === origin) successBase = parsed.origin + parsed.pathname;
        }
        if (requestedCancelUrl) {
            const parsed = new URL(requestedCancelUrl, origin);
            if (parsed.origin === origin) cancelUrl = parsed.href;
        }
    } catch (_) {}

    return {
        successUrl: `${successBase}?checkout_success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl
    };
}

function sanitizeCheckoutItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error('Your cart is empty.');
    }

    return items.map(item => {
        const price = Number(item.price);
        if (!Number.isFinite(price) || price <= 0) {
            throw new Error(`Invalid price for ${item.title || 'item'}. Paid products must be greater than $0.`);
        }

        return {
            id: String(item.id || '').slice(0, 120),
            title: String(item.title || 'Premium Prompt').slice(0, 180),
            type: String(item.type || 'AI Prompt').slice(0, 120),
            price,
            previewPrompt: String(item.previewPrompt || '').slice(0, 200)
        };
    });
}

// --- EMAIL CONFIGURATION ---
let transporter;
async function initMailer() {
    let configured = false;
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        try {
            transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
                port: process.env.SMTP_PORT || 587,
                secure: false,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
            await transporter.verify();
            console.log("Real Email Transporter Initialized and Verified successfully.");
            configured = true;
        } catch (err) {
            console.warn("⚠️ Real SMTP verification failed (EAUTH/Invalid Login). Falling back to Ethereal Mailer...", err.message);
        }
    }
    
    if (!configured) {
        try {
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
        } catch (err) {
            console.error("❌ Critical: Failed to initialize even the fallback Ethereal mailer:", err);
        }
    }
}
initMailer();

app.post('/api/signup', async (req, res) => {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    try {
        let info = await transporter.sendMail({
            from: process.env.SMTP_FROM || '"PromptFlow" <swirlcraftdigital@gmail.com>',
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

app.post('/api/trigger-simulated-receipt', async (req, res) => {
    const { email, items } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });
    
    try {
        console.log(`Triggering simulated receipt email for ${email}...`);
        await sendReceiptEmail(email, items || []);
        res.json({ success: true });
    } catch (err) {
        console.error("Failed to send simulated receipt email:", err);
        res.status(500).json({ error: "Failed to send email." });
    }
});

app.post('/api/create-checkout-session', async (req, res) => {
    try {
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey || stripeKey === 'your_stripe_secret_key_here' || stripeKey.startsWith('mk_') || !stripeKey.startsWith('sk_')) {
            return res.status(400).json({
                error: 'Stripe Secret Key is not configured. Set STRIPE_SECRET_KEY in your server environment. Use sk_test_ for testing or sk_live_ for real payments.'
            });
        }

        const stripe = require('stripe')(stripeKey);
        const { customerEmail, successUrl: requestedSuccessUrl, cancelUrl: requestedCancelUrl } = req.body;
        const items = sanitizeCheckoutItems(req.body.items);
        const urls = buildSafeCheckoutUrls(req, requestedSuccessUrl, requestedCancelUrl);

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

        const metadataItems = items.map(item => ({
            id: item.id,
            title: item.title,
            type: item.type,
            price: item.price,
            previewPrompt: item.previewPrompt
        }));

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            customer_email: customerEmail || undefined,
            success_url: urls.successUrl,
            cancel_url: urls.cancelUrl,
            metadata: {
                item_ids: items.map(item => item.id).join(','),
                items: JSON.stringify(metadataItems).slice(0, 500),
                customerEmail: customerEmail || ''
            }
        });

        mockSessionDB[session.id] = { email: customerEmail, items };
        res.json({ id: session.id, url: session.url });
    } catch (error) {
        console.error('Stripe checkout error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/verify-checkout-session', async (req, res) => {
    try {
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey || !stripeKey.startsWith('sk_')) {
            return res.status(500).json({ success: false, error: 'Stripe is not configured on the server.' });
        }

        const sessionId = String(req.query.session_id || '');
        if (!sessionId.startsWith('cs_')) {
            return res.status(400).json({ success: false, error: 'Invalid Checkout Session ID.' });
        }

        const stripe = require('stripe')(stripeKey);
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== 'paid' || session.status !== 'complete') {
            return res.status(402).json({
                success: false,
                payment_status: session.payment_status,
                status: session.status,
                error: 'Payment is not complete.'
            });
        }

        let purchasedItems = mockSessionDB[session.id]?.items || [];

        if (!purchasedItems.length && session.metadata?.items) {
            try { purchasedItems = JSON.parse(session.metadata.items); } catch (_) {}
        }

        if (!purchasedItems.length && session.metadata?.item_ids) {
            purchasedItems = session.metadata.item_ids.split(',').filter(Boolean).map(id => ({ id }));
        }

        res.json({
            success: true,
            id: session.id,
            payment_status: session.payment_status,
            status: session.status,
            items: purchasedItems
        });
    } catch (error) {
        console.error('Stripe verification error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

async function sendReceiptEmail(email, items) {
    if (!transporter) return;
    if (!email) return;
    
    const promptsHtml = items.map(item => {
        // Generate a full unlocked prompt for the email
        const fullPrompt = `[FULL UNLOCKED PROMPT — ${item.type}]

[System Instruction]
Act as an elite ${item.type} specialist. You are generating a professional-grade ${(item.title || '').toLowerCase()} output.

${item.previewPrompt || ''}

[Advanced Parameters]
Resolution: 4K Ultra HD
Aspect Ratio: 16:9 Cinematic
Frame Rate: 24fps (Film) / 60fps (Smooth)
Camera: Dynamic tracking shot with parallax depth
Lighting: Volumetric rays, ambient occlusion, rim lighting
Color Grading: Teal & Orange cinematic palette
Motion: Smooth bezier easing, 2s transitions
Post-Processing: Film grain 15%, chromatic aberration subtle

[Output Format]
Deliver the final result as a structured JSON schema with all parameters locked. Include fallback values for each parameter.`;
        
        return `
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
            <h3 style="margin-top: 0; color: #1e293b; font-size: 18px;">${item.title} <span style="color: #64748b; font-size: 14px;">(${item.type})</span></h3>
            <pre style="background-color: #1e293b; color: #4ade80; padding: 20px; border-radius: 8px; overflow-x: auto; font-family: 'Courier New', monospace; font-size: 13px; white-space: pre-wrap; line-height: 1.6;">${fullPrompt}</pre>
        </div>
    `}).join('');

    try {
        let info = await transporter.sendMail({
            from: process.env.SMTP_FROM || '"PromptFlow" <swirlcraftdigital@gmail.com>',
            to: email,
            subject: "✨ Your PromptFlow Purchase — Premium Prompts Unlocked!",
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; max-width: 650px; margin: 0 auto; color: #333; background-color: #ffffff;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #1e293b; font-size: 28px; margin-bottom: 8px;">Thank you for your purchase! 🎉</h1>
                        <p style="color: #64748b; font-size: 16px;">Your premium prompts are ready to use.</p>
                    </div>
                    
                    <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 30px; text-align: center;">
                        <p style="margin: 0; font-size: 14px; opacity: 0.9;">Your full, unlocked prompts are included below.</p>
                        <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">They’re also available in your <strong>Vault Dashboard</strong> at promptflowing.com.</p>
                    </div>
                    
                    ${promptsHtml}
                    
                    <div style="margin-top: 30px; padding: 20px; background-color: #f1f5f9; border-radius: 12px; text-align: center;">
                        <p style="font-size: 14px; color: #64748b; margin: 0;">Questions? Reply to this email or contact <a href="mailto:support@promptflowing.com" style="color: #3b82f6;">support@promptflowing.com</a></p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                        <p style="font-size: 12px; color: #94a3b8;">&copy; 2026 PromptFlow. All rights reserved.</p>
                    </div>
                </div>
            `,
        });
        console.log("Receipt Email sent! Preview URL: %s", nodemailer.getTestMessageUrl(info));
    } catch (err) {
        console.error("Failed to send receipt email:", err);
    }
}

// Dynamic Sitemap for SEO crawling
app.get('/sitemap.xml', (req, res) => {
    res.header('Content-Type', 'application/xml');
    
    // Standard site sitemap template
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://www.promptflowing.com/</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>https://www.promptflowing.com/#page-video</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.9</priority>
    </url>
    <url>
        <loc>https://www.promptflowing.com/#page-free</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>https://www.promptflowing.com/#page-contact</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.5</priority>
    </url>
</urlset>`;
    
    res.send(sitemap);
});

// Dynamic robots.txt
app.get('/robots.txt', (req, res) => {
    res.header('Content-Type', 'text/plain');
    res.send(`User-agent: *
Allow: /
Sitemap: https://www.promptflowing.com/sitemap.xml`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
