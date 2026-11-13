// Love Thy Nerd channels, added to the lineup on this PC only:
//   LTN LATEST      rotating pages: Twitch status, the website's newest posts, the newest videos from every LTN YouTube channel
//   LTN DAILY BIBLE the LTN Daily Audio Bible playlist, played through in order (YouTube's own player)
// Loaded before player.js; everything here is used at run time, after player.js has defined the helpers ($, channels, flash, clock, ...).
const LTN = {
  numLatest: 158, numBible: 159, // moved up automatically if the lineup already uses them
  site: "https://lovethynerd.com/feed",
  twitch: "lovethynerd",
  playlist: "PLibAByUqZ70-6rRTHbRimCrxG7F-PCdSN", firstVideo: "QbDIEoXcMw8",
  pageMs: 12000, refreshMs: 10 * 60000,
  // YouTube channel ids (from the @handles). @LoveThyNerd and @LTNPlaysGames are the same channel.
  youtube: [
    "UC8eB_7RaI0sKhVbo8abjhEw", // @LoveThyNerd / @LTNPlaysGames
    "UCq4sMTRd7Unwidjl1PVP2qA", // @NCMUpodcastLTN
    "UC5FybvYjKGsMN_7f8M0YUMQ", // @NerdHistoryLTN
    "UCXX-ABXIGaUW3_NmY7LOQGg", // @TheRPGRundownLTN
    "UCybQk4iV2Ax6cMLWsIO-sUw", // @ThePullListLTN
    "UCiGN0i7cRwTLLv51DDMaM2w", // @SaveAndContinueLTN
    "UCcfPQJO0t5WfwMW08BVjhjg", // @ChristianBoardGamersLTN
    "UCUJCjVIfE5p2rrPgfNq_0XQ", // @FaithAndFandomLTN
    "UCda5tLEdzlfm3FtLi4rLQyA", // @SatelliteStoriesLTN
    "UCTDE0NRt9QqeUByTE6WM0kQ", // @TwoWordsLTN
    "UCT67V7nvgWuygXAORpiU7iA", // @ChurchNerdsLTN
    "UCXhCjTVjYof3F1tUfmem5hw", // @BibleThumpLTN
  ],
};

function injectLtnChannels() {
  const free = (n) => { while (channels.some((c) => c.num === n)) n++; return n; };
  const add = (c) => { if (!channels.some((x) => x.id === c.id)) channels.push(c); };
  add({ id: "ltn-latest", num: free(LTN.numLatest), name: "LTN LATEST", kind: "ltn", cat: "Love Thy Nerd", blurb: "The newest from Love Thy Nerd: Twitch, the website and every YouTube channel." });
  add({ id: "ltn-bible", num: free(LTN.numBible), name: "LTN DAILY BIBLE", kind: "bible", cat: "Love Thy Nerd", blurb: "The LTN Daily Audio Bible playlist, played through in order." });
  channels.sort((a, b) => a.num - b.num);
}

