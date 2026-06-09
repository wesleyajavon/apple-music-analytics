type GdprContactBlockProps = {
  title: string;
  body: string;
  email: string;
  emailAriaLabel: string;
};

export function GdprContactBlock({ title, body, email, emailAriaLabel }: GdprContactBlockProps) {
  return (
    <section className="mt-10 rounded-xl border border-card-border bg-card/40 p-5" aria-labelledby="gdpr-contact-title">
      <h2 id="gdpr-contact-title" className="text-lg font-semibold text-foreground">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
      <p className="mt-3">
        <a
          href={`mailto:${email}`}
          className="text-sm font-medium text-primary underline-offset-2 hover:underline"
          aria-label={emailAriaLabel}
        >
          {email}
        </a>
      </p>
    </section>
  );
}
