// Love Thy Nerd channels, added to the lineup on this PC only:
//   LTN NEWS        rotating pages: who is live, Twitch, the website's newest posts, new YouTube videos, every show's latest
//   LTN PLAYS GAMES the Twitch stream when live, otherwise the LTN Plays Games YouTube channel on shuffle, with a note about the next stream
//   LTN DAILY BIBLE the LTN Daily Audio Bible playlist, played through in order
//   one channel per YouTube show: always on, joined mid-programme like a TV channel, and the live stream whenever the show is live
// Loaded before player.js; everything here is used at run time, after player.js has defined the helpers ($, channels, flash, clock, ...).
const LTN = {
  ltnOnly: true, // LTN TV: only the Love Thy Nerd channels are in the lineup (false brings back the BackWhenTV channels)
  numLatest: 1, numBible: 2, numTwitch: 3, // channel numbers: LTN News, LTN Daily Audio Bible, LTN Plays Games; the shows follow from 4
  site: "https://lovethynerd.com/feed",
  outreach: "https://lovethynerd.com/outreach/", // fallback only: the trips come from missions.lovethynerd.com (src/missions.js)
  remote: "https://ltn-tv-admin.ltn-tv-admin.workers.dev/config.json", // the admin backend's public /config.json (see ltn-tv-admin); empty = built-in lineup only
  twitch: "lovethynerd",
  // Spotify playlists listed on LTN NEWS: [id, title], in the order the profile page shows them (open.spotify.com/user/${user}/playlists). Spotify has no
  // keyless way for an app to ask a profile for its list, so this was read from the page; new playlists can be added by pasting links in Settings
  // ("Spotify playlist links"), or ask for the list to be refreshed. Covers are fetched through Spotify's own oEmbed.
  spotify: { user: "31ejau6exrk7de732manwvlcxx3u", playlists: [
    ["4eTWcSsMDgVQl4mqzeErZP","LTN Daily Audio Bible Playlist"],
    ["7GxDRQVRyKtwChRdqaNCVc","Christian Littles Mix"],
    ["4681y06CThMEsdylcYy5rZ","Christian Youth Group Mix"],
    ["3uvGDIJ2V0IZKn1WiylEUQ","Christian Children's Mix"],
    ["2M2kdd47E7AssVIiMYk6nP","Best Christian Music of 2025"],
    ["6Y473qvgavjPDgDaFP3ylG","Every Christian #1"],
    ["5J54Jjoazcf5iCGbXon7ED","Christian Rock Top 25"],
    ["1PZnJOZJTWSRzIiFF6v3Sd","Christian Top 25"],
    ["4UyWQsuupY9jUgw2yHBVvI","Christian Christmas Party Mega Mix"],
    ["1bIXKXEskh5mKFTbaFgFd5","Christmas Hymn Mega Mix"],
    ["7zitN22Ve4MZP4vTrJACrj","Ultimate Christian Christmas Mega Mix"],
    ["60jGz5k5gjtvsY7r3oZDdG","Lo-fi Christmas Mega Mix"],
    ["7cc9cT436d0SkIIaMtp46F","New Christian Christmas 2026"],
    ["5nOLFvOATnpe3vU1SmPvTL","Christian Christmas Pop / Contemporary Mega Mix"],
    ["3NIn6G0sUQO7pCSTZkxJIT","Christian Oldies Mega Mix"],
    ["2sZ8gjAihkyX4A2XRiS2xV","Millennial Worship Mega Mix"],
    ["1KidjJ0uybdlrsXzhLOLv8","2010s Christian Mega Mix"],
    ["3rFKoSdz0aQLDYfc2eH0Ce","90s Christian Mega Mix"],
    ["2WwgjizFeHnT0Krdz8UZG3","2000s Christian Mega Mix"],
    ["7Ke8u3efYFBV5g3LtlwnUg","Christian Millennial Mega Mix"],
    ["3GtZJCikF4dQqUThCPMuPb","New Christian Music This Week"],
    ["6Mv7yWfmX5XVVvhg3kSVS2","New Christian R&B / Soul"],
    ["43RQUl9NlSDHLuhSsChLzU","New Gospel"],
    ["75LjwYz9jLi8VY2iPe15Kq","New Christian Hard Rock / Heavy Metal"],
    ["4efUxEjoKmkXUnpUFRZLPt","New Christian EDM / Dance"],
    ["37JzxMwHa8dwtyaTZREz68","New Christian Alternative"],
    ["17JNBB2BjlkpDILzmsLE3E","New Christian Rap / Hip-Hop"],
    ["0SY02ncpqXSOliyYRM8kGG","New Christian Rock"],
    ["7df4GRDXQV0Q09Q8UkzkAF","New Christian Worship"],
    ["1qt3qHe7vHzwWfzDUx4Ic6","New Christian Country / Southern Gospel"],
    ["18xDjF7jbnh3AD5I8tfk7Z","New Christian Pop / Contemporary"],
    ["6P4BYK3xPmUjIpAsm0XK1e","New Christian Indie / Folk"],
    ["7bE1tUJ2V7ZupxR4xbs8ja","Joe's Favorites"],
    ["1BtrR7u4qPnLBFDZKDvsyI","Kyle's Favorites"],
    ["4etgWzS7OFz3tjMysdmmDG","Bubba's Favorites"],
    ["5wJrgpWmHpjuTNsUQ6kf25","Radio Matt's Favorites"],
    ["7l6HK30mkjESSccHB40F5I","Christian R&B / Soul Mega Mix"],
    ["64xJVavYI4wadHMSDEDQIk","Ultimate Christian Pop / Rock / Rap Mega Mix"],
    ["58MRYiwUUf9IgXRT3OmktO","Nerdy Lo-fi Mega Mix"],
    ["3JEAHIozb7NQJZv4MLc0kM","Church Hymn Mega Mix"],
    ["7l3w5MK5yapNPM3ZzsoY3F","Christian Reggae Mega Mix"],
    ["28wrKAuxF5DL9MnmxLu6Nf","Christian Hard Rock / Heavy Metal Mega Mix"],
    ["2b4aT24wvi40LvTfhPCH3Q","Christian Country / Southern Gospel Mega Mix"],
    ["0lBMf9SH56RSCi56omC6IG","Gospel Mega Mix"],
    ["23dzhfkMJ8uij48tg3cK1g","Christian Pop / Contemporary Mega Mix"],
    ["0v3uuJcnrygLEuOsTgxANw","Christian Lo-fi Mega Mix"],
    ["5OHbTHIoLXrrL2ud1jr6oE","Christian Worship Mega Mix"],
    ["1lzexReFUL9YA00v64T8q0","Christian Alternative Mega Mix"],
    ["4sOSspmyFWRsyZ8ffLKr73","Christian Rock Mega Mix"],
    ["1xYrwRe9EvJQmE33G2KEkj","Christian Indie / Folk Mega Mix"],
    ["0Dcf3faMuzUq3CYtzjl4Pq","Christian Rap / Hip-Hop Mega Mix"],
    ["0i2YKE2RGDgQlNmfxGqHOJ","Christian EDM / Dance Mega Mix"],
    ["0vDEOf72OSv0niwr5hznqY","Christian Recovery Mix"],
    ["7wFur9Xiq0OZ8CfEQaTGHs","Upbeat Praise & Worship Mix"],
    ["6mr4PyH6FKzhWtWUsksyCb","Christian Happy Rap Mix"],
    ["2yc3B8vYMV1kDIs9VKHV6h","Christian Funny Mix"],
    ["406ruCINHLqU7fsgixJhR2","Christian Calm Mix"],
    ["5v5KlqGvqJ3H5ryl8SANbQ","Christian Coffee House Mix"],
    ["1kP2yCnoXYshPFiUifzfsl","Christian Sleep Mix"],
    ["7CAsKi9FJ4LoYswnvxP3Ku","Christian Workout Mix"],
    ["2Cc24kFeKuXCjqIkhpT8P8","Christian Upbeat Mix"],
    ["1gae1hPJMB5JrOyRKHXPf2","Christian Chill Mix"],
    ["3V9EZa4920yOQw0zMvv3qw","Christian Love Mix"],
    ["5WGKrW7Htpd8b6CDzkVcQM","Christian Sorrow Mix"],
  ] },
  playsId: "UC8eB_7RaI0sKhVbo8abjhEw", // the LTN Plays channel (@LTNPlaysGames / @LoveThyNerd): LTN TWITCH shows what it is playing while we are not live
  // The stream schedule, weekly, in this time zone. day: 0 = Sunday ... 6 = Saturday. Twitch only gives its schedule to apps with a key, so it is kept here.
  schedule: { tz: "America/Chicago", slots: [
    // from twitch.tv/lovethynerd/schedule (weekly, Central time)
    { day: 2, at: "11:00", mins: 240, title: "Lunch Time Stream + Bubba Plays Games Casually" },
    { day: 3, at: "11:00", mins: 60, title: "Lunch Time Stream + Radio Matt Plays Games Badly" },
    { day: 4, at: "11:00", mins: 240, title: "Lunch Time Stream + Bubba Plays Games Casually" },
  ] },
  music: "IBC3x9Zyo-Q", // background music on LTN NEWS: audio only, from a 24/7 YouTube stream (NESTALGIA: Nintendo music for coding)
  bible: { playlist: "PLibAByUqZ70-6rRTHbRimCrxG7F-PCdSN", first: "QbDIEoXcMw8" },
  pageMs: 12000, refreshMs: 10 * 60000, livePollMs: 4 * 60000, remoteMs: 60000,
  // one channel each, in channel-number order (IDs from each channel page's canonical link)
  shows: [
    { id: "UC8eB_7RaI0sKhVbo8abjhEw", name: "LTN PLAYS GAMES", info: "LTN Plays Games, @LTNPlaysGames", hidden: true }, // not a channel of its own: LTN PLAYS GAMES (159) plays it while Twitch is offline
    { id: "UCybQk4iV2Ax6cMLWsIO-sUw", num: 4, name: "LOVE THY NERD", info: "@LoveThyNerd" },
    { id: "UCIdJqzOfkA4IUHC8RMM7SnA", num: 5, name: "NCMU PODCAST", info: "Nerd Culture Ministry Underground, @NCMUpodcastLTN" },
    { id: "UC5FybvYjKGsMN_7f8M0YUMQ", num: 6, name: "NERD HISTORY", info: "@NerdHistoryLTN" },
    { id: "UCXX-ABXIGaUW3_NmY7LOQGg", num: 7, name: "RPG RUNDOWN", info: "The RPG Rundown, @TheRPGRundownLTN" },
    { id: "UC6yLOcIFpviSxE9c6d2Xpqg", num: 8, name: "THE PULL LIST", info: "@ThePullListLTN" },
    { id: "UCiGN0i7cRwTLLv51DDMaM2w", num: 9, name: "SAVE & CONTINUE", info: "Save & Continue Podcast, @SaveAndContinueLTN" },
    { id: "UCJ17-LAbqJhlWKr0yw2Jbzg", num: 10, name: "CHRISTIAN BOARD GAMERS", info: "The Christian Board Gamers Podcast, @ChristianBoardGamersLTN" },
    { id: "UCjJEmqOToVh-jYDJePEBcvQ", num: 11, name: "FAITH & FANDOM", info: "Faith & Fandom Podcast, @FaithAndFandomLTN" },
    { id: "UCda5tLEdzlfm3FtLi4rLQyA", num: 12, name: "SATELLITE STORIES", info: "@SatelliteStoriesLTN" },
    { id: "UCTDE0NRt9QqeUByTE6WM0kQ", num: 13, name: "TWO WORDS", info: "Two Words Podcast, @TwoWordsLTN" },
    { id: "UCT67V7nvgWuygXAORpiU7iA", num: 14, name: "CHURCH NERDS", info: "@ChurchNerdsLTN" },
    { id: "UCXhCjTVjYof3F1tUfmem5hw", num: 15, name: "BIBLE THUMP", info: "@BibleThumpLTN" },
  ],
};

