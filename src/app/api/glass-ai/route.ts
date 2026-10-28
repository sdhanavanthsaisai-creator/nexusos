import { NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Msg { role: 'user' | 'assistant'; content: string }

const SYSTEM = `You are the GlassOS Assistant — a witty, concise system assistant living inside the Dynamic Island of a browser-based glassmorphic operating system called GlassOS.
GlassOS apps: Finder (virtual files), Prism (browser), Notes (markdown), Music (live synthesized tracks: Aurora Drift, Glass Ribbons, Midnight Lagoon, Neon Comet), Settings.
The user can ask you to "open music", "start a 5 min timer", or "change theme" — if the request sounds like one of these system commands, reply with ONLY the matching command token on the first line: [open:music] [open:notes] [open:finder] [open:browser] [open:settings] [timer:5] [theme:next] — followed by a short friendly line.
Otherwise answer the question directly in under 80 words. No markdown headers, keep it chat-sized.`;

export async function POST(req: Request) {
  let body: { messages?: Msg[] };
  try {
    body = (await req.json()) as { messages?: Msg[] };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const messages = (body.messages ?? [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-8);

  if (!messages.length) {
    return NextResponse.json({ error: 'messages[] required' }, { status: 400 });
  }

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [{ role: 'assistant', content: SYSTEM }, ...messages],
      thinking: { type: 'disabled' },
    });
    let text = completion.choices[0]?.message?.content?.trim();
    if (!text) throw new Error('empty response');

    // Parse command tokens into actions for the client
    const actions: { type: string; arg?: string }[] = [];
    text = text.replace(/\[(open|timer|theme):([^\]]+)\]/g, (_m, kind, arg) => {
      actions.push({ type: String(kind), arg: String(arg).trim() });
      return '';
    });
    text = text.trim();

    return NextResponse.json({ text: text || 'Done ✦', actions });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'AI request failed';
    return NextResponse.json({ text: `The AI core is unreachable right now. (${msg.slice(0, 120)})`, actions: [], error: msg }, { status: 200 });
  }
}
