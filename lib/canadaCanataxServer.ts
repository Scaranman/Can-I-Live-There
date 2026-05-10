/**
 * Server-only: invoke scripts/canatax_estimate.py via Python. Not imported from client bundles.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

import type { CanataxAnnualResult } from "./canadaTax";

export function runCanataxPython(income: number, province: string): Promise<CanataxAnnualResult | null> {
  const script = join(process.cwd(), "scripts", "canatax_estimate.py");
  if (!existsSync(script)) return Promise.resolve(null);

  const pythonExe =
    process.env.CANATAX_PYTHON?.trim() || (process.platform === "win32" ? "python" : "python3");
  const stdin = JSON.stringify({
    income: Math.max(0, income),
    province: province.toUpperCase(),
  });

  return new Promise((resolve) => {
    const child = spawn(pythonExe, [script], {
      cwd: process.cwd(),
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr?.on("data", () => {});

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve(null);
    }, 15_000);

    child.on("error", () => {
      clearTimeout(timer);
      resolve(null);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        resolve(null);
        return;
      }
      try {
        const parsed = JSON.parse(stdout.trim()) as CanataxAnnualResult;
        if (
          typeof parsed.federal_tax !== "number" ||
          typeof parsed.provincial_tax !== "number" ||
          typeof parsed.total_tax !== "number"
        ) {
          resolve(null);
          return;
        }
        resolve(parsed);
      } catch {
        resolve(null);
      }
    });

    child.stdin?.write(stdin, "utf8", (err) => {
      if (err) {
        clearTimeout(timer);
        child.kill();
        resolve(null);
        return;
      }
      child.stdin?.end();
    });
  });
}
