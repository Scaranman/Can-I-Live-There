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
    "You write ultra-short budget insights for a relocation calculator.",
    "Hard rules:",
    "- Only reference facts present in the JSON summary (city labels, dollar amounts, percentages).",
    "- The summary includes reportingCurrency, expenseLineSummary, cadPerUsd, fxSource — use them when commenting on US vs Canada or currency conversion.",
    "- Never cite external stats, rents, or COL indexes.",
    "- 3–6 bullets, plain English, no markdown.",
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
        temperature: 0.35,
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
      .map((l) => l.replace(/^[-•]\s*/, "").trim())
      .filter(Boolean);

    return NextResponse.json({
      ok: true,
      mode: "openai",
      bullets: bullets.length ? bullets : deterministic,
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