const ltnFree = (n) => { while (channels.some((c) => c.num === n)) n++; return n; };
const ltnAdd = (c) => { if (!channels.some((x) => x.id === c.id)) { c.cat = c.cat || "Love Thy Nerd"; channels.push(c); } };
function ltnInjectShows() { // one channel per YouTube show in LTN.shows
  const mk = (s, num) => ({ id: "ltn-yt-" + s.id, num, name: s.name, kind: "yt", ytid: s.id, yt: { list: "UULF" + s.id.slice(2), sched: true, wall: true, random: s.id === LTN.playsId }, blurb: s.info + ": full videos only, no Shorts. Always on and shuffled, the same for everyone, and the live stream whenever the show is live." });
  for (const s of LTN.shows) {
    if (s.hidden) { ltnPlaysCh = mk(s, 0); ltnPlaysCh.cat = "Love Thy Nerd"; continue; } // a source only, not in the lineup
    ltnAdd(mk(s, ltnFree(s.num)));
  }
}
function injectLtnChannels() {
  ltnAdd({ id: "ltn-latest", num: ltnFree(LTN.numLatest), name: "LTN NEWS", kind: "ltn", blurb: "LTN News: who is live, plus the newest from Twitch, the website and every YouTube show. Background music: 24/7 Nintendo music." });
  ltnAdd({ id: "ltn-twitch", num: ltnFree(LTN.numTwitch), name: "LTN PLAYS GAMES", kind: "twitch", blurb: "twitch.tv/" + LTN.twitch + ": the live stream when we are on, and the LTN Plays Games channel on shuffle when we are not." });
  ltnAdd({ id: "ltn-bible", num: ltnFree(LTN.numBible), name: "LTN DAILY BIBLE", kind: "yt", yt: { list: LTN.bible.playlist, first: LTN.bible.first, wall: false }, blurb: "The LTN Daily Audio Bible playlist, played through in order." });
  ltnInjectShows();
  channels.sort((a, b) => a.num - b.num);
}

/* ---------- shared state ---------- */
let ltnData = null, ltnAt = 0, ltnPage = 0, ltnPageTimer = null, ltnRefreshTimer = null;
let ltnLiveMap = {}, ltnTw = null, ltnTunedLive = false, ltnTunedSig = "", ltnPollTimers = [], ltnNextTimer = null;
let ltnPlaysCh = null; // the LTN Plays Games YouTube channel: a hidden source, not in the lineup
const ltnMirror = () => ltnPlaysCh;
// what is really playing: for LTN TWITCH while offline, that is the LTN Plays channel
const ltnPlayCh = () => { const ch = channels[tuned]; return ch && ch.kind === "twitch" && !isLive(ch) ? ltnMirror() || ch : ch; };
// everything that decides WHAT plays on a channel; when it changes the channel is re-tuned
function ltnSig(ch) {
  if (ch.kind === "twitch") { if (isLive(ch)) return "tw"; const m = ltnMirror(); return "off" + (m && isLive(m) ? "+yt" : ""); }
  return isLive(ch) ? "live" : "off";
}
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ltnTag = (el, tag) => { const n = el.getElementsByTagName(tag)[0]; return n ? n.textContent.trim() : ""; };
const ltnIsOwn = (ch) => ch && (ch.kind === "ltn" || ch.kind === "yt" || ch.kind === "twitch");
function isLive(ch) {
  if (!ch) return false;
  if (ch.kind === "twitch") return !!(ltnTw && ltnTw.live);
  if (ch.kind === "yt" && ch.ytid) return !!(ltnLiveMap[ch.ytid] && ltnLiveMap[ch.ytid].live);
  return false;
}

