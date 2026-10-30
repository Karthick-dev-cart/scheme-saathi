import { readFileSync, readdirSync } from "fs";
import path from "path";
import matter from "gray-matter";

const SCHEMES_DIR = path.join(process.cwd(), "data", "schemes");

export interface SchemeDoc {
  id: string;
  title: string;
  board: string;
  sourceType: string;
  sourceUrl: string;
  sourceName: string;
  lastVerified: string;
  body: string;
}

export interface Chunk {
  chunkId: string;
  docId: string;
  docTitle: string;
  board: string;
  sourceType: string;
  sourceUrl: string;
  sourceName: string;
  heading: string;
  text: string;
}

export function loadDocs(): SchemeDoc[] {
  const files = readdirSync(SCHEMES_DIR).filter((f) => f.endsWith(".md"));
  return files.map((file) => {
    const raw = readFileSync(path.join(SCHEMES_DIR, file), "utf-8");
    const { data, content } = matter(raw);
    return {
      id: data.id,
      title: data.title,
      board: data.board,
      sourceType: data.source_type ?? "unknown",
      sourceUrl: data.source_url,
      sourceName: data.source_name,
      lastVerified: data.last_verified,
      body: content.trim(),
    };
  });
}

// Chunk each doc by markdown heading (##). Keeps tables/lists intact under their
// heading rather than splitting mid-table, which matters for eligibility figures.
export function chunkDocs(docs: SchemeDoc[]): Chunk[] {
  const chunks: Chunk[] = [];
  for (const doc of docs) {
    const sections = doc.body.split(/\n(?=## )/g);
    sections.forEach((section, i) => {
      const headingMatch = section.match(/^##\s+(.+)$/m);
      const heading = headingMatch ? headingMatch[1].trim() : doc.title;
      const text = section.trim();
      if (!text) return;
      chunks.push({
        chunkId: `${doc.id}::${i}`,
        docId: doc.id,
        docTitle: doc.title,
        board: doc.board,
        sourceType: doc.sourceType,
        sourceUrl: doc.sourceUrl,
        sourceName: doc.sourceName,
        heading,
        text,
      });
    });
  }
  return chunks;
}
