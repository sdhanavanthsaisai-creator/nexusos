import { NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import type { AiStats } from '@/lib/nexus/types';
import { buildSystemPrompt, mockCoachReply } from '@/lib/nexus/ai-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CoachMessage { role: 'user' | 'assistant'; content: string }
interface CoachBody {
  messages?: CoachMessage[];
  context?: AiStats;
  provider?: 'nexus' | 'gemini';
  apiKey?: string;
  model?: string;
}

const MAX_MESSAGES = 12;

/** Gemini REST proxy (user-supplied key, never persisted server-side). */
async function callGemini(
  apiKey: string,
  model: string,
  system: string,
  history: CoachMessage[],
): Promise<string> {
  const contents = history.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model || 'gemini-2.0-flash')}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: system }] },
        generationConfig: { temperature: 0.7, maxOutputTokens: 700 },
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Gemini ${res.status}: ${detail.slice(0, 180)}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim();
  if (!text) throw new Error('Gemini returned an empty response');
  return text;
}

/** Built-in Nexus AI via z-ai-web-dev-sdk (server-side only). */
async function callNexus(system: string, history: CoachMessage[]): Promise<string> {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: system },
      ...history,
    ],
    thinking: { type: 'disabled' },
  });
  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) throw new Error('Nexus AI returned an empty response');
  return text;
}

export async function POST(req: Request) {
  let body: CoachBody;
  try {
    body = (await req.json()) as CoachBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const history = (body.messages ?? [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_MESSAGES);
  const context = body.context;
  const lastUser = [...history].reverse().find((m) => m.role === 'user')?.content ?? '';

  if (!history.length) {
    return NextResponse.json({ error: 'messages[] required' }, { status: 400 });
  }

  const system = context ? buildSystemPrompt(context) : 'You are Nexus Coach, a concise, encouraging study coach. Answer in under 200 words with markdown.';

  // 1) Gemini (bring-your-own-key)
  if (body.provider === 'gemini' && body.apiKey) {
    try {
      const text = await callGemini(body.apiKey, body.model ?? 'gemini-2.0-flash', system, history);
      return NextResponse.json({ text, provider: 'gemini', mock: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gemini request failed';
      return NextResponse.json(
        { text: mockCoachReply(lastUser, context as AiStats), provider: 'mock', mock: true, error: msg },
        { status: 200 },
      );
    }
  }

  // 2) Built-in Nexus AI
  try {
    const text = await callNexus(system, history);
    return NextResponse.json({ text, provider: 'nexus', mock: false });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Nexus AI request failed';
    // 3) deterministic offline fallback
    return NextResponse.json(
      { text: mockCoachReply(lastUser, context as AiStats), provider: 'mock', mock: true, error: msg },
      { status: 200 },
    );
  }
}