/* ---------- data ---------- */
let ltnData = null, ltnAt = 0, ltnPage = 0, ltnPageTimer = null, ltnRefreshTimer = null;
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ltnTag = (el, tag) => { const n = el.getElementsByTagName(tag)[0]; return n ? n.textContent.trim() : ""; };
async function ltnXml(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(url + " " + r.status);
  return new DOMParser().parseFromString(await r.text(), "text/xml");
}
async function ltnYoutube() {
  const out = [], shows = [];
  const res = await Promise.allSettled(LTN.youtube.map(async (id) => {
    const doc = await ltnXml("https://www.youtube.com/feeds/videos.xml?channel_id=" + id);
    const show = ltnTag(doc.documentElement, "title");
    const vids = [...doc.getElementsByTagName("entry")].slice(0, 5).map((e) => ({ id: ltnTag(e, "yt:videoId"), t: ltnTag(e, "title"), at: Date.parse(ltnTag(e, "published")) || 0, show }));
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
  const g = (p) => fetch("https://decapi.me/twitch/" + p + "/" + LTN.twitch, { cache: "no-store" }).then((r) => r.text()).then((t) => t.trim()).catch(() => "");
  const [uptime, title, game] = await Promise.all([g("uptime"), g("title"), g("game")]);
  return { live: !!uptime && !/offline|not found|error|unavailable/i.test(uptime), uptime, title, game };
}
async function ltnLoad(force) {
  if (!force && ltnData && Date.now() - ltnAt < LTN.refreshMs) return;
  const [yt, site, tw] = await Promise.allSettled([ltnYoutube(), ltnSite(), ltnTwitch()]);
  ltnData = { yt: yt.value || (ltnData && ltnData.yt) || null, site: site.value || (ltnData && ltnData.site) || null, tw: tw.value || (ltnData && ltnData.tw) || null };
  ltnAt = Date.now();
}

/* ---------- pages ---------- */
const ago = (at) => {
  const m = Math.max(1, Math.round((Date.now() - at) / 60000));
  if (m < 60) return m + " MIN AGO";
  const h = Math.round(m / 60); if (h < 48) return h + " HR" + (h > 1 ? "S" : "") + " AGO";
  const d = Math.round(h / 24); return d < 60 ? d + " DAYS AGO" : Math.round(d / 30) + " MONTHS AGO";
};
function ltnPages() {
  const d = ltnData, pages = [];
  if (!d) return [() => ["LOVE THY NERD", `<div class="lmsg">Getting the latest...</div>`]];
  if (d.tw) pages.push(() => {
    const t = d.tw;
    const img = t.live ? `<img src="https://static-cdn.jtvnw.net/previews-ttv/live_user_${LTN.twitch}-1280x720.jpg?t=${Math.floor(Date.now() / 60000)}" onerror="this.style.visibility='hidden'">` : `<div class="loff">OFFLINE</div>`;
    return ["TWITCH", `<div class="ltw"><div class="ltwimg">${img}</div><div class="ltwtxt"><div class="lstat ${t.live ? "live" : ""}">${t.live ? "&#9679; LIVE NOW" : "NOT LIVE RIGHT NOW"}</div><div class="ltitle">${esc(t.title || "")}</div><div class="lsub">${esc([t.game, t.live && t.uptime ? "live for " + t.uptime : ""].filter(Boolean).join("  •  "))}</div><div class="lsub">twitch.tv/${esc(LTN.twitch)}</div></div></div>`];
  });
  if (d.site && d.site.length) for (let i = 0; i < d.site.length; i += 3) pages.push(() => ["LOVETHYNERD.COM", d.site.slice(i, i + 3).map((p) => `<div class="lpost">${p.img ? `<img src="${esc(p.img)}" onerror="this.style.display='none'">` : ""}<div class="lptxt"><div class="lpt">${esc(p.t)}</div><div class="lps">${esc([p.cat, p.by, ago(p.at)].filter(Boolean).join("  •  "))}</div><div class="lpx">${esc(p.text)}</div></div></div>`).join("")]);
  if (d.yt) {
    const vids = d.yt.videos.slice(0, 18);
    for (let i = 0; i < vids.length; i += 6) pages.push(() => ["NEW ON YOUTUBE", `<div class="lgrid">${vids.slice(i, i + 6).map((v) => `<div class="lc"><img src="https://i.ytimg.com/vi/${esc(v.id)}/mqdefault.jpg" onerror="this.style.visibility='hidden'"><div class="lct">${esc(v.t)}</div><div class="lcs">${esc(v.show)}  •  ${ago(v.at)}</div></div>`).join("")}</div>`]);
    for (let i = 0; i < d.yt.shows.length; i += 6) pages.push(() => ["OUR SHOWS", d.yt.shows.slice(i, i + 6).map((v) => `<div class="lrow"><span class="lrs">${esc(v.show)}</span><span class="lrt">${esc(v.t)}</span><span class="lra">${ago(v.at)}</span></div>`).join("")]);
  }
  return pages.length ? pages : [() => ["LOVE THY NERD", `<div class="lmsg">Nothing to show right now.</div>`]];
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

/* ---------- LTN daily audio Bible: YouTube's embedded player, playlist played through ---------- */
let ytInfo = {};
let ytListenTimer = null;
const bibleTitle = () => (ytInfo.videoData && ytInfo.videoData.title) || "LTN Daily Audio Bible";
function ytCmd(func, args) {
  const f = $("#ytf");
  if (f && f.contentWindow && /youtube/.test(f.getAttribute("src") || "")) f.contentWindow.postMessage(JSON.stringify({ event: "command", func, args: args || [] }), "*");
}
function ytAudio() { // follow the window's volume and mute (the hidden NDI copy is always silent here; its sound is carried by NDI only when the audio is capturable)
  if (!/youtube/.test($("#ytf").getAttribute("src") || "")) return;
  const quiet = NDI_MODE || S.muteWindow;
  ytCmd(quiet ? "mute" : "unMute");
  ytCmd("setVolume", [Math.round(Math.min(1, Math.max(0, S.volume)) * 100)]);
}
function playBible(ch, gen) {
  loadingOn(false);
  ytInfo = {};
  $("#yt").classList.add("on");
  const f = $("#ytf");
  f.onload = () => {
    let n = 0;
    clearInterval(ytListenTimer);
    ytListenTimer = setInterval(() => { // keeps asking until the player starts reporting what it is playing
      if (gen !== tuneGen || ++n > 120) return clearInterval(ytListenTimer);
      f.contentWindow.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*");
      ytAudio();
    }, 1000);
  };
  f.src = "https://www.youtube-nocookie.com/embed/" + LTN.firstVideo + "?list=" + LTN.playlist + "&autoplay=1&loop=1&controls=0&disablekb=1&modestbranding=1&rel=0&iv_load_policy=3&fs=0&playsinline=1&enablejsapi=1";
}
addEventListener("message", (e) => {
  if (!/youtube/.test(e.origin || "")) return;
  let d = e.data;
  try { if (typeof d === "string") d = JSON.parse(d); } catch { return; }
  if (d && (d.event === "infoDelivery" || d.event === "initialDelivery") && d.info) {
    Object.assign(ytInfo, d.info);
    if (d.info.videoData) ytInfo.videoData = { ...(ytInfo.videoData || {}), ...d.info.videoData };
  }
});
// the visible window reports where the playlist is; the hidden NDI copy follows it
const ytSync = () => (channels[tuned] && channels[tuned].kind === "bible" && ytInfo.playlistIndex != null ? { idx: ytInfo.playlistIndex, t: ytInfo.currentTime || 0 } : undefined);
function ytFollow(y) {
  if (!y || !channels[tuned] || channels[tuned].kind !== "bible") return;
  if (ytInfo.playlistIndex !== y.idx) ytCmd("playVideoAt", [y.idx]);
  else if (Math.abs((ytInfo.currentTime || 0) - y.t) > 6) ytCmd("seekTo", [y.t, true]);
}

function ltnStop() {
  clearInterval(ltnPageTimer); clearInterval(ltnRefreshTimer); clearInterval(ytListenTimer);
  ltnPageTimer = ltnRefreshTimer = ytListenTimer = null;
  const l = $("#ltn"), y = $("#yt");
  if (l) l.classList.remove("on");
  if (y) { y.classList.remove("on"); const f = $("#ytf"); if (f && /youtube/.test(f.getAttribute("src") || "")) f.src = "about:blank"; }
}