/* ---------- Shorts are ignored everywhere ---------- */
const ytShortCache = new Map();
async function ytIsShort(id) {
  if (!id) return false;
  if (ytShortCache.has(id)) return ytShortCache.get(id);
  let short = false;
  try { const r = await fetch("https://www.youtube.com/shorts/" + id, { method: "HEAD", redirect: "follow", cache: "no-store" }); short = /\/shorts\//.test(r.url); } catch { short = false; } // cannot tell: treat as a normal video
  ytShortCache.set(id, short);
  return short;
}

/* ---------- data pulls ---------- */
async function ltnXml(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(url + " " + r.status);
  return new DOMParser().parseFromString(await r.text(), "text/xml");
}
async function ltnYoutube() {
  const out = [], shows = [];
  await Promise.allSettled(LTN.shows.map(async (s) => {
    let vids;
    try { // the channel's RSS feed: exact dates
      const doc = await ltnXml("https://www.youtube.com/feeds/videos.xml?playlist_id=UULF" + s.id.slice(2));
      const show = ltnTag(doc.getElementsByTagName("author")[0] || doc.documentElement, "name") || s.name;
      vids = [...doc.getElementsByTagName("entry")].slice(0, 5).map((e) => ({ id: ltnTag(e, "yt:videoId"), t: ltnTag(e, "title"), at: Date.parse(ltnTag(e, "published")) || 0, show, cid: s.id }));
    } catch { vids = []; }
    if (!vids.length) { // the feed is down (YouTube has switched it off at times): read the same uploads list from its page instead
      const now = Date.now();
      vids = (await ltnFetchList("UULF" + s.id.slice(2))).slice(0, 5).map((v) => ({ id: v.id, t: v.title, at: v.age ? now - v.age : 0, show: s.name, cid: s.id }));
    }
    out.push(...vids);
    if (vids[0]) shows.push(vids[0]);
  }));
  if (!out.length) throw new Error("no youtube data");
  out.sort((a, b) => b.at - a.at); shows.sort((a, b) => b.at - a.at);
  return { videos: out, shows };
}
async function ltnSite() {
  const doc = await ltnXml(LTN.site);
  return [...doc.getElementsByTagName("item")].slice(0, 9).map((it) => {
    const body = ltnTag(it, "content:encoded") || ltnTag(it, "description");
    const img = (body.match(/src="(https:[^"]+?\.(?:jpe?g|png|webp)[^"]*)"/i) || [])[1] || "";
    const text = ltnTag(it, "description").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").replace(/The post .* appeared first on .*$/i, "").trim();
    return { t: ltnTag(it, "title"), at: Date.parse(ltnTag(it, "pubDate")) || 0, by: ltnTag(it, "dc:creator"), cat: ltnTag(it, "category"), img, text: text.slice(0, 220) };
  });
}
const LTN_MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
function ltnTripStart(text) { // "Dec 3–7, 2026", "Jun 30 – Jul 2, 2027", "Dec 30, 2026 – Jan 2, 2027" -> start date, or 0
  const t = String(text || "");
  const a = /([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2})/.exec(t);
  const years = t.match(/\b(20\d{2})\b/g) || [];
  if (!a || !years.length || !(a[1].toLowerCase() in LTN_MONTHS)) return 0;
  let year = +years[0];
  const b = /[–—-]\s*([A-Za-z]{3})[a-z]*\.?\s+\d{1,2}/.exec(t); // a range that runs into another month
  if (years.length === 1 && b && b[1].toLowerCase() in LTN_MONTHS && LTN_MONTHS[b[1].toLowerCase()] < LTN_MONTHS[a[1].toLowerCase()]) year -= 1; // Dec 30 - Jan 2, 2027
  return new Date(year, LTN_MONTHS[a[1].toLowerCase()], +a[2]).getTime();
}
async function ltnTripsMissions() { // from missions.lovethynerd.com, read by the app itself (a hidden page, in main.js)
  if (!window.bw || !window.bw.missionTrips) throw new Error("not in the app");
  const list = await window.bw.missionTrips();
  if (!Array.isArray(list) || !list.length) throw new Error("no trips");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const out = [];
  for (const t of list) {
    const at = ltnTripStart(t.when);
    if (!at || at < today.getTime()) continue; // only trips that have not started
    out.push({ t: ltnStr(t.title, 60).toUpperCase(), at, where: ltnStr(t.where, 60), when: ltnStr(t.when, 40), cost: ltnStr(t.cost, 12).replace(/\.00$/, ""), leader: ltnStr(t.leader, 40), days: Math.round((at - today.getTime()) / 86400000), open: undefined, img: /placeholder/i.test(t.img || "") ? "" : ltnHttps(t.img) });
  }
  out.sort((a, b) => a.at - b.at);
  if (!out.length) throw new Error("no upcoming trips");
  return out.slice(0, 9);
}
async function ltnTrips() { // missions site first; the old outreach page only if that cannot be read
  try { return await ltnTripsMissions(); } catch { return ltnTripsOutreach(); }
}
async function ltnTripsOutreach() { // the old source: the outreach page's cards
  const html = await fetch(LTN.outreach, { cache: "no-store" }).then((r) => r.text());
  const doc = new DOMParser().parseFromString(html, "text/html");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const out = [];
  for (const c of doc.querySelectorAll(".trip-card")) {
    const start = c.getAttribute("data-start-date") || "";
    const [y, m, d] = start.split("-").map(Number);
    if (!y) continue;
    const at = new Date(y, m - 1, d).getTime();
    if (at < today.getTime()) continue;
    const im = c.querySelector("img");
    const img = (im && (im.getAttribute("data-src") || im.getAttribute("src")) || "").replace(/\?.*$/, "");
    const btn = c.querySelector("button"), ev = c.querySelector("h1,h2");
    out.push({
      t: (ev ? ev.textContent : "").trim().toUpperCase(), at,
      where: (c.querySelector(".trip-location") || {}).textContent || "",
      when: ((c.querySelector(".trip-date") || {}).textContent || "").trim(),
      days: Math.round((at - today.getTime()) / 86400000),
      open: !!btn && !/closed/i.test(btn.textContent), img: /^https?:/.test(img) ? img : "",
    });
  }
  out.sort((a, b) => a.at - b.at);
  if (!out.length) throw new Error("no trips");
  return out;
}
async function ltnTwitch() {
  const g = (p) => fetch("https://decapi.me/twitch/" + p + "/" + LTN.twitch, { cache: "no-store" }).then((r) => r.text()).then((t) => t.trim());
  const [uptime, title, game] = await Promise.all([g("uptime"), g("title").catch(() => ""), g("game").catch(() => "")]);
  return { live: !!uptime && !/offline|not found|error|unavailable/i.test(uptime), uptime, title, game };
}
// Is this YouTube channel live? Its /live page names a watch link only while a stream is on. The page is huge, so stop reading once we know.
async function ytLive(id) {
  const ctl = new AbortController();
  const r = await fetch("https://www.youtube.com/channel/" + id + "/live", { signal: ctl.signal, cache: "no-store", headers: { "Accept-Language": "en-US" } });
  const rd = r.body.getReader(), dec = new TextDecoder();
  let buf = "";
  try {
    for (;;) {
      const { done, value } = await rd.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const m = /rel="canonical" href="([^"]*)"/.exec(buf);
      if (m) {
        const w = /watch\?v=([\w-]{11})/.exec(m[1]);
        if (!w) return { live: false }; // canonical is the channel page: nothing live
        if (/"isLive":true/.test(buf)) { const t = /<title>([^<]*)<\/title>/.exec(buf); return { live: true, vid: w[1], title: t ? t[1].replace(/ - YouTube$/, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'") : "" }; }
        if (buf.length > m.index + 150000) return { live: false }; // a watch page that is not live: an old stream
      }
      if (buf.length > 1500000) break;
    }
  } finally { ctl.abort(); }
  return { live: false };
}
function ltnSpotifyList() { // [{id, t}]: the built-in list, or the playlists pasted in Settings
  const base = LTN.spotify.playlists.map((p) => ({ id: p[0], t: p[1] }));
  const text = (S.spotifyLinks || "").trim();
  if (!text) return base;
  const out = [];
  for (const x of text.split(/[\s,]+/)) {
    const m = /^(?:https?:\/\/open\.spotify\.com\/(?:embed\/)?playlist\/|spotify:playlist:)?([A-Za-z0-9]{22})(?:[?#\/].*)?$/.exec((x || "").trim());
    if (m && !out.some((o) => o.id === m[1])) { const known = base.find((b) => b.id === m[1]); out.push({ id: m[1], t: known ? known.t : "" }); }
  }
  return out;
}
const ltnSpotifyIds = () => ltnSpotifyList().map((p) => p.id);
async function ltnSpotify() { // the covers (and names we do not know) through Spotify's own oEmbed; covers are remembered between runs
  const list = ltnSpotifyList(), names = {};
  let cache = {};
  try { cache = JSON.parse(localStorage.getItem("ltn-sp-covers") || "{}"); } catch { /* none yet */ }
  const todo = list.filter((p) => !cache[p.id] || !p.t);
  let k = 0;
  const worker = async () => {
    while (k < todo.length) {
      const p = todo[k++];
      try {
        const r = await fetch("https://open.spotify.com/oembed?url=" + encodeURIComponent("https://open.spotify.com/playlist/" + p.id), { cache: "no-store" });
        if (!r.ok) continue;
        const j = await r.json();
        cache[p.id] = j.thumbnail_url || cache[p.id] || ""; names[p.id] = j.title || "";
      } catch { /* try again next refresh */ }
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker)); // a few at a time
  try { localStorage.setItem("ltn-sp-covers", JSON.stringify(cache)); } catch { /* storage blocked */ }
  return list.map((p, i) => ({ id: p.id, t: p.t || names[p.id] || "", img: cache[p.id] || "", i })).filter((p) => p.t || p.img);
}
async function ltnLoad(force) {
  if (!force && ltnData && Date.now() - ltnAt < LTN.refreshMs) return;
  const [yt, site, tw, trips] = await Promise.allSettled([ltnYoutube(), ltnSite(), ltnTwitch(), ltnTrips()]);
  ltnData = { yt: yt.value || (ltnData && ltnData.yt) || null, site: site.value || (ltnData && ltnData.site) || null, trips: trips.value || (ltnData && ltnData.trips) || null, spotify: (ltnData && ltnData.spotify) || [] };
  ltnSpotify().then((sp) => { if (ltnData && sp.length) ltnData.spotify = sp; }).catch(() => {}); // in the background: many small requests
  if (tw.value) ltnTw = tw.value;
  ltnAt = Date.now();
}
const ltnLiveSnap = () => ({ yt: ltnLiveMap, tw: ltnTw ? { live: !!ltnTw.live, title: ltnTw.title, game: ltnTw.game, uptime: ltnTw.uptime } : null });
function ltnLiveChanged() {
  if (mode === "guide") renderGuide();
  const ch = channels[tuned];
  if (started && ltnIsOwn(ch) && ch.kind !== "ltn" && ltnSig(ch) !== ltnTunedSig) tune(tuned, false); // went live or ended: switch what is playing
}
async function ltnLivePoll() {
  const before = JSON.stringify(ltnLiveSnap());
  try { ltnTw = await ltnTwitch(); } catch { /* keep the last answer */ }
  await Promise.allSettled(LTN.shows.map(async (s) => { try { ltnLiveMap[s.id] = await ytLive(s.id); } catch { /* keep the last answer */ } }));
  if (JSON.stringify(ltnLiveSnap()) !== before) ltnLiveChanged();
}
// the channel being watched is checked more often, so going live or ending is noticed within a minute or two
async function ltnPollTuned() {
  const ch = channels[tuned];
  if (!started || !ltnIsOwn(ch)) return;
  const before = JSON.stringify(ltnLiveSnap());
  try {
    if (ch.kind === "twitch") { ltnTw = await ltnTwitch(); if (!ltnTw.live && ltnMirror()) ltnLiveMap[LTN.playsId] = await ytLive(LTN.playsId); }
    else if (ch.kind === "yt" && ch.ytid) ltnLiveMap[ch.ytid] = await ytLive(ch.ytid);
  } catch { return; }
  if (JSON.stringify(ltnLiveSnap()) !== before) ltnLiveChanged();
}
/* ---------- remote config: channels, extra news pages, the banner and the stream schedule come from the admin backend ---------- */
// LTN.remote is the address of the backend's public /config.json. It is polled once a minute, whichever channel is on, so a change published there
// shows up here by itself. If it cannot be reached the last good copy (kept on this PC) or the built-in lineup is used, so nothing breaks.
const LTN_SHOWS0 = LTN.shows.slice(), LTN_SCHEDULE0 = LTN.schedule;
const ltnShowSig = (list) => list.map((s) => s.id + "|" + s.name + "|" + s.num).join(";");
let ltnCfgVer = 0, ltnCfgSig = ltnShowSig(LTN_SHOWS0.filter((s) => !s.hidden)), ltnRemoteBusy = false;
const ltnStr = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);
const ltnHttps = (v) => { try { const u = new URL(String(v)); return u.protocol === "https:" ? u.href : ""; } catch { return ""; } };
const ltnDay = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v || "") ? v : "");
function ltnCleanCfg(c) { // never trust what came over the wire: keep only well-formed pieces
  if (!c || typeof c !== "object") return null;
  const out = { version: Number(c.version) || 0, shows: null, pages: [], notice: { enabled: false, text: "", push: false }, schedule: null, hide: [] };
  if (Array.isArray(c.shows)) {
    const seen = new Set(), list = [];
    for (const s of c.shows.slice(0, 40)) {
      if (!s || !/^UC[\w-]{22}$/.test(String(s.id)) || seen.has(s.id)) continue;
      seen.add(s.id);
      list.push({ id: s.id, name: ltnStr(s.name, 40).toUpperCase() || "CHANNEL", info: ltnStr(s.info, 120), num: 4 + list.length });
    }
    if (list.length) out.shows = list;
  }
  if (Array.isArray(c.pages)) for (const p of c.pages.slice(0, 30)) {
    if (!p || p.enabled === false || !ltnStr(p.title, 60)) continue;
    out.pages.push({ id: ltnStr(p.id, 40), title: ltnStr(p.title, 60).toUpperCase(), body: ltnStr(p.body, 600), image: ltnHttps(p.image), link: ltnStr(p.link, 60), from: ltnDay(p.from), to: ltnDay(p.to) });
  }
  if (c.notice && typeof c.notice === "object") out.notice = { enabled: !!c.notice.enabled, text: ltnStr(c.notice.text, 200), push: !!c.notice.push };
  if (c.schedule && typeof c.schedule === "object") {
    let ok = true;
    try { new Intl.DateTimeFormat("en-US", { timeZone: String(c.schedule.tz) }); } catch { ok = false; }
    if (ok && Array.isArray(c.schedule.slots)) {
      out.schedule = { tz: String(c.schedule.tz), slots: c.schedule.slots.slice(0, 30).filter((s) => s && Number.isInteger(+s.day) && +s.day >= 0 && +s.day <= 6 && /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s.at)) && +s.mins >= 1 && +s.mins <= 1440).map((s) => ({ day: +s.day, at: String(s.at), mins: +s.mins, title: ltnStr(s.title, 80) })) };
    }
  }
  if (Array.isArray(c.hide)) out.hide = c.hide.map(String).slice(0, 20);
  return out;
}
function ltnRebuildShows() { // the channel list changed: swap the show channels without restarting
  const curId = channels[tuned] && channels[tuned].id;
  for (let i = channels.length - 1; i >= 0; i--) if (/^ltn-yt-/.test(channels[i].id)) channels.splice(i, 1);
  ltnPlaysCh = null;
  ltnInjectShows();
  channels.sort((a, b) => a.num - b.num);
  const ni = channels.findIndex((c) => c.id === curId);
  if (ni >= 0) tuned = ni;
  else { tuned = 0; if (started) tune(0); } // the channel being watched was removed
  ltnLivePoll(); // find out which of the new channels are live
  if (mode === "guide") renderGuide();
}
function ltnRemoteApply(raw, cached) {
  const c = ltnCleanCfg(raw);
  if (!c) return;
  if (!cached && c.version && c.version < ltnCfgVer) return; // an older copy from a slow edge: ignore
  ltnCfgVer = Math.max(ltnCfgVer, c.version);
  const list = c.shows || LTN_SHOWS0.filter((s) => !s.hidden);
  LTN.shows = [...LTN_SHOWS0.filter((s) => s.hidden), ...list];
  LTN.schedule = c.schedule || LTN_SCHEDULE0;
  LTN.remotePages = c.pages; LTN.notice = c.notice; LTN.hide = c.hide;
  const sig = ltnShowSig(list), changed = sig !== ltnCfgSig;
  ltnCfgSig = sig;
  if (changed) ltnRebuildShows();
  if (!cached) {
    try { localStorage.setItem("ltn-remote", JSON.stringify(raw)); } catch { /* storage blocked */ }
    const key = c.version + ":" + c.notice.text;
    let seen = ""; try { seen = localStorage.getItem("ltn-push") || ""; } catch { /* none */ }
    if (c.notice.enabled && c.notice.push && c.notice.text && seen !== key) { // a pushed notice: shown once over whatever is playing
      try { localStorage.setItem("ltn-push", key); } catch { /* storage blocked */ }
      const m = $("#msg"); m.style.fontSize = "4.2vh"; showMsg(c.notice.text);
      setTimeout(() => { showMsg(""); m.style.fontSize = ""; }, 9000);
    }
  }
  if (started && channels[tuned] && channels[tuned].kind === "ltn") ltnDraw();
}
async function ltnRemotePoll() {
  if (!LTN.remote || ltnRemoteBusy) return;
  ltnRemoteBusy = true;
  try { const r = await fetch(LTN.remote, { cache: "no-store" }); if (r.ok) ltnRemoteApply(await r.json(), false); } catch { /* offline or down: keep what we have */ }
  ltnRemoteBusy = false;
}
// the news data (website, YouTube, trips) is refreshed in the background too, not only while LTN News is on screen
function ltnBackgroundNews() {
  ltnLoad(true).then(() => { if (started && channels[tuned] && channels[tuned].kind === "ltn") ltnDraw(); }).catch(() => {});
}
const ltnPageActive = (p) => { const t = new Date(), d = t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0"); return (!p.from || d >= p.from) && (!p.to || d <= p.to); };
function ltnNoticeText() { const n = LTN.notice; return n && n.enabled && n.text ? n.text : ""; }

function ltnStart() { // called once the lineup is known
  try { const c = localStorage.getItem("ltn-remote"); if (c) ltnRemoteApply(JSON.parse(c), true); } catch { /* none yet */ }
  ltnRemotePoll();
  ltnLoad(false).catch(() => {});
  ltnLivePoll();
  setTimeout(ltnWarm, 20000);
  ltnPollTimers.push(setInterval(ltnLivePoll, LTN.livePollMs), setInterval(ltnPollTuned, 75000), setInterval(ltnRemotePoll, LTN.remoteMs), setInterval(ltnBackgroundNews, LTN.refreshMs));
}

/* ---------- what the guide, banner and preview say about these channels ---------- */
function ytNowTitle() { return (ytInfo.videoData && ytInfo.videoData.title) || ""; }
function ltnNow(ch) {
  const live = isLive(ch);
  if (ch.kind === "twitch") return live ? { t: "\u25CF LIVE: " + ((ltnTw && ltnTw.title) || "on Twitch"), n: (ltnTw && ltnTw.game) || "" } : { t: (channels[tuned] === ch && ytNowTitle()) || "LTN Plays Games", n: ltnNextText() || "twitch.tv/" + LTN.twitch };
  if (ch.kind === "yt") {
    if (live) return { t: "● LIVE: " + (ltnLiveMap[ch.ytid].title || ch.name), n: "" };
    const lst = ch.ytid && ch.yt.sched && ltnLists[ch.ytid];
    if (lst && lst.sched && lst.sched.order.length) { const a = schedAt(lst.sched, Date.now() / 1000); return { t: a.it.title || ch.name, n: "Up next: " + (a.next.title || "") }; }
    const cur = channels[tuned] === ch ? ytNowTitle() : "";
    return { t: cur || (ch.ytid ? ch.name : "LTN Daily Audio Bible"), n: ch.ytid ? "Always on" : "Played through in order" };
  }
  return { t: "LTN News", n: "" };
}
const ltnAsked = new Set();
function ltnEnsure(c) { // load a channel's schedule for the guide (once; a failed load is retried after a minute)
  if (!c || !c.ytid || ltnAsked.has(c.ytid)) return;
  ltnAsked.add(c.ytid);
  ltnGetSchedule(c).then((sch) => {
    if (!sch) return setTimeout(() => ltnAsked.delete(c.ytid), 60000);
    if (mode !== "guide") return;
    renderGuide();
    const sel = channels[gCh]; // the selected channel may be this one, or the Twitch channel showing it
    if (sel && (sel === c || (sel.kind === "twitch" && ltnMirror() === c))) ltnPreview(sel);
  }).catch(() => setTimeout(() => ltnAsked.delete(c.ytid), 60000));
}
function ltnPrograms(ch, from, to) {
  const l = ltnNow(ch), live = isLive(ch);
  // what is on in the slots: the channel's own schedule, or for LTN PLAYS GAMES while not live, the LTN Plays Games schedule
  const src = ch.kind === "twitch" && !live ? ltnMirror() : ch;
  if (!live && src && src.kind === "yt" && src.yt && src.yt.sched && src.ytid) {
    const lst = ltnLists[src.ytid];
    if (lst && lst.sched && lst.sched.order.length) {
      const sch = lst.sched, n = sch.order.length, out = [];
      const a = schedAt(sch, from);
      let start = from - a.offset, i = a.index;
      for (let guard = 0; start < to && guard < 500; guard++, i++) {
        const it = sch.order[i % n], nx = sch.order[(i + 1) % n];
        out.push({ s: start, e: start + it.len, t: it.title || src.name, sub: "", sched: true, next: { t: nx.title || src.name, s: start + it.len, e: start + it.len + nx.len } });
        start += it.len;
      }
      return out;
    }
    ltnEnsure(src); // not loaded yet: ask for it, and show the single block until it arrives
  }
  return [{ s: from, e: to, t: l.t, sub: l.n, live }];
}
function ltnPreviewClear() { const i = $("#gprevimg"); if (i) { i.style.display = "none"; i.removeAttribute("src"); } }
// The video on this channel right now: {id, live} for a video, {tw: true} for the Twitch stream, or null when not known yet.
function ltnNowVideo(ch) {
  if (ch.kind === "twitch") { if (isLive(ch)) return { tw: true }; ch = ltnMirror(); if (!ch) return null; } // not live: it is showing the LTN Plays Games channel
  if (ch.kind !== "yt") return null;
  if (ch.ytid) {
    const lv = ltnLiveMap[ch.ytid];
    if (lv && lv.live) return { id: lv.vid, live: true };
    const lst = ltnLists[ch.ytid];
    if (lst && lst.sched && lst.sched.order.length) return { id: schedAt(lst.sched, Date.now() / 1000).it.id }; // what the clock says is on
    ltnEnsure(ch); // not known yet: load it, and the preview refreshes when it arrives
    return null;
  }
  const cur = channels[tuned] === ch && ytInfo.videoData && ytInfo.videoData.video_id; // the Daily Audio Bible: what it is playing now, else its first video
  return { id: cur || LTN.bible.first };
}
const ytThumbs = (id) => ["maxresdefault", "sddefault", "hqdefault", "mqdefault"].map((q) => "https://i.ytimg.com/vi/" + id + "/" + q + ".jpg"); // sharpest first; not every video has every size
function ltnPreview(ch) { // the guide's preview box: the thumbnail of what is on the channel right now
  const img = $("#gprevimg"), msg = $("#gprevmsg");
  const v = ltnNowVideo(ch);
  let chain = [], logo = false;
  if (v && v.tw) chain = ["https://static-cdn.jtvnw.net/previews-ttv/live_user_" + LTN.twitch + "-640x360.jpg?t=" + Math.floor(Date.now() / 30000)];
  else if (v && v.live) chain = ["maxresdefault_live", "hqdefault_live"].map((q) => "https://i.ytimg.com/vi/" + v.id + "/" + q + ".jpg");
  else if (v && v.id) chain = ytThumbs(v.id);
  else if (ch.kind === "ltn") { chain = ["ltn-wordmark.png"]; logo = true; } // LTN News is not a video
  else { const nv = ch.ytid && ltnData && ltnData.yt && ltnData.yt.videos.find((x) => x.cid === ch.ytid); if (nv) chain = ytThumbs(nv.id); } // list not loaded yet: the newest upload until it arrives
  const live = isLive(ch) || !!(v && (v.live || v.tw));
  const none = () => { img.style.display = "none"; msg.textContent = (live ? "● LIVE  " : "") + ch.name; msg.style.alignItems = "center"; };
  let k = 0;
  const next = () => { if (k < chain.length) { img.src = chain[k++]; img.style.display = "block"; } else none(); };
  img.style.objectFit = logo ? "contain" : "cover"; img.style.padding = logo ? "3vh" : "0";
  img.onerror = next;
  msg.textContent = live ? "● LIVE" : ""; msg.style.alignItems = "flex-end";
  if (chain.length) next(); else none();
}

/* ---------- LTN NEWS pages ---------- */
const ago = (at) => {
  if (!at) return "";
  const m = Math.max(1, Math.round((Date.now() - at) / 60000));
  if (m < 60) return m + " MIN AGO";
  const h = Math.round(m / 60); if (h < 48) return h + " HR" + (h > 1 ? "S" : "") + " AGO";
  const d = Math.round(h / 24); return d < 60 ? d + " DAYS AGO" : Math.round(d / 30) + " MONTHS AGO";
};
function ltnPages() {
  const d = ltnData, pages = [];
  const hid = (k) => (LTN.hide || []).includes(k);
  // anything about being live is only here while something is live
  const live = channels.filter((c) => ltnIsOwn(c) && c.kind !== "ltn" && isLive(c));
  if (live.length && !hid("live")) pages.push(() => ["LIVE NOW", live.map((c) => `<div class="lrow"><span class="lrs">CH ${c.num}  ${esc(c.name)}</span><span class="lrt">${esc(ltnNow(c).t)}</span><span class="lra">&#9679; LIVE</span></div>`).join("")]);
  if (ltnTw && ltnTw.live && !hid("twitch")) pages.push(() => {
    const t = ltnTw;
    const img = `<img src="https://static-cdn.jtvnw.net/previews-ttv/live_user_${LTN.twitch}-1280x720.jpg?t=${Math.floor(Date.now() / 60000)}" onerror="this.style.visibility='hidden'">`;
    return ["TWITCH", `<div class="ltw"><div class="ltwimg">${img}</div><div class="ltwtxt"><div class="lstat live">&#9679; LIVE NOW</div><div class="ltitle">${esc(t.title || "")}</div><div class="lsub">${esc([t.game, t.uptime ? "live for " + t.uptime : ""].filter(Boolean).join("  •  "))}</div><div class="lsub">twitch.tv/${esc(LTN.twitch)}</div></div></div>`];
  });
  // pages added in the admin backend
  for (const p of LTN.remotePages || []) {
    if (!ltnPageActive(p)) continue;
    pages.push(() => {
      const img = p.image ? `<div class="ltwimg"><img src="${esc(p.image)}" onerror="this.style.visibility='hidden'"></div>` : "";
      const lines = (p.body || "").split(/\n+/).filter(Boolean);
      const txt = lines.map((l, i) => `<div class="${i === 0 && l.length <= 90 ? "ltitle" : "lsub"}">${esc(l)}</div>`).join("") + (p.link ? `<div class="lstat">${esc(p.link)}</div>` : "");
      return [p.title, img ? `<div class="ltw">${img}<div class="ltwtxt">${txt}</div></div>` : `<div class="lmsg">${txt || esc(p.title)}</div>`];
    });
  }
  // a small picture card: used for website posts and new videos, nine to a page (3 x 3)
  const card = (img, title, meta) => {
    const pic = img ? `<img src="${esc(img)}" onerror="this.style.visibility='hidden'">` : `<div class="lph">LTN</div>`;
    return `<div class="lc">${pic}<div class="lct">${esc(title)}</div><div class="lcs">${esc(meta)}</div></div>`;
  };
  if (d && d.site && d.site.length && !hid("site")) pages.push(() => ["LOVETHYNERD.COM", `<div class="lgrid3">${d.site.slice(0, 9).map((p) => card(p.img, p.t, [p.cat, ago(p.at)].filter(Boolean).join("  •  "))).join("")}</div>`]);
  // mission trips, soonest first
  if (d && d.trips && d.trips.length && !hid("trips")) pages.push(() => ["MISSION TRIPS", `<div class="lgrid3">${d.trips.slice(0, 9).map((t) => card(t.img, t.t, [(t.where || "").trim(), t.days <= 0 ? "STARTS TODAY" : t.days + (t.days === 1 ? " DAY" : " DAYS") + " AWAY", t.open === true ? "REGISTRATION OPEN" : t.open === false ? "REGISTRATION CLOSED" : "", t.cost || ""].filter(Boolean).join("  •  "))).join("")}</div>`]);
  if (d && d.yt) {
    const vids = hid("youtube") ? [] : d.yt.videos.slice(0, 18);
    for (let i = 0; i < vids.length; i += 9) pages.push(() => ["NEW ON YOUTUBE", `<div class="lgrid3">${vids.slice(i, i + 9).map((v) => card("https://i.ytimg.com/vi/" + v.id + "/mqdefault.jpg", v.t, [v.show, ago(v.at)].filter(Boolean).join("  •  "))).join("")}</div>`]);
    // every show on one page
    if (d.yt.shows.length && !hid("shows")) pages.push(() => ["OUR SHOWS", `<div class="lshows">${d.yt.shows.map((v) => `<div class="lrow"><span class="lrs">${esc(v.show)}</span><span class="lrt">${esc(v.t)}</span><span class="lra">${ago(v.at)}</span></div>`).join("")}</div>`]);
  }
  // our Spotify playlists, five across
  if (d && d.spotify && d.spotify.length && !hid("spotify")) for (let i = 0; i < d.spotify.length; i += 15) pages.push(() => ["SPOTIFY PLAYLISTS", `<div class="lspot">${d.spotify.slice(i, i + 15).map((s) => `<div class="sp"><img src="${esc(s.img)}" onerror="this.style.visibility='hidden'"><div class="spt">${esc(s.t)}</div></div>`).join("")}</div>`]);
  return pages.length ? pages : [() => ["LTN NEWS", `<div class="lmsg">Getting the latest...</div>`]];
}
function ltnDraw() {
  const pages = ltnPages();
  const [title, html] = pages[ltnPage % pages.length]();
  $("#ltntitle").textContent = title;
  $("#ltnbody").innerHTML = html;
  $("#ltnpage").textContent = "PAGE " + ((ltnPage % pages.length) + 1) + " OF " + pages.length;
  $("#ltnclock").textContent = clock(Date.now());
  const nt = ltnNoticeText(), ne = $("#ltnnote");
  if (ne) { ne.textContent = nt; ne.classList.toggle("on", !!nt); }
}
async function playLtn(ch, gen) {
  loadingOn(false);
  $("#ltn").classList.add("on");
  ltnPage = 0; ltnDraw();
  if (LTN.music) { // the music: always playing, sound only
    const m = $("#ytm");
    m.onload = () => ytAudioSoon();
    m.src = ytEmbed(LTN.music + "?playlist=" + LTN.music);
  }
  const reload = async (force) => { try { await ltnLoad(force); } catch { /* keep what we have */ } if (gen === tuneGen) ltnDraw(); };
  await reload(false);
  if (gen !== tuneGen) return;
  ltnPageTimer = setInterval(() => { ltnPage++; ltnDraw(); }, LTN.pageMs);
}

/* ---------- the shared schedule: every show channel is always on, shuffled, and the same for everyone ---------- */
// The channel's newest 100 videos (with their lengths) are put in a fixed pseudo-random order that depends only on the channel and the video ids,
// then played back to back on a loop that starts at a fixed moment. What is on, and how far in, is therefore a function of the clock alone:
// anyone tuning in at the same time sees the same thing, in the shuffled order, with no server involved.
const SCHED_ANCHOR = 1767225600; // 1 Jan 2026 00:00 UTC: where the loop starts
const SCHED_EPOCH = 6 * 3600;    // everyone refreshes the video list at the same UTC moments (00:00, 06:00, 12:00, 18:00)
const ltnLists = {}, ltnListLoading = {};
let ytSched = null, ytSchedCtx = null, ytSchedActive = false, ytCtl = null, ytLoadAt = 0, ytBad = new Set();
const ltnSchedOn = (ch) => !!(ch && ch.kind === "yt" && ch.yt && ch.yt.sched && ytSchedActive);
function ltnHash(str) { // 32-bit FNV-1a with a finishing mix
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
}
// the first 100 videos of a playlist page: [{id, len (seconds), title}]
async function ltnFetchList(listId) {
  const toSec = (t) => t.split(":").reduce((a, x) => a * 60 + +x, 0);
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch("https://www.youtube.com/playlist?list=" + listId, { cache: "no-store", headers: { "Accept-Language": "en-US" } });
      const html = await r.text();
      const m = /var ytInitialData = (\{.*?\});<\/script>/s.exec(html);
      if (!m) throw new Error("no list data");
      const out = [];
      (function walk(o) {
        if (!o || typeof o !== "object") return;
        const l = o.lockupViewModel;
        if (l && l.contentType === "LOCKUP_CONTENT_TYPE_VIDEO" && l.contentId) {
          const badges = [];
          (function w(x) { if (!x || typeof x !== "object") return; if (x.thumbnailBadgeViewModel) badges.push(x.thumbnailBadgeViewModel.text); for (const k in x) w(x[k]); })(l);
          const t = badges.find((b) => /^\d+(:\d+)+$/.test(b || ""));
          const title = (l.metadata && l.metadata.lockupMetadataViewModel && l.metadata.lockupMetadataViewModel.title && l.metadata.lockupMetadataViewModel.title.content) || "";
          let age = 0; // "10h ago", "3 days ago": roughly when it went up
          (function w(x) { if (!x || typeof x !== "object" || age) return; if (typeof x.content === "string") { const a = /^(\d+)\s*(second|minute|hour|day|week|month|year|mo|[smhdwy])\w*\s+ago$/i.exec(x.content.trim()); if (a) { const u = a[2].toLowerCase(); age = +a[1] * ({ s: 1e3, second: 1e3, m: 6e4, minute: 6e4, h: 36e5, hour: 36e5, d: 864e5, day: 864e5, w: 6048e5, week: 6048e5, mo: 2592e6, month: 2592e6, y: 31536e6, year: 31536e6 }[u] || 864e5); } } for (const k in x) w(x[k]); })(l.metadata);
          if (t) out.push({ id: l.contentId, len: toSec(t), title, age });
        }
        for (const k in o) walk(o[k]);
      })(JSON.parse(m[1]));
      if (!out.length) throw new Error("empty list");
      return out;
    } catch (e) { lastErr = e; await new Promise((res) => setTimeout(res, 1500)); }
  }
  throw lastErr;
}
function ltnBuildSchedule(items, seed) {
  // sorted by a hash of (channel, video): adding or removing one video only inserts or removes it; everything else keeps its place
  const order = items.map((it) => ({ ...it, k: ltnHash(seed + ":" + it.id) })).sort((a, b) => a.k - b.k || (a.id < b.id ? -1 : 1));
  let acc = 0;
  for (const it of order) { it.start = acc; acc += it.len; }
  return { order, total: acc, items, seed };
}
function schedAt(sch, nowSec) { // what is on at this moment: {it, offset, index, next}
  const pos = (((nowSec - SCHED_ANCHOR) % sch.total) + sch.total) % sch.total;
  let lo = 0, hi = sch.order.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (sch.order[mid].start <= pos) lo = mid; else hi = mid - 1; }
  const it = sch.order[lo];
  return { it, offset: pos - it.start, index: lo, next: sch.order[(lo + 1) % sch.order.length] };
}
async function ltnVerifyList(ch, items) {
  let doc;
  try { doc = await ltnXml("https://www.youtube.com/feeds/videos.xml?playlist_id=" + ch.yt.list); } catch { return; } // cannot check right now: accept
  const entries = [...doc.getElementsByTagName("entry")];
  if (!entries.length) return;
  if (entries.some((e) => { const c = ltnTag(e, "yt:channelId"); return c && c !== ch.ytid; })) throw new Error("this list belongs to another channel");
  const ids = new Set(items.map((x) => x.id));
  if (!entries.some((e) => ids.has(ltnTag(e, "yt:videoId")))) throw new Error("this list does not match the channel's own feed");
}
async function ltnGetSchedule(ch) {
  const ep = Math.floor(Date.now() / 1000 / SCHED_EPOCH), id = ch.ytid;
  const have = ltnLists[id];
  if (have && have.epoch === ep) return have.sched;
  if (ltnListLoading[id]) return ltnListLoading[id];
  ltnListLoading[id] = (async () => {
    try {
      let items = null;
      // a saved copy is only trusted if it was saved for exactly this channel and playlist, and it is checked again like a fresh list
      try { const c = JSON.parse(localStorage.getItem("ltn-list-" + id) || "null"); if (c && c.epoch === ep && c.id === id && c.list === ch.yt.list && c.items && c.items.length) items = c.items; } catch { /* no saved copy */ }
      if (items) { try { await ltnVerifyList(ch, items); } catch { items = null; try { localStorage.removeItem("ltn-list-" + id); } catch { /* ignore */ } } } // a bad saved copy is thrown away
      if (!items) {
        items = await ltnFetchList(ch.yt.list);
        await ltnVerifyList(ch, items); // never schedule another channel's videos
        try { localStorage.setItem("ltn-list-" + id, JSON.stringify({ epoch: ep, id, list: ch.yt.list, items })); } catch { /* storage full or blocked */ }
      }
      const sched = ltnBuildSchedule(items.filter((x) => !ytBad.has(x.id)), id);
      ltnLists[id] = { epoch: ep, sched };
      return sched;
    } catch { return have ? have.sched : null; } // keep the last list if refreshing fails
    finally { delete ltnListLoading[id]; }
  })();
  return ltnListLoading[id];
}
async function ltnWarm() { // load every channel's list in the background (one at a time) so the guide can name what is on
  for (const c of [...channels.filter((x) => x.kind === "yt" && x.yt && x.yt.sched), ...(ltnPlaysCh ? [ltnPlaysCh] : [])]) {
    try { await ltnGetSchedule(c); if (mode === "guide") renderGuide(); } catch { /* next one */ }
    await new Promise((r) => setTimeout(r, 3500));
  }
}

