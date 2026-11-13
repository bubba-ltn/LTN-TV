// Love Thy Nerd channels, added to the lineup on this PC only:
//   LTN LATEST      rotating pages: who is live, Twitch, the website's newest posts, new YouTube videos, every show's latest
//   LTN TWITCH      the Twitch stream when live, otherwise the trailer (or Twitch's own offline screen)
//   LTN DAILY BIBLE the LTN Daily Audio Bible playlist, played through in order
//   one channel per YouTube show: always on, joined mid-programme like a TV channel, and the live stream whenever the show is live
// Loaded before player.js; everything here is used at run time, after player.js has defined the helpers ($, channels, flash, clock, ...).
const LTN = {
  numLatest: 158, numTwitch: 159, numBible: 160, numShows: 161, // moved up automatically if the lineup already uses them
  site: "https://lovethynerd.com/feed",
  twitch: "lovethynerd",
  twitchTrailer: "", // YouTube video id of the trailer to play while Twitch is offline; empty = Twitch's own offline screen
  bible: { playlist: "PLibAByUqZ70-6rRTHbRimCrxG7F-PCdSN", first: "QbDIEoXcMw8" },
  pageMs: 12000, refreshMs: 10 * 60000, livePollMs: 4 * 60000,
  // one channel each; @LoveThyNerd and @LTNPlaysGames are the same YouTube channel, so they share one
  shows: [
    { id: "UC8eB_7RaI0sKhVbo8abjhEw", name: "LOVE THY NERD", info: "@LoveThyNerd and @LTNPlaysGames" },
    { id: "UCq4sMTRd7Unwidjl1PVP2qA", name: "NCMU PODCAST", info: "Nerd Culture Ministry Underground, @NCMUpodcastLTN" },
    { id: "UC5FybvYjKGsMN_7f8M0YUMQ", name: "NERD HISTORY", info: "@NerdHistoryLTN" },
    { id: "UCXX-ABXIGaUW3_NmY7LOQGg", name: "RPG RUNDOWN", info: "The RPG Rundown, @TheRPGRundownLTN" },
    { id: "UCybQk4iV2Ax6cMLWsIO-sUw", name: "THE PULL LIST", info: "@ThePullListLTN" },
    { id: "UCiGN0i7cRwTLLv51DDMaM2w", name: "SAVE & CONTINUE", info: "Save & Continue Podcast, @SaveAndContinueLTN" },
    { id: "UCcfPQJO0t5WfwMW08BVjhjg", name: "CHRISTIAN BOARD GAMERS", info: "@ChristianBoardGamersLTN" },
    { id: "UCUJCjVIfE5p2rrPgfNq_0XQ", name: "FAITH & FANDOM", info: "Faith & Fandom Podcast, @FaithAndFandomLTN" },
    { id: "UCda5tLEdzlfm3FtLi4rLQyA", name: "SATELLITE STORIES", info: "@SatelliteStoriesLTN" },
    { id: "UCTDE0NRt9QqeUByTE6WM0kQ", name: "TWO WORDS", info: "Two Words Podcast, @TwoWordsLTN" },
    { id: "UCT67V7nvgWuygXAORpiU7iA", name: "CHURCH NERDS", info: "@ChurchNerdsLTN" },
    { id: "UCXhCjTVjYof3F1tUfmem5hw", name: "BIBLE THUMP", info: "@BibleThumpLTN" },
  ],
};

function injectLtnChannels() {
  const free = (n) => { while (channels.some((c) => c.num === n)) n++; return n; };
  const add = (c) => { if (!channels.some((x) => x.id === c.id)) { c.cat = c.cat || "Love Thy Nerd"; channels.push(c); } };
  add({ id: "ltn-latest", num: free(LTN.numLatest), name: "LTN LATEST", kind: "ltn", blurb: "Who is live, and the newest from Love Thy Nerd: Twitch, the website and every YouTube show." });
  add({ id: "ltn-twitch", num: free(LTN.numTwitch), name: "LTN TWITCH", kind: "twitch", blurb: "twitch.tv/" + LTN.twitch + ": the live stream when we are on, the trailer when we are not." });
  add({ id: "ltn-bible", num: free(LTN.numBible), name: "LTN DAILY BIBLE", kind: "yt", yt: { list: LTN.bible.playlist, first: LTN.bible.first, wall: false }, blurb: "The LTN Daily Audio Bible playlist, played through in order." });
  let n = LTN.numShows;
  for (const s of LTN.shows) {
    n = free(n);
    add({ id: "ltn-yt-" + s.id, num: n, name: s.name, kind: "yt", ytid: s.id, yt: { list: "UU" + s.id.slice(2), wall: true }, blurb: s.info + " on YouTube. Always on, and the live stream whenever the show is live." });
  }
  channels.sort((a, b) => a.num - b.num);
}

