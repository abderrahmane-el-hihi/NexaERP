# Landing page redesign — design brief for Gemini

*Paste everything below the divider into Gemini. It assumes the NexaERP repo checked out
on `main`, and that Gemini already has the blueprint, strategy and handoff documents.*

---

## The job

Redesign `src/app/(marketing)/page.tsx` — the public landing page for **NexaERP**, an
ERP for Moroccan SMEs. The current page must be replaced, not adjusted.

**The page has one job:** convince a Moroccan business owner that the e-invoicing
obligation arriving on 1 January 2027 is handled, and get him to book a demo or start a
trial. Everything else on the page is subordinate to that.

---

## Who is actually reading this page

Design for this person, not for yourself:

> **Rachid, 47.** Owns a SARL AU in Casablanca distributing auto parts. Eleven employees.
> Turnover around 6 million dirhams. Invoices go out from an Excel file his cousin set
> up in 2019. His accounting is done by a fiduciaire he has used for eight years. He runs
> his business on WhatsApp and a paper carnet. He speaks and reads French for business;
> Arabic at home. He is not a software buyer, has never heard the word "ERP" spoken
> positively, and does not want to "build" anything.
>
> Three weeks ago his fiduciaire told him that from January, his invoices have to go
> through a government platform. He does not know what that means. He is not excited —
> he is quietly worried about a problem with the DGI.

Every design decision answers one question: **does this make Rachid feel that January is
handled by someone competent who will answer the phone?**

---

## What is wrong with the current page

Read `src/app/(marketing)/page.tsx` before you start. It is a competent page for the
wrong product and the wrong person:

| Problem | Why it fails |
|---|---|
| Near-black background (`#0a0a0a`), glow shadows, gradient white-to-grey headings | This is the developer-tool aesthetic. Rachid reads it as "not for me." Dark mode signals a product for people who work at night in a code editor |
| English copy | The buyer conducts business in French |
| Pricing in **USD** — $49 / $149 / $399 | Instantly disqualifying. He pays in dirhams and cannot expense a dollar price |
| "Enterprise capabilities. Startup speed." / "Ready to build?" | He does not want startup speed and has nothing to build |
| "Clarity through connection", generic bento of modules | Says nothing. Every SaaS page says this |
| Nothing about the January obligation | The single reason he would buy is absent from the page |
| Nothing about the state subsidy | The biggest price lever is absent |
| Dashboard mockup as the hero | He does not care what the software looks like. He cares whether his invoice is legal |
| No phone number, no company identity, no proof | He is choosing who holds his accounting. There is no reason to trust this page |

Keep exactly one thing: the accent colour `#f06e53` has brand continuity with the app.
It survives, deepened, as one member of a larger palette.

---

## Design direction

### Concept

**The page is built around the document, not the software.**

Every competitor shows a dashboard. Rachid does not buy a dashboard — he buys the
certainty that the piece of paper he hands his customer is legally valid. So the hero is
a **facture**, and the memorable moment on the page is that facture receiving its
validation from the DGI.

This is the one deliberate risk in the design, and it is the right one: it shows the
outcome instead of the tool, in the visual language of the artefact he already knows.

### Palette

Light, warm, and drawn from the world of commercial paperwork — invoice paper, ink,
rubber stamps — not from the SaaS-startup palette.

```css
--paper:      #FCFAF5;  /* ground — warm invoice paper, not grey, not stark white */
--paper-deep: #F4EFE4;  /* alternating section bands, card grounds */
--ink:        #141E2C;  /* body text and headings — deep ink navy, never pure black */
--ink-soft:   #5A6675;  /* secondary text */
--cachet:     #6B2FA0;  /* the stamp violet — primary action, official validation */
--zellige:    #0E8C8C;  /* teal — success, validated, paid, "en vigueur" */
--safran:     #F2A33C;  /* deadline, urgency, the phase that is coming */
--terre:      #C8553D;  /* deepened from the app's #f06e53 — brand continuity, warnings */
--rule:       #E2D9C8;  /* hairlines, table rules, document edges */
```

Each colour has a **job**, and only that job:

- **cachet violet** — anything official and anything clickable that matters. The stamp,
  the primary button, the recommended plan.
- **zellige teal** — validated, cleared, paid, already in force. Never decorative.
- **safran** — the deadline and only the deadline. Its scarcity is what makes it land.
- **terre** — rejections, penalties, the things that go wrong.

Do not tint the page with gradients. The ground is paper; colour arrives as ink.

### Typography

Load with `next/font/google`. Do not use Inter, Geist, or any system stack.

