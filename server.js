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

// --- PERSISTENT E-COMMERCE ADMIN STORE DATABASE ---
const fs = require('fs');
const statsFilePath = path.join(__dirname, 'admin_stats.json');

let adminStats = {
    views: 1842, // Starting e-commerce traffic base
    sales: 14,
    revenue: 21.00,
    emailLogs: [],
    recentSales: [],
    productClicks: {}
};

function loadStats() {
    if (fs.existsSync(statsFilePath)) {
        try {
            const raw = fs.readFileSync(statsFilePath, 'utf8');
            adminStats = JSON.parse(raw);
        } catch (e) {
            console.error("Failed to load admin stats:", e);
        }
    }
}
function saveStats() {
    try {
        fs.writeFileSync(statsFilePath, JSON.stringify(adminStats, null, 2), 'utf8');
    } catch (e) {
        console.error("Failed to save admin stats:", e);
    }
}
loadStats();

function trackSaleInternal(email, items, totalPaid) {
    adminStats.sales += 1;
    adminStats.revenue += parseFloat(totalPaid) || 0;
    
    const transaction = {
        email: email,
        itemsCount: items.length,
        itemsSummary: items.map(i => `${i.title} (${i.type})`).join(', '),
        amount: parseFloat(totalPaid),
        timestamp: new Date().toLocaleString()
    };
    adminStats.recentSales.unshift(transaction);
    if (adminStats.recentSales.length > 50) adminStats.recentSales.pop();
    
    saveStats();
}

function logEmailInternal(email, subject, itemsCount) {
    const log = {
        email: email,
        subject: subject,
        itemsCount: itemsCount,
        timestamp: new Date().toLocaleString(),
        status: 'Dispatched Successfully'
    };
    adminStats.emailLogs.unshift(log);
    if (adminStats.emailLogs.length > 50) adminStats.emailLogs.pop();
    
    saveStats();
}

// --- ADMIN DASHBOARD AUTHENTICATION MIDDLEWARE ---
const authAdmin = (req, res, next) => {
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASS || 'SwirlCraftAdmin2026!';
    
    const headerPass = req.headers['x-admin-password'];
    if (headerPass === adminPass) {
        return next();
    }
    
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Basic ')) {
        try {
            const credentialsStr = Buffer.from(authHeader.split(' ')[1], 'base64').toString('ascii');
            const [user, pass] = credentialsStr.split(':');
            if (user === adminUser && pass === adminPass) {
                return next();
            }
        } catch (e) {
            // Ignore parse errors
        }
    }
    
    console.log("Admin auth fail: headerPass=" + JSON.stringify(headerPass) + ", adminPass=" + JSON.stringify(adminPass));
    res.status(401).json({ error: "Unauthorized access to Admin API. Please provide valid admin credentials." });
};

// --- ADMIN DASHBOARD ENDPOINTS ---
app.get('/api/admin/stats', authAdmin, (req, res) => {
    res.json(adminStats);
});

app.post('/api/admin/track-view', (req, res) => {
    adminStats.views += 1;
    saveStats();
    res.json({ success: true, views: adminStats.views });
});

app.post('/api/admin/track-product-click', (req, res) => {
    const { productId } = req.body;
    if (productId) {
        adminStats.productClicks[productId] = (adminStats.productClicks[productId] || 0) + 1;
        saveStats();
    }
    res.json({ success: true });
});

app.post('/api/admin/track-sale', (req, res) => {
    const { email, items, totalPaid } = req.body;
    trackSaleInternal(email || 'stripe_checkout@promptflow.ai', items || [], totalPaid || 0);
    res.json({ success: true });
});

app.post('/api/admin/reset', authAdmin, (req, res) => {
    adminStats = {
        views: 0,
        sales: 0,
        revenue: 0.00,
        emailLogs: [],
        recentSales: [],
        productClicks: {}
    };
    saveStats();
    res.json({ success: true });
});


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
        
        // Accumulate total items price for e-commerce sale tracking
        let totalPaid = 0;
        (items || []).forEach(item => {
            totalPaid += parseFloat(item.price) || 0;
        });
        trackSaleInternal(email, items || [], totalPaid);

        res.json({ success: true });
    } catch (err) {
        console.error("Failed to send simulated receipt email:", err);
        res.status(500).json({ error: "Failed to send email." });
    }
});

// Expose only the publishable key to the frontend — never the secret key
app.get('/api/config', (req, res) => {
    res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '' });
});

