import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { headline, style, brandName, description, logoUrl, productImageUrl } = await req.json();
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured");

    // Engineering the prompt for Flux
    const stylePrompts: Record<string, string> = {
      photorealistic: `high-end commercial product photography, studio lighting, 8k resolution, sharp focus`,
      cyberpunk: `neon lights, cyberpunk city background, futuristic, glowing, vibrant colors, cinematic`,
      pastel: `minimalist pastel colors, soft lighting, clean composition, gentle aesthetic`,
      "3d-render": `3d octane render, abstract geometric shapes, glossy materials, surreal, high detail`,
      lifestyle: `authentic lifestyle photography, warm natural lighting, golden hour, happy atmosphere`,
    };

    const baseStyle = stylePrompts[style] || stylePrompts.photorealistic;

    // Construct a rich prompt for Flux
    let prompt = `A professional advertising image for brand "${brandName}". ${baseStyle}. `;
    if (description) prompt += `Product description: ${description}. `;
    if (headline) prompt += `Text overlay "${headline}" integrated naturally. `;
    prompt += `High quality, commercial grade.`;

    console.log("Generating image with prompt:", prompt);

    const response = await fetch("https://openrouter.ai/api/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "black-forest-labs/flux-1-schnell",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter error:", errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error("No image generated from API");
    }

    return new Response(JSON.stringify({ imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-ad-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
