# missions database

`data/missions.json` is the single source of truth for every mission. Nothing else is edited by hand.

## add or change a mission
1. Copy an existing mission object in `data/missions.json` and edit it (num, title, company, status, year, the texts, logo_svg, portrait_svg…).
   - `status`: `boarding` | `delayed` | `boarded` (as the board understands it) · `sponsored`: true for a real company's mission · `image`: the 1080×1350 card for social, uploaded to `/missions/NNN.png`.
2. Run `node tools/build-missions.js` from the website folder. It rewrites `missions.js` (the board), `feed.json` and `feed.xml`.
3. Commit all four files. The job board updates on the next page load.

## automatic posting (Instagram / LinkedIn)
The site publishes `feed.xml` and `feed.json`. A no-code automation (Make.com or Zapier) watches the feed and posts each new item:
- trigger: "new item in RSS feed" → `https://impossiblejobs.org/feed.xml`
- action: Instagram for Business "create a photo post" with `media:content` (the mission card) and the item description as the caption; LinkedIn page "create post" with the same text and the link.
- Instagram requires a Business/Creator account linked to a Facebook page; the image must be reachable at a public URL (the `image` field).
Nothing posts until the automation is set up; until then the feed simply lists the missions.

## later
The same JSON can feed a real backend (a form that writes to it) without changing the board or the feeds.