function generateBuyerFriendlyPrompt(item) {
    const titleLower = (item.title || '').toLowerCase();
    const typeLower = (item.type || '').toLowerCase();
    const descLower = (item.description || '').toLowerCase();
    
    const isCode = titleLower.includes('code') || titleLower.includes('developer') || typeLower.includes('code') || descLower.includes('code');
    const isImageOrVideo = typeLower.includes('midjourney') || typeLower.includes('dall-e') || typeLower.includes('sora') || typeLower.includes('runway') || typeLower.includes('video') || typeLower.includes('diffusion') || typeLower.includes('sdxl');
    
    let promptText = '';
    
    if (isCode) {
        promptText = `🔥 PREMIUM DEVELOPER PROMPT UNLOCKED 🔥\n\n`;
        promptText += `📌 INSTRUCTIONS:\nCopy the system prompt below and paste it into your AI model (e.g., ChatGPT, Claude) to instantiate an elite developer assistant.\n\n`;
        promptText += `💻 THE MASTER PROMPT:\n"""\n${item.previewPrompt || ''}\n"""\n\n`;
        promptText += `⚙️ KEY CAPABILITIES:\n${(item.features || []).map(f => `• ${f}`).join('\n') || '• Multi-language support\n• Automated debugging\n• Edge-case handling'}\n\n`;
        promptText += `🚀 HOW TO USE:\n1. Paste the Master Prompt into your AI interface.\n2. Provide your target source code or description.\n3. The AI will output perfectly formatted code, complete with inline documentation and comprehensive test cases.`;
    } else if (isImageOrVideo) {
        promptText = `✨ PREMIUM CREATIVE PROMPT UNLOCKED ✨\n\n`;
        promptText += `📌 THE CORE GENERATION PROMPT:\n"${item.previewPrompt || ''}"\n\n`;
        promptText += `🎨 ARTISTIC PARAMETERS (ADJUSTABLE):\n`;
        if (typeLower.includes('midjourney')) {
            promptText += `• Aspect Ratios: Use --ar 16:9 for cinematic screens, --ar 4:3 for blogs, or --ar 1:1 for social posts.\n`;
            promptText += `• Version: Optimized for Midjourney v6.1 (append --v 6.1 --style raw for best realism).\n`;
        } else if (typeLower.includes('dall-e')) {
            promptText += `• Aspect Ratios: Use standard portrait, landscape, or square in your generation command.\n`;
        }
        promptText += `• Lighting: Professional studio ambient lighting.\n`;
        promptText += `• Color Grading: Harmonious palette tailored to ${titleLower}.\n\n`;
        promptText += `📚 INCLUDED FEATURES:\n${(item.features || []).map(f => `• ${f}`).join('\n') || '• Ultra-high fidelity resolution\n• Commercial usage license'}\n\n`;
        promptText += `🚀 HOW TO USE:\n1. Replace the square-bracketed placeholders like [PRODUCT] or [STYLE] with your desired values.\n2. Run the prompt in your image/video engine (Midjourney, DALL-E 3, Sora, Runway, etc.).\n3. Enjoy professional, commercial-ready visual assets instantly!`;
    } else {
        promptText = `🚀 PREMIUM STRATEGIST PROMPT UNLOCKED 🚀\n\n`;
        promptText += `📌 THE MASTER OUTREACH & STRATEGY PROMPT:\n`;
        promptText += `"""\n${item.previewPrompt || ''}\n"""\n\n`;
        promptText += `💎 PROFESSIONAL UTILITY & HIGHLIGHTS:\n`;
        promptText += `• Niche: Designed explicitly for premium B2B and consumer copywriting.\n`;
        promptText += `• Style: Authoritative, engaging, conversational, and highly persuasive.\n`;
        promptText += `• Conversion: Engineered utilizing industry-leading persuasion frameworks.\n\n`;
        promptText += `📦 WHAT'S INCLUDED IN THIS PLAYBOOK:\n${(item.features || []).map(f => `• ${f}`).join('\n') || '• High converting subject lines\n• Custom tone calibration'}\n\n`;
        promptText += `🚀 HOW TO USE:\n1. Copy the Master Prompt above.\n2. Replace placeholders (e.g., company names, Pain Points, target audience) with your specific project details.\n3. Run it in ChatGPT, Claude, or Gemini.\n4. Copy, paste, and watch your business scale!`;
    }
    
    return promptText;
}

function isStripeKeyError(error) {
    if (!error) return false;
    const msg = (error.message || '').toLowerCase();
    return error.statusCode === 401 || 
           error.type === 'StripeAuthenticationError' || 
           msg.includes('api key') || 
           msg.includes('expired api key') || 
           msg.includes('invalid api key') || 
           msg.includes('no api key');
}



