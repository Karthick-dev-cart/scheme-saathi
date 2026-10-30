import { checkEligibility } from "../src/lib/eligibility";

const cases: { label: string; input: Parameters<typeof checkEligibility>[0]; check: (r: ReturnType<typeof checkEligibility>) => string | null }[] = [
  {
    label: "Auto driver, 45, no EPF/ESI — should match drivers board, no family pension",
    input: { age: 45, occupation: "auto driver", epfOrEsiCovered: false },
    check: (r) => {
      if (r.matchedBoard.id !== "drivers") return `expected drivers board, got ${r.matchedBoard.id}`;
      if (!r.notEligibleFor.some((b) => b.includes("Family pension"))) return "expected family pension to be excluded";
      if (!r.registrationEligible) return "expected registration eligible";
      return null;
    },
  },
  {
    label: "Mason, 30, no EPF/ESI — should match construction board, ₹5L accident override",
    input: { age: 30, occupation: "mason", epfOrEsiCovered: false },
    check: (r) => {
      if (r.matchedBoard.id !== "construction") return `expected construction board, got ${r.matchedBoard.id}`;
      const accidentBenefit = r.benefits.find((b) => b.name.includes("work site"));
      if (!accidentBenefit || accidentBenefit.amount !== "₹5,00,000") return "expected ₹5,00,000 work-site accident override";
      if (!r.benefits.some((b) => b.name.includes("Family pension"))) return "expected family pension present for construction";
      return null;
    },
  },
  {
    label: "Factory worker with EPF, 35 — should be ineligible",
    input: { age: 35, occupation: "factory machine operator", epfOrEsiCovered: true },
    check: (r) => (r.registrationEligible ? "expected registration ineligible due to EPF coverage" : null),
  },
  {
    label: "Age 65 driver — should be ineligible on age",
    input: { age: 65, occupation: "taxi driver", epfOrEsiCovered: false },
    check: (r) => (r.registrationEligible ? "expected registration ineligible due to age" : null),
  },
  {
    label: "Unknown occupation — should flag unmatched, not silently guess with confidence",
    input: { age: 40, occupation: "astrologer", epfOrEsiCovered: false },
    check: (r) => (r.matchedBoard.confidence !== "unmatched" ? "expected unmatched confidence flag" : null),
  },
];

let failures = 0;
for (const c of cases) {
  const result = checkEligibility(c.input);
  const failure = c.check(result);
  if (failure) {
    failures++;
    console.log(`FAIL: ${c.label}\n  ${failure}`);
  } else {
    console.log(`PASS: ${c.label}`);
  }
}

console.log(`\n${cases.length - failures}/${cases.length} passed`);
if (failures > 0) process.exit(1);
