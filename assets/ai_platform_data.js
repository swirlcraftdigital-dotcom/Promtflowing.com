// Dynamic SEO and Programmatic Content Database for PromptFlowing.com Hubs & Subpages
const AI_PLATFORM_DATA = {
    // ----------------------------------------------------
    // BRANCH 1: CHATGPT PROMPTS
    // ----------------------------------------------------
    "/chatgpt-prompts": {
        title: "Best ChatGPT Prompts for Business, Marketing, and Sales | PromptFlow",
        metaDescription: "Unlock over 10,000 highly optimized ChatGPT prompts. Supercharge your professional workflow across business, marketing, copywriting, social media, and SEO.",
        h1: "ChatGPT Prompts Authority Hub",
        intro: `Welcome to the world's most comprehensive index of professional ChatGPT prompts. Artificial intelligence has fundamentally changed the baseline of modern productivity, but the utility of language models like GPT-4o or Claude 3.5 Sonnet is entirely dependent on the quality of instructions they receive. Generic inputs yield generic, low-fidelity outputs that lack context, brand calibration, or strategic value. Here, you'll discover expertly engineered prompt architectures designed to transform ChatGPT into an elite co-strategist, copywriter, programmer, and business consultant.

Our prompt architectures are engineered using structured system prompt principles, incorporating detailed persona calibration, input variables, negative constraints, and output format schemas. Whether you are scaling an email marketing campaign, optimizing web copy, preparing a pitch deck, or writing code, these frameworks ensure your outputs bypass generic fluff and deliver enterprise-ready results. Dive into our curated subcategories below to unlock elite playbooks tailored to your exact professional requirements.`,
        faqs: [
            { q: "What makes a ChatGPT prompt 'expertly engineered'?", a: "An expertly engineered prompt goes beyond a simple request. It calibrates an elite persona, outlines a strict execution workflow, defines variables (like target audience and tone), applies negative constraints (e.g., 'avoid cliches'), and specifies a strict output schema (like JSON or Markdown)." },
            { q: "How do I calibrate my brand's voice in ChatGPT?", a: "Use our marketing and business prompts to feed ChatGPT raw examples of your previous successful copy and instruct it to extract the underlying voice parameters before writing new material." }
        ],
        subcategories: [
            { name: "Business Prompts", path: "/chatgpt-prompts/business", desc: "Strategy, operations, business plans, and executive decision-making blueprints." },
            { name: "Marketing Prompts", path: "/chatgpt-prompts/marketing", desc: "Conversion copywriting, brand positioning, and campaigns." },
            { name: "Sales Prompts", path: "/chatgpt-prompts/sales", desc: "Outbound outreach, pitch scripts, and closing frameworks." },
            { name: "Email Prompts", path: "/chatgpt-prompts/email", desc: "Cold email copy, newsletters, and customer drip sequences." },
            { name: "Social Media Prompts", path: "/chatgpt-prompts/social-media", desc: "Viral hooks, scheduling scripts, and content calendar blueprints." },
            { name: "SEO Prompts", path: "/chatgpt-prompts/seo", desc: "Keyword cluster maps, blog outlines, and schema metadata generators." },
            { name: "YouTube Prompts", path: "/chatgpt-prompts/youtube", desc: "High-retention video hooks, script structures, and title hooks." },
            { name: "Resume Prompts", path: "/chatgpt-prompts/resume", desc: "ATS-optimized descriptions and cover letter calibrators." },
            { name: "Students Prompts", path: "/chatgpt-prompts/students", desc: "Study guides, complex concept simplifiers, and exam preppers." },
            { name: "Productivity Prompts", path: "/chatgpt-prompts/productivity", desc: "Time blocking matrices, goal frameworks, and cognitive loaders." }
        ]
    }
};

