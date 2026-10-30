"use client";

import { useState } from "react";
import ChatPanel from "@/components/ChatPanel";
import EligibilityChecker from "@/components/EligibilityChecker";

type Tab = "chat" | "eligibility";

export default function Home() {
  const [tab, setTab] = useState<Tab>("chat");

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 sm:px-6">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Scheme Saathi</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Tamil Nadu welfare scheme eligibility — grounded answers with sources
        </p>
        <div className="mt-3 flex gap-1">
          <button
            onClick={() => setTab("chat")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === "chat"
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            Ask a question
          </button>
          <button
            onClick={() => setTab("eligibility")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === "eligibility"
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            Quick eligibility check
          </button>
        </div>
      </header>

      {tab === "chat" ? <ChatPanel /> : <EligibilityChecker />}
    </div>
  );
}