/* ---------- shared state ---------- */
let ltnData = null, ltnAt = 0, ltnPage = 0, ltnPageTimer = null, ltnRefreshTimer = null;
let ltnLiveMap = {}, ltnTw = null, ltnTunedLive = false, ltnPollTimers = [];
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ltnTag = (el, tag) => { const n = el.getElementsByTagName(tag)[0]; return n ? n.textContent.trim() : ""; };
const ltnIsOwn = (ch) => ch && (ch.kind === "ltn" || ch.kind === "yt" || ch.kind === "twitch");
function isLive(ch) {
  if (!ch) return false;
  if (ch.kind === "twitch") return !!(ltnTw && ltnTw.live);
  if (ch.kind === "yt" && ch.ytid) return !!(ltnLiveMap[ch.ytid] && ltnLiveMap[ch.ytid].live);
  return false;
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
    const doc = await ltnXml("https://www.youtube.com/feeds/videos.xml?channel_id=" + s.id);
    const show = ltnTag(doc.documentElement, "title");
    const vids = [...doc.getElementsByTagName("entry")].slice(0, 5).map((e) => ({ id: ltnTag(e, "yt:videoId"), t: ltnTag(e, "title"), at: Date.parse(ltnTag(e, "published")) || 0, show, cid: s.id }));
    out.push(...vids);
    if (vids[0]) shows.push(vids[0]);
  }));
  if (!out.length) throw new Error("no youtube data");
  out.sort((a, b) => b.at - a.at); shows.sort((a, b) => b.at - a.at);
  return { videos: out, shows };
}
async function ltnSite() {
  const doc = await ltnXml(LTN.site);
  return [...doc.getElementsByTagName("item")].slice(0, 6).map((it) => {
    const body = ltnTag(it, "content:encoded") || ltnTag(it, "description");
    const img = (body.match(/src="(https:[^"]+?\.(?:jpe?g|png|webp)[^"]*)"/i) || [])[1] || "";
    const text = ltnTag(it, "description").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").replace(/The post .* appeared first on .*$/i, "").trim();
    return { t: ltnTag(it, "title"), at: Date.parse(ltnTag(it, "pubDate")) || 0, by: ltnTag(it, "dc:creator"), cat: ltnTag(it, "category"), img, text: text.slice(0, 220) };
  });
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
async function ltnLoad(force) {
  if (!force && ltnData && Date.now() - ltnAt < LTN.refreshMs) return;
  const [yt, site, tw] = await Promise.allSettled([ltnYoutube(), ltnSite(), ltnTwitch()]);
  ltnData = { yt: yt.value || (ltnData && ltnData.yt) || null, site: site.value || (ltnData && ltnData.site) || null };
  if (tw.value) ltnTw = tw.value;
  ltnAt = Date.now();
}
const ltnLiveSnap = () => ({ yt: ltnLiveMap, tw: ltnTw ? { live: !!ltnTw.live, title: ltnTw.title, game: ltnTw.game, uptime: ltnTw.uptime } : null });
function ltnApplyLive(s) { // the hidden NDI copy receives this from the visible window
  if (!s) return;
  const before = JSON.stringify(ltnLiveSnap());
  ltnLiveMap = s.yt || {}; if (s.tw) ltnTw = { ...(ltnTw || {}), ...s.tw };
  if (JSON.stringify(ltnLiveSnap()) !== before) ltnLiveChanged();
}
function ltnLiveChanged() {
  if (mode === "guide") renderGuide();
  const ch = channels[tuned];
  if (started && ltnIsOwn(ch) && ch.kind !== "ltn" && isLive(ch) !== ltnTunedLive) tune(tuned, false); // went live or ended: switch what is playing
  syncOut();
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
    if (ch.kind === "twitch") ltnTw = await ltnTwitch();
    else if (ch.kind === "yt" && ch.ytid) ltnLiveMap[ch.ytid] = await ytLive(ch.ytid);
  } catch { return; }
  if (JSON.stringify(ltnLiveSnap()) !== before) ltnLiveChanged();
}
function ltnStart() { // called once the lineup is known (visible window only: the NDI copy is told what is live)
  if (NDI_MODE) return;
  ltnLoad(false).catch(() => {});
  ltnLivePoll();
  ltnPollTimers.push(setInterval(ltnLivePoll, LTN.livePollMs), setInterval(ltnPollTuned, 75000));
}

