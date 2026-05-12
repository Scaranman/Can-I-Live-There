import Image from "next/image";
import Link from "next/link";

const PORTFOLIO_URL = "https://jacobscarani.me";
const EMAIL = "jacobscarani@gmail.com";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t-2 border-ink/10 bg-paper2">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src="/jacob-scarani-logo.png"
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 object-contain"
            sizes="48px"
          />
          <Link
            href={PORTFOLIO_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="by Jacob Scarani — visit portfolio at jacobscarani.me"
            className="flex min-w-0 flex-col items-start gap-0.5 rounded-xl text-ink outline-none transition-opacity hover:opacity-90 focus-visible:ring-4 focus-visible:ring-pastel-lilac"
          >
            <span className="text-sm text-ink/65">by Jacob Scarani</span>
            <span className="text-base font-semibold underline decoration-ink/25 decoration-2 underline-offset-4">
              Visit my Portfolio
            </span>
          </Link>
        </div>

        <Link
          href={`mailto:${EMAIL}`}
          className="shrink-0 self-end text-sm font-semibold text-ink underline decoration-ink/25 decoration-2 underline-offset-4 outline-none transition-opacity hover:opacity-90 focus-visible:ring-4 focus-visible:ring-pastel-lilac sm:self-auto sm:text-base"
          aria-label={`Email ${EMAIL}`}
        >
          {EMAIL}
        </Link>
      </div>
    </footer>
  );
}
