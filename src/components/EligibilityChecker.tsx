"use client";

import { useState } from "react";
import { sourceTypeBadgeClass } from "./sourceBadge";

interface EligibilityResult {
  registrationEligible: boolean;
  reasons: string[];
  matchedBoard: { id: string; name: string; docId: string; confidence: "matched" | "unmatched" };
  benefits: { name: string; amount: string; note?: string }[];
  notEligibleFor: string[];
  sourceType: string;
  sourceUrl: string;
  sourceName: string;
}

export default function EligibilityChecker() {
  const [age, setAge] = useState("35");
  const [occupation, setOccupation] = useState("auto driver");
  const [epfOrEsiCovered, setEpfOrEsiCovered] = useState(false);
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function check() {
    setLoading(true);
    try {
      const res = await fetch("/api/eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ age: Number(age), occupation, epfOrEsiCovered }),
      });
      const data = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-2xl flex flex-col gap-4">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Deterministic rule matching — no LLM call, same answer every time for the same inputs.
          Benefit amounts come straight from the official Labour Dept schedule.
        </p>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-200">
            Age
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-200">
            Occupation
            <input
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="e.g. auto driver, mason, domestic worker"
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
            <input
              type="checkbox"
              checked={epfOrEsiCovered}
              onChange={(e) => setEpfOrEsiCovered(e.target.checked)}
            />
            Already covered by EPF or ESI through an employer
          </label>
          <button
            onClick={check}
            disabled={loading}
            className="rounded-full bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 px-5 py-2 text-sm font-medium disabled:opacity-40 self-start"
          >
            {loading ? "Checking…" : "Check eligibility"}
          </button>
        </div>

        {result && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 flex flex-col gap-3 text-sm">
            <div
              className={`font-medium ${result.registrationEligible ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
            >
              {result.registrationEligible ? "Likely eligible to register" : "Likely not eligible to register"}
            </div>

            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <span
                className={`rounded px-1 py-0.5 text-[10px] font-medium uppercase ${
                  result.matchedBoard.confidence === "matched"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                }`}
              >
                {result.matchedBoard.confidence}
              </span>
              {result.matchedBoard.name}
            </div>

            <ul className="list-disc pl-5 text-zinc-600 dark:text-zinc-400">
              {result.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>

            <div>
              <p className="font-medium text-zinc-700 dark:text-zinc-200 mb-1">Benefits that apply</p>
              <table className="w-full text-left">
                <tbody>
                  {result.benefits.map((b, i) => (
                    <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800">
                      <td className="py-1 pr-2 text-zinc-600 dark:text-zinc-400">
                        {b.name}
                        {b.note && <span className="text-zinc-400 dark:text-zinc-500"> ({b.note})</span>}
                      </td>
                      <td className="py-1 text-right font-medium text-zinc-800 dark:text-zinc-100">{b.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {result.notEligibleFor.length > 0 && (
              <div>
                <p className="font-medium text-red-600 dark:text-red-400 mb-1">Not eligible for</p>
                <ul className="list-disc pl-5 text-zinc-600 dark:text-zinc-400">
                  {result.notEligibleFor.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            )}

            <a
              href={result.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline mt-1"
            >
              <span
                className={`rounded px-1 py-0.5 text-[10px] font-medium uppercase no-underline ${sourceTypeBadgeClass(result.sourceType)}`}
              >
                {result.sourceType}
              </span>
              {result.sourceName}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
