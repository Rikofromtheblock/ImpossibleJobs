# impossible jobs — website

Status (11 Oct 2026): LIVE on GitHub Pages at https://rikofromtheblock.github.io/impossible-jobs/ (GitHub user: Rikofromtheblock, repo `impossible-jobs`, branch main/root). Custom domain impossiblejobs.org (GoDaddy) being connected. No Netlify needed.

## Files (repo root)
index.html (home; loads holo.css + holo.js), jobs.html (module 01 mission board), privacy.html (privacy & data statement), site.css, site.js (shared: rocket launch, cursor, audio engine, dock, menu), flap.css + flap.js (the brand mark: split-flap tile + LED icons), board.css, board.js (mission board only), missions.js (all mission data incl. logos + hiring-manager portraits), favicon.svg (ij monogram), og.png (link preview, ij monogram). Leave CNAME in the repo (domain record).
Project copies: `website/*` with the same names.
Updating the live site: GitHub repo → Add file → Upload files → drag changed files → Commit changes (live in ~1 min) → hard refresh (Ctrl/Cmd + Shift + R).

## Adding a new mission
Add one entry to the end of `missions.js` (fields: num, title, company, board_company, board_location, status, headquarters, founded, turnover, company_description, punchline, values, tags, posted, about_company, about_role, responsibilities, requirements[{skill, sectors}], nice_to_have, reports_to{name,title,background}, slide5_future_line, company_colors, logo_svg, portrait_svg). Statuses: now boarding · boarding · final call · last seats · delayed · classified.

## Mission board (jobs.html) — "IJ/OS"
- System environment: darker bg, grid + scanlines, system bar (ij/os · mission board, uplink, counts, 2046 clock, sound switch). No rocket.
- Opening: boot log (once per session) → title "now boarding: careers that haven't been invented. mind the gap." + smaller "experience required: none. nobody has any. yet." (no LinkedIn digs — LinkedIn will be used heavily) → split-flap board flips in.
- Board: no. · title · company · location · status; larger readable flaps; a random row re-flips every 4 s (never the same twice).
- Mission file (holographic): full carousel content + portrait + values; buttons: apply now (mailto hello@impossiblejobs.org, prefilled subject/body), share on WhatsApp (wa.me with message + deep link), copy link. Deep links #mission-00N.

## The mark (identity approved 14 Oct 2026, on the site from 15 Oct 2026)
Rule: **still = ij monogram, moving = split-flap tile, astronaut = character only.**
- ij monogram: inline SVG with class `ij-mono` (bare, neon glow, never on a rounded square). Board top bar, both footers, the gap section ("born in the gap"), privacy page, favicon.svg, og.png.
- Split-flap tile: `<span class="ij-flap" data-size=".." data-mode="spin|armed|static" data-icon="..">` built by flap.js. Portrait 4:5, LED faces from 15 pixel icons, every second landing comes home to ij.
  - Home hero: `data-mode="armed"`, shows the LED rocket during the countdown. There is only one rocket: the flying rocket (site.js) is the same LED sprite as the tile's face (drawn by flap.js on the same 24-dot grid, same glow, same dot screen), positioned by its nozzle exactly over the tile. At ignition the tile's face switches off and the flying rocket switches on in the same frame, so it lifts straight out of the tile; its flame grows in LED steps and its sparks are LED pixels. site.js fires `ij:ignition` / `ij:liftoff`; after liftoff the tile spins.
  - Flip timing runs on its own clock (not on animationend), so the board keeps speed on busy pages, e.g. inside the blurred top bar.
  - Home top bar: 22 px tile, spins briefly every ~7 s. Menu "contact": spinning tile.
- Astronaut: `data-mode="static"`, drawn as a lit figure with no tile, in the final section (standing).
- Menu crews: `<div class="ij-crew" data-crew="who|what|contact">`, three LED figures per panel (flap.js `CREW`), same 24-dot grid and glow. Who we are: the tall engineer (square helmet, wrench, blinking antenna), the waver (tool belt), the small one on a jetpack. What we do: the telescope scout (star twinkles), the robot with a mission card, the flag planter. Contact: the radio operator (signal waves), the mail rocket ("deliveries by rocket only"), the dish. Each bobs at its own pace and swaps between two frames; asleep while the menu is closed; still under reduced motion.
- The top-left logo stays above the open menu (both pages) and closes the menu when clicked.
- Reduced motion: tiles rest on ij and never spin.
- Still showing the old rocket: carousel footers 001–009 (kept as the "early" look).