| Role | Face | Use |
|---|---|---|
| Display | **Bricolage Grotesque** (variable, 500–800) | Headlines only. Tight tracking at large sizes, `-0.03em` |
| Body | **IBM Plex Sans** (400, 500, 600) | All prose. Excellent French diacritics, and an Arabic sibling exists for the roadmap |
| Figures | **IBM Plex Mono** (400, 500) | Every amount, every identifier — ICE, IF, invoice numbers, MAD figures, dates, the countdown |

The mono face is not a stylistic tic: it is how documents set their figures, it makes
dirham amounts scan in a column, and it is what makes an ICE number read as an ICE
number. Use it consistently and never for prose.

Type scale (clamp for fluid sizing):

```
display-xl   clamp(2.75rem, 6vw, 5rem)      Bricolage 700, -0.03em, line-height 1.02
display-l    clamp(2rem, 4vw, 3.25rem)      Bricolage 600, -0.02em
title        1.5rem                          Bricolage 600
body-l       1.125rem / 1.65                 Plex Sans 400
body         1rem / 1.6                      Plex Sans 400
label        0.8125rem, 0.08em tracking, uppercase   Plex Sans 600
figure       tabular-nums                    Plex Mono 500
```

### Structure and geometry

- Radius: **6px** on interface elements, **2px** on document surfaces. The current page's
  `rounded-3xl` everywhere is what makes it read as generic; documents have crisp corners.
- Rules and edges instead of shadows. One soft shadow is permitted: under the hero
  document, to lift it off the page like paper on a desk.
- Generous vertical rhythm — sections at `clamp(5rem, 10vw, 8rem)` padding. Paper needs
  margins.
- Max content width 1120px; the hero document sits at 560px.

### The signature element

**The cachet.** A round stamp mark, like the wet rubber stamp every Moroccan business
owns, reading `VALIDÉE · DGI` around the arc with the clearance reference in the middle.

It appears **once at full strength** — landing on the hero invoice — and then survives as
a quiet motif: section eyebrows sit inside a small stamp-edged chip, and "validated"
states carry a miniature arc mark. Build it as **inline SVG**, not an image file: a
circle with `textPath` around it, slightly rotated (about −8°), with an intentionally
imperfect edge so it reads as ink on paper rather than a UI badge.

This is where the boldness is spent. Everything else stays quiet.

### Colourful assets, without stock art

The client asked for colour and assets. It arrives in three places, all built as inline
SVG so nothing depends on an image pipeline:

1. **Section marks** — small geometric line badges, one per section, derived from the
   eight-point rosette geometry of zellige but reduced to a single-weight line mark, each
   in a different palette colour. Reduced, not decorative — they act as section
   identifiers.
2. **The phase band** — the three obligation dates rendered as a horizontal timeline in
   teal (in force), teal (in force), saffron (coming). The colour *is* the information.
3. **The document surfaces** — the invoice, the rejection card, the VAT summary. These
   are drawn with real content in real colours, and they are the most colourful thing on
   the page precisely because they are the product.

No illustrations of people. No 3D blobs. No gradient meshes. No emoji.

---

## Section by section

Copy is given in French and should be used as written. It is deliberately plain: Rachid
is worried, not entertained. Do not add exclamation marks, do not write "révolutionnez",
and do not use the word "solution".

### 1 — Hero

```
┌──────────────────────────────────────────────────────────────┐
│  [logo]                    Fonctions  Tarifs  Connexion  [→] │
├──────────────────────────────────────────────────────────────┤
│                                    │                         │
│  ▸ FACTURATION ÉLECTRONIQUE — DGI  │   ┌─────────────────┐   │
│                                    │   │ FACTURE         │   │
│  À partir de janvier,              │   │ FA-2027-00014   │   │
│  une facture non validée           │   │                 │   │
│  n'est plus une facture.           │   │ Client · ICE    │   │
│                                    │   │ ─────────────── │   │
│  NexaERP transmet vos factures     │   │ 3 lignes        │   │
│  à la plateforme de la DGI,        │   │ TVA 20%         │   │
│  récupère la validation, et vous   │   │ Total 14 400,00 │   │
│  prévient si quelque chose bloque. │   │        ╭─────╮  │   │
│                                    │   │        │CACHET│  │  │
│  [ Voir une facture validée ]      │   │        ╰─────╯  │   │
│  [ Parler à quelqu'un ]            │   └─────────────────┘   │
│                                    │                         │
│  J–117 avant l'obligation          │                         │
└──────────────────────────────────────────────────────────────┘
```

- **Eyebrow:** `FACTURATION ÉLECTRONIQUE — OBLIGATION DGI`
- **H1:** *À partir de janvier, une facture non validée n'est plus une facture.*
- **Body:** *NexaERP transmet vos factures à la plateforme de la DGI, récupère la
  validation, et vous prévient si quelque chose bloque. Vous continuez à facturer.*
