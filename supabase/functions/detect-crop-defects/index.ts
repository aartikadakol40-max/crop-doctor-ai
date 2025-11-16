import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();
    
    if (!image) {
      throw new Error('Image is required');
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log('Analyzing crop image for defects...');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert agricultural AI system specialized in detecting crop defects. 
Analyze images of crops from these 5 categories: Wheat, Rice, Corn, Tomato, Potato.

For each image, identify:
1. The crop type
2. Any defects present (disease, pest damage, nutrient deficiency, physical damage, etc.)
3. Severity level (Low, Medium, High, Critical)
4. Confidence score (0-100)

Respond in JSON format:
{
  "crop_type": "crop name",
  "defects": [
    {
      "name": "defect name",
      "description": "brief description",
      "affected_area": "percentage or location"
    }
  ],
  "severity": "Low|Medium|High|Critical",
  "confidence_score": 85.5,
  "recommendations": "brief treatment recommendations"
}`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this crop image for defects and identify the crop type."
              },
              {
                type: "image_url",
                image_url: {
                  url: image
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_crop",
              description: "Analyze crop image for type, defects, and severity",
              parameters: {
                type: "object",
                properties: {
                  crop_type: {
                    type: "string",
                    enum: ["Wheat", "Rice", "Corn", "Tomato", "Potato"]
                  },
                  defects: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        affected_area: { type: "string" }
                      },
                      required: ["name", "description", "affected_area"]
                    }
                  },
                  severity: {
                    type: "string",
                    enum: ["Low", "Medium", "High", "Critical"]
                  },
                  confidence_score: {
                    type: "number",
                    minimum: 0,
                    maximum: 100
                  },
                  recommendations: { type: "string" }
                },
                required: ["crop_type", "defects", "severity", "confidence_score", "recommendations"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_crop" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to analyze image");
    }

    const data = await response.json();
    console.log('AI Response:', JSON.stringify(data, null, 2));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No analysis result from AI");
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify(analysis),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in detect-crop-defects:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
