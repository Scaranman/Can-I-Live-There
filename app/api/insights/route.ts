import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "bad_json" }, { status: 400 });
  }

  const summary = (body as { summary?: unknown })?.summary;
  const deterministic = (body as { deterministic?: string[] })?.deterministic ?? [];

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: true, mode: "deterministic", bullets: deterministic });
  }

  const prompt = [
    "You write short, useful budget insights for a relocation calculator.",
    "Hard rules:",
    "- Only reference facts present in the JSON summary (city labels, dollar amounts, percentages, named expense lines, enteredColAspects, missingColAspects).",
    "- Never invent city-specific rents, wages, or external COL indexes / statistics.",
    "- Do not invent expense amounts the user did not enter.",
    "- Plain English bullets, no markdown headings, no numbering schema beyond leading dashes.",
    "- Return 5–8 bullets.",
    "",
    "Cover these themes (skip a theme only if the JSON has nothing useful for it):",
    "1) Cross-city tradeoffs: leftover, housing, taxes, FX / reportingCurrency when relevant.",
    "2) Line-item expenses: name the user’s largest expenseLines / topExpenseLines; say how expenseShareOfBaselineTakeHomePct or expenseMonthlyTotalReporting affects leftover. Give 1–2 concrete suggestions grounded only in those named lines (trim, combine, renegotiate, watch FX on CAD vs USD lines, etc.).",
    "3) Other cost-of-living aspects: using missingColAspects (and noting that housing is already modeled per city), mention 2–4 living-cost categories the user has NOT entered that often change after relocating. Frame these as budget gaps to fill — not as claims about how expensive a city is.",
    "4) Close with a caution that this is input-based only, not professional advice — unless a similar caution is already clear in an earlier bullet.",
    "",
    "Summary JSON:",
    JSON.stringify(summary ?? {}),
  ].join("\n");

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.4,
        messages: [
          { role: "system", content: "Follow instructions exactly." },
          { role: "user", content: prompt },
        ],
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const errTxt = await res.text();
      return NextResponse.json(
        { ok: false, mode: "error", bullets: deterministic, detail: errTxt.slice(0, 400) },
        { status: 502 },
      );
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim() ?? "";
    const bullets = text
      .split("\n")
      .map((l) => l.replace(/^[-•]\s*/, "").replace(/^\d+[.)]\s*/, "").trim())
      .filter(Boolean);

    return NextResponse.json({
      ok: true,
      mode: "openai",
      bullets: bullets.length ? bullets.slice(0, 8) : deterministic,
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      mode: "error",
      bullets: deterministic,
      detail: e instanceof Error ? e.message : "unknown_error",
    });
  }
}
