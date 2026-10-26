'use client';

/**
 * AIDrawer — Nexus Coach side sheet. Chat with the AI productivity coach;
 * falls back to the built-in deterministic coach when no provider is reachable.
 */

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { Loader2, Sparkles, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useNexus, useUI } from '@/lib/nexus/store';
import { buildAiStats, mockCoachReply } from '@/lib/nexus/ai-context';
import { cn } from '@/lib/utils';

const QUICK_PROMPTS = [
  'Summarize my week',
  'Which subject am I neglecting?',
  "Generate tomorrow's study plan",
  'How can I improve my focus?',
] as const;

const MD_STYLES = [
  '[&_a]:text-primary [&_a]:underline',
  '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px]',
  '[&_h1]:mb-1 [&_h1]:mt-3 [&_h1]:text-base [&_h1]:font-semibold',
  '[&_h2]:mb-1 [&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold',
  '[&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:text-sm [&_h3]:font-semibold',
  '[&_li]:my-0.5',
  '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-4',
  '[&_p]:my-2 [&_p]:first:mt-0 [&_p]:last:mb-0',
  '[&_strong]:font-semibold [&_strong]:text-primary',
  '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-4',
].join(' ');

function Markdown({ content }: { content: string }) {
  return (
    <div className={MD_STYLES}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

function EmptyChatState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="glow-soft flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/25 to-violet-500/25 text-primary">
        <Sparkles className="h-6 w-6" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-semibold">Meet Nexus Coach</p>
        <p className="mt-1 text-xs text-muted-foreground">A coach that actually knows your live stats.</p>
      </div>
      <ul className="mt-1 space-y-1.5 text-left text-xs text-muted-foreground">
        <li className="flex items-start gap-2"><span className="text-primary" aria-hidden="true">•</span> Summarize your week and spot neglected subjects</li>
        <li className="flex items-start gap-2"><span className="text-primary" aria-hidden="true">•</span> Build tomorrow&rsquo;s study plan around your targets</li>
        <li className="flex items-start gap-2"><span className="text-primary" aria-hidden="true">•</span> Suggest focus, habit and DSA improvements</li>
      </ul>
    </div>
  );
}

export default function AIDrawer() {
  const open = useUI((s) => s.aiOpen);
  const setAiOpen = useUI((s) => s.setAiOpen);
  const chat = useNexus((s) => s.chat);
  const settings = useNexus((s) => s.settings);
  const addChat = useNexus((s) => s.addChat);
  const clearChat = useNexus((s) => s.clearChat);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const offlineToastedRef = useRef(false);

  const providerLabel = settings.aiProvider === 'gemini' ? `Gemini · ${settings.geminiModel}` : 'Nexus AI · built-in';

  // Auto-scroll to the newest message.
  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chat.length, loading, open]);

  const send = async (raw?: string) => {
    const content = (raw ?? input).trim();
    if (!content || loading) return;
    setInput('');
    setLoading(true);
    addChat({ role: 'user', content });
    const userMsg = { role: 'user' as const, content };
    const history = [...chat, userMsg].slice(-10).map((m) => ({ role: m.role, content: m.content }));
    try {
      const stats = buildAiStats(useNexus.getState());
      const res = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          context: stats,
          provider: settings.aiProvider,
          apiKey: settings.geminiKey || undefined,
          model: settings.geminiModel,
        }),
      });
      if (!res.ok) throw new Error(`Coach request failed (${res.status})`);
      const data = (await res.json()) as { text?: string; provider?: string; mock?: boolean };
      if (!data.text) throw new Error('Empty reply from coach');
      addChat({ role: 'assistant', content: data.text, provider: data.mock ? 'mock' : (data.provider ?? settings.aiProvider) });
    } catch {
      // Route missing / provider down → deterministic offline fallback.
      const text = mockCoachReply(content, buildAiStats(useNexus.getState()));
      addChat({ role: 'assistant', content: text, provider: 'offline' });
      if (!offlineToastedRef.current) {
        offlineToastedRef.current = true;
        toast.info('Coach is in offline mode', { description: 'Using built-in replies. Add a Gemini key in Settings for full coaching.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const onTextareaKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <Sheet open={open} onOpenChange={setAiOpen}>
      <SheetContent side="right" className="glass-strong w-full gap-0 p-0 sm:w-[420px] sm:max-w-none">
        <SheetTitle className="sr-only">Nexus Coach</SheetTitle>
        <SheetDescription className="sr-only">Chat with your AI productivity coach</SheetDescription>

        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border/60 p-4 pr-14">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-white shadow-lg">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight">Nexus Coach</p>
              <p className="truncate text-[11px] text-muted-foreground">{providerLabel}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => {
              if (!chat.length) return;
              clearChat();
              toast.success('Chat cleared');
            }}
            disabled={!chat.length}
            aria-label="Clear chat"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Messages */}
        {chat.length === 0 && !loading ? (
          <EmptyChatState />
        ) : (
          <ScrollArea className="slim-scroll min-h-0 flex-1">
            <div className="flex flex-col gap-3 p-4">
              {chat.map((m) => (
                <div key={m.id} className={cn('flex w-full', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[88%] px-3.5 py-2.5 text-sm leading-relaxed',
                      m.role === 'user'
                        ? 'rounded-2xl rounded-br-md border border-primary/20 bg-primary/15'
                        : 'glass rounded-2xl rounded-bl-md',
                    )}
                  >
                    {m.role === 'assistant' ? <Markdown content={m.content} /> : <p className="whitespace-pre-wrap">{m.content}</p>}
                    {m.role === 'assistant' && (m.provider === 'mock' || m.provider === 'offline') && (
                      <Badge variant="outline" className="mt-2 text-[9px] uppercase tracking-wider text-muted-foreground">
                        offline mode
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex w-full justify-start">
                  <div className="glass flex items-center gap-1.5 rounded-2xl rounded-bl-md px-3.5 py-3" aria-label="Coach is typing">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70" style={{ animationDelay: `${i * 140}ms` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
        )}

        {/* Quick prompts */}
        <div className="flex flex-wrap gap-1.5 border-t border-border/60 px-4 py-2.5">
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q}
              type="button"
              disabled={loading}
              onClick={() => void send(q)}
              className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="border-t border-border/60 p-3">
          <div className="flex items-end gap-2">
            <Textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onTextareaKeyDown}
              placeholder="Ask your coach anything…"
              aria-label="Message Nexus Coach"
              disabled={loading}
              className="min-h-0 flex-1 resize-none text-sm"
            />
            <Button
              size="icon"
              className="glow-soft h-9 w-9 shrink-0"
              onClick={() => void send()}
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
            </Button>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            <span className="kbd">Enter</span> to send · <span className="kbd">Shift</span>+<span className="kbd">Enter</span> for a new line
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