## Sources and modules (holo.css + holo.js, home page only)
- **Sources:** every statistic carries a glowing star (`<button class="ref-star" data-ref="N">`). One click opens a holographic source card with the job board's materialise animation, launched from the star: publisher, title, year, coverage, how often it's cited, the exact claim it backs (rebuilt from the page), a "read the source" button and ← → through all 7 sources. The source data lives in `REFS` in holo.js; the footer list is gone.
- **Modules:** the bottom dock is replaced by a left-edge rail (`.mrail` in index.html). Folded, it is a **boarding-pass stub** (chosen 15 Oct from four options): pale ticket, perforated edge, two notches cut through it, IJ/OS, LED status lights, "now boarding", "modules 01–03", barcode, arrow. It peeks out every 7 s (faster further down). Under 1280 px wide it rests tucked in (`--tuck`), a sliver showing, and slides fully out when it peeks. Open, the stub stays in place as the left end of one boarding pass: the panel (same top and bottom, same pale ticket) unrolls from its perforated edge, the notches line up as two punched holes on the tear line, the dark module cards sit on the ticket, and a footer carries the fine print and a barcode. Clicking the stub again closes it. It stays available over the open menu, visible 1.6 s after load, with a one-time "psst. module 01 just switched on." nudge per visit. Hover, focus or tap slides out a tall panel (up to 700 px wide) holding the **original module cards**: module 01 full width, 02 and 03 side by side. The cards keep their pointer-following 3D tilt and light, and replay the original boot sequence (`window.IJBootModule`, site.js) every time the panel opens. "see the modules" links and `index.html#modules` open it.
- Class names are prefixed (`ix-`, `mrail`) because `.rail` and `.bar` already exist in site.css.

## Privacy
privacy.html describes what the site actually does today: emails to hello@ (incl. apply now, which only opens the visitor's email app), sound/session settings in browser storage, GitHub Pages logs, Google Fonts. No list, analytics or cookies. Linked from both footers and from every mission file next to "apply now". **Before adding a newsletter or GA4/Clarity, update privacy.html first** (the 12 Oct audit draft has wording for both). Placeholder to fill: data controller legal name + country.

## Sound (all synthesized live in the browser, no audio files)
- On by default (stored per visitor; browsers still need one click/tap). Switch on both pages.
- Home: upbeat space synth track, 118 BPM, A minor (Am9 · Fmaj7 · Cadd9 · G6/9), kick/clap/hats, pumping pads, bass, arps, risers, zaps.
- Board: same track continues (position carried over) muffled through a low-pass, + control-room drone + busy airport (crowd of 9 invented-language voices, footsteps, suitcases, PA announcements with chime in two invented languages, hall reverb). Airport ducks while a mission file is open. Digital flap blips, row-settle chirp, mission-file sweeps.
- Page-to-page "warp" transition (whoosh + filter sweep + visual fade/zoom).

## Site-wide decisions
- Functionality kept vague; home shows the job board only as its module card.
- Modules dock: minimised glowing bar by default; opens full screen.
- Custom reticle cursor (mouse/trackpad only).
- Rocket (home): countdown → liftoff → automatic passes, arc ≤ 25°, enter/exit different edges.

## Statistics — global only
Gallup SOGW 2026; McKinsey Health Institute 2023; Microsoft Work Trend Index 2023; Deloitte Gen Z & Millennial 2025; Randstad Workmonitor 2025; WEF Future of Jobs 2025; WHO/ILO 2022.

## Domain (GoDaddy → GitHub)
GitHub Settings → Pages → Custom domain: impossiblejobs.org. GoDaddy DNS: delete parked A @ / AAAA @ / CNAME www (and any forwarding); add A @ → 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153; CNAME www → rikofromtheblock.github.io. Then Enforce HTTPS. Email forwarding for hello@impossiblejobs.org.

## Open items
Fill in the data controller on privacy.html; Finish DNS + HTTPS; email forwarding; Instagram handle; mobile glitches list from user.