// Global category arrays to generate subpages programmatically with 100% unique context
const PLATFORM_BRANCHES = {
    "/chatgpt-prompts/": {
        type: "chatgpt",
        subcategories: ["business", "marketing", "sales", "email", "social-media", "seo", "youtube", "resume", "students", "productivity"]
    },
    "/ai-video-prompts/": {
        type: "video",
        subcategories: ["sora-prompts", "runway-prompts", "veo-prompts", "kling-prompts", "pika-prompts", "cinematic-camera-movements", "product-commercials", "youtube-shorts-prompts"]
    },
    "/ai-image-prompts/": {
        type: "image",
        subcategories: ["midjourney-prompts", "dalle-prompts", "stable-diffusion-prompts", "logo-prompts", "product-photography-prompts", "realistic-portrait-prompts", "instagram-post-prompts"]
    },
    "/prompt-engineering/": {
        type: "engineering",
        subcategories: ["what-is-prompt-engineering", "prompt-formulas", "system-prompts", "few-shot-prompts", "negative-prompts", "how-to-write-better-prompts", "prompt-templates", "common-prompt-mistakes"]
    },
    "/ai-tools/": {
        type: "tools",
        subcategories: ["best-ai-video-generators", "best-ai-image-generators", "best-ai-writing-tools", "best-ai-coding-tools", "best-ai-website-builders", "best-ai-logo-generators", "best-ai-resume-builders", "free-ai-tools", "ai-tools-for-small-business", "ai-tools-for-youtube"]
    },
    "/ai-agents/": {
        type: "agents",
        subcategories: ["what-are-ai-agents", "business-automation", "customer-support", "sales-agents", "research-agents", "coding-agents", "workflow-automation", "no-code-ai-agents", "agentic-ai-examples"]
    },
    "/ai-for-business/": {
        type: "business-use",
        subcategories: ["marketing", "customer-service", "sales", "hr", "legal-documents", "real-estate", "ecommerce", "restaurants", "consultants", "agencies"]
    },
    "/ai-website-builder/": {
        type: "website-prompts",
        subcategories: ["prompts", "html-css-prompts", "landing-page-prompts", "shopify-prompts", "wordpress-prompts", "saas-landing-page-prompts", "portfolio-website-prompts", "cursor-prompts", "code-debugging-prompts"]
    },
    "/free-ai-generators/": {
        type: "generators",
        subcategories: ["logo-prompt-generator", "video-prompt-generator", "image-prompt-generator", "youtube-title-generator", "instagram-caption-generator", "business-name-generator", "seo-title-generator", "meta-description-generator", "product-description-generator", "email-subject-line-generator"]
    },
    "/industries/": {
        type: "industries",
        subcategories: ["real-estate-ai-prompts", "fitness-ai-prompts", "restaurants-ai-prompts", "ecommerce-ai-prompts", "law-firm-ai-prompts", "dental-ai-prompts", "med-spa-ai-prompts", "coaches-ai-prompts", "photographers-ai-prompts", "insurance-ai-prompts", "cleaning-business-ai-prompts", "roofing-ai-prompts", "plumbing-ai-prompts"]
    }
};

