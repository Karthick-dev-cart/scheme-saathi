import { readFileSync } from "fs";
import path from "path";
import { hybridSearch } from "../src/lib/search";

interface TestCase {
  query: string;
  expectedDocIds: string[];
  notes?: string;
}

const K_VALUES = [1, 3, 5];

async function main() {
  const testsetPath = path.join(process.cwd(), "eval", "testset.json");
  const testset: TestCase[] = JSON.parse(readFileSync(testsetPath, "utf-8"));

  const hitsAtK: Record<number, number> = { 1: 0, 3: 0, 5: 0 };
  const failures: { query: string; expected: string[]; got: string[] }[] = [];

  for (const tc of testset) {
    const results = await hybridSearch(tc.query, 5);
    const retrievedDocIds = results.map((r) => r.docId);

    for (const k of K_VALUES) {
      const topKDocIds = retrievedDocIds.slice(0, k);
      if (topKDocIds.some((id) => tc.expectedDocIds.includes(id))) {
        hitsAtK[k]++;
      }
    }

    if (!retrievedDocIds.slice(0, 3).some((id) => tc.expectedDocIds.includes(id))) {
      failures.push({ query: tc.query, expected: tc.expectedDocIds, got: retrievedDocIds });
    }
  }

  const n = testset.length;
  console.log(`\nRetrieval eval over ${n} test cases:`);
  for (const k of K_VALUES) {
    const rate = ((hitsAtK[k] / n) * 100).toFixed(1);
    console.log(`  Hit rate @${k}: ${hitsAtK[k]}/${n} (${rate}%)`);
  }

  if (failures.length > 0) {
    console.log(`\nFailures (miss @3):`);
    for (const f of failures) {
      console.log(`  Q: "${f.query}"`);
      console.log(`    expected one of: ${f.expected.join(", ")}`);
      console.log(`    got top-3 docIds: ${f.got.slice(0, 3).join(", ")}`);
    }
  } else {
    console.log(`\nNo misses at @3.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
