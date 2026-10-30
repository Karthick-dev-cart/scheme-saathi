import { NextRequest, NextResponse } from "next/server";
import { checkEligibility } from "@/lib/eligibility";

export async function POST(req: NextRequest) {
  const { age, occupation, epfOrEsiCovered } = await req.json();

  if (typeof age !== "number" || typeof occupation !== "string" || typeof epfOrEsiCovered !== "boolean") {
    return NextResponse.json(
      { error: "age (number), occupation (string), and epfOrEsiCovered (boolean) are required" },
      { status: 400 }
    );
  }

  const result = checkEligibility({ age, occupation, epfOrEsiCovered });
  return NextResponse.json(result);
}
