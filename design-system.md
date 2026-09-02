# Soundprint landing — cinematic vitrine

Extracted from the current home hero. The marketing landing is always dark, independent of the app theme switcher.

## Canvas

- Page background: `#050508`
- Product surfaces: `#080913`, `#0c0e18`, `#10111c`
- No light-theme tokens (`bg-background`, `text-foreground`, `bg-card-surface`, `border-card-border`, `bg-app-shell`) on the landing.

## Color

- Text: `text-white`
- Body: `text-white/68`
- Muted: `text-white/45` to `text-white/55`
- Eyebrow: `text-white/70`
- Hairline: `border-white/10` or `border-white/15`
- Glass fill: `bg-white/5` hover `bg-white/10`
- Brand gradient CTA: `bg-brand-gradient` + `shadow-brand-glow`
- Accent glow: `rgb(152 80 208 / 0.28)` radial behind devices
- Album ring: `ring-1 ring-white/10`
- Album shadow: `shadow-[0_22px_50px_-18px_rgba(0,0,0,0.85)]`

## Typography

- Eyebrow: `font-mono text-[0.68rem] font-semibold uppercase tracking-[0.22em] sm:text-xs`
- Section H2: `text-[1.85rem] font-semibold leading-[1.15] tracking-[-0.045em] text-white min-[380px]:text-[2.05rem] sm:text-5xl sm:leading-[1.08] sm:tracking-[-0.055em]`
- Body: `text-base leading-7 text-white/68 sm:text-lg sm:leading-8`
- Buttons: `text-sm font-semibold`

## Layout

- Max width: `max-w-7xl`
- Horizontal padding: `px-4 sm:px-6 lg:px-8`
- Centered on mobile, left-aligned from `lg`
- Section spacing: generous `pb-16 sm:pb-24`, `gap-10 lg:gap-12`
- Radius: tiles `rounded-2xl`, stages `rounded-[1.75rem]` to `rounded-[2.6rem]`
- Header: sticky `bg-black/40 backdrop-blur-xl border-white/10`

## Components

Primary CTA:

```tsx
<Link className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-7 py-3 text-sm font-semibold text-white shadow-brand-glow transition-all hover:-translate-y-0.5 hover:opacity-95 sm:w-auto">
  Label
</Link>
```

Ghost CTA:

```tsx
<Link className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-7 py-3 text-sm font-semibold text-white shadow-[0_18px_50px_-28px_rgba(0,0,0,0.55)] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/10 sm:w-auto">
  Label
</Link>
```

Glass stage:

```tsx
<div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-[0_18px_50px_-28px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:p-6">
  {children}
</div>
```

Album cover:

```tsx
<div className="relative overflow-hidden rounded-[12px] bg-[#10111c] shadow-[0_22px_50px_-18px_rgba(0,0,0,0.85)] ring-1 ring-white/10">
  <Image src={album.imageSrc} alt="" fill className="object-cover" />
</div>
```

Device frame (phone):

```tsx
<div className="relative overflow-hidden rounded-[2.6rem] border-[5px] border-[#1c1d24] bg-[#050508] p-[5px] shadow-[0_40px_80px_-24px_rgba(0,0,0,0.88)] ring-1 ring-white/12">
  <div className="absolute left-1/2 top-2 z-10 h-5 w-[4.4rem] -translate-x-1/2 rounded-full bg-black" />
  <div className="relative overflow-hidden rounded-[2.15rem] bg-[#080913]">{screen}</div>
</div>
```

Header chrome:

```tsx
<header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur-xl">
  <nav className="text-sm font-medium text-white/70 hover:text-white" />
</header>
```

FAQ row:

```tsx
<details className="group rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm open:bg-white/[0.07]">
  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold tracking-[-0.01em] text-white">
    Question
  </summary>
  <p className="px-5 pb-5 text-sm leading-7 text-white/55">Answer</p>
</details>
```

## Motion

- Hover lift: `hover:-translate-y-0.5`
- Album float / marquee already exist (`animate-home-hero-album-float`, `animate-home-hero-marquee-up/down`)
- Respect `prefers-reduced-motion`
- Reveals: existing `HomeBlurFadeReveal` / `HomeTextReveal`

## Do not

- Do not introduce light cards, lavender app-shell gradients, or logo dividers between sections
- Do not use theme CSS variables for landing text/surfaces
- Do not hide product videos on mobile