// Helper function to capitalize and prettify words
function capitalizeWords(slug) {
    return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Generate the platform hubs and subpages programmatically for 100% complete routing
Object.keys(PLATFORM_BRANCHES).forEach(branchPath => {
    const branch = PLATFORM_BRANCHES[branchPath];
    const hubName = capitalizeWords(branchPath.replace(/\//g, ''));
    
    // 1. Programmatically define the Main Hub Page if not already defined
    if (!AI_PLATFORM_DATA[branchPath.slice(0, -1)]) {
        AI_PLATFORM_DATA[branchPath.slice(0, -1)] = {
            title: `${hubName} Platform & Resource Authority Directory | PromptFlow`,
            metaDescription: `Discover professional, expertly engineered resources for ${hubName}. Access dynamic tools, copy-ready prompt sets, and comparison grids.`,
            h1: `${hubName} Directory`,
            intro: `Welcome to our professional ${hubName} resource hub. In the rapidly evolving artificial intelligence landscape, success is defined by how effectively you integrate and instruct models. This platform serves as a global directory and authority platform, providing hand-crafted prompts, curated comparative lists of top AI software, interactive generators, and industrial workflow models. Explore our specialized sub-branches below to elevate your output.`,
            faqs: [
                { q: `How does the ${hubName} hub help my business?`, a: `By providing exact checklists, prompt engineering guides, and vetted tools tailored specifically to the disciplines represented in this hub.` },
                { q: "Are these prompts free to use?", a: "Yes, all the prompt lists and interactive generation tools on our SEO directory branches are free to copy and use." }
            ],
            subcategories: branch.subcategories.map(sub => ({
                name: capitalizeWords(sub),
                path: `${branchPath}${sub}`,
                desc: `Discover specialized elite resources, direct prompt bundles, and optimized workflows for ${capitalizeWords(sub)}.`
            }))
        };
    }

    // 2. Programmatically generate each of the 93 subpages in the dataset!
    branch.subcategories.forEach(subSlug => {
        const fullPath = `${branchPath}${subSlug}`;
        const name = capitalizeWords(subSlug);
        
        let subData = {
            title: `Best ${name} AI Prompts, Tools & Masterclass Guide | PromptFlow`,
            metaDescription: `Unlock top-rated expert ${name} resources. Get 10+ cinematic or contextual copyable prompts, advanced modifiers, and industry-standard workflows.`,
            h1: name,
            intro: `Leverage advanced artificial intelligence for ${name} to scale your output, automate tedious workflows, and achieve higher consistency. This specialized resource compiles direct direct direct prompts designed explicitly for modern models (including ChatGPT, Midjourney, Claude 3.5 Sonnet, Sora, Stable Diffusion, and DeepSeek R1). Use the detailed templates below to achieve outstanding results.`,
            faqs: [
                { q: `What is the optimal AI model for ${name}?`, a: `For text-based strategy, we highly recommend Claude 3.5 Sonnet or ChatGPT. For visual generations, Midjourney v6 or Stable Diffusion offer the most granular parameter control.` },
                { q: `How do I customize these ${name} prompts?`, a: `Simply click the copy button, paste it into your AI dashboard, and replace the brackets [like this] with your specific company or product variables.` }
            ]
        };

        // Custom parameters based on branch types
        if (branch.type === "chatgpt" || branch.type === "business-use" || branch.type === "website-prompts" || branch.type === "industries") {
            subData.prompts = Array.from({ length: 10 }).map((_, i) => ({
                title: `${name} Campaign Directive Vol. ${i + 1}`,
                bestFor: `Digital marketers, creators, and professionals in ${name}`,
                models: ["ChatGPT", "Claude", "Gemini"],
                prompt: `Act as a senior expert in ${name}. Analyze our goal: [DESCRIBE_GOAL]. Write a highly structured roadmap specifying target metrics, visual components, negative parameters, and a step-by-step implementation matrix. Avoid conversational filler.`,
                category: name
            }));
        } else if (branch.type === "video") {
            subData.aspectRatios = ["--ar 16:9 (Cinematic Widescreen)", "--ar 9:16 (Vertical Reels/TikTok)", "--ar 1:1 (Square Feed)"];
            subData.cameraAngles = ["Pan-left/right tracking shot", "Low-angle crane sweep", "Slow tracking push-in with shallow depth of field"];
            subData.lightingStyles = ["Volumetric ambient lighting", "Golden hour backlighting", "Dramatic high-contrast chiaroscuro"];
            subData.prompts = Array.from({ length: 10 }).map((_, i) => ({
                title: `${name} Cinematic Prompt ${i + 1}`,
                bestFor: "Cinematographers, video editors, and 3D animators",
                models: ["Sora", "Runway Gen-3", "Pika"],
                prompt: `Cinematic [camera_angle], [lighting_style] highlighting [SUBJECT] in a [SETTING]. Mood is [MOOD]. 4k, photorealistic textures, hyper-detailed motion vector rendering, --ar 16:9`,
                category: name
            }));
        } else if (branch.type === "image") {
            subData.styleModifiers = ["Hyperrealistic 8k render", "Moody synthwave Cyberpunk aesthetic", "Editorial commercial food photography style"];
            subData.lightingModifiers = ["Soft studio umbrella diffusion", "Neon glow highlight", "Moody cinematic split-lighting"];
            subData.compositionModifiers = ["Symmetrical shot", "Macro extreme close-up", "Low angle heroic dynamic view"];
            subData.promptFormula = "Style Modifier + Subject + Setting + Lighting Modifier + Composition Parameter --v 6.0";
            subData.prompts = Array.from({ length: 10 }).map((_, i) => ({
                title: `${name} Creative Render ${i + 1}`,
                bestFor: "Graphic designers, brand managers, and concept artists",
                models: ["Midjourney v6", "DALL-E 3", "Stable Diffusion"],
                prompt: `A beautiful [STYLE_MODIFIER] featuring [SUBJECT] in [SETTING]. Lit with [LIGHTING_MODIFIER], [COMPOSITION_MODIFIER] framing, hyper-detailed, commercial grade, --v 6.1 --style raw`,
                category: name
            }));
        } else if (branch.type === "engineering") {
            subData.intro = `Prompt Engineering is the science of calibrating inputs to extract highly contextual, validated outputs from large language models. Rather than treating AI as a conversational partner, prompt engineering treats LLMs as standard compilers, injecting personas, constraining token weights, and formatting nested JSON parameters. This authority guide details exactly how to write expert prompts.`;
            subData.prompts = Array.from({ length: 6 }).map((_, i) => ({
                title: `Elite Few-Shot Prompting Technique ${i + 1}`,
                bestFor: "Developers, prompt engineers, and workflow automators",
                models: ["Claude 3.5 Sonnet", "ChatGPT", "DeepSeek R1"],
                prompt: `[PERSONA_CALIBRATION]\nYou are a senior compiler. Analyze the following three input-output pairs:\n\nInput: [SAMPLE_1]\nOutput: [VALIDATED_RESULT_1]\n\nInput: [SAMPLE_2]\nOutput: [VALIDATED_RESULT_2]\n\nExecute on target input: [TARGET_INPUT]`,
                category: "Prompt Engineering"
            }));
        } else if (branch.type === "tools") {
            subData.intro = `Comparing and choosing the right artificial intelligence stack is critical for startup operations. This comparative grid details features, pricing estimates, pros/cons, and core competencies of the top AI software.`;
            subData.tools = [
                { name: `PromptFlow Pro Suite`, rating: "4.9/5", desc: "Enterprise-grade prompt workspace and generation manager.", pros: ["Zero-latency copying", "100% custom templates", "Built-in local vaulting"], cons: ["Limited free trial runs"] },
                { name: `Model-Y Engine`, rating: "4.5/5", desc: "Automated batch copywriting tool for mid-market platforms.", pros: ["Simple interface", "Bulk exporting"], cons: ["Higher subscription tier pricing"] }
            ];
        } else if (branch.type === "agents") {
            subData.intro = `AI Agents go beyond simple text completion. They utilize execution loops, memory databases (Vectordb), tools (APIs), and decision trees to perform complex business workflows autonomously. Explore the standard agent templates below.`;
            subData.workflows = [
                { title: `Autonomous Customer Agent`, steps: ["1. Parse customer email with sentiment classification.", "2. Fetch client records from database.", "3. Generate custom email answer draft.", "4. Flag high-risk tickets to human operator."] }
            ];
            subData.prompts = Array.from({ length: 6 }).map((_, i) => ({
                title: `Agent Persona Definition ${i + 1}`,
                bestFor: "Agent engineers and developers",
                models: ["ChatGPT", "Claude"],
                prompt: `Identify the current state. Loop through tool parameters. If tool outputs an error, correct variable [VAR] and run execution again.`,
                category: "Agents"
            }));
        } else if (branch.type === "generators") {
            // Interactive generator page configurations!
            subData.isGenerator = true;
            subData.generatorConfig = {
                "logo-prompt-generator": {
                    fields: [
                        { id: "genBrandName", label: "Brand Name", placeholder: "e.g. PromptFlow" },
                        { id: "genIndustry", label: "Industry", placeholder: "e.g. Artificial Intelligence" },
                        { id: "genStyle", label: "Design Style", type: "select", options: ["Minimalist Flat", "Modern Isometric", "Luxury Gold Embellished", "Retro Emblem"] },
                        { id: "genColors", label: "Color Palette", placeholder: "e.g. Neon Purple and Cyberpunk Pink" }
                    ],
                    formula: (inputs) => `Vector logo for a brand named "${inputs.genBrandName}" in the "${inputs.genIndustry}" industry. Designed in a "${inputs.genStyle}" aesthetic, featuring a clean bold logomark, utilizing a color palette of "${inputs.genColors}". White background, flat design, modern branding assets, scalable vector asset, high contrast --no realistic photo gradients`
                },
                "video-prompt-generator": {
                    fields: [
                        { id: "genSubject", label: "Subject", placeholder: "e.g. A futuristic robot reading a book" },
                        { id: "genSetting", label: "Setting", placeholder: "e.g. Cyberpunk library at midnight" },
                        { id: "genMood", label: "Atmosphere & Mood", type: "select", options: ["Cinematic Mystery", "Bright Optimistic", "High-Energy Action", "Dark Moody"] },
                        { id: "genCamera", label: "Camera Movement", placeholder: "e.g. Pan-right tracking sweep with macro zoom" },
                        { id: "genLighting", label: "Lighting", type: "select", options: ["Volumetric Neon Glow", "Warm Studio Ambient", "Golden Hour Sun rays", "Dramatic Chiaroscuro"] }
                    ],
                    formula: (inputs) => `Cinematic photorealistic video of "${inputs.genSubject}" in a "${inputs.genSetting}". The mood is "${inputs.genMood}". Action captured with a "${inputs.genCamera}". Illuminated with "${inputs.genLighting}". Hyper-detailed texture mapping, professional color grade, smooth motion vectors, --ar 16:9`
                },
                "image-prompt-generator": {
                    fields: [
                        { id: "genSubject", label: "Subject", placeholder: "e.g. A luxury wristwatch resting on black volcanic sand" },
                        { id: "genStyle", label: "Artistic Style", type: "select", options: ["Hyperrealistic Editorial Photography", "Cyberpunk Digital Concept Art", "Oil Painting Canvas", "Isometric 3D Render"] },
                        { id: "genLighting", label: "Lighting setup", placeholder: "e.g. High-contrast split lighting" },
                        { id: "genComposition", label: "Composition", placeholder: "e.g. Extreme close-up macro, rule of thirds" }
                    ],
                    formula: (inputs) => `Commercial grade "${inputs.genStyle}" of "${inputs.genSubject}". Lit with "${inputs.genLighting}", shot with "${inputs.genComposition}", highly detailed textures, depth of field, 8k resolution, shot on 85mm lens --v 6.1 --style raw`
                },
                "youtube-title-generator": {
                    fields: [
                        { id: "genTopic", label: "Video Topic", placeholder: "e.g. Coding a website in 10 minutes" },
                        { id: "genAngle", label: "Hook Style", type: "select", options: ["Curiosity Gap", "X vs Y Case Study", "Listicle/Number Hook", "Direct Benefit"] }
                    ],
                    formula: (inputs) => `YouTube Video Title Ideas:\n1. I Tried Coding a "${inputs.genTopic}" - Here is what happened!\n2. Why most creators FAIL at "${inputs.genTopic}" (And how to fix it)\n3. 10 Secrets about "${inputs.genTopic}" they don't want you to know\n4. "${inputs.genTopic}": The ultimate guide for beginners`
                },
                "instagram-caption-generator": {
                    fields: [
                        { id: "genTopic", label: "Post Topic / Goal", placeholder: "e.g. Launching our new templates" },
                        { id: "genTone", label: "Tone of Voice", type: "select", options: ["Witty & Fun", "Inspirational", "Straight-to-the-point Value", "Bold Announcement"] }
                    ],
                    formula: (inputs) => `Instagram Post Playbook:\n\n🔥 HOOK:\nStop scrolling. If you care about "${inputs.genTopic}", read this.\n\n✍️ BODY:\nWe are shifting the paradigm in "${inputs.genTopic}". Here is exactly how we deliver results:\n• High quality outputs\n• Built by professionals\n• Actionable steps\n\n🎯 CTA:\nClick the link in our bio to grab yours now!\n\n🏷️ TAGS:\n#${inputs.genTopic.replace(/\s+/g, '')} #aimodule #promptflow`
                },
                "business-name-generator": {
                    fields: [
                        { id: "genKeywords", label: "Core Keywords", placeholder: "e.g. prompt, flow, fast, smart" },
                        { id: "genNiche", label: "Niche / Industry", placeholder: "e.g. marketing templates" }
                    ],
                    formula: (inputs) => `1. "${inputs.genKeywords.split(',')[0]}ify" - Modern digital solution for "${inputs.genNiche}".\n2. "${inputs.genKeywords.split(',')[0]}Craft" - Premium agency aesthetic.\n3. "Apex${inputs.genKeywords.split(',')[0]}" - High authority branding.\n4. "${inputs.genKeywords.split(',')[0]}Lab" - Research and tech driven.`
                },
                "seo-title-generator": {
                    fields: [
                        { id: "genKeyword", label: "Target Keyword", placeholder: "e.g. best ai prompts for real estate" },
                        { id: "genYear", label: "Current Year", placeholder: "2026" }
                    ],
                    formula: (inputs) => `1. 10+ "${inputs.genKeyword}" in "${inputs.genYear}" (Copy & Paste!)\n2. Best "${inputs.genKeyword}" for Professionals [Tested]\n3. The Ultimate Directory of "${inputs.genKeyword}" ("${inputs.genYear}" Guide)`
                },
                "meta-description-generator": {
                    fields: [
                        { id: "genKeyword", label: "Target Keyword", placeholder: "e.g. free email marketing prompts" },
                        { id: "genBenefit", label: "Core Benefit", placeholder: "e.g. increase click-through rates by 40%" }
                    ],
                    formula: (inputs) => `Looking for the absolute "${inputs.genKeyword}"? Access our direct copyable templates designed to "${inputs.genBenefit}". Completely free, ATS-friendly, and optimized. Click to copy now!`
                },
                "product-description-generator": {
                    fields: [
                        { id: "genProduct", label: "Product Name", placeholder: "e.g. Zenith Planner" },
                        { id: "genFeatures", label: "Features", placeholder: "e.g. 100 pages, vegan leather, gold binding" }
                    ],
                    formula: (inputs) => `Elevate your standard with "${inputs.genProduct}". Expertly constructed featuring "${inputs.genFeatures}". Engineered to combine luxury and premium utilities. Buy yours today.`
                },
                "email-subject-line-generator": {
                    fields: [
                        { id: "genTopic", label: "Email Topic", placeholder: "e.g. 50% discount launch" },
                        { id: "genTone", label: "Tone", type: "select", options: ["High Urgency", "Friendly curiosity", "Direct Value"] }
                    ],
                    formula: (inputs) => `1. [URGENT] ⏰ Last chance for "${inputs.genTopic}"...\n2. Quick question about your "${inputs.genTopic}"\n3. Inside: Our master strategy for "${inputs.genTopic}"`
                }
            }[subSlug] || {
                fields: [{ id: "genInput", label: "Target Input", placeholder: "e.g. details" }],
                formula: (inputs) => `Engineered prompt for ${inputs.genInput}`
            };
        }

        // Assign back to global database
        AI_PLATFORM_DATA[fullPath] = subData;
    });
});

// Export globally so the main browser window can reference it directly
if (typeof window !== "undefined") {
    window.AI_PLATFORM_DATA = AI_PLATFORM_DATA;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = AI_PLATFORM_DATA;
}
