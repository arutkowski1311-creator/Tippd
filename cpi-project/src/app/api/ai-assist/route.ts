import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { CPI_CATEGORIES } from "@/lib/constants";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const categoryDefinitions = Object.entries(CPI_CATEGORIES)
  .map(([key, val]) => `- ${key}: "${val.label}" — ${val.description}`)
  .join("\n");

const systemPrompt = `You are a clinical performance categorization assistant for the CPI (Clinical Performance Index) system.

Your job is to:
1. Clean up and standardize the nomination description (fix grammar, make concise, keep clinical tone)
2. Suggest which CPI category best fits the described behavior
3. Provide a confidence score (0-1) and brief reasoning

CPI Categories:
${categoryDefinitions}

Respond ONLY with valid JSON in this exact format:
{
  "category": "<category_key>",
  "confidence": <0.0-1.0>,
  "reasoning": "<1 sentence explaining why>",
  "cleaned_text": "<cleaned version of the description>"
}`;

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Nomination text is required" },
        { status: 400 }
      );
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Categorize and clean this clinical nomination:\n\n"${text.trim()}"`,
        },
      ],
      system: systemPrompt,
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    const result = JSON.parse(content.text);

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI assist error:", error);
    return NextResponse.json(
      { error: "Failed to process nomination" },
      { status: 500 }
    );
  }
}
