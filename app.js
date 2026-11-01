'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// Einschlafkalender – app.js
// ═══════════════════════════════════════════════════════════════════════════

const HAMBURG = { lat: 53.5753, lon: 10.0153 };

const MONTHS_DE = ['Januar','Februar','März','April','Mai','Juni',
                   'Juli','August','September','Oktober','November','Dezember'];
const MONTHS_SHORT = ['JAN','FEB','MRZ','APR','MAI','JUN',
                      'JUL','AUG','SEP','OKT','NOV','DEZ'];
const WEEKDAYS_DE = ['Sonntag','Montag','Dienstag','Mittwoch',
                     'Donnerstag','Freitag','Samstag'];

// ── Datum / Zeitzone ────────────────────────────────────────────────────────

/** Effektives Datum: Wechsel um 12:00 Uhr Berlin-Zeit */
function getEffectiveDate() {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', hour12: false
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map(p => [p.type, p.value]));
  const y = parseInt(parts.year);
  const m = parseInt(parts.month) - 1;
  const d = parseInt(parts.day);
  const h = parseInt(parts.hour);

  const date = new Date(y, m, d);
  if (h < 12) date.setDate(date.getDate() - 1); // vor Mittag: gestern
  return date;
}

function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 1);
  return Math.floor((date - start) / 86400000) + 1;
}

function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const jan4 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - jan4) / 86400000 - 3 + (jan4.getDay() + 6) % 7) / 7);
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// ── Sommerzeit (Deutschland) ────────────────────────────────────────────────

