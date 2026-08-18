import {
  SoundprintBrandDivider,
} from "@/lib/components/soundprint-brand-divider";

export function OverviewSectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 rounded-[1.5rem] border border-card-border bg-surface-glass/60 p-5 backdrop-blur-sm sm:flex-row sm:items-end sm:p-6">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">
          {title}
        </h2>
      </div>
      <p className="max-w-xl text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}

/** Quiet pause between sibling overview blocks. */
export function OverviewSectionRule({
  compact = false,
  plain = false,
}: {
  compact?: boolean;
  plain?: boolean;
}) {
  const spacing = compact ? "py-4" : "py-6 sm:py-8";

  if (plain) {
    return (
      <div className={`mx-auto w-full max-w-2xl ${spacing}`} aria-hidden>
        <div className="h-px bg-gradient-to-r from-transparent via-card-border to-transparent" />
      </div>
    );
  }

  return (
    <SoundprintBrandDivider
      logoSize="sm"
      lineStyle="fade"
      maxWidth="narrow"
      className={spacing}
    />
  );
}
