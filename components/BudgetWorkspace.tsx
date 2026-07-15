"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Dialog,
  DialogTrigger,
  FileTrigger,
  Heading,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Modal,
  ModalOverlay,
  Popover,
  Radio,
  RadioGroup,
  Select,
  SelectValue,
  TextField,
} from "react-aria-components";

import { guessProvinceFromLabel } from "@/lib/canadaTax";
import { workCountryToCurrency } from "@/lib/currencyConversion";
import { computeComparison, deltasVsBaseline, deriveCityIncomeAndDeferrals } from "@/lib/compute";
import { derivePayrollWorkCountry } from "@/lib/deriveWorkCountry";
import { expenseEnteredSubtotals } from "@/lib/expenseTotals";
import { isCityColumnEntered, filterEnteredCityInputs } from "@/lib/cityEntered";
import { defaultSnapshot, newCity, normalizeSnapshotBaseline } from "@/lib/defaultSnapshot";
import {
  buildExportPayload,
  downloadJson,
  exportResultsCsv,
  summarizeForInsights,
} from "@/lib/exportData";
import { deterministicInsights } from "@/lib/insightsDeterministic";
import { formatMoney, formatMoneySignedDelta, parseMoney } from "@/lib/money";
import { loadSnapshot, saveSnapshot, STORAGE_KEY } from "@/lib/storage";
import type {
  CityInput,
  ComparisonComputed,
  ComparisonSnapshot,
  ContributionPeriod,
  HousingMode,
  MoneyCurrency,
} from "@/lib/types";

type PlacesPrediction = { description: string; place_id: string };

function RequiredAsterisk() {
  return (
    <>
      <span className="text-red-600" aria-hidden="true">
        *
      </span>
      <span className="sr-only"> (required)</span>
    </>
  );
}

/** Blocks Calculate until each entered city has location and income (cities you have not opened yet are ignored). */
function collectCalculateErrors(snapshot: ComparisonSnapshot, placesOk: boolean | null): string[] {
  const errs: string[] = [];
  if (snapshot.cities.length === 0) {
    errs.push("Add at least one city before calculating.");
    return errs;
  }

  const entered = snapshot.cities.filter((c) => isCityColumnEntered(c, placesOk));
  if (entered.length === 0) {
    errs.push("Choose a work city above for at least one city, then complete income for each city you've opened.");
    return errs;
  }

  entered.forEach((city) => {
    const slot = snapshot.cities.findIndex((c) => c.id === city.id);
    const col =
      city.label.trim() ||
      (slot === 0 ? "Baseline" : slot === 1 ? "Comparison" : `City ${slot + 1}`);
    const { grossAnnual } = deriveCityIncomeAndDeferrals(city, snapshot.pretax);
    if (grossAnnual <= 0) {
      errs.push(`${col}: enter annual income (salary, bonus, or other) greater than $0.`);
    }
    if (derivePayrollWorkCountry(city) === "CA" && !guessProvinceFromLabel(city.label)) {
      errs.push(
        `${col}: for Canada, include a province or territory in the work city (e.g. Toronto, ON or Calgary, Alberta).`,
      );
    }
  });

  return errs;
}

/** Each tax line as % of monthly gross (gross annual ÷ 12). */
function pctOfMonthlyGross(monthlyTax: number, grossAnnual: number): string {
  const grossMonthly = grossAnnual / 12;
  if (!Number.isFinite(monthlyTax) || !Number.isFinite(grossAnnual) || grossMonthly <= 0) return "—";
  const p = (monthlyTax / grossMonthly) * 100;
  return Number.isFinite(p) ? `${p.toFixed(1)}%` : "—";
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);
  return v;
}

