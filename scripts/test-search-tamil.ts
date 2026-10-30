import { hybridSearch } from "../src/lib/search";

const queries = [
  { ta: "என் கணவர் விபத்தில் இறந்துவிட்டார், எவ்வளவு உதவி பெற முடியும்?", expectDocId: "common-benefit-schedule" },
  { ta: "ஆட்டோ டிரைவர்கள் எந்த வாரியத்தில் பதிவு செய்ய வேண்டும்?", expectDocId: "drivers-welfare-pension" },
  { ta: "கட்டுமான தொழிலாளிக்கு திருமண உதவி எவ்வளவு?", expectDocId: "common-benefit-schedule" },
  { ta: "பதிவு செய்ய என்ன ஆவணங்கள் தேவை?", expectDocId: "tnuwwb-overview" },
];

async function main() {
  for (const q of queries) {
    console.log(`\n=== ${q.ta}`);
    console.log(`    expect: ${q.expectDocId}`);
    const results = await hybridSearch(q.ta, 8);
    results.forEach((r, i) => {
      const marker = r.docId === q.expectDocId ? " <-- expected" : "";
      console.log(`${i + 1}. [${r.score.toFixed(3)}] ${r.docId} > ${r.heading}${marker}`);
    });
  }
}

main();
