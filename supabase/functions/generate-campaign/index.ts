import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CampaignRequest {
  brandName: string;
  industry: string;
  theme: string;
  headlineText: string;
  visualStyle: string;
  brandColor: string;
  productImageBase64?: string;
  productImageMimeType?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      brandName,
      industry,
      theme,
      headlineText,
      visualStyle,
      brandColor,
      productImageBase64,
      productImageMimeType,
    }: CampaignRequest = await req.json();

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured");

    // ============================
    // STEP 1: Analyze product image via OpenRouter Vision (if provided)
    // ============================
    let productContext = "";

    if (productImageBase64 && productImageMimeType) {
      console.log("Step 1: Analyzing product image with vision...");

      const visionMessages: any[] = [
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

      const visionResp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-exp",
          messages: visionMessages,
          max_tokens: 500,
        }),
      });

      if (!visionResp.ok) {
        const errText = await visionResp.text();
        console.error("Vision API error:", visionResp.status, errText);
        throw new Error(`Vision analysis failed: ${visionResp.status}`);
      }

      const visionData = await visionResp.json();
      productContext = visionData.choices?.[0]?.message?.content || "";
      console.log("Product context:", productContext);
    }

    // ============================
    // STEP 2: Engineer a prompt for image generation via OpenRouter
    // ============================
    console.log("Step 2: Engineering image generation prompt...");

    const styleDescriptions: Record<string, string> = {
      Photorealistic: "photorealistic, high-end commercial photography, studio lighting, sharp details",
      Neon: "neon lights, dark moody atmosphere, vibrant glowing colors, cyberpunk-inspired",
      Pastel: "soft pastel colors, minimalist, clean, gentle gradients, calming aesthetic",
      Luxury: "luxury, gold accents, rich textures, premium feel, elegant composition, dark tones",
    };

    const styleDesc = styleDescriptions[visualStyle] || styleDescriptions.Photorealistic;

    const productSection = productContext
      ? `\n\nIMPORTANT PRODUCT CONTEXT (from analyzing the uploaded product photo):\n${productContext}\nYou MUST incorporate this exact product into the scene naturally.`
      : "";

    const promptEngineerMessages = [
      {
        role: "system",
        content: `You are a Prompt Engineer for an AI image generator. Your goal is to write a single, detailed prompt that results in a 1080x1080 square marketing image. The image must:
1. Feature the text "${headlineText}" rendered clearly and legibly as part of the design
2. Match the visual style: ${styleDesc}
3. Use the brand color ${brandColor} as a dominant accent
4. Be suitable for a ${theme}-themed ${industry} marketing campaign for the brand "${brandName}"
5. Look professional and eye-catching for social media

Rules:
- Output ONLY the prompt text, nothing else
- Do NOT include instructions like "generate" or "create" — just describe the scene
- The text "${headlineText}" must appear spelled correctly and be the focal point
- Keep the prompt under 200 words
- Describe specific composition, lighting, typography style, and visual elements`,
      },
      {
        role: "user",
        content: `Brand: ${brandName}
Industry: ${industry}
Theme/Occasion: ${theme}
Headline Text: "${headlineText}"
Visual Style: ${visualStyle}
Brand Color: ${brandColor}${productSection}

Write the image generation prompt now.`,
      },
    ];

    const promptResp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-exp",
        messages: promptEngineerMessages,
        max_tokens: 400,
      }),
    });

    if (!promptResp.ok) {
      const errText = await promptResp.text();
      console.error("Prompt engineering error:", promptResp.status, errText);
      throw new Error(`Prompt engineering failed: ${promptResp.status}`);
    }

    const promptData = await promptResp.json();
    const imagenPrompt = promptData.choices?.[0]?.message?.content?.trim() || "";
    console.log("Engineered prompt:", imagenPrompt);

    if (!imagenPrompt) throw new Error("Failed to generate image prompt");

    // ============================
    // STEP 3: Generate image via OpenRouter (sourceful/riverflow-v2-pro)
    // ============================
    console.log("Step 3: Generating image with sourceful/riverflow-v2-pro...");

    const imageGenResp = await fetch("https://openrouter.ai/api/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "black-forest-labs/flux-1-schnell",
        prompt: imagenPrompt,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json",
      }),
    });

    if (!imageGenResp.ok) {
      const errText = await imageGenResp.text();
      console.error("Image generation error:", imageGenResp.status, errText);
      throw new Error(`Image generation failed: ${imageGenResp.status} - ${errText}`);
    }

    const imageGenData = await imageGenResp.json();
    console.log("Image gen response keys:", Object.keys(imageGenData));

    // Handle both OpenAI-style responses
    let imageDataUrl = "";
    if (imageGenData.data?.[0]?.b64_json) {
      imageDataUrl = `data:image/png;base64,${imageGenData.data[0].b64_json}`;
    } else if (imageGenData.data?.[0]?.url) {
      imageDataUrl = imageGenData.data[0].url;
    } else {
      console.error("Unexpected image gen response:", JSON.stringify(imageGenData).slice(0, 500));
      throw new Error("No image was generated");
    }

    // ============================
    // STEP 4: Generate matching caption via OpenRouter
    // ============================
    console.log("Step 4: Generating social media caption...");

    const captionMessages = [
      {
        role: "system",
        content: `You are an expert social media copywriter. Generate a compelling social media caption for a marketing post. The caption should:
1. Be engaging and on-brand
2. Include 2-3 relevant hashtags at the end
3. Be between 50-150 words
4. Match the tone of the campaign theme
5. Include a clear call to action
Output ONLY the caption text, nothing else.`,
      },
      {
        role: "user",
        content: `Brand: ${brandName}
Industry: ${industry}
Theme/Occasion: ${theme}
Main Headline: "${headlineText}"
Visual Style: ${visualStyle}

Write a matching social media caption.`,
      },
    ];

    const captionResp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-exp",
        messages: captionMessages,
        max_tokens: 300,
      }),
    });

    let caption = "";
    if (captionResp.ok) {
      const captionData = await captionResp.json();
      caption = captionData.choices?.[0]?.message?.content?.trim() || "";
    } else {
      console.warn("Caption generation failed, continuing without caption");
    }

    console.log("Campaign generation complete!");

    return new Response(
      JSON.stringify({
        imageUrl: imageDataUrl,
        caption,
        prompt: imagenPrompt,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("generate-campaign error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
