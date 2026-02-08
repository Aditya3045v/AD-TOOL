import { toast } from "sonner";

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

interface CampaignRequest {
    brandName: string;
    industry: string;
    theme: string;
    headlineText: string;
    visualStyle: string;
    brandColor: string;
    brandTone: string;
    targetAudience: string;
    aspectRatio: string;
    productImageBase64?: string;
    productImageMimeType?: string;
}

export const generateCampaign = async (params: CampaignRequest) => {
    if (!OPENROUTER_API_KEY) {
        throw new Error("API configuration missing. Please add VITE_OPENROUTER_API_KEY to .env");
    }

    const {
        brandName,
        industry,
        theme,
        headlineText,
        visualStyle,
        brandColor,
        brandTone,
        targetAudience,
        aspectRatio,
        productImageBase64,
        productImageMimeType,
    } = params;

    // ============================
    // STEP 1: Analyze product image (if provided)
    // ============================
    let productContext = "";

    if (productImageBase64 && productImageMimeType) {
        console.log("Step 1: Analyzing product image with vision...");

        const visionMessages = [
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: `You are an expert product analyst. Analyze this product image in detail. Describe the product, its colors, textures, materials, shape, and any notable features. Be specific and vivid so a text-to-image AI can recreate this product accurately in a new scene. Keep your description to 3-4 sentences.`,
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:${productImageMimeType};base64,${productImageBase64}`,
                        },
                    },
                ],
            },
        ];

        try {
            const visionResp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": window.location.origin,
                    "X-Title": "AI Ad Studio",
                },
                body: JSON.stringify({
                    model: "anthropic/claude-3.5-sonnet",
                    messages: visionMessages,
                    max_tokens: 500,
                }),
            });

            if (!visionResp.ok) {
                const error = await visionResp.text();
                console.error("Vision failed:", error);
            } else {
                const visionData = await visionResp.json();
                productContext = visionData.choices?.[0]?.message?.content || "";
            }
        } catch (e) {
            console.error("Vision error:", e);
        }
    }

    // ============================
    // STEP 2: Engineer a detailed prompt for image generation
    // ============================
    console.log("Step 2: Engineering prompt...");

    const styleDescriptions: Record<string, string> = {
        Photorealistic: "High-end commercial photography, sharp focus, 8k resolution, professional studio lighting with rim lights, realistic textures, clean minimal background",
        Neon: "Cyberpunk aesthetic, vibrant neon glow, deep shadows, electric atmosphere, futuristic typography integrated with light, cinematic color grading",
        Pastel: "Minimalist soft aesthetic, gentle pastel gradients, clean white spaces, soft diffused lighting, modern sophisticated layout",
        Luxury: "Elite luxury branding, gold and marble textures, rich deep tones, elegant serif typography, moody atmospheric lighting, prestige product showcase",
    };

    const styleDesc = styleDescriptions[visualStyle] || styleDescriptions.Photorealistic;

    const productSection = productContext
        ? `\n\nIMPORTANT PRODUCT CONTEXT (from analyzing the uploaded product photo):\n${productContext}\nYou MUST incorporate this exact product into the scene naturally.`
        : "";

    const promptEngineerMessages = [
        {
            role: "system",
            content: `You are a world-class Ad Tech Engineer and Creative Director. Your job is to translate user inputs into a HIGH-FIDELITY visual blueprint.

STRICT INPUT ADHERENCE:
1. BRAND NAME ("${brandName}"): Include it as professional branding (e.g., as logo signage in the background, on a product tag, or a minimalist digital overlay).
2. INDUSTRY & THEME: These are the world-building blocks. If industry is "${industry}" and theme is "${theme}", the entire lighting and environment must reflect this.
3. BRAND TONE ("${brandTone}"): The "vibe" of the image must be ${brandTone}. 
4. TARGET AUDIENCE ("${targetAudience}"): Design the composition to appeal specifically to ${targetAudience}.
5. HEADLINE ("${headlineText}"): The absolute focal hero. Describe its weight, material, and legible placement.
6. ASPECT RATIO ("${aspectRatio}"): Your prompt MUST describe a composition-optimized ${aspectRatio === "portrait" ? "Vertical (9:16 mobile story)" : "Square (1:1 feed)"} layout.

AD LAYOUT BLUEPRINT:
- Focal Point: The product analyzed from the vision context ("${productContext || "Generic " + industry + " product"}").
- Header/Center: Massive, legible 3D typography of "${headlineText}".
- Environment: A high-end atmosphere that matches "${theme}" perfectly.
- Detail: Professional photographic techniques (Depth of field: f/1.8, studio strobe lighting).

RULE: 
- Your prompt must be extremely descriptive. 
- Output ONLY the final prompt. No conversational filler.`,
        },
        {
            role: "user",
            content: `USER INPUT DATA:
- Brand: ${brandName}
- Industry: ${industry}
- Theme: ${theme}
- Visual Style: ${visualStyle}
- Brand Tone: ${brandTone}
- Target Audience: ${targetAudience}
- Format: ${aspectRatio}
- Color Palette Primary: ${brandColor}
- Text to Render: "${headlineText}"
- Product Context: ${productContext || "Analyze standard " + industry + " product features"}

Generate a technical, ultra-detailed image generation prompt based on this blueprint.`,
        },
    ];

    const promptResp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": window.location.origin,
            "X-Title": "AI Ad Studio",
        },
        body: JSON.stringify({
            model: "anthropic/claude-3.5-sonnet",
            messages: promptEngineerMessages,
            max_tokens: 500,
        }),
    });

    if (!promptResp.ok) {
        const errorText = await promptResp.text();
        console.error("Prompt Engineering Error:", errorText);
        throw new Error(`Prompt engineering failed: ${promptResp.status}`);
    }

    const promptData = await promptResp.json();
    const imagenPrompt = promptData.choices?.[0]?.message?.content?.trim();

    if (!imagenPrompt) throw new Error("Failed to generate prompt");

    console.log("Generated prompt:", imagenPrompt);

    // ============================
    // STEP 3: Generate high-quality image with Gemini 2.5 Flash
    // ============================
    console.log("Step 3: Generating high-quality image with Gemini 2.5 Flash...");

    const imageGenResp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": window.location.origin,
            "X-Title": "AI Ad Studio",
        },
        body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [
                {
                    role: "user",
                    content: imagenPrompt
                }
            ],
            modalities: ["image"]
        }),
    });

    if (!imageGenResp.ok) {
        const errorText = await imageGenResp.text();
        console.error("Image Gen Error:", errorText);
        throw new Error(`Image generation failed: ${imageGenResp.status} - ${errorText}`);
    }

    const imageGenData = await imageGenResp.json();
    console.log("Full Image response:", JSON.stringify(imageGenData, null, 2));

    // Robust extraction for Flux/OpenRouter response structure
    let finalImageUrl = "";

    // 1. Check for standard multimodal structure
    const message = imageGenData.choices?.[0]?.message;
    if (message?.content) {
        if (Array.isArray(message.content)) {
            const imagePart = message.content.find((part: any) => part.type === "image" || part.image_url);
            finalImageUrl = imagePart?.image_url?.url || imagePart?.url;
        } else if (typeof message.content === 'string' && message.content.startsWith('http')) {
            finalImageUrl = message.content;
        }
    }

    // 2. Fallback: Recursive search for any URL in the object
    if (!finalImageUrl) {
        const findImageUrl = (obj: any): string | null => {
            if (!obj || typeof obj !== 'object') return null;
            if (typeof obj.url === 'string' && (obj.url.startsWith('http') || obj.url.startsWith('data:'))) return obj.url;
            if (typeof obj.image_url?.url === 'string') return obj.image_url.url;

            for (const key in obj) {
                const result = findImageUrl(obj[key]);
                if (result) return result;
            }
            return null;
        };
        finalImageUrl = findImageUrl(imageGenData) || "";
    }

    if (!finalImageUrl) {
        console.error("No image URL found in response:", JSON.stringify(imageGenData, null, 2));
        throw new Error("The image was generated but the URL could not be extracted. Please check the console.");
    }

    console.log("Extracted image URL:", finalImageUrl);

    // ============================
    // STEP 4: Generate compelling caption
    // ============================
    console.log("Step 4: Generating caption...");

    const captionMessages = [
        {
            role: "system",
            content: `You are an expert social media copywriter. Generate a HIGH-CONVERSION social media caption.
            
Tone: ${brandTone}
Target Audience: ${targetAudience}

The caption should be punchy, incorporate the offer "${headlineText}" naturally, and include a strategic call-to-action.`,
        },
        {
            role: "user",
            content: `Brand: ${brandName}
Industry: ${industry}
Theme: ${theme}
Main Headline: "${headlineText}"
Tone Goal: ${brandTone}
Audience Goal: ${targetAudience}

Write the final optimized ad caption. Include 3 hashtags.`,
        },
    ];

    const captionResp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": window.location.origin,
            "X-Title": "AI Ad Studio",
        },
        body: JSON.stringify({
            model: "anthropic/claude-3.5-sonnet",
            messages: captionMessages,
            max_tokens: 300,
        }),
    });

    let caption = "";
    if (captionResp.ok) {
        const captionData = await captionResp.json();
        caption = captionData.choices?.[0]?.message?.content?.trim() || "";
    } else {
        const errorText = await captionResp.text();
        console.error("Caption Generation Error:", errorText);
    }

    if (typeof window !== "undefined") {
        (window as any)._lastGeneratedPrompt = imagenPrompt;
    }

    return { imageUrl: finalImageUrl, caption, prompt: imagenPrompt };
};
