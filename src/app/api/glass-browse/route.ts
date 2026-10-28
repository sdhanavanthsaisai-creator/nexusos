import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Simple reader-mode extractor: fetches a page and returns title + readable text. */
function extract(html: string): { title: string; text: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ') : 'Untitled';

  // strip scripts/styles/svg/nav-ish noise
  let body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<(nav|footer|header|aside)[\s\S]*?<\/\1>/gi, ' ');

  // keep paragraph-ish breaks
  body = body
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article|blockquote)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n');

  const text = body
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 1)
    .join('\n')
    .slice(0, 20000);

  return { title, text };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('url');
  if (!target) {
    return NextResponse.json({ error: 'url param required' }, { status: 400 });
  }
  let url: URL;
  try {
    url = new URL(target);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('bad protocol');
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GlassOSPrism/1.0; +https://glassos.local)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    });
    const ctype = res.headers.get('content-type') ?? '';
    if (!res.ok) {
      return NextResponse.json({ error: `Upstream ${res.status}` }, { status: 200 });
    }
    if (!ctype.includes('html')) {
      return NextResponse.json({ title: url.hostname, text: `(binary content: ${ctype})`, url: url.toString() });
    }
    const html = await res.text();
    const { title, text } = extract(html);
    return NextResponse.json({ title, text, url: url.toString() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'fetch failed';
    return NextResponse.json({ error: msg }, { status: 200 });
  }
}