- **Primary CTA:** `Voir une facture validée` (cachet violet, solid)
- **Secondary CTA:** `Parler à quelqu'un` (outline, opens WhatsApp)
- **Under the CTAs:** a live countdown to 1 January 2027, set in Plex Mono, in saffron.
  Compute it client-side from the real date; do not hardcode a number.

The invoice on the right is a **real French invoice**, not a screenshot: header with
company name and ICE, client block, three product lines with quantities and MAD amounts,
a TVA 20% line, a TTC total. Set every figure in Plex Mono with tabular numerals. It
should look like something Rachid would recognise from his own drawer.

### 2 — The phase band

A full-width band on `--paper-deep`. Three markers on one horizontal rule:

| Date | Who | State |
|---|---|---|
| 1 janvier 2026 | Grandes entreprises | **En vigueur** (teal) |
| 1 juillet 2026 | Entreprises moyennes | **En vigueur** (teal) |
| 1 janvier 2027 | **PME et TPE — moins de 10 M MAD** | **Vous êtes ici** (saffron, emphasised) |

The third marker is visually heavier than the other two. This band encodes real
information — a phased legal calendar — which is why it is a timeline and not decoration.

Footnote in small type: *Calendrier publié par la DGI. Les seuils définitifs dépendent du
décret d'application.*

### 3 — What changes, concretely

Three rows. Left column states the obligation in the law's terms; right column states
what the product does about it. Two columns, hairline rule between rows, no cards.

| L'obligation | Ce que fait NexaERP |
|---|---|
| **Le format.** Un PDF envoyé par e-mail ne suffit plus. La facture doit être un fichier structuré et signé électroniquement. | Nous générons le format attendu et le signons. Vous ne voyez que votre facture. |
| **La validation.** La facture doit être validée par la plateforme de la DGI avant d'exister légalement. | Nous l'envoyons, nous attendons la réponse, et nous réessayons tant que la plateforme ne répond pas. |
| **Les sanctions.** Une amende par facture non conforme, et un risque sur votre droit à déduction de TVA. | En fin de mois, nous vérifions que toutes vos factures de la période ont bien été validées. |

**Before publishing, confirm the penalty figures and the format requirement against DGI
primary sources.** They are reported by secondary sources in the strategy document; do
not print a number on a public page that you have not verified.

### 4 — When it fails, you know why

The differentiator, and the most concrete thing on the page. Show a **rejected** invoice
card in terre-cuite, with the platform's raw code translated into an instruction:

```
  ✕  Rejetée par la plateforme
     ICE_MISSING  ·  champ : client.ICE

     L'ICE du client est absent.
     Renseignez-le dans la fiche de MAROC PIÈCES AUTO SARL.

     [ Corriger et renvoyer ]     Facture n° FA-2027-00015 · conservée
```

With the line underneath: *La facture garde son numéro. Une facture rejetée n'a jamais
été émise, elle est corrigée et renvoyée — sans trou dans votre numérotation.*

That sentence is worth more than any feature list: it demonstrates that the people who
built this understood the regulation.

### 5 — And it is a real ERP

Short, three columns, restrained. He is buying compliance; this is what stops him
leaving for a cheaper invoicing tool once January passes.

- **Stock** — *Ce que vous avez, ce que vous avez vendu, ce que ça vous a coûté.*
- **Achats** — *Commandes, réceptions, factures fournisseurs qui se rapprochent toutes seules.*
- **Ce qu'on vous doit** — *La liste de vos impayés, par ancienneté, avec les relances.*

One line under the three: *Comptabilité complète, plan comptable marocain, TVA prête à
déclarer.*

### 6 — Pricing, in dirhams, with the subsidy

Three plans. Middle one recommended, lifted, cachet-violet border.

| | ESSENTIEL | GESTION | COMPLET |
|---|---|---|---|
| Prix | **4 800 MAD/an** | **12 000 MAD/an** | **24 000 MAD/an** |
| Utilisateurs | 2 | 5 | 12 |
| | Facturation + DGI, clients, TVA, relances | + achats, stock, marge, rapprochement bancaire | + comptabilité complète, multi-site, support prioritaire |

Above the plans, in a saffron-bordered strip:

> **Jusqu'à 90 % pris en charge.** Les programmes publics de digitalisation couvrent une
> large part du coût pour les TPE et PME. Nous montons le dossier avec vous.
> *Éligibilité à confirmer selon votre situation.*

Under each price, in mono, smaller: `à partir de 480 MAD/an après subvention` (compute
the 10% figure per plan).

Do not print a subsidy percentage as a guarantee. Say "jusqu'à" and mark that eligibility
depends on the company.

### 7 — Why trust us

Four short items, no cards, set in a single row with hairline dividers:

