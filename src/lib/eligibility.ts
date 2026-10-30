import { readFileSync } from "fs";
import path from "path";

interface Benefit {
  name: string;
  amount: string;
  overrides?: string;
}

interface BoardRule {
  id: string;
  name: string;
  occupationKeywords: string[];
  extraBenefits: Benefit[];
  excludedBenefits?: string[];
  docId: string;
}

interface RulesFile {
  commonEligibility: { minAge: number; maxAge: number; excludesEpfEsi: boolean; residency: string };
  commonBenefits: { name: string; amount: string }[];
  sourceType: string;
  sourceUrl: string;
  sourceName: string;
  boards: BoardRule[];
}

export interface EligibilityInput {
  age: number;
  occupation: string;
  epfOrEsiCovered: boolean;
}

export interface EligibilityResult {
  registrationEligible: boolean;
  reasons: string[];
  matchedBoard: { id: string; name: string; docId: string; confidence: "matched" | "unmatched" };
  benefits: { name: string; amount: string; note?: string }[];
  notEligibleFor: string[];
  sourceType: string;
  sourceUrl: string;
  sourceName: string;
}

let rulesCache: RulesFile | null = null;

function loadRules(): RulesFile {
  if (!rulesCache) {
    const rulesPath = path.join(process.cwd(), "data", "eligibility-rules.json");
    rulesCache = JSON.parse(readFileSync(rulesPath, "utf-8"));
  }
  return rulesCache!;
}

function matchBoard(occupation: string, boards: BoardRule[]): BoardRule | null {
  const normalized = occupation.toLowerCase();
  for (const board of boards) {
    if (board.occupationKeywords.some((kw) => normalized.includes(kw))) {
      return board;
    }
  }
  return null;
}

// Deterministic rule matching — not an LLM call. The occupation -> board mapping and
// benefit amounts come from data/eligibility-rules.json, itself derived from the official
// TN Labour Dept citizen's charter (see data/schemes/common-benefit-schedule.md).
export function checkEligibility(input: EligibilityInput): EligibilityResult {
  const rules = loadRules();
  const reasons: string[] = [];
  let registrationEligible = true;

  if (input.age < rules.commonEligibility.minAge || input.age > rules.commonEligibility.maxAge) {
    registrationEligible = false;
    reasons.push(
      `Age ${input.age} is outside the ${rules.commonEligibility.minAge}–${rules.commonEligibility.maxAge} registration window.`
    );
  } else {
    reasons.push(`Age ${input.age} is within the ${rules.commonEligibility.minAge}–${rules.commonEligibility.maxAge} window.`);
  }

  if (input.epfOrEsiCovered) {
    registrationEligible = false;
    reasons.push("Already covered under EPF/ESI — unorganised-worker boards generally exclude workers with EPF/ESI coverage.");
  } else {
    reasons.push("Not covered under EPF/ESI, which matches the common eligibility requirement.");
  }

  const matched = matchBoard(input.occupation, rules.boards);

  const board: EligibilityResult["matchedBoard"] = matched
    ? { id: matched.id, name: matched.name, docId: matched.docId, confidence: "matched" }
    : {
        id: "manual",
        name: "Tamil Nadu Manual Workers Welfare Board (unconfirmed guess — occupation not recognised)",
        docId: "manual-workers-board-benefits",
        confidence: "unmatched",
      };

  if (!matched) {
    reasons.push(
      `Occupation "${input.occupation}" didn't match a known board's keyword list. Defaulting to Manual Workers board as a guess — confirm with the district Labour Office rather than relying on this.`
    );
  } else {
    reasons.push(`Occupation "${input.occupation}" matched the ${matched.name}.`);
  }

  const benefits: { name: string; amount: string; note?: string }[] = [...rules.commonBenefits];
  const notEligibleFor: string[] = [];

  if (matched) {
    for (const extra of matched.extraBenefits) {
      if (extra.overrides) {
        const idx = benefits.findIndex((b) => b.name === extra.overrides);
        if (idx >= 0) {
          benefits[idx] = { ...extra, note: `overrides the general "${extra.overrides}" amount for this board` };
        } else {
          benefits.push(extra);
        }
      } else {
        benefits.push(extra);
      }
    }
    for (const excluded of matched.excludedBenefits ?? []) {
      notEligibleFor.push(excluded);
    }
  }

  return {
    registrationEligible,
    reasons,
    matchedBoard: board,
    benefits,
    notEligibleFor,
    sourceType: rules.sourceType,
    sourceUrl: rules.sourceUrl,
    sourceName: rules.sourceName,
  };
}