/* ---------- what the guide, banner and preview say about these channels ---------- */
function ytNowTitle() { return (ytInfo.videoData && ytInfo.videoData.title) || ""; }
function ltnNow(ch) {
  const live = isLive(ch);
  if (ch.kind === "twitch") return live ? { t: "● LIVE: " + ((ltnTw && ltnTw.title) || "on Twitch"), n: (ltnTw && ltnTw.game) || "" } : { t: "Not live right now", n: LTN.twitchTrailer ? "Playing the trailer" : "twitch.tv/" + LTN.twitch };
  if (ch.kind === "yt") {
    if (live) return { t: "● LIVE: " + (ltnLiveMap[ch.ytid].title || ch.name), n: "" };
    const cur = channels[tuned] === ch ? ytNowTitle() : "";
    return { t: cur || (ch.ytid ? ch.name + " on YouTube" : "LTN Daily Audio Bible"), n: ch.ytid ? "Always on" : "Played through in order" };
  }
  return { t: "The newest from Love Thy Nerd", n: "" };
}
function ltnPrograms(ch, from, to) {
  const l = ltnNow(ch);
  return [{ s: from, e: to, t: l.t, sub: l.n, live: isLive(ch) }];
}
function ltnPreviewClear() { const i = $("#gprevimg"); if (i) { i.style.display = "none"; i.removeAttribute("src"); } }
function ltnPreview(ch) { // a picture for the guide's preview box
  const img = $("#gprevimg"), msg = $("#gprevmsg");
  let src = "";
  if (ch.kind === "twitch" && isLive(ch)) src = "https://static-cdn.jtvnw.net/previews-ttv/live_user_" + LTN.twitch + "-640x360.jpg?t=" + Math.floor(Date.now() / 30000);
  else if (ch.kind === "yt" && ch.ytid) {
    const lv = ltnLiveMap[ch.ytid];
    const v = ltnData && ltnData.yt && ltnData.yt.videos.find((x) => x.cid === ch.ytid);
    if (lv && lv.live) src = "https://i.ytimg.com/vi/" + lv.vid + "/hqdefault_live.jpg";
    else if (v) src = "https://i.ytimg.com/vi/" + v.id + "/mqdefault.jpg";
  } else if (ch.kind === "yt") src = "https://i.ytimg.com/vi/" + LTN.bible.first + "/mqdefault.jpg";
  if (src) { img.onerror = () => { img.style.display = "none"; }; img.src = src; img.style.display = "block"; }
  msg.textContent = (isLive(ch) ? "● LIVE  " : "") + (src ? "" : ch.name);
  msg.style.alignItems = src ? "flex-end" : "center";
}