app.post('/api/create-checkout-session', async (req, res) => {
    try {
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        const { items, customerEmail, successUrl, cancelUrl } = req.body;


        // If no key or placeholder/mock key is present, generate a simulated checkout experience
        if (!stripeKey || stripeKey === 'your_stripe_secret_key_here' || stripeKey.startsWith('mk_')) {
            const sessionId = `sim_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            mockSessionDB[sessionId] = { email: customerEmail, items: items };
            const simulatedCheckoutUrl = `/checkout-simulation.html?session_id=${sessionId}&success_url=${encodeURIComponent(successUrl)}&cancel_url=${encodeURIComponent(cancelUrl)}`;
            return res.json({ id: sessionId, url: simulatedCheckoutUrl });
        }
        
        const stripe = require('stripe')(stripeKey);
        const lineItems = items.map(item => ({
            price_data: {
                currency: 'usd',
                product_data: { name: item.title, description: item.type },
                unit_amount: Math.round(item.price * 100), 
            },
            quantity: 1,
        }));

        const metadataItems = items.map(item => ({
            id: item.id, title: item.title, type: item.type, price: item.price,
            previewPrompt: (item.previewPrompt || '').substring(0, 200)
        }));
        const metadataStr = JSON.stringify(metadataItems).substring(0, 500);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            customer_email: customerEmail || undefined,
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: { items: metadataStr, customerEmail: customerEmail || '' }
        });

        mockSessionDB[session.id] = { email: customerEmail, items: items };
        res.json({ id: session.id, url: session.url });
    } catch (error) {
        if (isStripeKeyError(error)) {
            console.warn('⚠️ Stripe API Key error detected in create-checkout-session. Falling back to simulated checkout.');
            const sessionId = `sim_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            mockSessionDB[sessionId] = { email: customerEmail, items: items };
            const simulatedCheckoutUrl = `/checkout-simulation.html?session_id=${sessionId}&success_url=${encodeURIComponent(successUrl)}&cancel_url=${encodeURIComponent(cancelUrl)}`;
            return res.json({ id: sessionId, url: simulatedCheckoutUrl });
        }
        console.error('Stripe error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/create-payment-intent', async (req, res) => {
    try {
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        const { items, customerEmail } = req.body;

        if (!stripeKey || stripeKey.startsWith('mk_')) {
            return res.status(455).json({ fallbackToSimulated: true });
        }

        const stripe = require('stripe')(stripeKey);

        const totalAmount = items.reduce((sum, item) => sum + Math.round(parseFloat(item.price) * 100), 0);

        if (totalAmount < 50) {
            return res.status(400).json({ error: 'Order total must be at least $0.50.' });
        }

        const metadataItems = items.map(item => ({
            id: item.id, title: item.title, type: item.type, price: item.price,
            previewPrompt: (item.previewPrompt || '').substring(0, 150)
        }));
        const metadataStr = JSON.stringify(metadataItems).substring(0, 500);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: totalAmount,
            currency: 'usd',
            receipt_email: customerEmail || undefined,
            automatic_payment_methods: { enabled: true },
            metadata: {
                items: metadataStr,
                customerEmail: customerEmail || '',
            }
        });

        // Store items keyed by payment intent ID for webhook lookup
        mockSessionDB[paymentIntent.id] = { email: customerEmail, items: items };

        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            totalAmount: totalAmount
        });
    } catch (error) {
        if (isStripeKeyError(error)) {
            console.warn('⚠️ Stripe API Key error detected in create-payment-intent. Instructing client to fallback to simulation.');
            
            const sessionId = `sim_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            mockSessionDB[sessionId] = { email: customerEmail, items: items };
            const protocol = req.headers['x-forwarded-proto'] || req.protocol;
            const origin = `${protocol}://${req.get('host')}`;
            const successUrl = `${origin}/?checkout_success=true&unlocked=${encodeURIComponent(items.map(i=>i.id).join(','))}&email=${encodeURIComponent(customerEmail || '')}`;
            const cancelUrl = `${origin}/`;
            const simulatedCheckoutUrl = `/checkout-simulation.html?session_id=${sessionId}&success_url=${encodeURIComponent(successUrl)}&cancel_url=${encodeURIComponent(cancelUrl)}`;
            
            return res.json({
                fallbackToSimulated: true,
                url: simulatedCheckoutUrl
            });
        }
        console.error('PaymentIntent error:', error);
        res.status(500).json({ error: error.message });
    }
});



app.get('/api/get-session-items/:id', (req, res) => {
    const session = mockSessionDB[req.params.id];
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.json(session);
});

async function sendReceiptEmail(email, items) {
    if (!transporter) return;
    if (!email) return;
    
    const promptsHtml = items.map(item => {
        // Generate a full unlocked prompt for the email
        const fullPrompt = item.prompt || generateBuyerFriendlyPrompt(item);
        
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
        
        // Log inside admin email logs
        logEmailInternal(email, "✨ Your PromptFlow Purchase — Premium Prompts Unlocked!", items.length);
    } catch (err) {
        console.error("Failed to send receipt email:", err);
    }
}

// Dynamic Sitemap for SEO crawling
app.get('/sitemap.xml', (req, res) => {
    res.header('Content-Type', 'application/xml');
    
    // Standard site sitemap template (removed URL fragment identifier sublinks which GSC rejects)
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://www.promptflowing.com/</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
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

// Serve Apple Pay domain association file (express.static ignores dotfiles starting with '.' by default)
app.get('/.well-known/apple-developer-merchantid-domain-association', (req, res) => {
    const wellKnownPath = path.join(__dirname, '.well-known', 'apple-developer-merchantid-domain-association');
    const rootPath = path.join(__dirname, 'apple-developer-merchantid-domain-association');
    
    if (fs.existsSync(wellKnownPath)) {
        res.setHeader('Content-Type', 'text/plain');
        return res.sendFile(wellKnownPath);
    } else if (fs.existsSync(rootPath)) {
        res.setHeader('Content-Type', 'text/plain');
        return res.sendFile(rootPath);
    }
    res.status(404).send('Apple Pay domain association file not found. Please place it in the root or .well-known folder.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