- **Édité au Maroc.** Plan comptable marocain, factures en français, support en français.
- **Vos données sont à vous.** Export complet, à tout moment, sans demander.
- **On l'utilise pour nos propres factures.** Nos clients sont facturés avec NexaERP.
- **Quelqu'un répond.** [phone number] · WhatsApp

Under it, in small mono: the company's own `ICE · IF · RC`. A business that prints its
own identifiers is a business that exists — and it quietly demonstrates the invoice
mentions the product handles.

### 8 — Final CTA

Full-width, paper-deep ground, the cachet mark large and faint behind the text.

- **H2:** *Vos factures de janvier peuvent déjà être conformes.*
- **Body:** *Trente minutes pour ouvrir votre compte et émettre une première facture
  validée. On vous accompagne pour la reprise de vos clients et de vos produits.*
- **CTA:** `Commencer` + `Parler à quelqu'un`

### Footer

Company identity, links (Fonctions, Tarifs, Connexion, CGU, Confidentialité), the ICE,
and a line on data protection. Keep it plain.

---

## Motion

One orchestrated moment, then near-silence.

**The hero, on load:** the invoice fades and rises 12px over 500ms; its lines stagger in
at 40ms intervals; then, after a 400ms beat, the cachet lands — scale from 1.6 to 1 with
a slight overshoot, opacity 0 to 0.9, rotation settling at −8°, over 450ms with a spring.
A faint ink-spread on the paper underneath. Total sequence under 1.6 seconds.

**Everywhere else:** a 300ms fade-and-rise on scroll into view, once, 16px of travel.
Nothing loops. Nothing parallaxes. No ambient particles.

**Hover:** buttons shift 1px and deepen; document cards raise their shadow slightly.
That is all.

**`prefers-reduced-motion: reduce` must render the cachet already stamped**, with every
scroll animation disabled and no layout shift. Test it.

Framer Motion is already a dependency. Note that in this file the animation presets are
typed as `MotionProps` and applied by **spreading** (`{...fadeInUp}`), not via
`variants={}` — follow the existing pattern.

---

## Technical constraints

- **File:** `src/app/(marketing)/page.tsx`. The route group and the existing
  `/login`, `/signup` routes stay as CTA targets.
- **Next.js 16 App Router, Tailwind v4, TypeScript strict.** Fonts via `next/font/google`
  in the marketing layout.
- **This page commits to light.** The app has a dark mode; the marketing page does not
  inherit it. Set the ground explicitly so no theme leaks in.
- **All artwork is inline SVG.** No image files, no icon fonts, no external asset host.
  Heroicons is already available for utility icons; do not add an icon library.
- **No new dependencies** without saying why first.
- **Zero `: any`.** The codebase has none; keep it that way.
- **Extract sub-components** — the current 340-line single file is hard to work on. Put
  each section in `src/app/(marketing)/_components/`, and the cachet in its own file.
- **`npm run build`, `npx tsc --noEmit` and `npm run lint` must all pass** before you
  report it done. `npm run dev` succeeding proves nothing.

## Quality floor

- Responsive to 360px. The hero stacks; the invoice stays legible; the phase band becomes
  vertical.
- Real text contrast: body text on paper must clear 4.5:1. Check the saffron and teal on
  paper — if either fails, darken the text variant rather than the accent.
- Visible keyboard focus on every interactive element, in cachet violet.
- Semantic landmarks, one `h1`, ordered headings.
- French typography: non-breaking space before `:` `?` `!` `%`, and `«` `»` if you quote.
  Currency as `14 400,00 MAD` — space as thousands separator, comma as decimal.
- No layout shift from the fonts — use `display: swap` and set fallback metrics.

## What not to do

- No dark hero, no glow shadows, no gradient headline text — that is the page you are
  replacing.
- No dashboard screenshot as the hero.
- No stock photography, no illustrated people, no 3D shapes, no gradient mesh.
- No zellige tile pattern as a background texture. The rosette geometry may inform the
  small section marks; a tiled Moroccan pattern behind the content is the cliché this
  design is specifically avoiding.
- No fake logos, no invented customer counts, no testimonials that do not exist. If there
  is no proof yet, use the honest proof: the product runs the company's own invoicing.
- No countdown that manufactures panic — one quiet line, not a ticking banner.
- Do not print any tax figure, penalty or subsidy percentage you have not verified.

## Definition of done

1. Every section built with the copy above, in French.
2. The cachet animation runs on load and is respectful of reduced motion.
3. Prices in MAD with the subsidy line.
4. Contrast checked, keyboard focus visible, responsive to 360px.
5. All three verification commands pass; paste the output.
6. A screenshot of the hero at 1440px and at 390px.

Before you write any code, reply with: the palette rendered as swatches with their jobs,
the type specimen, and a one-paragraph description of the cachet animation. If any part
of your plan is what you would produce for any B2B SaaS page rather than for this one,
say which part and change it.