/* ---------- LTN LATEST pages ---------- */
const ago = (at) => {
  const m = Math.max(1, Math.round((Date.now() - at) / 60000));
  if (m < 60) return m + " MIN AGO";
  const h = Math.round(m / 60); if (h < 48) return h + " HR" + (h > 1 ? "S" : "") + " AGO";
  const d = Math.round(h / 24); return d < 60 ? d + " DAYS AGO" : Math.round(d / 30) + " MONTHS AGO";
};
function ltnPages() {
  const d = ltnData, pages = [];
  pages.push(() => {
    const live = channels.filter((c) => ltnIsOwn(c) && c.kind !== "ltn" && isLive(c));
    return ["LIVE NOW", live.length ? live.map((c) => `<div class="lrow"><span class="lrs">CH ${c.num}  ${esc(c.name)}</span><span class="lrt">${esc(ltnNow(c).t)}</span><span class="lra">&#9679; LIVE</span></div>`).join("") : `<div class="lmsg">Nothing is live right now.<br><span class="lsub">twitch.tv/${esc(LTN.twitch)}</span></div>`];
  });
  if (ltnTw) pages.push(() => {
    const t = ltnTw;
    const img = t.live ? `<img src="https://static-cdn.jtvnw.net/previews-ttv/live_user_${LTN.twitch}-1280x720.jpg?t=${Math.floor(Date.now() / 60000)}" onerror="this.style.visibility='hidden'">` : `<div class="loff">OFFLINE</div>`;
    return ["TWITCH", `<div class="ltw"><div class="ltwimg">${img}</div><div class="ltwtxt"><div class="lstat ${t.live ? "live" : ""}">${t.live ? "&#9679; LIVE NOW" : "NOT LIVE RIGHT NOW"}</div><div class="ltitle">${esc(t.title || "")}</div><div class="lsub">${esc([t.game, t.live && t.uptime ? "live for " + t.uptime : ""].filter(Boolean).join("  •  "))}</div><div class="lsub">twitch.tv/${esc(LTN.twitch)}</div></div></div>`];
  });
  if (d && d.site && d.site.length) for (let i = 0; i < d.site.length; i += 3) pages.push(() => ["LOVETHYNERD.COM", d.site.slice(i, i + 3).map((p) => `<div class="lpost">${p.img ? `<img src="${esc(p.img)}" onerror="this.style.display='none'">` : ""}<div class="lptxt"><div class="lpt">${esc(p.t)}</div><div class="lps">${esc([p.cat, p.by, ago(p.at)].filter(Boolean).join("  •  "))}</div><div class="lpx">${esc(p.text)}</div></div></div>`).join("")]);
  if (d && d.yt) {
    const vids = d.yt.videos.slice(0, 18);
    for (let i = 0; i < vids.length; i += 6) pages.push(() => ["NEW ON YOUTUBE", `<div class="lgrid">${vids.slice(i, i + 6).map((v) => `<div class="lc"><img src="https://i.ytimg.com/vi/${esc(v.id)}/mqdefault.jpg" onerror="this.style.visibility='hidden'"><div class="lct">${esc(v.t)}</div><div class="lcs">${esc(v.show)}  •  ${ago(v.at)}</div></div>`).join("")}</div>`]);
    for (let i = 0; i < d.yt.shows.length; i += 6) pages.push(() => ["OUR SHOWS", d.yt.shows.slice(i, i + 6).map((v) => `<div class="lrow"><span class="lrs">${esc(v.show)}</span><span class="lrt">${esc(v.t)}</span><span class="lra">${ago(v.at)}</span></div>`).join("")]);
  }
  return pages;
}
function ltnDraw() {
  const pages = ltnPages();
  const [title, html] = pages[ltnPage % pages.length]();
  $("#ltntitle").textContent = title;
  $("#ltnbody").innerHTML = html;
  $("#ltnpage").textContent = "PAGE " + ((ltnPage % pages.length) + 1) + " OF " + pages.length;
  $("#ltnclock").textContent = clock(Date.now());
}
async function playLtn(ch, gen) {
  loadingOn(false);
  $("#ltn").classList.add("on");
  ltnPage = 0; ltnDraw();
  const reload = async (force) => { try { await ltnLoad(force); } catch { /* keep what we have */ } if (gen === tuneGen) ltnDraw(); };
  await reload(false);
  if (gen !== tuneGen) return;
  ltnPageTimer = setInterval(() => { ltnPage++; ltnDraw(); }, LTN.pageMs);
  ltnRefreshTimer = setInterval(() => reload(true), LTN.refreshMs);
}

