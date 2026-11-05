(() => {
  "use strict";

  const CSV_PATH = "earworms.csv";
  const COLUMNS = ["date", "song", "artist", "lyric", "youtube_url", "type", "notes"];
  const TYPE_LABEL = { wakeup: "☀️ Woke up with it", stuck: "🌀 Stuck all day" };

  // Fallback repo for the "edit on GitHub" link when not served from *.github.io
  const FALLBACK_REPO = { owner: "mhendri", repo: "earworm", branch: "master" };

  const $ = (sel) => document.querySelector(sel);
  let all = [];
  let filter = "all";
  let query = "";

  // ---------- CSV ----------
  function parseCSV(text) {
    const rows = [];
    let row = [], field = "", inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); rows.push(row); row = []; field = "";
      } else field += c;
    }
    if (field !== "" || row.length) { row.push(field); rows.push(row); }

    const header = (rows.shift() || []).map((h) => h.trim().toLowerCase());
    return rows
      .filter((r) => r.some((v) => v.trim() !== ""))
      .map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] || "").trim()])));
  }

  function toCSVField(v) {
    v = String(v ?? "");
    return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  }

  // ---------- helpers ----------
  function youtubeId(url) {
    if (!url) return null;
    try {
      const u = new URL(url);
      const host = u.hostname.replace(/^www\.|^m\.|^music\./, "");
      if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
      if (host === "youtube.com") {
        if (u.searchParams.get("v")) return u.searchParams.get("v");
        const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{6,})/);
        if (m) return m[1];
      }
    } catch (_) { /* not a URL */ }
    return null;
  }

  function playUrl(w) {
    if (w.youtube_url) return w.youtube_url;
    const q = encodeURIComponent(`${w.song} ${w.artist}`.trim());
    return `https://www.youtube.com/results?search_query=${q}`;
  }

  function parseDate(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || "");
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }

  function prettyDate(s) {
    const d = parseDate(s);
    if (!d) return s || "";
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  }

  function songKey(w) {
    return `${w.song}|${w.artist}`.toLowerCase();
  }

  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else node.setAttribute(k, v);
    }
    for (const c of children) if (c != null) node.append(c);
    return node;
  }

  // ---------- now playing ----------
  function showNow(w, { shuffled = false } = {}) {
    const lyric = $("#now-lyric");
    lyric.classList.remove("loading");
    lyric.textContent = w.lyric || "…(hums tunelessly)…";
    $("#now-song").textContent = w.song;
    $("#now-artist").textContent = w.artist;
    const type = $("#now-type");
    type.textContent = TYPE_LABEL[w.type] || w.type || "";
    type.className = `badge ${w.type || ""}`;
    $("#now-date").textContent = prettyDate(w.date);
    $("#now-notes").textContent = w.notes || "";
    $("#vinyl-label").textContent = w.song;
    $("#now-kicker").textContent = shuffled ? "Blast from the past" : "Currently stuck in my head";
    $("#back-latest").classList.toggle("hidden", !shuffled);

    const id = youtubeId(w.youtube_url);
    const play = $("#now-play");
    const embed = $("#embed");
    embed.innerHTML = "";
    embed.classList.add("hidden");
    play.href = playUrl(w);
    play.textContent = id ? "▶ Play it here" : "▶ Find it on YouTube";
    play.onclick = id
      ? (e) => {
          e.preventDefault();
          embed.innerHTML = "";
          embed.append(el("iframe", {
            src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`,
            title: `${w.song} on YouTube`,
            allow: "autoplay; encrypted-media; picture-in-picture",
            allowfullscreen: "",
          }));
          embed.classList.remove("hidden");
        }
      : null;
  }

  // ---------- stats ----------
  function renderStats() {
    const counts = new Map();
    const artists = new Map();
    for (const w of all) {
      counts.set(songKey(w), (counts.get(songKey(w)) || 0) + 1);
      if (w.artist) artists.set(w.artist, (artists.get(w.artist) || 0) + 1);
    }
    const top = (m) => [...m.entries()].sort((a, b) => b[1] - a[1])[0];

    const topSong = top(counts);
    const topSongObj = topSong && all.find((w) => songKey(w) === topSong[0]);
    const topArtist = top(artists);
    const wakeups = all.filter((w) => w.type === "wakeup").length;

    const stats = [
      { value: all.length, label: "earworms logged" },
      { value: all.length ? `${Math.round((wakeups / all.length) * 100)}%` : "–", label: "were there when I woke up" },
      { value: topSongObj ? topSongObj.song : "–", label: topSong ? `repeat offender (${topSong[1]}×)` : "repeat offender", small: true },
      { value: topArtist ? topArtist[0] : "–", label: "most-squatting artist", small: true },
    ];

    const wrap = $("#stats");
    wrap.innerHTML = "";
    for (const s of stats) {
      wrap.append(el("div", { class: "stat" },
        el("div", { class: `stat-value${s.small ? " small" : ""}`, text: String(s.value) }),
        el("div", { class: "stat-label", text: s.label }),
      ));
    }
    $("#count-foot").textContent = `${all.length} worm${all.length === 1 ? "" : "s"} and counting`;
  }

  // ---------- history cards ----------
  function renderCards() {
    const counts = new Map();
    for (const w of all) counts.set(songKey(w), (counts.get(songKey(w)) || 0) + 1);

    const q = query.toLowerCase();
    const list = all.filter((w) =>
      (filter === "all" || w.type === filter) &&
      (!q || [w.song, w.artist, w.lyric, w.notes].join(" ").toLowerCase().includes(q))
    );

    const ol = $("#cards");
    ol.innerHTML = "";
    list.forEach((w, i) => {
      const id = youtubeId(w.youtube_url);
      const top = id
        ? el("a", { class: "card-thumb", href: playUrl(w), target: "_blank", rel: "noopener", "aria-label": `Play ${w.song}` },
            el("img", { src: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, alt: "", loading: "lazy" }),
            el("span", { class: "play-dot", text: "▶" }))
        : el("div", { class: "card-strip" });

      const repeats = counts.get(songKey(w));
      const card = el("li", { class: "card", style: `animation-delay:${Math.min(i, 12) * 40}ms` },
        repeats > 1 ? el("span", { class: "repeat-tag", text: `🔁 ${repeats}×` }) : null,
        top,
        el("div", { class: "card-body" },
          el("p", { class: "card-lyric", text: `“${w.lyric}”` }),
          el("p", { class: "card-song", text: w.song }),
          w.artist ? el("p", { class: "card-artist", text: w.artist }) : null,
          w.notes ? el("p", { class: "card-notes", text: w.notes }) : null,
          el("div", { class: "card-foot" },
            el("span", { class: "card-date", text: `${w.type === "wakeup" ? "☀️" : w.type === "stuck" ? "🌀" : "🎵"} ${prettyDate(w.date)}` }),
            el("div", { class: "card-actions" },
              (() => {
                const b = el("button", { class: "icon-btn", type: "button", title: "Show at the top", text: "⬆ Spin" });
                b.addEventListener("click", () => {
                  showNow(w, { shuffled: w !== all[0] });
                  $("#now").scrollIntoView({ behavior: "smooth" });
                });
                return b;
              })(),
              el("a", { class: "icon-btn", href: playUrl(w), target: "_blank", rel: "noopener", text: "▶ YouTube" }),
            ),
          ),
        ),
      );
      ol.append(card);
    });
    $("#empty").classList.toggle("hidden", list.length > 0);
  }

  // ---------- add form ----------
  function repoInfo() {
    const host = location.hostname;
    if (host.endsWith(".github.io")) {
      const owner = host.split(".")[0];
      const seg = location.pathname.split("/").filter(Boolean)[0];
      const repo = seg && !seg.includes(".") ? seg : `${owner}.github.io`;
      return { owner, repo, branch: FALLBACK_REPO.branch };
    }
    return FALLBACK_REPO;
  }

  function setupForm() {
    const form = $("#add-form");
    const today = new Date();
    form.date.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const { owner, repo, branch } = repoInfo();
    $("#edit-link").href = `https://github.com/${owner}/${repo}/edit/${branch}/${CSV_PATH}`;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const line = COLUMNS.map((c) => toCSVField((data.get(c) || "").toString().trim())).join(",");
      $("#csv-line").textContent = line;
      $("#output").classList.remove("hidden");
    });

    $("#copy").addEventListener("click", async () => {
      const btn = $("#copy");
      try {
        await navigator.clipboard.writeText($("#csv-line").textContent);
        btn.textContent = "✅ Copied!";
      } catch (_) {
        btn.textContent = "Select & copy manually";
      }
      setTimeout(() => (btn.textContent = "📋 Copy"), 1800);
    });
  }

  // ---------- background notes ----------
  function spawnNotes() {
    const wrap = $(".bg-notes");
    const glyphs = ["♪", "♫", "♬", "♩", "🎵", "🎶"];
    const colors = ["#ff4fa3", "#ffd23f", "#3de8ff", "#7cff6b"];
    for (let i = 0; i < 18; i++) {
      const s = document.createElement("span");
      s.textContent = glyphs[i % glyphs.length];
      s.style.left = `${Math.random() * 100}%`;
      s.style.color = colors[i % colors.length];
      s.style.fontSize = `${18 + Math.random() * 30}px`;
      s.style.animationDuration = `${14 + Math.random() * 18}s`;
      s.style.animationDelay = `${-Math.random() * 30}s`;
      wrap.append(s);
    }
  }

  // ---------- boot ----------
  async function init() {
    spawnNotes();
    setupForm();
    $("#now-lyric").classList.add("loading");

    try {
      const res = await fetch(CSV_PATH, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      all = parseCSV(await res.text())
        .filter((w) => w.song || w.lyric)
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    } catch (err) {
      console.error(err);
      $("#now-lyric").textContent = "Couldn't load earworms.csv. (If you opened this file directly, run a local server.)";
      return;
    }

    if (!all.length) {
      $("#now-lyric").textContent = "Silence… for now. Add your first earworm below!";
      renderStats();
      return;
    }

    showNow(all[0]);
    renderStats();
    renderCards();

    $("#shuffle").addEventListener("click", () => {
      const pool = all.length > 1 ? all.slice(1) : all;
      showNow(pool[Math.floor(Math.random() * pool.length)], { shuffled: all.length > 1 });
    });
    $("#back-latest").addEventListener("click", () => showNow(all[0]));
    $("#search").addEventListener("input", (e) => { query = e.target.value.trim(); renderCards(); });
    document.querySelectorAll(".chip").forEach((chip) =>
      chip.addEventListener("click", () => {
        document.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === chip));
        filter = chip.dataset.filter;
        renderCards();
      })
    );
  }

  init();
})();
