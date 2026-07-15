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
    "You write the AI Insights panel for a city-to-city relocation budget app (“Can I Live There?”).",
    "",
    "The results dashboard ALREADY shows take-home, housing, taxes, leftover, and deltas.",
    "Do NOT restate which city has the highest/lowest leftover, tax %, or housing total.",
    "Do NOT narrate FX rates or “table is in USD/CAD” unless essential to a COL point.",
    "Do NOT tell the user to add more expense line items or list “missing categories to fill in.”",
    "Do NOT invent precise dollar rents, COL index scores, or cite fake statistics.",
    "",
    "Write 6–10 plain-English bullets (leading dashes OK). No markdown headings.",
    "",
    "What TO write (this is the value of the panel):",
    "1) City-specific cost-of-living color for EACH city in summary.cities:",
    "   Use general knowledge of those places (and US vs Canada when relevant) covering themes in colThemesToDiscuss —",
    "   groceries, dining, transit vs car, healthcare norms, childcare if plausible, seasonal utilities, lifestyle.",
    "   Compare cities when useful. Prefer qualitative / directional language (“typically”, “often”, “tends to”).",
    "2) Personalized read of the user’s expenseLines / topExpenseLines:",
    "   How those named costs may feel, stretch, or behave differently across the cities; what to watch;",
    "   suggestions that use the amounts they entered (e.g. grocery or debt lines) — not reminders to enter new rows.",
    "   Remember expensesAreGlobalAcrossCities: the model applies the same line amounts everywhere;",
    "   real life often diverges — say so when discussing grocery/transit/healthcare.",
    "3) One brief closing caveat: qualitative COL notes are general knowledge + their inputs, not a quote of local prices or advice from a planner.",
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
        temperature: 0.55,
        messages: [
          {
            role: "system",
            content:
              "You are a relocation cost-of-living advisor. Add insight beyond numbers already on screen. Never nag users to fill forms.",
          },
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
      bullets: bullets.length ? bullets.slice(0, 10) : deterministic,
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
