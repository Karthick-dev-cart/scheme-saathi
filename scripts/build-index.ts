import { writeFileSync } from "fs";
import path from "path";
import { loadDocs, chunkDocs } from "../src/lib/corpus";
import { embedBatch } from "../src/lib/embeddings";

async function main() {
  const docs = loadDocs();
  const chunks = chunkDocs(docs);
  console.log(`Embedding ${chunks.length} chunks from ${docs.length} documents...`);

  // Prefix with doc title so terse sections (e.g. a bare benefits table) still carry
  // enough semantic context — "Benefit amounts" alone embeds poorly for colloquial queries.
  const vectors = await embedBatch(chunks.map((c) => `${c.docTitle} — ${c.heading}\n${c.text}`));

  const index = chunks.map((chunk, i) => ({ ...chunk, vector: vectors[i] }));

  const outPath = path.join(process.cwd(), "data", "index.json");
  writeFileSync(outPath, JSON.stringify(index), "utf-8");
  console.log(`Wrote index for ${index.length} chunks to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
