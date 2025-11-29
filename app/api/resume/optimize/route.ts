import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import AnalysisResult from '@/models/AnalysisResult';
import { hasCredits, deductCredits } from '@/payment/creditService';
import { CREDIT_COSTS } from '@/payment/config';
import { openRouterQueue } from '@/lib/requestQueue';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    // Get user from session
    const User = (await import('@/models/User')).default;
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = (user._id as any).toString();

    // Check credits
    const hasSufficientCredits = await hasCredits(
      userId,
      CREDIT_COSTS.RESUME_OPTIMIZATION || 2
    );

    if (!hasSufficientCredits) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          code: 'INSUFFICIENT_CREDITS',
          requiredCredits: CREDIT_COSTS.RESUME_OPTIMIZATION || 2
        },
        { status: 402 }
      );
    }

    const body = await req.json();
    const { analysisId, resumeText, suggestions } = body;

    if (!resumeText) {
      return NextResponse.json(
        { error: 'Resume text is required' },
        { status: 400 }
      );
    }

    // If analysisId is provided, fetch the full analysis from DB
    let fullAnalysis = null;
    if (analysisId) {
      fullAnalysis = await AnalysisResult.findOne({
        _id: analysisId,
        userId,
      });

      if (!fullAnalysis) {
        return NextResponse.json(
          { error: 'Analysis not found' },
          { status: 404 }
        );
      }
    }

    // Generate optimized resume using AI
    const optimizedResume = await generateOptimizedResume(
      resumeText,
      suggestions || (fullAnalysis?.suggestions || [])
    );

    // Deduct credits
    await deductCredits(
      userId,
      CREDIT_COSTS.RESUME_OPTIMIZATION || 2,
      'resume_optimization',
      undefined,
      'resume_optimization'
    );

    return NextResponse.json({
      optimizedResume,
      analysisId,
      creditsUsed: CREDIT_COSTS.RESUME_OPTIMIZATION || 2,
    });
  } catch (error) {
    console.error('Error optimizing resume:', error);
    return NextResponse.json(
      { error: 'Failed to optimize resume' },
      { status: 500 }
    );
  }
}

async function generateOptimizedResume(
  resumeText: string,
  suggestions: any[]
): Promise<string> {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured');
  }

  const prompt = `You are an expert resume writer and ATS optimization specialist. Your task is to generate an optimized version of a resume by incorporating specific improvement suggestions.

ORIGINAL RESUME:
${resumeText}

IMPROVEMENT SUGGESTIONS:
${suggestions
      .map(
        (s, idx) =>
          `${idx + 1}. ${s.suggestion}
   Current: "${s.originalText}"
   Suggested: "${s.improvedText}"`
      )
      .join('\n\n')}

INSTRUCTIONS:
1. Take the original resume and apply ALL the improvement suggestions
2. Maintain the original structure and formatting style
3. Replace the "Current" text with the "Suggested" text where applicable
4. If a suggestion says "MISSING", add that content in the appropriate section
5. Ensure the resume flows naturally and maintains professional tone
6. Keep all contact information and personal details intact
7. Return ONLY the optimized resume text, no explanations or additional commentary

OPTIMIZED RESUME:`;

  const response = await openRouterQueue.add(() =>
    fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://resume-optimizer.com', // Replace with your actual site URL
          'X-Title': 'Resume Optimizer',
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2048,
        }),
      }
    )
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('OpenRouter API error:', response.status, response.statusText, errorBody);

    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a moment.');
    }

    if (response.status === 400) {
      throw new Error('Invalid request to OpenRouter API. Please check your input.');
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error('Invalid OpenRouter API key or authentication failed.');
    }

    throw new Error(`OpenRouter API error: ${response.statusText}`);
  }

  const data = await response.json();
  const optimizedResume = data.choices?.[0]?.message?.content || '';

  if (!optimizedResume) {
    throw new Error('No optimized resume received from OpenRouter API');
  }

  return optimizedResume.trim();
}
