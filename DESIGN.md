# Memory Series — Design System

This document is the single reference for layout, typography, and surface treatment on the site. Implementation tokens live in `src/index.css` (Tailwind v4 / `@theme`).

## 1. Design movement

**Cinematic Tech-Noir Minimalism**

- Deep-space void as the canvas, not decoration.
- Silver-precision typography: clear hierarchy, restrained tracking on body, slightly wider tracking on labels.
- Warm gold as the only strong accent (CTA, focus ring, key dots). Use sparingly.

## 2. Color (dark mode default)

| Role        | Intent                          | Token / usage                          |
|------------|----------------------------------|----------------------------------------|
| Background | Deep navy void                   | `background` — oklch deep blue         |
| Foreground | Cool silver text                 | `foreground`                           |
| Accent     | Emotional spark, not loud chrome | `accent` / `oklch(0.78 0.12 75)` gold  |
| Surfaces   | Float above void                 | `card`, `border` at low opacity         |

Do not introduce extra saturated hues for marketing blocks; variation comes from opacity, blur, and thin borders.

## 3. Typography

- **Display / H1**: `font-[Manrope]`, semibold, tight tracking (`tracking-[-0.02em]`), `text-balance` for headlines.
- **Section titles (H2)**: Same family, `text-2xl`–`text-3xl`, clear separation from body.
- **Eyebrow / label**: `text-xs`, `tracking-[0.34em]`, `text-foreground/60` (or `/65`).
- **Body**: `text-sm`–`text-base`, `leading-7`–`leading-8`, `text-foreground/70`–`/75`. Prefer `text-pretty` on wide paragraphs.
- Avoid long unbroken paragraphs on product pages; use `whitespace-pre-line` only where copy is authored with intentional breaks.

## 4. Layout and rhythm

- **Max width**: `max-w-6xl` for shell; **reading column** for long prose: `max-w-3xl` centered or in a clear column so lines are not too long on large screens.
- **Horizontal padding**: `px-5` on sections.
- **Vertical rhythm**: Section blocks separated by `space-y-16`–`space-y-24` rather than many small boxes.
- **Negative space**: Prefer one strong hero, then calm vertical flow; avoid dense multi-column marketing grids unless content is inherently tabular.

## 5. Surfaces and components

- **Cards**: `rounded-3xl`, `border border-border/60`, `bg-card/35` or `bg-background/10`, `backdrop-blur` where layered over imagery.
- **Pills / chips** (meta row): `rounded-full`, `border-border/70`, `bg-background/25`, optional gold dot separator.
- **Dividers**: `Separator` with `bg-border/60`; optional thin gold line for emphasis (`h-px`, `bg-accent/40`).
- **Grain / hero**: Hero may use full-bleed image with gradient scrim + `.grain`; keep image opacity moderate (`opacity-70`–`80`) so type stays legible.

## 6. Motion

- Use **short** fades and small vertical offsets (`framer-motion`, ~0.75s ease `[0.16, 1, 0.3, 1]`).
- Do not chain aggressive stagger on long pages; hero animate-in is enough for product pages.

## 7. Product page pattern (Trace / Inhabit and future products)

1. **Sticky header**: Minimal bar — primary action is contextual (e.g. back to top), product name centered, no dead links to removed site areas.
2. **Hero**: Full-bleed background, one eyebrow line, one H1, one subtitle, optional primary/secondary CTAs (outline secondary).
3. **Anchor strip** (optional): Compact horizontal list of in-page anchors; on large screens may align with content start. Not a heavy sidebar TOC.
4. **Body sections**: Each block: eyebrow label → H2 → content. Value props in a simple grid; scenarios similar. Closing statement with breathing room before footer.
5. **Footer**: Slim border-top, low contrast links; no competing accents.

## 8. Accessibility

- Maintain visible focus on interactive elements (`ring` uses accent).
- Alt text on hero imagery: decorative images use empty `alt` when accompanied by visible headings that convey purpose.