function PlacesField({
  title,
  helper,
  required,
  cityId,
  draftLabel,
  setDraftLabel,
  onResolvedCity,
  onPlacesAvailability,
}: {
  title: string;
  helper: string;
  /** Show red asterisk (Calculate requires this field). */
  required?: boolean;
  cityId: string;
  draftLabel: string;
  setDraftLabel: (next: string) => void;
  onResolvedCity: (placeId: string, label: string, meta?: { countryCode?: "US" | "CA" }) => void;
  onPlacesAvailability: (ok: boolean | null) => void;
}) {
  const debounced = useDebouncedValue(draftLabel, 250);
  const [open, setOpen] = useState(false);
  const [ preds, setPreds ] = useState<PlacesPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const availabilityRef = useRef(onPlacesAvailability);
  useEffect(() => {
    availabilityRef.current = onPlacesAvailability;
  }, [onPlacesAvailability]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (debounced.trim().length < 2) {
        setPreds([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/places/autocomplete?q=${encodeURIComponent(debounced)}`);
        const data = (await res.json()) as {
          ok?: boolean;
          code?: string;
          predictions?: PlacesPrediction[];
        };
        if (!res.ok && data.code === "missing_key") availabilityRef.current(false);
        if (res.ok) availabilityRef.current(true);
        if (!cancelled) setPreds(data.predictions ?? []);
      } catch {
        if (!cancelled) setPreds([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  return (
    <div ref={rootRef} className="flex flex-col gap-1.5">
      <TextField
        className="rac-field"
        aria-label={title}
        value={draftLabel}
        onChange={(v) => {
          setDraftLabel(v);
          setSelectionError(null);
          setOpen(true);
        }}
      >
        <Label className="text-sm font-semibold text-ink">
          {title}
          {required ? (
            <>
              {" "}
              <RequiredAsterisk />
            </>
          ) : null}
        </Label>
        <p className="text-xs text-ink/60">{helper}</p>
        <Input
          onFocus={() => setOpen(true)}
          onBlur={(e) => {
            const next = e.relatedTarget as Node | null;
            if (next && rootRef.current?.contains(next)) return;
            setOpen(false);
          }}
          className="rac-input w-full"
          placeholder="Search US or Canadian city…"
          autoComplete="off"
        />
      </TextField>

      {open && draftLabel.trim().length >= 2 ? (
        <div className="relative">
          <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border-2 border-ink bg-white p-0 shadow-cut">
            <div>
              {loading ? (
                <div className="px-3 py-2 text-sm text-ink/60">Searching…</div>
              ) : preds.length ? (
                preds.map((p) => (
                  <Button
                    key={`${cityId}-${p.place_id}`}
                    className="w-full rounded-none px-3 py-2 text-left text-sm outline-none hover:bg-pastel-yellow data-[focus-visible]:ring-2 data-[focus-visible]:ring-pastel-lilac"
                    onMouseDown={(e) => e.preventDefault()}
                    onPress={async () => {
                      setSelectionError(null);
                      const details = await fetch(`/api/places/details?placeId=${encodeURIComponent(p.place_id)}`);
                      const payload = (await details.json()) as {
                        ok?: boolean;
                        code?: string;
                        detail?: string;
                        label?: string;
                        countryCode?: "US" | "CA";
                      };
                      if (
                        !payload.ok ||
                        (payload.countryCode !== "US" && payload.countryCode !== "CA")
                      ) {
                        setSelectionError(
                          payload.detail ??
                            "Only United States and Canada are supported. Pick another city.",
                        );
                        setOpen(true);
                        return;
                      }
                      setDraftLabel(p.description);
                      setOpen(false);
                      const label = payload.label ? payload.label : p.description;
                      onResolvedCity(p.place_id, label, { countryCode: payload.countryCode });
                    }}
                  >
                    {p.description}
                  </Button>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-ink/60">No matches yet — keep typing.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
      {selectionError ? (
        <p className="text-xs font-medium text-red-700" role="alert">
          {selectionError}
        </p>
      ) : null}
    </div>
  );
}

function ResidencePlacesField({
  cityId,
  value,
  onChange,
  onPlacesAvailability,
}: {
  cityId: string;
  value: string;
  onChange: (next: string) => void;
  onPlacesAvailability: (ok: boolean | null) => void;
}) {
  const debounced = useDebouncedValue(value, 250);
  const [open, setOpen] = useState(false);
  const [preds, setPreds] = useState<PlacesPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const availabilityRef = useRef(onPlacesAvailability);
  useEffect(() => {
    availabilityRef.current = onPlacesAvailability;
  }, [onPlacesAvailability]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (debounced.trim().length < 2) {
        setPreds([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/places/autocomplete?q=${encodeURIComponent(debounced)}`);
        const data = (await res.json()) as {
          ok?: boolean;
          code?: string;
          predictions?: PlacesPrediction[];
        };
        if (!res.ok && data.code === "missing_key") availabilityRef.current(false);
        if (res.ok) availabilityRef.current(true);
        if (!cancelled) setPreds(data.predictions ?? []);
      } catch {
        if (!cancelled) setPreds([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  return (
    <div ref={rootRef} className="flex flex-col gap-1.5">
      <TextField
        className="rac-field"
        aria-label="Residence for payroll (optional)"
        value={value}
        onChange={(v) => {
          onChange(v);
          setSelectionError(null);
          setOpen(true);
        }}
      >
        <Label className="text-xs font-semibold text-ink/70">Residence for payroll (optional)</Label>
        <Input
          onFocus={() => setOpen(true)}
          onBlur={(e) => {
            const next = e.relatedTarget as Node | null;
            if (next && rootRef.current?.contains(next)) return;
            setOpen(false);
          }}
          className="rac-input w-full"
          placeholder="Leave blank if same as work city — or search another city…"
          autoComplete="off"
        />
      </TextField>

      {open && value.trim().length >= 2 ? (
        <div className="relative">
          <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border-2 border-ink bg-white p-0 shadow-cut">
            <div>
              {loading ? (
                <div className="px-3 py-2 text-sm text-ink/60">Searching…</div>
              ) : preds.length ? (
                preds.map((p) => (
                  <Button
                    key={`res-${cityId}-${p.place_id}`}
                    className="w-full rounded-none px-3 py-2 text-left text-sm outline-none hover:bg-pastel-yellow data-[focus-visible]:ring-2 data-[focus-visible]:ring-pastel-lilac"
                    onMouseDown={(e) => e.preventDefault()}
                    onPress={async () => {
                      setSelectionError(null);
                      const details = await fetch(`/api/places/details?placeId=${encodeURIComponent(p.place_id)}`);
                      const payload = (await details.json()) as {
                        ok?: boolean;
                        code?: string;
                        detail?: string;
                        label?: string;
                        countryCode?: "US" | "CA";
                      };
                      if (!payload.ok || (payload.countryCode !== "US" && payload.countryCode !== "CA")) {
                        setSelectionError(
                          payload.detail ??
                            "Only United States and Canada are supported. Pick another city.",
                        );
                        setOpen(true);
                        return;
                      }
                      const label = payload.label ? payload.label : p.description;
                      onChange(label);
                      setOpen(false);
                    }}
                  >
                    {p.description}
                  </Button>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-ink/60">No matches yet — keep typing.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {selectionError ? (
        <p className="text-xs font-medium text-red-700" role="alert">
          {selectionError}
        </p>
      ) : null}
    </div>
  );
}

function FieldMoney({
  label,
  value,
  onChange,
  required,
  inputClassName = "w-full",
  fieldClassName,
  labelClassName,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
  /** Tailwind width utilities for the input only (label stays full width). */
  inputClassName?: string;
  /** Extra classes on the TextField root (e.g. `md:contents` for expense grid rows). */
  fieldClassName?: string;
  /** Extra classes on the Label (e.g. grid column / row placement). */
  labelClassName?: string;
}) {
  return (
    <TextField
      value={value}
      onChange={onChange}
      className={fieldClassName ? `rac-field ${fieldClassName}` : "rac-field"}
    >
      <Label
        className={
          labelClassName
            ? `text-xs font-semibold text-ink/70 ${labelClassName}`
            : "text-xs font-semibold text-ink/70"
        }
      >
        {label}
        {required ? (
          <>
            {" "}
            <RequiredAsterisk />
          </>
        ) : null}
      </Label>
      <Input className={`rac-input ${inputClassName}`} inputMode="decimal" placeholder="0" />
    </TextField>
  );
}

const periodItems: { id: ContributionPeriod; label: string }[] = [
  { id: "monthly", label: "Monthly" },
  { id: "annual", label: "Annual" },
];

const expenseCurrencyItems: { id: MoneyCurrency; label: string }[] = [
  { id: "USD", label: "USD" },
  { id: "CAD", label: "CAD" },
];

function SelectDropdownChevron() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-[1.125rem] w-[1.125rem] shrink-0 text-black transition-transform duration-200 ease-out group-aria-[expanded=true]:rotate-180"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function ExpenseCurrencySelect({
  value,
  onChange,
  expenseGrid,
}: {
  value: MoneyCurrency;
  onChange: (next: MoneyCurrency) => void;
  /** When true, label row / control row align with expense line grid (md+). */
  expenseGrid?: boolean;
}) {
  return (
    <Select
      selectedKey={value}
      onSelectionChange={(key) => {
        if (key === "USD" || key === "CAD") onChange(key);
      }}
      className={expenseGrid ? "rac-field md:contents" : "rac-field"}
    >
      <Label
        className={
          expenseGrid
            ? "text-xs font-semibold text-ink/70 md:col-start-3 md:row-start-1"
            : "text-xs font-semibold text-ink/70"
        }
      >
        Currency
      </Label>
      <Button
        className={
          expenseGrid
            ? "group rac-input flex w-full cursor-default items-center justify-between gap-2 text-left outline-none data-[focus-visible]:ring-4 data-[focus-visible]:ring-pastel-lilac md:col-start-3 md:row-start-2"
            : "group rac-input flex w-full cursor-default items-center justify-between gap-2 text-left outline-none data-[focus-visible]:ring-4 data-[focus-visible]:ring-pastel-lilac"
        }
      >
        <SelectValue />
        <SelectDropdownChevron />
      </Button>
      <Popover className="z-[100] min-w-[var(--trigger-width)] overflow-hidden rounded-2xl border-2 border-ink bg-white p-0 shadow-cut outline-none">
        <ListBox items={expenseCurrencyItems} className="p-0 outline-none">
          {(item) => (
            <ListBoxItem
              id={item.id}
              className="cursor-pointer rounded-none px-3 py-2 text-sm outline-none data-[focused]:bg-pastel-yellow"
            >
              {item.label}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </Select>
  );
}

function PeriodSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ContributionPeriod;
  onChange: (next: ContributionPeriod) => void;
}) {
  return (
    <Select
      selectedKey={value}
      onSelectionChange={(key) => {
        if (key === "monthly" || key === "annual") onChange(key);
      }}
      className="rac-field"
    >
      <Label className="text-xs font-semibold text-ink/70">{label}</Label>
      <Button className="group rac-input flex w-full cursor-default items-center justify-between gap-2 text-left outline-none data-[focus-visible]:ring-4 data-[focus-visible]:ring-pastel-lilac">
        <SelectValue />
        <SelectDropdownChevron />
      </Button>
      <Popover className="z-[100] min-w-[var(--trigger-width)] overflow-hidden rounded-2xl border-2 border-ink bg-white p-0 shadow-cut outline-none">
        <ListBox items={periodItems} className="p-0 outline-none">
          {(item) => (
            <ListBoxItem
              id={item.id}
              className="cursor-pointer rounded-none px-3 py-2 text-sm outline-none data-[focused]:bg-pastel-yellow"
            >
              {item.label}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </Select>
  );
}

function BaselineCitySelect({
  cities,
  selectedId,
  onChange,
}: {
  cities: ComparisonSnapshot["cities"];
  selectedId: string;
  onChange: (cityId: string) => void;
}) {
  return (
    <Select
      selectedKey={selectedId}
      onSelectionChange={(key) => {
        if (key != null) onChange(String(key));
      }}
      className="rac-field text-sm font-semibold text-ink"
    >
      <Label className="text-sm font-semibold text-ink">Baseline</Label>
      <Button className="group rac-input flex w-full cursor-default items-center justify-between gap-2 text-left font-semibold outline-none data-[focus-visible]:ring-4 data-[focus-visible]:ring-pastel-lilac">
        <SelectValue />
        <SelectDropdownChevron />
      </Button>
      <Popover className="z-[100] min-w-[var(--trigger-width)] overflow-hidden rounded-2xl border-2 border-ink bg-white p-0 shadow-cut outline-none">
        <ListBox items={cities} className="p-0 outline-none">
          {(c) => (
            <ListBoxItem
              id={c.id}
              textValue={c.label || "Untitled city"}
              className="cursor-pointer rounded-none px-3 py-2 text-sm font-normal outline-none data-[focused]:bg-pastel-yellow"
            >
              {c.label || "Untitled city"}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </Select>
  );
}

function RadioChoiceRow({
  legend,
  name,
  value,
  onChange,
  options,
}: {
  legend: string;
  name: string;
  value: string;
  onChange: (next: string) => void;
  options: {
    value: string;
    label: string;
    isDisabled?: boolean;
    /** Native tooltip when this option is disabled (e.g. hover on desktop). */
    disabledTooltip?: string;
  }[];
}) {
  return (
    <RadioGroup
      name={name}
      value={value}
      onChange={(next) => onChange(String(next))}
      className="flex flex-col gap-1.5"
    >
      <Label className="text-xs font-semibold text-ink/70">{legend}</Label>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {options.map((o) => (
          <Radio
            key={o.value}
            value={o.value}
            isDisabled={o.isDisabled}
            className="flex cursor-pointer items-center gap-2 text-sm text-ink outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45 data-[focus-visible]:outline data-[focus-visible]:outline-2 data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-ink forced-color-adjust-none"
          >
            {({ isSelected }) => (
              <span
                className="flex items-center gap-2"
                title={o.isDisabled && o.disabledTooltip ? o.disabledTooltip : undefined}
              >
                <span
                  aria-hidden
                  className="relative flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-white"
                >
                  <span
                    className={`h-2 w-2 rounded-full bg-ink transition-opacity ${isSelected ? "opacity-100" : "opacity-0"}`}
                  />
                </span>
                <span>{o.label}</span>
              </span>
            )}
          </Radio>
        ))}
      </div>
    </RadioGroup>
  );
}

export function BudgetWorkspace() {
  const [snapshot, setSnapshot] = useState<ComparisonSnapshot>(() => defaultSnapshot());
  const [storageHydrated, setStorageHydrated] = useState(false);
  const [computed, setComputed] = useState<ComparisonComputed | null>(null);
  const [status, setStatus] = useState<string>("Idle");
  const [placesOk, setPlacesOk] = useState<boolean | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [insightsMode, setInsightsMode] = useState<"openai" | "deterministic" | "error" | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [showCalculateErrors, setShowCalculateErrors] = useState(false);
  const resultsDashboardRef = useRef<HTMLElement | null>(null);

  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(defaultSnapshot().cities.map((c) => [c.id, c.label])),
  );

  useEffect(() => {
    const saved = loadSnapshot();
    if (saved) {
      const norm = normalizeSnapshotBaseline(saved);
      setSnapshot(norm);
      setDrafts(Object.fromEntries(norm.cities.map((c) => [c.id, c.label])));
    }
    setStorageHydrated(true);
  }, []);

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const c of snapshot.cities) next[c.id] ??= c.label;
      return next;
    });
  }, [snapshot.cities]);

  useEffect(() => {
    if (!storageHydrated) return;
    const handle = window.setTimeout(() => {
      const next: ComparisonSnapshot = { ...snapshot, updatedAt: new Date().toISOString() };
      saveSnapshot(next);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [snapshot, storageHydrated]);

  const baselineCity = useMemo(
    () => snapshot.cities.find((c) => c.id === snapshot.baselineCityId) ?? snapshot.cities[0],
    [snapshot.baselineCityId, snapshot.cities],
  );

  const delta = useMemo(() => {
    if (!computed) return null;
    return deltasVsBaseline(snapshot.baselineCityId, computed);
  }, [computed, snapshot.baselineCityId]);

  const rankedByLeftover = useMemo(() => {
    if (!computed) return [];
    return [...computed.cities].sort((a, b) => b.leftoverMonthly - a.leftoverMonthly);
  }, [computed]);

  const displayCurrency = useMemo((): MoneyCurrency => {
    if (computed) return computed.reportingCurrency;
    if (!baselineCity) return "USD";
    return workCountryToCurrency(derivePayrollWorkCountry(baselineCity));
  }, [computed, baselineCity]);

  const hasCanadianPayrollCity = useMemo(
    () => snapshot.cities.some((c) => derivePayrollWorkCountry(c) === "CA"),
    [snapshot.cities],
  );

  useEffect(() => {
    if (!hasCanadianPayrollCity || snapshot.filingStatus !== "hoh") return;
    setSnapshot((s) => normalizeSnapshotBaseline({ ...s, filingStatus: "single" }));
  }, [hasCanadianPayrollCity, snapshot.filingStatus]);

  const calculateErrors = useMemo(
    () => collectCalculateErrors(snapshot, placesOk),
    [snapshot, placesOk],
  );
  const calculateBlocked = calculateErrors.length > 0;

  useEffect(() => {
    if (!calculateBlocked) setShowCalculateErrors(false);
  }, [calculateBlocked]);

  function patchSnapshot(updater: (s: ComparisonSnapshot) => ComparisonSnapshot) {
    setSnapshot((s) => normalizeSnapshotBaseline(updater(s)));
  }

  function updateCity(cityId: string, patch: Partial<ComparisonSnapshot["cities"][number]>) {
    patchSnapshot((s) => ({
      ...s,
      cities: s.cities.map((c) => (c.id === cityId ? { ...c, ...patch } : c)),
    }));
  }

  async function runCalculate() {
    const preErrors = collectCalculateErrors(snapshot, placesOk);
    if (preErrors.length > 0) {
      setShowCalculateErrors(true);
      setStatus(
        preErrors.length === 1
          ? preErrors[0]
          : `Fix ${preErrors.length} issues before calculating — first: ${preErrors[0]}`,
      );
      return;
    }
    setShowCalculateErrors(false);

    setStatus("Calculating…");
    setInsights([]);
    setInsightsError(null);
    setInsightsMode(null);
    setInsightsLoading(false);

    const calcSnapshot = normalizeSnapshotBaseline({
      ...snapshot,
      cities: filterEnteredCityInputs(snapshot.cities, placesOk),
    });

    let nextComputed: ComparisonComputed;

    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(calcSnapshot),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        computed?: ComparisonComputed;
        detail?: string;
      };
      if (res.ok && data.ok && data.computed) {
        nextComputed = data.computed;
      } else {
        throw new Error(data.detail ?? "compare_failed");
      }
    } catch {
      nextComputed = computeComparison({
        cities: calcSnapshot.cities,
        baselineCityId: calcSnapshot.baselineCityId,
        filingStatus: calcSnapshot.filingStatus,
        pretax: calcSnapshot.pretax,
        expenses: calcSnapshot.expenses,
        cadPerUsd: null,
      });
    }
    setComputed(nextComputed);
    setInsightsLoading(true);
    setStatus("Generating insights…");

    // Show the results dashboard (including insights loading state) while GPT runs.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        resultsDashboardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    const summary = summarizeForInsights(snapshot, nextComputed);
    const det = deterministicInsights({
      baselineLabel: summary.baselineLabel,
      computed: nextComputed,
      snapshot,
    });

    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary, deterministic: det }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        mode?: string;
        bullets?: string[];
        detail?: string;
      };
      if (!res.ok || !data.ok) {
        setInsights(det);
        setInsightsError(data.detail ?? "Insights request failed — showing deterministic notes.");
        setInsightsMode("error");
      } else {
        setInsights(data.bullets ?? det);
        setInsightsError(null);
        setInsightsMode(data.mode === "openai" ? "openai" : "deterministic");
      }
    } catch {
      setInsights(det);
      setInsightsError("Insights unavailable offline — showing deterministic notes.");
      setInsightsMode("error");
    } finally {
      setInsightsLoading(false);
      setStatus(`Updated ${new Date().toLocaleTimeString()}`);
    }
  }

  function exportJsonClicked() {
    downloadJson(
      `city-budget-${new Date().toISOString().slice(0, 10)}.json`,
      buildExportPayload(snapshot, computed),
    );
  }

  function importJsonFile(file: File) {
    file
      .text()
      .then((txt) => JSON.parse(txt) as { snapshot?: ComparisonSnapshot })
      .then((payload) => {
        const snap = payload.snapshot;
        if (!snap || snap.version !== 1 || !Array.isArray(snap.cities)) throw new Error("Invalid import");
        const normalized = normalizeSnapshotBaseline(snap);
        setSnapshot(normalized);
        setDrafts(Object.fromEntries(normalized.cities.map((c) => [c.id, c.label])));
        setComputed(null);
        setInsights([]);
        setInsightsError(null);
        setInsightsMode(null);
        setInsightsLoading(false);
        setStatus("Imported — calculate again to refresh numbers.");
      })
      .catch(() => {
        setStatus("Import failed — file must include snapshot.version = 1.");
      });
  }

  function resetAll() {
    window.localStorage.removeItem(STORAGE_KEY);
    const snap = defaultSnapshot();
    setSnapshot(snap);
    setDrafts(Object.fromEntries(snap.cities.map((c) => [c.id, c.label])));
    setComputed(null);
    setInsights([]);
    setInsightsError(null);
    setInsightsMode(null);
    setInsightsLoading(false);
    setStatus("Reset");
  }

  return (
    <div className="flex flex-col gap-10">
      <header className="rac-section">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <h1 className="font-marker text-4xl tracking-wide text-ink">Can I Live There?</h1>
            <p className="max-w-xl text-sm text-ink/70">
              This tool is for US and Canadian cities only. Your budget lives only on this device: inputs and autosave sit
              in your browser&apos;s local storage, not in a cloud account. Features like search or Calculate may call the
              server and APIs when you use them, but no information persists there.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button className="rac-btn bg-pastel-yellow" onPress={exportJsonClicked}>
              Export Data
            </Button>
            <FileTrigger
              acceptedFileTypes={["application/json", ".json"]}
              onSelect={(files) => {
                const f = files?.item(0);
                if (f) importJsonFile(f);
              }}
            >
              <Button className="rac-btn rac-btn-quiet">Import Data</Button>
            </FileTrigger>

            <DialogTrigger>
              <Button className="rac-btn bg-pastel-pink">Reset</Button>
              <ModalOverlay className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <Modal className="w-full max-w-md rounded-2xl border-[3px] border-ink bg-paper2 p-6 shadow-cutLg outline-none">
                  <Dialog className="outline-none">
                    {({ close }) => (
                      <div className="flex flex-col gap-4">
                        <Heading slot="title" className="text-xl font-semibold text-ink">
                          Reset comparison?
                        </Heading>
                        <p className="text-sm text-ink/70">
                          This clears the locally saved comparison on this device.
                        </p>
                        <div className="flex justify-end gap-2">
                          <Button className="rac-btn rac-btn-quiet" onPress={close}>
                            Cancel
                          </Button>
                          <Button
                            className="rac-btn bg-pastel-pink"
                            onPress={() => {
                              resetAll();
                              close();
                            }}
                          >
                            Reset
                          </Button>
                        </div>
                      </div>
                    )}
                  </Dialog>
                </Modal>
              </ModalOverlay>
            </DialogTrigger>
          </div>
        </div>

      </header>

      <section className="rac-section space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-marker text-3xl text-ink">Cities</h2>
            <p className="text-sm text-ink/65">
              Pick each work city above. Income and housing appear below only for cities you&apos;ve set — baseline or
              comparison first is fine.
            </p>
          </div>
          <Button
            className="rac-btn bg-pastel-yellow shrink-0 self-start whitespace-nowrap md:mt-2"
            onPress={() =>
              patchSnapshot((s) => ({
                ...s,
                cities: [...s.cities, newCity()],
              }))
            }
          >
            + Add city
          </Button>
        </div>

        {snapshot.cities.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed border-ink/30 bg-paper2/80 px-4 py-6 text-center text-sm text-ink/70">
            No cities yet. Use <span className="font-semibold text-ink">+ Add city</span>, then set each work location
            here or in the city cards below.
          </p>
        ) : placesOk === false ? (
          <div className="flex flex-col gap-1.5 rounded-2xl border-2 border-ink bg-white/70 p-4">
            <Label className="text-xs font-semibold text-ink/70">
              City labels <RequiredAsterisk />
            </Label>
            <p className="text-xs text-ink/55">
              Google Places isn&apos;t reachable from this server (often missing{" "}
              <code className="rounded bg-ink/10 px-1 py-0.5 font-mono text-[11px]">GOOGLE_MAPS_API_KEY</code>). Type
              each city below — United States and Canada only for this version. Use comma + state for US cities (e.g.
              Chicago, IL) or comma + province for Canada (e.g. Toronto, ON); payroll rules follow from that.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {snapshot.cities.map((city, idx) => (
                <div
                  key={`manual-${city.id}`}
                  className={`flex gap-2 ${idx >= 2 ? "items-end" : ""}`}
                >
                  <TextField
                    className="rac-field min-w-0 flex-1"
                    value={drafts[city.id] ?? ""}
                    onChange={(v) => {
                      setDrafts((d) => ({ ...d, [city.id]: v }));
                      updateCity(city.id, { label: v, placeId: "", placeCountryCode: undefined });
                    }}
                    aria-label={`City label for ${city.label || `city ${idx + 1}`}`}
                  >
                    <Label className="text-xs font-semibold text-ink/70">
                      {idx === 0 ? "Baseline city" : idx === 1 ? "Comparison city" : `City ${idx + 1}`}{" "}
                      <RequiredAsterisk />
                    </Label>
                    <Input className="rac-input w-full" placeholder="e.g. Chicago, IL or Toronto, ON" />
                  </TextField>
                  {idx >= 2 && snapshot.cities.length > 2 ? (
                    <Button
                      className="rac-btn shrink-0 bg-pastel-pink !rounded-xl !px-3 !py-2 !text-xs whitespace-nowrap"
                      onPress={() => {
                        const id = city.id;
                        patchSnapshot((s) => {
                          const remaining = s.cities.filter((c) => c.id !== id);
                          const nextBaseline =
                            s.baselineCityId === id ? remaining[0]?.id ?? s.baselineCityId : s.baselineCityId;
                          return { ...s, cities: remaining, baselineCityId: nextBaseline };
                        });
                        setDrafts((d) => {
                          const next = { ...d };
                          delete next[id];
                          return next;
                        });
                      }}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              {snapshot.cities.slice(0, 2).map((city, idx) => (
                <PlacesField
                  key={city.id}
                  title={idx === 0 ? "Baseline city" : "Add comparison city"}
                  required
                  helper={
                    idx === 0
                      ? "Your default city for comparisons — you can change the baseline anytime."
                      : "Pick another work location to compare against your baseline."
                  }
                  cityId={city.id}
                  draftLabel={drafts[city.id] ?? ""}
                  setDraftLabel={(label) => setDrafts((d) => ({ ...d, [city.id]: label }))}
                  onResolvedCity={(placeId, label, meta) => {
                    setDrafts((d) => ({ ...d, [city.id]: label }));
                    updateCity(city.id, {
                      placeId,
                      label,
                      placeCountryCode: meta?.countryCode,
                    });
                  }}
                  onPlacesAvailability={(ok) => setPlacesOk(ok)}
                />
              ))}
            </div>

            {snapshot.cities.length > 2 ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {snapshot.cities.slice(2).map((city) => (
                  <div key={city.id} className="grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
                    <PlacesField
                      title="Additional city"
                      required={false}
                      helper="Optional: add more cities to compare side by side. Remove if you added one by mistake."
                      cityId={city.id}
                      draftLabel={drafts[city.id] ?? ""}
                      setDraftLabel={(label) => setDrafts((d) => ({ ...d, [city.id]: label }))}
                      onResolvedCity={(placeId, label, meta) => {
                        setDrafts((d) => ({ ...d, [city.id]: label }));
                        updateCity(city.id, {
                          placeId,
                          label,
                          placeCountryCode: meta?.countryCode,
                        });
                      }}
                      onPlacesAvailability={(ok) => setPlacesOk(ok)}
                    />
                    <Button
                      className="rac-btn shrink-0 bg-pastel-pink !rounded-xl !px-3 !py-2 !text-xs whitespace-nowrap md:mb-0.5"
                      onPress={() => {
                        const id = city.id;
                        patchSnapshot((s) => {
                          const remaining = s.cities.filter((c) => c.id !== id);
                          const nextBaseline =
                            s.baselineCityId === id ? remaining[0]?.id ?? s.baselineCityId : s.baselineCityId;
                          return { ...s, cities: remaining, baselineCityId: nextBaseline };
                        });
                        setDrafts((d) => {
                          const next = { ...d };
                          delete next[id];
                          return next;
                        });
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        )}
      </section>

      <section className="rac-section space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          {snapshot.cities.length === 0 ? (
            <p className="text-sm text-ink/60">Add cities in the Cities section to compare them.</p>
          ) : (
            <>
              <Button
                className="rac-btn bg-pastel-mint"
                isDisabled={snapshot.cities.length < 2}
                onPress={() => {
                  const base = snapshot.cities.find((c) => c.id === snapshot.baselineCityId);
                  if (!base) return;
                  patchSnapshot((s) => ({
                    ...s,
                    cities: s.cities.map((c) =>
                      c.id === base.id ? c : { ...c, income: { ...base.income } },
                    ),
                  }));
                }}
              >
                Copy baseline income → all cities
              </Button>

              {snapshot.cities.length >= 2 &&
              isCityColumnEntered(snapshot.cities[0], placesOk) &&
              isCityColumnEntered(snapshot.cities[1], placesOk) ? (
                <BaselineCitySelect
                  cities={snapshot.cities}
                  selectedId={snapshot.baselineCityId}
                  onChange={(baselineCityId) => patchSnapshot((s) => ({ ...s, baselineCityId }))}
                />
              ) : null}
            </>
          )}
        </div>

        {snapshot.cities.length > 0 &&
        snapshot.cities.every((c) => !isCityColumnEntered(c, placesOk)) ? (
          <p className="rounded-2xl border-2 border-dashed border-ink/25 bg-paper2/80 px-4 py-4 text-center text-sm text-ink/70">
            Choose a baseline or comparison work city above — income and housing open here after each city is set.
          </p>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-3">
          {snapshot.cities
            .filter((city) => isCityColumnEntered(city, placesOk))
            .map((city) => {
            const row = computed?.cities.find((r) => r.cityId === city.id);
            const d = delta?.[city.id];
            const colCur = workCountryToCurrency(derivePayrollWorkCountry(city));

            return (
              <div
                key={city.id}
                className="flex flex-col gap-4 rounded-2xl border-[3px] border-ink bg-white p-5 shadow-cut"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-ink">{city.label || "Untitled city"}</h3>
                    <p className="text-[11px] text-ink/45">
                      Payroll: {derivePayrollWorkCountry(city) === "CA" ? "Canada" : "United States"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-row flex-wrap items-center justify-end gap-2">
                    {city.id === snapshot.baselineCityId ? (
                      <span className="rounded-full bg-pastel-blue px-3 py-1 text-xs font-semibold text-ink">
                        Baseline
                      </span>
                    ) : (
                      <Button
                        className="rac-btn !rounded-full !px-3 !py-1 !text-xs rac-btn-quiet"
                        onPress={() =>
                          patchSnapshot((s) => ({
                            ...s,
                            baselineCityId: city.id,
                          }))
                        }
                      >
                        Set baseline
                      </Button>
                    )}
                    {city.id !== snapshot.baselineCityId && snapshot.cities.length > 2 ? (
                      <Button
                        className="rac-btn !rounded-full !px-3 !py-1 !text-xs bg-pastel-pink"
                        onPress={() =>
                          patchSnapshot((s) => {
                            const remaining = s.cities.filter((c) => c.id !== city.id);
                            const nextBaseline =
                              s.baselineCityId === city.id ? remaining[0]?.id ?? s.baselineCityId : s.baselineCityId;
                            return { ...s, cities: remaining, baselineCityId: nextBaseline };
                          })
                        }
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>

                <TextField
                  value={city.residenceLabel ?? ""}
                  onChange={(residenceLabel) => updateCity(city.id, { residenceLabel })}
                  className="rac-field"
                >
                  <Label className="text-xs font-semibold text-ink/70">Residence for payroll (optional)</Label>
                  {derivePayrollWorkCountry(city) === "CA" ? (
                    <p className="text-[11px] text-ink/50">
                      Cross-province payroll is not modeled in this version; you can still note where you live for your
                      own reference.
                    </p>
                  ) : (
                    <p className="text-[11px] text-ink/50">
                      If different from the work location above, enter where you live (comma + state, e.g. Princeton,
                      NJ). Used when your home state differs from your work city for US tax estimates.
                    </p>
                  )}
                </TextField>
                {placesOk === false ? (
                  <Input
                    className="rac-input w-full"
                    placeholder={
                      derivePayrollWorkCountry(city) === "CA"
                        ? "Optional — e.g. Ottawa, ON"
                        : "Leave blank if same as work city — or e.g. Jersey City, NJ"
                    }
                  />
                ) : (
                  <ResidencePlacesField
                    cityId={city.id}
                    value={city.residenceLabel ?? ""}
                    onChange={(residenceLabel) => updateCity(city.id, { residenceLabel })}
                    onPlacesAvailability={(ok) => setPlacesOk(ok)}
                  />
                )}

                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-semibold text-ink">
                    Income <RequiredAsterisk />
                  </p>
                  <p className="text-xs text-ink/55">
                    Enter amounts in{" "}
                    <span className="font-semibold text-ink">
                      {derivePayrollWorkCountry(city) === "CA" ? "CAD" : "USD"}
                    </span>{" "}
                    (this city&apos;s payroll country). Annual total must be greater than 0.
                  </p>
                  <FieldMoney
                    label={`Salary (annual, ${derivePayrollWorkCountry(city) === "CA" ? "CAD" : "USD"})`}
                    required
                    value={city.income.salary}
                    onChange={(salary) => updateCity(city.id, { income: { ...city.income, salary } })}
                  />
                  <FieldMoney
                    label={`Bonus (optional, ${derivePayrollWorkCountry(city) === "CA" ? "CAD" : "USD"})`}
                    value={city.income.bonus}
                    onChange={(bonus) => updateCity(city.id, { income: { ...city.income, bonus } })}
                  />
                  <FieldMoney
                    label={`Other income (${derivePayrollWorkCountry(city) === "CA" ? "CAD" : "USD"})`}
                    value={city.income.other}
                    onChange={(other) => updateCity(city.id, { income: { ...city.income, other } })}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <RadioChoiceRow
                    legend="Housing"
                    name={`housing-mode-${city.id}`}
                    value={city.housing.mode}
                    onChange={(mode) =>
                      updateCity(city.id, {
                        housing: { ...city.housing, mode: mode as HousingMode },
                      })
                    }
                    options={[
                      { value: "rent", label: "Rent" },
                      { value: "mortgage", label: "Mortgage" },
                    ]}
                  />

                  <FieldMoney
                    label={`${city.housing.mode === "rent" ? "Monthly rent" : "Monthly mortgage"} (${derivePayrollWorkCountry(city) === "CA" ? "CAD" : "USD"}/mo)`}
                    value={city.housing.monthlyCore}
                    onChange={(monthlyCore) => updateCity(city.id, { housing: { ...city.housing, monthlyCore } })}
                  />
                  <FieldMoney
                    label={`Utilities (${derivePayrollWorkCountry(city) === "CA" ? "CAD" : "USD"}/mo)`}
                    value={city.housing.utilities}
                    onChange={(utilities) => updateCity(city.id, { housing: { ...city.housing, utilities } })}
                  />
                  <FieldMoney
                    label={`HOA (${derivePayrollWorkCountry(city) === "CA" ? "CAD" : "USD"}/mo)`}
                    value={city.housing.hoa}
                    onChange={(hoa) => updateCity(city.id, { housing: { ...city.housing, hoa } })}
                  />
                  <FieldMoney
                    label={`Property tax (${derivePayrollWorkCountry(city) === "CA" ? "CAD" : "USD"}/mo)`}
                    value={city.housing.propTax}
                    onChange={(propTax) => updateCity(city.id, { housing: { ...city.housing, propTax } })}
                  />
                </div>

                <div className="rounded-2xl border-2 border-dashed border-ink/25 bg-paper p-4">
                  <p className="text-xs font-semibold text-ink">Output preview</p>
                  <div className="mt-3 space-y-1 text-sm text-ink/75">
                    <div className="flex justify-between gap-3">
                      <span>Take-home/mo</span>
                      <span className="font-semibold text-ink">
                        {row ? formatMoney(row.netMonthlyNative, colCur) : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>Expenses/mo</span>
                      <span className="font-semibold text-ink">
                        {row ? formatMoney(row.expenseMonthlyNative, colCur) : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>Leftover/mo</span>
                      <span className="font-semibold text-ink">
                        {row ? formatMoney(row.leftoverMonthlyNative, colCur) : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>Annual save</span>
                      <span className="font-semibold text-ink">
                        {row ? formatMoney(row.annualSavingsProxyNative, colCur) : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>Δ leftover vs baseline</span>
                      <span className="font-semibold text-ink">
                        {!row || !d || d.leftoverMonthly == null
                          ? "—"
                          : formatMoneySignedDelta(d.leftoverMonthly, colCur)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rac-section space-y-10">
        <div className="space-y-5">
          <div>
            <h2 className="font-marker text-2xl text-ink">Pre-tax payroll contributions (global)</h2>
            <p className="mt-1 text-sm text-ink/65">
              Same settings apply to every city&apos;s tax math. In the U.S. this is modeled as 401(k) or 403(b); in
              Canada the same fields represent RRSP-style contributions. Percent-based deferrals still vary when salaries
              differ (salary + bonus only). For fixed 401(k) / RRSP and HSA amounts, pick the currency next to the amount;
              each city converts those figures into its payroll currency when needed. FSA amounts use{" "}
              <span className="font-semibold text-ink">
                {baselineCity ? workCountryToCurrency(derivePayrollWorkCountry(baselineCity)) : "USD"}
              </span>{" "}
              (baseline payroll country) and convert into each city&apos;s payroll currency when needed.
            </p>
          </div>

          <RadioChoiceRow
            legend="401(k) / 403(b) / RRSP contribution — type"
            name="fourOhOneMode"
            value={snapshot.pretax.fourOhOne.mode}
            onChange={(mode) =>
              patchSnapshot((s) => ({
                ...s,
                pretax: {
                  ...s.pretax,
                  fourOhOne: { ...s.pretax.fourOhOne, mode: mode as "amount" | "percent" },
                },
              }))
            }
            options={[
              { value: "amount", label: "Fixed amount" },
              { value: "percent", label: "Percent of salary (+ bonus)" },
            ]}
          />

          {snapshot.pretax.fourOhOne.mode === "amount" ? (
            <div className="grid gap-3 md:grid-cols-3">
              <FieldMoney
                label="401(k) / RRSP amount"
                value={snapshot.pretax.fourOhOne.amount}
                onChange={(amount) =>
                  patchSnapshot((s) => ({
                    ...s,
                    pretax: { ...s.pretax, fourOhOne: { ...s.pretax.fourOhOne, amount } },
                  }))
                }
              />
              <ExpenseCurrencySelect
                value={snapshot.pretax.fourOhOne.amountCurrency}
                onChange={(amountCurrency) =>
                  patchSnapshot((s) => ({
                    ...s,
                    pretax: {
                      ...s.pretax,
                      fourOhOne: { ...s.pretax.fourOhOne, amountCurrency },
                    },
                  }))
                }
              />
              <PeriodSelect
                label="Period"
                value={snapshot.pretax.fourOhOne.period}
                onChange={(period) =>
                  patchSnapshot((s) => ({
                    ...s,
                    pretax: {
                      ...s.pretax,
                      fourOhOne: { ...s.pretax.fourOhOne, period },
                    },
                  }))
                }
              />
            </div>
          ) : (
            <FieldMoney
              label="401(k) / RRSP percent"
              inputClassName="w-[100px] shrink-0"
              value={snapshot.pretax.fourOhOne.percent}
              onChange={(percent) =>
                patchSnapshot((s) => ({
                  ...s,
                  pretax: { ...s.pretax, fourOhOne: { ...s.pretax.fourOhOne, percent } },
                }))
              }
            />
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3 rounded-2xl border-2 border-ink bg-pastel-aqua/40 p-4">
              <p className="text-sm font-semibold text-ink">HSA contribution (optional)</p>
              <FieldMoney
                label={`Amount (${snapshot.pretax.hsa.amountCurrency})`}
                value={snapshot.pretax.hsa.amount}
                onChange={(amount) =>
                  patchSnapshot((s) => ({
                    ...s,
                    pretax: { ...s.pretax, hsa: { ...s.pretax.hsa, amount } },
                  }))
                }
              />
              <ExpenseCurrencySelect
                value={snapshot.pretax.hsa.amountCurrency}
                onChange={(amountCurrency) =>
                  patchSnapshot((s) => ({
                    ...s,
                    pretax: { ...s.pretax, hsa: { ...s.pretax.hsa, amountCurrency } },
                  }))
                }
              />
              <PeriodSelect
                label="Period"
                value={snapshot.pretax.hsa.period}
                onChange={(period) =>
                  patchSnapshot((s) => ({
                    ...s,
                    pretax: { ...s.pretax, hsa: { ...s.pretax.hsa, period } },
                  }))
                }
              />
            </div>

            <div className="space-y-3 rounded-2xl border-2 border-ink bg-pastel-peach/60 p-4">
              <p className="text-sm font-semibold text-ink">FSA contribution (optional)</p>
              <FieldMoney
                label={`Amount (${displayCurrency})`}
                value={snapshot.pretax.fsa.amount}
                onChange={(amount) =>
                  patchSnapshot((s) => ({
                    ...s,
                    pretax: { ...s.pretax, fsa: { ...s.pretax.fsa, amount } },
                  }))
                }
              />
              <PeriodSelect
                label="Period"
                value={snapshot.pretax.fsa.period}
                onChange={(period) =>
                  patchSnapshot((s) => ({
                    ...s,
                    pretax: { ...s.pretax, fsa: { ...s.pretax.fsa, period } },
                  }))
                }
              />
            </div>
          </div>
        </div>

        <div className="space-y-5 border-t-2 border-dashed border-ink/20 pt-10">
          <div>
            <h2 className="font-marker text-2xl text-ink">Tax settings (global)</h2>
            <p className="mt-1 text-sm text-ink/65">Used for withholding estimates on Calculate.</p>
          </div>
          <RadioChoiceRow
            legend="Filing status"
            name="filingStatus"
            value={snapshot.filingStatus}
            onChange={(v) =>
              patchSnapshot((s) => ({
                ...s,
                filingStatus: v as ComparisonSnapshot["filingStatus"],
              }))
            }
            options={[
              { value: "single", label: "Single" },
              { value: "married", label: "Married filing jointly" },
              {
                value: "hoh",
                label: "Head of household (US Only)",
                isDisabled: hasCanadianPayrollCity,
                disabledTooltip:
                  "Head of household is a United States filing status. It is unavailable while any work city uses Canadian payroll.",
              },
            ]}
          />
        </div>
      </section>

      <section className="rac-section space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div>
              <h2 className="font-marker text-3xl text-ink">Monthly expenses</h2>
              <p className="text-sm text-ink/65">Global expenses · applied equally to every city.</p>
            </div>
          </div>
          <Button
            className="rac-btn bg-pastel-yellow shrink-0 self-start whitespace-nowrap md:mt-2"
            onPress={() =>
              patchSnapshot((s) => ({
                ...s,
                expenses: [...s.expenses, { id: crypto.randomUUID(), name: "", amount: "", currency: "USD" }],
              }))
            }
          >
            + Add expense
          </Button>
        </div>

        <div className="divide-y divide-ink/15">
          {snapshot.expenses.map((row) => (
            <div
              key={row.id}
              className="grid gap-3 py-4 md:grid-cols-[1fr_140px_100px_auto] md:grid-rows-[auto_auto] md:gap-x-3 md:gap-y-1.5"
            >
              <TextField
                className="rac-field md:contents"
                value={row.name}
                onChange={(name) =>
                  patchSnapshot((s) => ({
                    ...s,
                    expenses: s.expenses.map((e) => (e.id === row.id ? { ...e, name } : e)),
                  }))
                }
              >
                <Label className="text-xs font-semibold text-ink/70 md:col-start-1 md:row-start-1">Name</Label>
                <Input className="rac-input w-full md:col-start-1 md:row-start-2" placeholder="Groceries…" />
              </TextField>

              <FieldMoney
                label={`Amount (${row.currency === "CAD" ? "CAD" : "USD"}/mo)`}
                value={row.amount}
                fieldClassName="md:contents"
                labelClassName="md:col-start-2 md:row-start-1"
                inputClassName="w-full md:col-start-2 md:row-start-2"
                onChange={(amount) =>
                  patchSnapshot((s) => ({
                    ...s,
                    expenses: s.expenses.map((e) => (e.id === row.id ? { ...e, amount } : e)),
                  }))
                }
              />

              <ExpenseCurrencySelect
                expenseGrid
                value={row.currency === "CAD" ? "CAD" : "USD"}
                onChange={(currency) =>
                  patchSnapshot((s) => ({
                    ...s,
                    expenses: s.expenses.map((e) => (e.id === row.id ? { ...e, currency } : e)),
                  }))
                }
              />

              <div className="flex justify-end md:col-start-4 md:row-start-2 md:items-center">
                <Button
                  className="rac-btn bg-pastel-pink !rounded-xl"
                  onPress={() =>
                    patchSnapshot((s) => ({
                      ...s,
                      expenses: s.expenses.filter((e) => e.id !== row.id),
                    }))
                  }
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1 border-t border-ink/20 pt-4 text-sm font-semibold text-ink md:flex-row md:items-center md:justify-between">
          <span>Entered monthly expenses (by currency)</span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-right font-normal text-ink/80 md:font-semibold md:text-ink">
            {(() => {
              const { usd, cad } = expenseEnteredSubtotals(snapshot.expenses);
              if (usd <= 0 && cad <= 0) return "—";
              return (
                <>
                  {usd > 0 ? <span>{formatMoney(usd, "USD")} USD</span> : null}
                  {usd > 0 && cad > 0 ? <span className="text-ink/50">·</span> : null}
                  {cad > 0 ? <span>{formatMoney(cad, "CAD")} CAD</span> : null}
                </>
              );
            })()}
          </span>
        </div>
      </section>

      <section className="rac-section flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              className={`rac-btn rac-btn-primary !px-8 !py-3 !text-base ${
                showCalculateErrors && calculateBlocked
                  ? "!border-red-600 !bg-red-50 !text-red-950 ring-2 ring-red-500 ring-offset-2 ring-offset-paper"
                  : ""
              }`}
              aria-invalid={showCalculateErrors && calculateBlocked}
              isDisabled={insightsLoading || status === "Calculating…"}
              onPress={() => void runCalculate()}
            >
              {insightsLoading ? "Generating insights…" : status === "Calculating…" ? "Calculating…" : "Calculate"}
            </Button>
            <p className="text-sm text-ink/70">
              Status: <span className="font-semibold text-ink">{status}</span>
            </p>
          </div>
          {showCalculateErrors && calculateBlocked ? (
            <div
              className="max-w-xl rounded-2xl border-2 border-red-600 bg-red-50 px-4 py-3 text-sm text-red-950"
              role="alert"
            >
              <p className="font-semibold">Required fields missing</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                {calculateErrors.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        {insightsError ? (
          <div className="rounded-2xl border-2 border-ink bg-pastel-peach px-4 py-3 text-sm text-ink">
            {insightsError}{" "}
            <Button className="rac-btn rac-btn-quiet !ml-2 !inline-flex !rounded-xl !py-1 !text-xs" onPress={() => void runCalculate()}>
              Retry insights
            </Button>
          </div>
        ) : null}
      </section>

      {computed ? (
        <section
          ref={resultsDashboardRef}
          id="results-dashboard"
          className="rac-section scroll-mt-8 space-y-8"
        >
          <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <h2 className="font-marker text-4xl text-ink">Results dashboard</h2>
              <p className="text-sm text-ink/65">
                Summary vs baseline{" "}
                <span className="font-semibold text-ink">{baselineCity?.label ?? "—"}</span>
                {" · "}
                The table and income vs spend charts use each city&apos;s payroll currency (USD or CAD). Best / worst
                leftover uses {computed.reportingCurrency} with FX so mixed-country cities stay rankable; AI insights
                use the same.
              </p>
            </div>
            <Button
              className="rac-btn bg-pastel-mint shrink-0 self-start md:mt-1"
              onPress={() => exportResultsCsv(snapshot.baselineCityId, computed)}
            >
              Export Results
            </Button>
          </header>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border-2 border-ink bg-pastel-mint/40 p-4">
              <p className="text-xs font-semibold text-ink/60">Best leftover / month</p>
              <p className="text-xl font-semibold text-ink">{rankedByLeftover[0]?.label ?? "—"}</p>
            </div>
            <div className="rounded-2xl border-2 border-ink bg-pastel-pink/40 p-4">
              <p className="text-xs font-semibold text-ink/60">Worst leftover / month</p>
              <p className="text-xl font-semibold text-ink">{rankedByLeftover.at(-1)?.label ?? "—"}</p>
            </div>
          </div>

          <div className="overflow-auto rounded-2xl border-[3px] border-ink bg-white">
            <table className="min-w-[760px] w-full border-collapse text-sm">
              <thead className="bg-pastel-yellow/40 text-left text-xs uppercase tracking-wide text-ink/70">
                <tr>
                  <th className="border-b-2 border-ink px-4 py-3">City</th>
                  <th className="border-b-2 border-ink px-4 py-3">Take-home / mo</th>
                  <th className="border-b-2 border-ink px-4 py-3">Expenses / mo</th>
                  <th className="border-b-2 border-ink px-4 py-3">Leftover / mo</th>
                  <th className="border-b-2 border-ink px-4 py-3">Δ leftover (same currency)</th>
                </tr>
              </thead>
              <tbody>
                {computed.cities.map((c) => {
                  const isBase = c.cityId === snapshot.baselineCityId;
                  const dd = delta?.[c.cityId];
                  return (
                    <tr key={c.cityId} className="odd:bg-paper2">
                      <td className="border-b border-ink/10 px-4 py-3 font-semibold">
                        {c.label}
                        {isBase ? <span className="ml-2 rounded-full bg-pastel-blue px-2 py-0.5 text-[11px]">Baseline</span> : null}
                      </td>
                      <td className="border-b border-ink/10 px-4 py-3">
                        {formatMoney(c.netMonthlyNative, workCountryToCurrency(c.workCountry))}
                      </td>
                      <td className="border-b border-ink/10 px-4 py-3">
                        {formatMoney(c.expenseMonthlyNative, workCountryToCurrency(c.workCountry))}
                      </td>
                      <td className="border-b border-ink/10 px-4 py-3">
                        {formatMoney(c.leftoverMonthlyNative, workCountryToCurrency(c.workCountry))}
                      </td>
                      <td className="border-b border-ink/10 px-4 py-3">
                        {isBase
                          ? "—"
                          : dd && dd.leftoverMonthly != null
                            ? formatMoneySignedDelta(dd.leftoverMonthly, workCountryToCurrency(c.workCountry))
                            : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {computed.cities.map((c) => {
              const colCur = workCountryToCurrency(c.workCountry);
              const chartMax = Math.max(1, c.netMonthlyNative, c.housingMonthlyNative, c.expenseMonthlyNative);
              return (
              <div key={`chart-${c.cityId}`} className="rounded-2xl border-[3px] border-ink bg-pastel-blue/35 p-4">
                <p className="text-xs font-semibold text-ink/60">Income vs spend · {c.label}</p>
                <div className="mt-4 space-y-3">
                  <div>
                    <div className="mb-1 flex justify-between text-xs font-semibold text-ink/70">
                      <span>Take-home</span>
                      <span>{formatMoney(c.netMonthlyNative, colCur)}</span>
                    </div>
                    <div className="h-3 w-full rounded-full border border-ink bg-white">
                      <div
                        className="h-full rounded-full bg-pastel-lilac"
                        style={{ width: `${Math.min(100, (Math.max(0, c.netMonthlyNative) / chartMax) * 60)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs font-semibold text-ink/70">
                      <span>Housing</span>
                      <span>{formatMoney(c.housingMonthlyNative, colCur)}</span>
                    </div>
                    <div className="h-3 w-full rounded-full border border-ink bg-white">
                      <div
                        className="h-full rounded-full bg-pastel-peach"
                        style={{ width: `${Math.min(100, (Math.max(0, c.housingMonthlyNative) / chartMax) * 60)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs font-semibold text-ink/70">
                      <span>Expenses</span>
                      <span>{formatMoney(c.expenseMonthlyNative, colCur)}</span>
                    </div>
                    <div className="h-3 w-full rounded-full border border-ink bg-white">
                      <div
                        className="h-full rounded-full bg-pastel-yellow"
                        style={{ width: `${Math.min(100, (Math.max(0, c.expenseMonthlyNative) / chartMax) * 60)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {computed.cities.map((c) => (
              <div key={`tax-${c.cityId}`} className="rounded-2xl border-[3px] border-ink bg-white p-5 shadow-cut">
                <p className="text-sm font-semibold text-ink">{c.label}</p>
                <p className="text-xs text-ink/55">
                  Withholding estimate (monthly)
                  {c.workCountry === "CA" ? " · Canada" : " · United States"}
                  {" · "}
                  Amounts in {workCountryToCurrency(c.workCountry)} (not converted). Matches take-home and housing in
                  the summary table.
                </p>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt>Federal</dt>
                    <dd className="text-right font-semibold">
                      {formatMoney(c.tax.monthlyFederal, workCountryToCurrency(c.workCountry))}{" "}
                      <span className="font-normal text-ink/60">
                        ({pctOfMonthlyGross(c.tax.monthlyFederal, c.grossAnnualNative)})
                      </span>
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>{c.workCountry === "CA" ? "Provincial" : "State"}</dt>
                    <dd className="text-right font-semibold">
                      {formatMoney(c.tax.monthlyState, workCountryToCurrency(c.workCountry))}{" "}
                      <span className="font-normal text-ink/60">
                        ({pctOfMonthlyGross(c.tax.monthlyState, c.grossAnnualNative)})
                      </span>
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>{c.workCountry === "CA" ? "Local (e.g. QPIP)" : "Local"}</dt>
                    <dd className="text-right font-semibold">
                      {formatMoney(c.tax.monthlyLocal, workCountryToCurrency(c.workCountry))}{" "}
                      <span className="font-normal text-ink/60">
                        ({pctOfMonthlyGross(c.tax.monthlyLocal, c.grossAnnualNative)})
                      </span>
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>{c.workCountry === "CA" ? "CPP / QPP" : "FICA"}</dt>
                    <dd className="text-right font-semibold">
                      {formatMoney(c.tax.monthlyFica, workCountryToCurrency(c.workCountry))}{" "}
                      <span className="font-normal text-ink/60">
                        ({pctOfMonthlyGross(c.tax.monthlyFica, c.grossAnnualNative)})
                      </span>
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>{c.workCountry === "CA" ? "EI" : "Medicare"}</dt>
                    <dd className="text-right font-semibold">
                      {formatMoney(c.tax.monthlyMedicare, workCountryToCurrency(c.workCountry))}{" "}
                      <span className="font-normal text-ink/60">
                        ({pctOfMonthlyGross(c.tax.monthlyMedicare, c.grossAnnualNative)})
                      </span>
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-dashed border-ink/20 pt-2">
                    <dt>Effective rate</dt>
                    <dd className="text-right font-semibold">{(c.tax.effectiveRate * 100).toFixed(1)}% of gross</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>
                      {c.workCountry === "CA" ? "RRSP deferrals / yr" : "401(k) / 403(b) deferrals / yr"}
                    </dt>
                    <dd className="font-semibold">
                      {formatMoney(c.deferralsAnnual401k, workCountryToCurrency(c.workCountry))}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>

          <div
            className="rounded-2xl border-[3px] border-ink bg-pastel-mint/40 p-6 shadow-cut"
            aria-busy={insightsLoading}
            aria-live="polite"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="font-marker text-2xl text-ink">AI Insights</h3>
              {insightsLoading ? (
                <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-white px-3 py-1 text-xs font-semibold text-ink shadow-cut">
                  <span
                    className="h-2.5 w-2.5 animate-pulse rounded-full bg-ink"
                    aria-hidden
                  />
                  Writing city COL notes…
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-xs text-ink/60">
              {insightsLoading ? (
                <>
                  Drafting city-by-city cost-of-living color and takes on your expense lines — this can take a few
                  seconds.
                </>
              ) : insightsMode === "openai" ? (
                <>
                  Written by OpenAI from your cities + expenses — qualitative, not a rehash of leftover/tax rows
                  (not financial advice).
                </>
              ) : insightsMode === "deterministic" ? (
                <>
                  Full city COL commentary needs{" "}
                  <code className="rounded bg-ink/10 px-1 py-0.5 font-mono text-[11px]">OPENAI_API_KEY</code> in{" "}
                  <code className="rounded bg-ink/10 px-1 py-0.5 font-mono text-[11px]">.env.local</code> — restart{" "}
                  <code className="rounded bg-ink/10 px-1 py-0.5 font-mono text-[11px]">next dev</code>, then Calculate
                  again.
                </>
              ) : insightsMode === "error" ? (
                <>Last insights request failed — fallback notes shown above.</>
              ) : (
                <>Run Calculate to load insights.</>
              )}
            </p>
            {insightsLoading ? (
              <div className="mt-4 space-y-3" role="status">
                <span className="sr-only">Loading AI insights</span>
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-3.5 animate-pulse rounded-full bg-ink/15"
                    style={{ width: `${92 - i * 10}%`, animationDelay: `${i * 120}ms` }}
                  />
                ))}
                <p className="pt-1 text-sm text-ink/55">
                  Numbers above are ready — insights continue loading in this panel.
                </p>
              </div>
            ) : (
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-ink">
                {insights.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