/* ---------- YouTube channels and the Daily Bible: YouTube's embedded player ---------- */
let ytInfo = {}, ytListenTimer = null, ytPos = 0, twPlayer = null;
const ytEmbed = (path) => "https://www.youtube-nocookie.com/embed/" + path + (path.includes("?") ? "&" : "?") + "autoplay=1&loop=1&controls=0&disablekb=1&modestbranding=1&rel=0&iv_load_policy=3&fs=0&playsinline=1&enablejsapi=1";
function ytCmd(func, args) {
  const f = $("#ytf");
  if (f && f.contentWindow && /youtube/.test(f.getAttribute("src") || "")) f.contentWindow.postMessage(JSON.stringify({ event: "command", func, args: args || [] }), "*");
}
function ytAudio() { // follow the window's volume and mute (the hidden NDI copy is always silent here: YouTube's player cannot be captured for NDI audio)
  const quiet = NDI_MODE || S.muteWindow, vol = Math.min(1, Math.max(0, S.volume));
  if (/youtube/.test(($("#ytf").getAttribute("src")) || "")) { ytCmd(quiet ? "mute" : "unMute"); ytCmd("setVolume", [Math.round(vol * 100)]); }
  if (twPlayer) { try { twPlayer.setMuted(quiet); twPlayer.setVolume(vol); } catch { /* not ready yet */ } }
}
function ytShow(src, gen) {
  const f = $("#ytf");
  $("#yt").classList.add("on");
  f.onload = () => {
    let n = 0;
    clearInterval(ytListenTimer);
    ytListenTimer = setInterval(() => { // keeps asking until the player starts reporting what it is playing
      if (gen !== tuneGen || ++n > 150) return clearInterval(ytListenTimer);
      try { f.contentWindow.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*"); } catch { /* frame gone */ }
      ytAudio();
    }, 1000);
  };
  f.src = src;
}
function playYt(ch, gen) {
  loadingOn(false);
  ytInfo = {}; ytPos = 0;
  ltnTunedLive = isLive(ch);
  if (ltnTunedLive) return ytShow(ytEmbed("live_stream?channel=" + ch.ytid), gen);
  ytShow(ytEmbed(ch.yt.first ? ch.yt.first + "?list=" + ch.yt.list : "videoseries?list=" + ch.yt.list), gen);
}
// a show channel is "already on": pick the programme from the wall clock so everyone (and the NDI copy) sees the same thing, and join part-way in
const ytHash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
function ytPosition() {
  const ch = channels[tuned];
  if (NDI_MODE || !ch || ch.kind !== "yt" || !ch.yt.wall || ltnTunedLive || ytPos === 2) return;
  const pl = ytInfo.playlist;
  if (!Array.isArray(pl) || !pl.length) return;
  const n = Math.min(pl.length, 40), slot = 4 * 3600, now = Date.now() / 1000;
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
  if (d && (d.event === "infoDelivery" || d.event === "initialDelivery") && d.info) {
    Object.assign(ytInfo, d.info);
    if (d.info.videoData) ytInfo.videoData = { ...(ytInfo.videoData || {}), ...d.info.videoData };
    ytPosition();
  }
});
// the visible window reports where the playlist is; the hidden NDI copy follows it
const ytSync = () => (channels[tuned] && channels[tuned].kind === "yt" && ytInfo.playlistIndex != null ? { idx: ytInfo.playlistIndex, t: ytInfo.currentTime || 0 } : undefined);
function ytFollow(y) {
  if (!y || !channels[tuned] || channels[tuned].kind !== "yt" || ltnTunedLive) return;
  if (ytInfo.playlistIndex !== y.idx) ytCmd("playVideoAt", [y.idx]);
  else if (Math.abs((ytInfo.currentTime || 0) - y.t) > 6) ytCmd("seekTo", [y.t, true]);
}

/* ---------- Twitch: the live stream, or the trailer while offline ---------- */
function ltnTwitchLib() {
  return window.Twitch && window.Twitch.Player ? Promise.resolve() : new Promise((res, rej) => { const s = document.createElement("script"); s.src = "https://player.twitch.tv/js/embed/v1.js"; s.onload = res; s.onerror = rej; document.head.append(s); });
}
async function playTwitch(ch, gen) {
  loadingOn(false);
  ytInfo = {};
  ltnTunedLive = isLive(ch);
  if (!ltnTunedLive && LTN.twitchTrailer) return ytShow(ytEmbed(LTN.twitchTrailer + "?playlist=" + LTN.twitchTrailer), gen);
  $("#tw").classList.add("on");
  try { await ltnTwitchLib(); } catch { return flash("TWITCH UNAVAILABLE"); }
  if (gen !== tuneGen) return;
  $("#twp").textContent = "";
  // the player only runs on a page whose host is in "parent"; the app serves itself from http://localhost for exactly this
  twPlayer = new Twitch.Player("twp", { channel: LTN.twitch, parent: ["localhost"], width: "100%", height: "100%", autoplay: true, muted: false });
  setTimeout(ytAudio, 1500); setTimeout(ytAudio, 4000);
}

function ltnStop() {
  clearInterval(ltnPageTimer); clearInterval(ltnRefreshTimer); clearInterval(ytListenTimer);
  ltnPageTimer = ltnRefreshTimer = ytListenTimer = null;
  twPlayer = null;
  const l = $("#ltn"), y = $("#yt"), t = $("#tw");
  if (l) l.classList.remove("on");
  if (t) { t.classList.remove("on"); const p = $("#twp"); if (p) p.textContent = ""; }
  if (y) { y.classList.remove("on"); const f = $("#ytf"); if (f && /youtube/.test(f.getAttribute("src") || "")) f.src = "about:blank"; }
}