/* ---------- YouTube channels and the Daily Bible: YouTube's embedded player ---------- */
let ytJumpVid = "", ytRecent = [];
let ytInfo = {}, ytListenTimer = null, ytPos = 0, twPlayer = null, ytLastVid = "", ytWant = -1, ytVidAtCmd = "";
const ytEmbed = (path) => "https://www.youtube-nocookie.com/embed/" + path + (path.includes("?") ? "&" : "?") + "autoplay=1&loop=1&controls=0&disablekb=1&modestbranding=1&rel=0&iv_load_policy=3&fs=0&playsinline=1&cc_load_policy=0&enablejsapi=1";
function ytCmd(func, args) {
  const f = $("#ytf");
  if (f && f.contentWindow && /youtube/.test(f.getAttribute("src") || "")) f.contentWindow.postMessage(JSON.stringify({ event: "command", func, args: args || [] }), "*");
}
function ytmCmd(func, args) {
  const f = $("#ytm");
  if (f && f.contentWindow && /youtube/.test(f.getAttribute("src") || "")) f.contentWindow.postMessage(JSON.stringify({ event: "command", func, args: args || [] }), "*");
}
let ytSent = {}; // what each player was last told
function ytAudio(force) { // follow the window's volume and mute
  const quiet = !!S.muteWindow, vol = Math.round(Math.min(1, Math.max(0, S.volume)) * 100), key = quiet + ":" + vol;
  const tell = (name, ready, cmd) => { if (!ready || (!force && ytSent[name] === key)) return; ytSent[name] = key; cmd(quiet ? "mute" : "unMute"); cmd("setVolume", [vol]); };
  tell("ytm", /youtube/.test($("#ytm").getAttribute("src") || ""), ytmCmd);
  tell("ytf", /youtube/.test($("#ytf").getAttribute("src") || ""), ytCmd);
  tell("tw", !!twPlayer, (func, args) => { try { if (func === "setVolume") twPlayer.setVolume(args[0] / 100); else twPlayer.setMuted(func === "mute"); } catch { /* not ready yet */ } });
}
function ytNoCaptions() { for (const m of ["captions", "cc"]) { ytCmd("unloadModule", [m]); ytmCmd("unloadModule", [m]); } }
const ytAudioSoon = () => { ytSent = {}; for (const ms of [1200, 3500, 8000]) setTimeout(() => { ytAudio(true); ytNoCaptions(); }, ms); }; // a freshly loaded player needs telling a few times until it is ready
function ytShow(src, gen) {
  const f = $("#ytf");
  $("#yt").classList.add("on");
  f.onload = () => {
    let n = 0;
    clearInterval(ytListenTimer);
    ytAudioSoon();
    ytListenTimer = setInterval(() => { // asks the player to report what it is playing, until it does
      if (gen !== tuneGen || ++n > 60 || ytInfo.currentTime != null) return clearInterval(ytListenTimer);
      try { f.contentWindow.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*"); } catch { /* frame gone */ }
    }, 1000);
  };
  f.src = src;
}
function playYt(ch, gen, owner) { // owner: the channel being watched, when it is borrowing this one's programme
  loadingOn(false);
  ytInfo = {}; ytPos = 0; ytWant = -1; ytVidAtCmd = ""; ytJumpVid = ""; ytRecent = [];
  ltnTunedLive = isLive(ch); ltnTunedSig = ltnSig(owner || ch);
  clearInterval(ytCtl); ytCtl = null; ytSched = null; ytSchedActive = false;
  if (ltnTunedLive) return ytShow(ytEmbed("live_stream?channel=" + ch.ytid), gen);
  if (ch.yt.sched) { // the shared shuffled schedule; if the list cannot be loaded, fall back to the plain playlist
    loadingOn(true);
    ltnGetSchedule(ch).then((sch) => {
      if (gen !== tuneGen) return;
      loadingOn(false);
      if (!sch || !sch.order.length) return ytLegacy(ch, gen);
      ytSched = sch; ytSchedCtx = ch; ytSchedActive = true;
      const a = schedAt(sch, Date.now() / 1000);
      ytLoadAt = Date.now();
      ytShow(ytEmbed(a.it.id + "?start=" + Math.floor(a.offset)), gen);
      ytCtl = setInterval(() => ytTick(ch, gen), 1000);
    }).catch(() => { if (gen === tuneGen) { loadingOn(false); ytLegacy(ch, gen); } });
    return;
  }
  ytLegacy(ch, gen);
}
function ytLegacy(ch, gen) { // the plain playlist (the Daily Bible, or a show whose list could not be loaded)
  ytShow(ytEmbed(ch.yt.first ? ch.yt.first + "?list=" + ch.yt.list : "videoseries?list=" + ch.yt.list), gen);
}
// every second: is the player showing what the clock says should be on? If not, put it right.
function ytTick(ch, gen) {
  if (gen !== tuneGen || !ytSched || !ytSchedActive) { clearInterval(ytCtl); ytCtl = null; return; }
  const a = schedAt(ytSched, Date.now() / 1000), cur = ytInfo.videoData && ytInfo.videoData.video_id, since = Date.now() - ytLoadAt;
  if (cur == null || ytInfo.currentTime == null) { // the player has not reported anything: after a while, load it again
    if (since > 20000) { ytLoadAt = Date.now(); ytShow(ytEmbed(a.it.id + "?start=" + Math.floor(a.offset)), gen); }
    return;
  }
  if (cur !== a.it.id) { // the next programme has started (or the player is on something else): go to it, part-way in if need be
    if (since > 3500) { ytLoadAt = Date.now(); ytCmd("loadVideoById", [a.it.id, Math.floor(a.offset)]); }
    return;
  }
  if ((ytInfo.playerState === -1 || ytInfo.playerState === 5) && since > 15000) { ytLoadAt = Date.now(); ytCmd("loadVideoById", [a.it.id, Math.floor(a.offset)]); return; } // stuck before playing
  if (ytInfo.playerState === 1 && since > 15000 && Math.abs(ytInfo.currentTime - a.offset) > 8) { ytLoadAt = Date.now(); ytCmd("seekTo", [a.offset, true]); } // drifted
}
// a video that cannot be played (removed, or embedding switched off): leave it out of the schedule
function ytOnError() {
  const cur = ytInfo.videoData && ytInfo.videoData.video_id;
  if (!ytSchedActive || !ytSched || !cur) return;
  ytBad.add(cur);
  const rest = ytSched.items.filter((x) => !ytBad.has(x.id));
  if (!rest.length) return;
  ytSched = ltnBuildSchedule(rest, ytSched.seed);
  if (ytSchedCtx && ltnLists[ytSchedCtx.ytid]) ltnLists[ytSchedCtx.ytid].sched = ytSched;
}
// a show channel is "already on": pick the programme from the wall clock so everyone sees the same thing, and join part-way in
const ytHash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
function ytPosition() {
  const ch = ltnPlayCh();
  if (!ch || ch.kind !== "yt" || !ch.yt.wall || ltnTunedLive || ytPos === 2 || ltnSchedOn(ch)) return;
  const pl = ytInfo.playlist;
  if (!Array.isArray(pl) || !pl.length) return;
  const now = Date.now() / 1000, slot = 4 * 3600;
  if (ch.yt.random) { // shuffled: start at a random video and a random point in it
    if (ytPos === 0) {
      ytPos = 1;
      ytWant = Math.floor(Math.random() * pl.length);
      ytVidAtCmd = (ytInfo.videoData && ytInfo.videoData.video_id) || "";
      ytCmd("playVideoAt", [ytWant]);
      return;
    }
    if (ytPos === 1 && ytInfo.playlistIndex === ytWant && ytInfo.videoData && ytInfo.videoData.video_id !== ytVidAtCmd && ytInfo.duration > 5) {
      ytCmd("seekTo", [Math.random() * ytInfo.duration * 0.7, true]);
      ytPos = 2;
    }
    return;
  }
  // in order: the clock picks the programme (same for everyone) and the player carries on down the list from there
  const n = Math.min(pl.length, 40);
  const want = (ytHash(ch.ytid) + Math.floor(now / slot)) % n;
  if (ytPos === 0) { ytPos = 1; if (ytInfo.playlistIndex !== want) { ytCmd("playVideoAt", [want]); return; } }
  if (ytPos === 1 && ytInfo.playlistIndex === want && ytInfo.videoData && ytInfo.videoData.video_id === pl[want] && ytInfo.duration > 5) {
    const off = (now % slot) % ytInfo.duration;
    ytCmd("seekTo", [off > ytInfo.duration - 30 ? 0 : off, true]);
    ytPos = 2;
  }
}
addEventListener("message", (e) => {
  if (!/youtube/.test(e.origin || "")) return;
  let d = e.data;
  try { if (typeof d === "string") d = JSON.parse(d); } catch { return; }
  if (d && d.event === "onError") ytOnError();
  if (d && (d.event === "infoDelivery" || d.event === "initialDelivery") && d.info) {
    Object.assign(ytInfo, d.info);
    if (d.info.videoData) {
      ytInfo.videoData = { ...(ytInfo.videoData || {}), ...d.info.videoData };
      const vid = d.info.videoData.video_id;
      if (vid && vid !== ytLastVid) { ytLastVid = vid; setTimeout(ytNoCaptions, 600); setTimeout(ytNoCaptions, 2500); ytSkipIfShort(vid); }
    }
    ytPosition();
    ytAdvance();
  }
});
function ytAdvance() {
  const ch = ltnPlayCh();
  if (!ch || ch.kind !== "yt" || ltnTunedLive || ltnSchedOn(ch)) return;
  if (ch.yt.wall && ytPos !== 2) return; // still joining part-way through
  const d = ytInfo.duration, t = ytInfo.currentTime, pl = ytInfo.playlist, vid = ytInfo.videoData && ytInfo.videoData.video_id, cur = ytInfo.playlistIndex;
  if (!(d > 20) || t == null || !Array.isArray(pl) || pl.length < 2 || !vid || cur == null || ytJumpVid === vid) return;
  if (!ytRecent.includes(vid)) ytRecent.push(vid);
  if (d - t > 2.5) return;
  ytJumpVid = vid; // once per video
  if (ytRecent.length > Math.min(8, pl.length - 1)) ytRecent.shift();
  ytGo(cur, pl, !!ch.yt.random);
}
// Play the next video: the next one down the list (back to the top at the end), or a random one for the shuffled channel. Shorts are passed over.
async function ytGo(cur, pl, random) {
  const tried = new Set([cur]);
  for (let k = 0; k < 15; k++) {
    let i;
    if (random) {
      i = -1;
      for (let n = 0; n < 20; n++) { const c = Math.floor(Math.random() * pl.length); if (!tried.has(c) && !ytRecent.includes(pl[c])) { i = c; break; } }
      if (i < 0) { do { i = Math.floor(Math.random() * pl.length); } while (tried.has(i) && tried.size < pl.length); }
    } else i = (cur + 1 + k) % pl.length;
    if (tried.has(i)) continue;
    tried.add(i);
    if (await ytIsShort(pl[i])) continue;
    return ytCmd("playVideoAt", [i]);
  }
  ytCmd("playVideoAt", [(cur + 1) % pl.length]); // everything we looked at was a Short: just carry on
}
// a video that starts and turns out to be a Short (the playlist moved on by itself, or the clock picked it): skip it at once
async function ytSkipIfShort(vid) {
  const ch = ltnPlayCh();
  if (!ch || ch.kind !== "yt" || ltnTunedLive || !(await ytIsShort(vid))) return;
  if (!ytInfo.videoData || ytInfo.videoData.video_id !== vid) return; // already moved on
  const pl = ytInfo.playlist, cur = ytInfo.playlistIndex;
  if (Array.isArray(pl) && pl.length > 1 && cur != null) ytGo(cur, pl, !!ch.yt.random);
}
/* ---------- Twitch: the live stream, or the trailer while offline ---------- */
function ltnTwitchLib() {
  return window.Twitch && window.Twitch.Player ? Promise.resolve() : new Promise((res, rej) => { const s = document.createElement("script"); s.src = "https://player.twitch.tv/js/embed/v1.js"; s.onload = res; s.onerror = rej; document.head.append(s); });
}
// ---- when is the next live stream (weekly schedule above, shown in this PC's time zone) ----
function ltnTzOffset(ts, tz) { // minutes east of UTC at that moment
  const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
  const p = Object.fromEntries(f.formatToParts(new Date(ts)).map((x) => [x.type, +x.value]));
  return (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ts / 1000) * 1000) / 60000;
}
function ltnNextStream(now = Date.now()) { // the next stream that has not started yet: {start, end, title}
  const { tz, slots } = LTN.schedule;
  const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric" });
  const p = Object.fromEntries(f.formatToParts(new Date(now)).map((x) => [x.type, +x.value]));
  const base = Date.UTC(p.year, p.month - 1, p.day);
  let best = null;
  for (let d = -1; d <= 8; d++) {
    const day = new Date(base + d * 86400000);
    for (const s of slots) {
      if (s.day !== day.getUTCDay()) continue;
      const [h, m] = s.at.split(":").map(Number);
      const wall = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), h, m);
      let start = wall - ltnTzOffset(wall, tz) * 60000;
      start = wall - ltnTzOffset(start, tz) * 60000; // once more, in case the clocks change that day
      const end = start + s.mins * 60000;
      if (start > now && (!best || start < best.start)) best = { start, end, title: s.title }; // only streams that have not started yet
    }
  }
  return best;
}
function ltnNextText() {
  const n = ltnNextStream();
  if (!n) return "";
  const now = Date.now(), fmt = (ts, o) => new Date(ts).toLocaleString(undefined, o);
  const zone = fmt(n.start, { timeZoneName: "short" }).split(" ").pop();
  const time = fmt(n.start, { hour: "numeric", minute: "2-digit" });
  const sd = new Date(n.start).toDateString();
  const when = sd === new Date(now).toDateString() ? "TODAY" : sd === new Date(now + 864e5).toDateString() ? "TOMORROW" : fmt(n.start, { weekday: "long" }).toUpperCase();
  return ("NEXT STREAM: " + when + " " + time + " " + zone + (n.title ? "  •  " + n.title : "")).toUpperCase();
}
function ltnNextShow(on) { // the note in the top-left corner
  clearInterval(ltnNextTimer); ltnNextTimer = null;
  const el = $("#nextlive");
  if (!el) return;
  if (!on) { el.classList.remove("on"); return; }
  const draw = () => { const t = ltnNextText(); el.textContent = t; el.classList.toggle("on", !!t); };
  draw(); ltnNextTimer = setInterval(draw, 30000);
}
async function playTwitch(ch, gen) {
  loadingOn(false);
  ytInfo = {};
  const m = isLive(ch) ? null : ltnMirror();
  if (m) { playYt(m, gen, ch); ltnNextShow(true); return; } // not live: whatever LTN Plays is showing, plus when we are next on
  ltnNextShow(false);
  ltnTunedLive = true; ltnTunedSig = ltnSig(ch);
  $("#tw").classList.add("on");
  try { await ltnTwitchLib(); } catch { return flash("TWITCH UNAVAILABLE"); }
  if (gen !== tuneGen) return;
  $("#twp").textContent = "";
  // the player only runs on a page whose host is in "parent"; the app serves itself from http://localhost for exactly this
  twPlayer = new Twitch.Player("twp", { channel: LTN.twitch, parent: ["localhost"], width: "100%", height: "100%", autoplay: true, muted: false });
  twPlayer.addEventListener(Twitch.Player.READY, () => { try { twPlayer.play(); } catch { /* player gone */ } });
  ytAudioSoon();
}

