import { Link } from "@/i18n/navigation";

type LegalRelatedLinksProps = {
  title: string;
  description: string;
  links: { href: string; label: string }[];
};

export function LegalRelatedLinks({ title, description, links }: LegalRelatedLinksProps) {
  return (
    <section
      aria-labelledby="related-policies"
      className="rounded-xl border border-card-border bg-card/30 px-4 py-4"
    >
      <h2 id="related-policies" className="text-base font-semibold text-foreground">
        {title}
      </h2>
      <p className="mt-2 text-sm text-muted">{description}</p>
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
