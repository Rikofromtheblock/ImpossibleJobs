#!/usr/bin/env node
/* impossible jobs · build the board data and the feeds from data/missions.json
   usage: node tools/build-missions.js   (from the website folder)
   writes: missions.js (what the job board loads), feed.xml (RSS, for Instagram / LinkedIn automation), feed.json */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const db = JSON.parse(fs.readFileSync(path.join(root, 'data', 'missions.json'), 'utf8'));
const missions = db.missions;
// 1. the board
const header = '/* impossible jobs · mission data — GENERATED from data/missions.json by tools/build-missions.js. edit the json, not this file. */\n';
fs.writeFileSync(path.join(root, 'missions.js'), header + 'window.MISSIONS = ' + JSON.stringify(missions, null, 1) + ';\n');
// 2. the feeds: newest first, one item per mission, with the text a post needs
const esc = s => String(s || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
const site = 'https://impossiblejobs.org';
const items = missions.slice().reverse().map(m => ({
  id: m.num, title: `${m.title} · ${m.company}`, url: `${site}/jobs.html#mission-${m.num}`, image: m.image,
  status: m.status, year: m.year, published: m.published, sponsored: !!m.sponsored,
  caption: `now boarding: ${m.title.toLowerCase()}. ${m.company}, launch window ${m.year}.\n\n${m.slide5_future_line || ''}\n\nfull brief on the board. think you could do this? you might be early.\n\n${m.sponsored ? 'sponsored mission' : 'fictional mission'} · launch window ${m.year} · impossiblejobs.org`,
  summary: m.company_description, tags: m.tags || []
}));
fs.writeFileSync(path.join(root, 'feed.json'), JSON.stringify({ version: 'https://jsonfeed.org/version/1.1', title: 'impossible jobs · now boarding', home_page_url: site, feed_url: `${site}/feed.json`,
  items: items.map(i => ({ id: i.id, url: i.url, title: i.title, content_text: i.caption, summary: i.summary, image: i.image, date_published: i.published, tags: i.tags })) }, null, 1));
const rss = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel><title>impossible jobs · now boarding</title><link>${site}</link><description>job postings from the future. fictional, until they won't be.</description>\n` +
  items.map(i => `<item><title>${esc(i.title)}</title><link>${i.url}</link><guid>${i.url}</guid><description>${esc(i.caption)}</description><media:content url="${i.image}" medium="image"/><pubDate>${i.published}</pubDate></item>`).join('\n') + '\n</channel></rss>\n';
fs.writeFileSync(path.join(root, 'feed.xml'), rss);
console.log(`built: ${missions.length} missions → missions.js, feed.json, feed.xml`);
