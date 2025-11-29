// route.ts
import { NextResponse } from "next/server";
import { openRouterQueue } from "@/lib/requestQueue";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const API_URL = "https://openrouter.ai/api/v1/chat/completions";

if (!OPENROUTER_API_KEY) {
  throw new Error("OPENROUTER_API_KEY is not defined in environment variables");
}

// Define the expected response types
interface OpenRouterMessage {
  role: string;
  content: string;
}

interface OpenRouterChoice {
  message: OpenRouterMessage;
  finish_reason: string;
}

interface OpenRouterResponse {
  choices: OpenRouterChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function POST(req: Request) {
  try {
    const { description }: { description: string } = await req.json();

    if (!description || description.trim().length === 0) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    const response = await openRouterQueue.add(() =>
      fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://resume-optimizer.com',
          'X-Title': 'Resume Optimizer',
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini", // Fast and cost-effective
          messages: [
            {
              role: "system",
              content:
                "You are a professional resume writer. Rewrite user-provided descriptions into highly impactful, professional, and truthful resume objectives.",
            },
            {
              role: "user",
              content: `Rewrite this into a polished resume objective (strictly under 450 characters):
Description: ${description}
- Clear, impactful, achievement-oriented
- Professional tone with strong action words
- No extra explanations`,
            },
          ],
          temperature: 0.7,
          max_tokens: 200,
        }),
      })
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        "OpenRouter API error:",
        response.status,
        response.statusText,
        errorBody
      );

      if (response.status === 429) {
        return NextResponse.json(
          {
            error: "Rate limit exceeded. Please try again in a moment.",
            code: "RATE_LIMIT_EXCEEDED",
          },
          { status: 429 }
        );
      }

      if (response.status === 400) {
        return NextResponse.json(
          {
            error: "Invalid request. Please check your input.",
            code: "INVALID_REQUEST",
          },
          { status: 400 }
        );
      }

      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          {
            error: "Invalid API key or authentication failed.",
            code: "AUTHENTICATION_FAILED",
          },
          { status: 401 }
        );
      }

      throw new Error(`OpenRouter API error: ${response.statusText} - ${errorBody}`);
    }

    const data: OpenRouterResponse = await response.json();

    const enhanced = data.choices?.[0]?.message?.content;

    if (!enhanced) {
      throw new Error("Invalid response format from OpenRouter API");
    }

    return NextResponse.json({
      enhanced: enhanced.trim(),
      usage: data.usage, // Optional: track token usage
    });
  } catch (error) {
    console.error("Error in enhance API:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to enhance description",
      },
      { status: 500 }
    );
  }
}