function lastSundayOf(year, month0) {
  const d = new Date(year, month0 + 1, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function isCEST(date) {
  const start = lastSundayOf(date.getFullYear(), 2); // letzter So März
  const end   = lastSundayOf(date.getFullYear(), 9); // letzter So Oktober
  return date >= start && date < end;
}

// ── Feiertage ───────────────────────────────────────────────────────────────

function calcEaster(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day   = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

function mk(month1, day) { return `${month1}-${day}`; } // Schlüssel m-d

function getDayInfo(date) {
  const year = date.getFullYear();
  const key  = mk(date.getMonth() + 1, date.getDate());
  const easter = calcEaster(year);

  // Gesetzliche Feiertage (bundesweit + Hamburg)
  const legal = {
    [mk(1,  1)]:  'Neujahr',
    [mk(5,  1)]:  'Tag der Arbeit',
    [mk(10, 3)]:  'Tag der Deutschen Einheit',
    [mk(10, 31)]: 'Reformationstag',  // Hamburg
    [mk(12, 25)]: '1. Weihnachtstag',
    [mk(12, 26)]: '2. Weihnachtstag',
    // Osterabhängige Feiertage
    [mk(addDays(easter,-2).getMonth()+1, addDays(easter,-2).getDate())]: 'Karfreitag',
    [mk(easter.getMonth()+1, easter.getDate())]:                         'Ostersonntag',
    [mk(addDays(easter,1).getMonth()+1,  addDays(easter,1).getDate())]:  'Ostermontag',
    [mk(addDays(easter,39).getMonth()+1, addDays(easter,39).getDate())]: 'Christi Himmelfahrt',
    [mk(addDays(easter,49).getMonth()+1, addDays(easter,49).getDate())]: 'Pfingstsonntag',
    [mk(addDays(easter,50).getMonth()+1, addDays(easter,50).getDate())]: 'Pfingstmontag',
  };

  // Besondere Tage
  const special = {
    [mk(2,14)]:  'Valentinstag',
    [mk(10,31)]: 'Halloween',         // wird durch Reformationstag überschrieben
    [mk(12,24)]: 'Heiligabend',
    [mk(12,31)]: 'Silvester',
    [mk(6,21)]:  'Sommeranfang',
    [mk(12,21)]: 'Winteranfang',
  };

  // Zeitumstellung
  const clkFwd  = lastSundayOf(year, 2);
  const clkBack = lastSundayOf(year, 9);
  special[mk(clkFwd.getMonth()+1,  clkFwd.getDate())]  = 'Sommerzeit beginnt';
  special[mk(clkBack.getMonth()+1, clkBack.getDate())] = 'Winterzeit beginnt';

  const legalName   = legal[key]   || null;
  const specialName = special[key] || null;
  const isSunday    = date.getDay() === 0;

  return {
    name:  legalName || specialName,
    isRed: isSunday || !!legalName
  };
}

// ── Mondphase ────────────────────────────────────────────────────────────────

function getMoonPhase(date) {
  const known = new Date(2000, 0, 6, 18, 14); // Neumond 6. Jan 2000
  const cycle = 29.530589;
  const diff  = (date - known) / 86400000;
  const phase = ((diff % cycle) + cycle) % cycle;

  if (phase < 1.85)  return { emoji: '🌑', name: 'Neumond' };
  if (phase < 7.38)  return { emoji: '🌒', name: 'Zunehmend' };
  if (phase < 9.22)  return { emoji: '🌓', name: 'Erstes Viertel' };
  if (phase < 14.77) return { emoji: '🌔', name: 'Zunehmend' };
  if (phase < 16.61) return { emoji: '🌕', name: 'Vollmond' };
  if (phase < 22.15) return { emoji: '🌖', name: 'Abnehmend' };
  if (phase < 23.99) return { emoji: '🌗', name: 'Letztes Viertel' };
  return { emoji: '🌘', name: 'Abnehmend' };
}

// ── Sonnenuntergang Hamburg ──────────────────────────────────────────────────

function getSunset(date) {
  const lat = HAMBURG.lat * Math.PI / 180;
  const lon = HAMBURG.lon;
  const doy = getDayOfYear(date);

  const decl = 23.45 * Math.PI / 180 *
               Math.sin((2 * Math.PI / 365) * (284 + doy));

  const cosH = -Math.tan(lat) * Math.tan(decl);
  if (cosH < -1 || cosH > 1) return null;

  const H  = Math.acos(cosH) * 180 / Math.PI;
  const B  = (2 * Math.PI / 365) * (doy - 81);
  const ET = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);

  const sunsetUTC = 720 + H * 4 - lon * 4 - ET;        // Minuten ab Mitternacht UTC
  const offset    = isCEST(date) ? 120 : 60;            // CEST = UTC+2, CET = UTC+1
  const local     = sunsetUTC + offset;

  const h = Math.floor(local / 60) % 24;
  const m = Math.round(local % 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

// ── Kalenderblatt füllen ────────────────────────────────────────────────────

function renderCalendarInfo(date) {
  const info   = getDayInfo(date);
  const moon   = getMoonPhase(date);
  const sunset = getSunset(date);
  const kw     = getISOWeek(date);

  const el = id => document.getElementById(id);

  el('page-month').textContent   = MONTHS_SHORT[date.getMonth()];
  el('page-day').textContent     = date.getDate();
  el('page-day').className       = 'cal-page-day' + (info.isRed ? ' is-red' : '');
  el('page-day').setAttribute('aria-label',
    `${date.getDate()}. ${MONTHS_DE[date.getMonth()]} ${date.getFullYear()}`);
  el('page-weekday').textContent = WEEKDAYS_DE[date.getDay()].toUpperCase();
  el('page-holiday').textContent = info.name || '';

  el('page-kw').textContent     = `KW ${kw}`;
  el('page-moon').textContent   = moon.emoji;
  el('page-moon').title         = moon.name;
  if (sunset) {
    el('page-sunset').textContent = `☀ ${sunset}`;
    el('page-sunset').title       = `Sonnenuntergang Hamburg: ${sunset} Uhr`;
  }
}

// ── Sleep-Timer ─────────────────────────────────────────────────────────────

let timerTO1 = null;
let timerTO2 = null;
let fadeIV   = null;

function clearAllTimers() {
  clearTimeout(timerTO1);
  clearTimeout(timerTO2);
  clearInterval(fadeIV);
  timerTO1 = timerTO2 = fadeIV = null;
}

function setTimer(minutes) {
  clearAllTimers();
  const audio  = document.getElementById('audio');
  const status = document.getElementById('timer-status');

  // Alle Buttons zurücksetzen
  document.querySelectorAll('.cal-timer-btn').forEach(b => b.classList.remove('active'));

  if (minutes === 0) {
    // Bis zum Ende – audio.onended kümmert sich darum
    if (status) status.textContent = 'Läuft bis zum Ende.';
    // Den "Ende"-Button markieren
    document.getElementById('timer-end-btn').classList.add('active');
    return;
  }

  // Den passenden Button markieren
  document.querySelectorAll('.cal-timer-btn[data-min]').forEach(b => {
    if (parseInt(b.dataset.min) === minutes) b.classList.add('active');
  });

  const totalMs  = minutes * 60 * 1000;
  const fadeMs   = 30 * 1000;
  const fadeStart = totalMs - fadeMs;
  const endTime  = Date.now() + totalMs;

  const updateStatus = () => {
    const rem = Math.ceil((endTime - Date.now()) / 60000);
    if (status && rem > 0) status.textContent = `Noch ca. ${rem} Min.`;
  };
  updateStatus();

  // Fade-out starten
  timerTO1 = setTimeout(() => {
    if (!audio || audio.paused) return;
    let vol = audio.volume;
    fadeIV = setInterval(() => {
      vol = Math.max(0, vol - 0.05);
      audio.volume = vol;
      if (vol <= 0) clearInterval(fadeIV);
    }, fadeMs / 20);
  }, Math.max(0, fadeStart));

  // Stop
  timerTO2 = setTimeout(() => {
    if (audio) { audio.pause(); audio.volume = 1; }
    clearAllTimers();
    updatePlayState(false);
    if (status) status.textContent = '';
    document.querySelectorAll('.cal-timer-btn').forEach(b => b.classList.remove('active'));
  }, totalMs);

  // Status alle 30 s updaten
  const statusIV = setInterval(() => {
    if (!timerTO2) { clearInterval(statusIV); return; }
    updateStatus();
  }, 30000);
}

// ── Wiedergabeposition (localStorage) ────────────────────────────────────────

function posKey(storyId) { return `ek_pos_${storyId}`; }

function savePos(audio) {
  const id = audio.dataset.storyId;
  if (!id || audio.currentTime < 15) return;
  if (audio.duration && audio.currentTime > audio.duration - 20) {
    localStorage.removeItem(posKey(id));
    return;
  }
  localStorage.setItem(posKey(id), audio.currentTime.toFixed(1));
}

function loadPos(storyId) {
  const v = localStorage.getItem(posKey(storyId));
  return v ? parseFloat(v) : null;
}

function fmtTime(s) {
  if (!isFinite(s)) return '0:00';
  return `${Math.floor(s / 60)}:${(Math.floor(s % 60)).toString().padStart(2,'0')}`;
}

// ── Play-State ────────────────────────────────────────────────────────────────

function updatePlayState(playing) {
  const btn  = document.getElementById('play-btn');
  const icon = document.getElementById('play-icon');
  if (!btn || !icon) return;
  icon.textContent = playing ? '⏸' : '▶';
  btn.setAttribute('aria-label', playing ? 'Pause' : 'Abspielen');
  btn.dataset.playing = playing ? 'true' : '';
}

function showControls() {
  document.getElementById('progress-wrap').hidden = false;
  document.getElementById('timer-section').hidden  = false;
}

// ── Weiterhören-Dialog ────────────────────────────────────────────────────────

function showResumeDialog(story, savedPos, onContinue, onRestart) {
  const dialog = document.getElementById('resume-dialog');
  const text   = document.getElementById('resume-text');
  if (!dialog) return;
  text.textContent = `Du bist bei ${fmtTime(savedPos)} eingeschlafen – weiterhören?`;
  dialog.hidden = false;
  document.getElementById('resume-continue').onclick = () => { dialog.hidden = true; onContinue(); };
  document.getElementById('resume-restart').onclick  = () => { dialog.hidden = true; onRestart(); };
}

// ── Gestern-Overlay ───────────────────────────────────────────────────────────

function fillYesterdayOverlay(date, story) {
  const el = id => document.getElementById(id);
  const info = getDayInfo(date);

  el('yd-month').textContent   = MONTHS_SHORT[date.getMonth()];
  el('yd-day').textContent     = date.getDate();
  el('yd-day').className       = 'cal-page-day' + (info.isRed ? ' is-red' : '');
  el('yd-weekday').textContent = WEEKDAYS_DE[date.getDay()].toUpperCase();
  el('yd-holiday').textContent = info.name || '';
  el('yesterday-title').textContent = story.title;

  const meta = [story.ort, story.dauer].filter(Boolean).join(' · ');
  el('yd-meta').textContent = meta;
  if (story.pageUrl) el('yd-link').href = story.pageUrl;

  const ydAudio = el('yd-audio');
  ydAudio.src = story.mp3Url;
  ydAudio.dataset.storyId = story.id;

  const ydBtn = el('yd-play-btn');
  ydBtn.onclick = () => {
    if (ydAudio.paused) { ydAudio.play(); ydBtn.textContent = '⏸'; }
    else                { ydAudio.pause(); ydBtn.textContent = '▶'; }
  };
}

// ── JSON-LD ───────────────────────────────────────────────────────────────────

function setJsonLD(story, date) {
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite',
        name: 'Einschlafkalender',
        url: 'https://einschlafkalender.de',
        description: 'Jeden Abend eine neue Hörgeschichte zum Einschlafen.' },
      { '@type': 'AudioObject',
        name: story.title,
        description: `Gute-Nacht-Geschichte: ${story.title}`,
        contentUrl: story.mp3Url,
        encodingFormat: 'audio/mpeg',
        url: story.pageUrl,
        uploadDate: date.toISOString().split('T')[0],
        author: { '@type': 'Person', name: 'Jens Salsa' } }
    ]
  };
  const el = document.getElementById('jsonld');
  if (el) el.textContent = JSON.stringify(ld);
}

// ── Haupt-Init ────────────────────────────────────────────────────────────────

async function init() {
  const today = getEffectiveDate();
  const yesterday = addDays(today, -1);

  // Kalenderblatt
  renderCalendarInfo(today);

  // Remnant (gestern)
  document.getElementById('remnant-month').textContent = MONTHS_SHORT[yesterday.getMonth()];
  document.getElementById('remnant-day').textContent   = yesterday.getDate();

  // Seitentitel
  document.title =
    `Einschlafkalender – ${WEEKDAYS_DE[today.getDay()]}, ${today.getDate()}. ${MONTHS_DE[today.getMonth()]}`;

  // Abreiß-Animation beim ersten Besuch des Tages
  const visitKey  = 'ek_lastvisit';
  const todayKey  = today.toISOString().split('T')[0];
  if (localStorage.getItem(visitKey) !== todayKey) {
    localStorage.setItem(visitKey, todayKey);
    setTimeout(() => document.getElementById('cal-page').classList.add('tearing'), 80);
  }

  // Geschichten laden
  let stories = [];
  try {
    const r = await fetch('stories.json');
    stories  = await r.json();
  } catch {
    document.getElementById('story-title').textContent = 'Keine Geschichte verfügbar.';
    return;
  }
  if (!stories.length) return;

  const doy          = getDayOfYear(today);
  const story        = stories[(doy - 1) % stories.length];
  const ydStory      = stories[(getDayOfYear(yesterday) - 1) % stories.length];

  // Geschichte rendern
  document.getElementById('story-title').textContent =
    story.title;
  document.getElementById('story-meta').textContent =
    [story.ort, story.dauer].filter(Boolean).join(' · ');
  const storyLink = document.getElementById('story-link');
  if (storyLink && story.pageUrl) storyLink.href = story.pageUrl;

  // Audio
  const audio = document.getElementById('audio');
  audio.src   = story.mp3Url;
  audio.dataset.storyId = story.id;

  // Gestern-Overlay
  fillYesterdayOverlay(yesterday, ydStory);

  // Spruch laden
  try {
    const sr    = await fetch('sprueche.json');
    const sprueche = await sr.json();
    if (sprueche.length) {
      const raw = sprueche[(doy - 1) % sprueche.length];
      document.getElementById('cal-quote').textContent =
        typeof raw === 'string' ? raw : raw.text;
    }
  } catch { /* optional */ }

  // JSON-LD
  setJsonLD(story, today);

  // Media Session
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title:  story.title,
      artist: 'K54 Stadtvampir',
      album:  'Einschlafkalender',
      artwork: story.coverUrl
        ? [{ src: story.coverUrl, sizes: '512x512', type: 'image/webp' }]
        : []
    });
    navigator.mediaSession.setActionHandler('play',
      () => { audio.play(); updatePlayState(true); });
    navigator.mediaSession.setActionHandler('pause',
      () => { audio.pause(); updatePlayState(false); savePos(audio); });
    navigator.mediaSession.setActionHandler('seekbackward',
      () => { audio.currentTime = Math.max(0, audio.currentTime - 15); });
    navigator.mediaSession.setActionHandler('seekforward',
      () => { audio.currentTime = Math.min(audio.duration || Infinity, audio.currentTime + 15); });
  }

  // Play-Button
  document.getElementById('play-btn').addEventListener('click', () => {
    if (audio.paused) {
      const saved = loadPos(story.id);
      if (saved && saved > 30) {
        showResumeDialog(
          story, saved,
          () => { audio.currentTime = saved; audio.play(); updatePlayState(true); showControls(); },
          () => { localStorage.removeItem(posKey(story.id)); audio.currentTime = 0;
                  audio.play(); updatePlayState(true); showControls(); }
        );
      } else {
        audio.play();
        updatePlayState(true);
        showControls();
      }
    } else {
      audio.pause();
      updatePlayState(false);
      savePos(audio);
    }
  });

  // Skip
  document.getElementById('skip-back').addEventListener('click', () => {
    audio.currentTime = Math.max(0, audio.currentTime - 15);
  });
  document.getElementById('skip-fwd').addEventListener('click', () => {
    audio.currentTime = Math.min(audio.duration || Infinity, audio.currentTime + 15);
  });

  // Zeit-Anzeige
  audio.addEventListener('timeupdate', () => {
    document.getElementById('time-display').textContent =
      `${fmtTime(audio.currentTime)} / ${fmtTime(audio.duration)}`;
  });

  // Ende
  audio.addEventListener('ended', () => {
    updatePlayState(false);
    localStorage.removeItem(posKey(story.id));
    clearAllTimers();
    document.getElementById('timer-status').textContent = '';
    document.querySelectorAll('.cal-timer-btn').forEach(b => b.classList.remove('active'));
  });

  audio.addEventListener('pause', () => savePos(audio));

  // Remnant-Klick → Gestern-Overlay
  document.getElementById('cal-remnant').addEventListener('click', () => {
    document.getElementById('yesterday-overlay').hidden = false;
  });
  document.getElementById('overlay-close').addEventListener('click', () => {
    document.getElementById('yesterday-overlay').hidden = true;
    const ya = document.getElementById('yd-audio');
    if (ya && !ya.paused) ya.pause();
    document.getElementById('yd-play-btn').textContent = '▶';
  });

  // Teilen
  document.getElementById('share-btn').addEventListener('click', async () => {
    const data = {
      title: 'Einschlafkalender',
      text:  `Heute Abend im Einschlafkalender: ${story.title} 🌙`,
      url:   'https://einschlafkalender.de'
    };
    try {
      if (navigator.share && navigator.canShare && navigator.canShare(data)) {
        await navigator.share(data);
      } else {
        await navigator.clipboard.writeText(`${data.text}\n${data.url}`);
        const btn = document.getElementById('share-btn');
        btn.textContent = 'Kopiert ✓';
        setTimeout(() => { btn.textContent = 'Teilen'; }, 2200);
      }
    } catch { /* abgebrochen */ }
  });
}

document.addEventListener('DOMContentLoaded', init);