function ltnStop() {
  clearInterval(ytCtl); ytCtl = null; ytSched = null; ytSchedActive = false;
  ltnNextShow(false);
  clearInterval(ltnPageTimer); clearInterval(ltnRefreshTimer); clearInterval(ytListenTimer);
  ltnPageTimer = ltnRefreshTimer = ytListenTimer = null;
  twPlayer = null;
  const l = $("#ltn"), y = $("#yt"), t = $("#tw"), m = $("#ytm");
  if (m && /youtube/.test(m.getAttribute("src") || "")) m.src = "about:blank";
  if (l) l.classList.remove("on");
  if (t) { t.classList.remove("on"); const p = $("#twp"); if (p) p.textContent = ""; }
  if (y) { y.classList.remove("on"); const f = $("#ytf"); if (f && /youtube/.test(f.getAttribute("src") || "")) f.src = "about:blank"; }
}

/* ---------- keep the picture still, and leave a trail if something moves it ---------- */
(() => {
  let n = 0;
  const diag = (...a) => { if (n++ < 300) console.error("DIAG", "window", ...a); };
  // nothing here should ever scroll; if it does, say so and put it back at once
  addEventListener("scroll", () => { diag("scroll", window.scrollX, window.scrollY, document.documentElement.scrollLeft, document.body.scrollLeft); window.scrollTo(0, 0); document.documentElement.scrollLeft = 0; document.body.scrollLeft = 0; }, true);
  if (window.visualViewport) for (const ev of ["scroll", "resize"]) visualViewport.addEventListener(ev, () => diag("visualViewport", ev, Math.round(visualViewport.offsetLeft), Math.round(visualViewport.offsetTop), Math.round(visualViewport.width), Math.round(visualViewport.height)));
  addEventListener("DOMContentLoaded", () => {
    if (!window.ResizeObserver) return;
    const ro = new ResizeObserver((es) => es.forEach((e) => diag("resize", e.target.id || e.target.tagName, Math.round(e.contentRect.width), Math.round(e.contentRect.height))));
    for (const id of ["ytf", "twp", "yt", "tw", "ltn"]) { const el = document.getElementById(id); if (el) ro.observe(el); }
    ro.observe(document.documentElement);
  });
})();
