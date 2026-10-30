import { hybridSearch } from "../src/lib/search";

const queries = [
  "I am an auto driver in Chennai, what pension can I get",
  "how much does marriage assistance pay for construction workers",
  "what documents do I need to register as an unorganised worker",
  "my husband died in a road accident, what compensation can I claim",
];

async function main() {
  for (const q of queries) {
    console.log(`\n=== Query: ${q} ===`);
    const results = await hybridSearch(q, 3);
    results.forEach((r, i) => {
      console.log(
        `${i + 1}. [${r.score.toFixed(3)}] ${r.docTitle} > ${r.heading} (${r.sourceName})`
      );
    });
  }
}

main();
