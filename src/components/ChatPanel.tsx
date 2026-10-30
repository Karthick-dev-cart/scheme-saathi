"use client";

import { useState, useRef, useEffect } from "react";
import { sourceTypeBadgeClass } from "./sourceBadge";

interface Citation {
  marker: string;
  chunkId: string;
  sourceType: string;
  sourceUrl: string;
  sourceName: string;
}

interface RetrievedChunk {
  docTitle: string;
  heading: string;
  text: string;
  sourceType: string;
  sourceUrl: string;
  sourceName: string;
}

interface Message {
  role: "user" | "assistant";
  text: string;
  citations?: Citation[];
  retrievedOnly?: RetrievedChunk[];
  error?: string;
}

const SUGGESTIONS = [
  "I'm an auto driver in Chennai, what pension can I get after 60?",
  "How much is marriage assistance for construction workers?",
  "What documents do I need to register as an unorganised worker?",
];

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(question: string) {
    if (!question.trim() || loading) return;
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            text: "",
            error: data.error,
            retrievedOnly: data.retrievedOnly,
          },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          { role: "assistant", text: data.text, citations: data.citations },
        ]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "", error: "Network error — please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-2xl flex flex-col gap-4">
          {messages.length === 0 && (
            <div className="mt-8 flex flex-col gap-3">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Ask about Tamil Nadu unorganised-worker welfare schemes, e.g.:
              </p>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-200 hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                    : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100"
                }`}
              >
                {m.error ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-amber-600 dark:text-amber-400">{m.error}</p>
                    {m.retrievedOnly && m.retrievedOnly.length > 0 && (
                      <div className="flex flex-col gap-2 border-t border-zinc-200 dark:border-zinc-800 pt-2 mt-1">
                        <p className="text-xs text-zinc-500">
                          Retrieval still ran — here&apos;s the raw matched context:
                        </p>
                        {m.retrievedOnly.map((c, j) => (
                          <div key={j} className="text-xs text-zinc-600 dark:text-zinc-400">
                            <span
                              className={`mr-1 rounded px-1 py-0.5 text-[10px] font-medium uppercase ${sourceTypeBadgeClass(c.sourceType)}`}
                            >
                              {c.sourceType}
                            </span>
                            <span className="font-medium">
                              {c.docTitle} — {c.heading}
                            </span>{" "}
                            (
                            <a
                              href={c.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline"
                            >
                              {c.sourceName}
                            </a>
                            )
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <p>{m.text}</p>
                    {m.citations && m.citations.length > 0 && (
                      <div className="mt-3 flex flex-col gap-1 border-t border-zinc-200 dark:border-zinc-800 pt-2">
                        <p className="text-xs font-medium text-zinc-500">Sources</p>
                        {m.citations.map((c) => (
                          <a
                            key={c.marker}
                            href={c.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline"
                          >
                            <span
                              className={`rounded px-1 py-0.5 text-[10px] font-medium uppercase no-underline ${sourceTypeBadgeClass(c.sourceType)}`}
                            >
                              {c.sourceType}
                            </span>
                            {c.marker} {c.sourceName}
                          </a>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <span className="text-sm text-zinc-400">Thinking…</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 sm:px-6"
      >
        <div className="mx-auto max-w-2xl flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your situation…"
            className="flex-1 rounded-full border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-full bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 px-5 py-2 text-sm font-medium disabled:opacity-40"
          >
            Ask
          </button>
        </div>
      </form>
    </div>
  );
}
