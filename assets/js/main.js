/* ── MVHOI project page ──────────────────────────────────────────── */

const V = 'assets/videos';

/* Case list — edit here to change what appears on the page.
   `methods` lists which baseline videos exist for the case. */
const CASES = [
  { id: 'short1', label: 'Case 1', long: false, methods: ['input', 'ours', 'genhoi', 'vace', 'hunyuancustom', 'mimicmotion'] },
  { id: 'short2', label: 'Case 2', long: false, methods: ['input', 'ours', 'genhoi', 'vace', 'hunyuancustom', 'mimicmotion'] },
  { id: 'short3', label: 'Case 3', long: false, methods: ['input', 'ours', 'genhoi', 'vace', 'hunyuancustom', 'mimicmotion'] },
  { id: 'short4', label: 'Case 4', long: false, methods: ['input', 'ours', 'genhoi', 'vace', 'hunyuancustom', 'mimicmotion'] },
  { id: 'short5', label: 'Case 5', long: false, methods: ['input', 'ours', 'genhoi', 'vace', 'hunyuancustom', 'mimicmotion'] },
  { id: 'long1',  label: 'Long 1', long: true,  methods: ['input', 'ours', 'genhoi', 'vace', 'hunyuancustom'] },
  { id: 'long2',  label: 'Long 2', long: true,  methods: ['input', 'ours', 'genhoi', 'vace', 'hunyuancustom'] },
];

const METHOD_NAMES = {
  input: 'Source video',
  ours: 'MVHOI (Ours)',
  genhoi: 'GenHOI',
  vace: 'VACE',
  hunyuancustom: 'HunyuanCustom',
  mimicmotion: 'MimicMotion',
};

const BASELINES = ['genhoi', 'vace', 'hunyuancustom', 'mimicmotion'];

const DEMO_GROUPS = [
  {
    source: 'book_src.mp4',
    items: [
      { file: 'book_bilibili.mp4', ref: 'bilibili.jpg',  label: 'Bilibili plush' },
      { file: 'book_mug.mp4',      ref: 'mug.jpg',       label: 'Mug' },
      { file: 'book_dragon.mp4',   ref: 'dragon.jpg',    label: 'Dragon figurine' },
    ],
  },
  {
    source: 'cola_src.mp4',
    items: [
      { file: 'cola_yogurt_drink.mp4', ref: 'yogurt_drink.jpg', label: 'Yogurt drink' },
      { file: 'cola_fabric_spray.mp4', ref: 'fabric_spray.jpg', label: 'Fabric spray' },
      { file: 'cola_dragon.mp4',       ref: 'dragon.jpg',       label: 'Dragon figurine' },
    ],
  },
];

const caseSrc = (caseId, method) => `${V}/comparisons/${caseId}/${method}.mp4`;

/* ── Synchronized playback ─────────────────────────────────────────
   Keeps a group of equal-length looping videos in lockstep. */
class SyncGroup {
  constructor(videos) {
    this.videos = videos.filter(Boolean);
    this.timer = null;
    // No independent looping: the master's `ended` event restarts the whole
    // group from frame 0, so every loop iteration re-aligns exactly.
    this.videos.forEach(v => { v.loop = false; v.removeAttribute('loop'); });
    this.videos[0]?.addEventListener('ended', () => { if (this.active) this.restart(); });
  }
  start() {
    if (this.active) return;
    this.active = true;
    const master = this.videos[0];
    this.videos.forEach(v => v.preload === 'metadata' && v.setAttribute('preload', 'auto'));
    this.restart();
    this.timer = setInterval(() => {
      if (!this.active || master.paused || !master.duration) return;
      const t = master.currentTime;
      // Skip correction near the loop boundary to avoid fighting the restart.
      if (t < 0.15 || master.duration - t < 0.15) return;
      this.videos.slice(1).forEach(v => {
        if (v.readyState < 2) return;
        if (Math.abs(v.currentTime - t) > 0.06) v.currentTime = t;
      });
    }, 200);
  }
  stop() {
    this.active = false;
    clearInterval(this.timer);
    this.timer = null;
    this.videos.forEach(v => v.pause());
  }
  restart() {
    // Wait until every video can play, then start all from frame 0 together.
    const token = (this.restartToken = (this.restartToken || 0) + 1);
    const ready = v => (v.readyState >= 3 ? Promise.resolve()
      : new Promise(res => v.addEventListener('canplay', res, { once: true })));
    Promise.all(this.videos.map(ready)).then(() => {
      if (!this.active || token !== this.restartToken) return;
      this.videos.forEach(v => { v.currentTime = 0; });
      this.videos.forEach(v => v.play().catch(() => {}));
    });
  }
}

/* Pause offscreen video groups. */
const visibilityObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    const group = groupsByElement.get(e.target);
    if (!group) return;
    if (e.isIntersecting) group.start(); else group.stop();
  });
}, { rootMargin: '80px', threshold: 0.05 });

const groupsByElement = new Map();

function registerGroup(element, group) {
  groupsByElement.set(element, group);
  visibilityObserver.observe(element);
}

/* ── Comparison slider ───────────────────────────────────────────── */
class CompareSlider {
  constructor(root) {
    this.root = root;
    this.frame = root.querySelector('.cmp-frame');
    this.under = root.querySelector('.cmp-under');   // right side (baseline)
    this.over = root.querySelector('.cmp-over');     // left side (ours)
    this.handle = root.querySelector('.cmp-handle');
    this.group = new SyncGroup([this.over, this.under]);
    registerGroup(root, this.group);
    this.bind();
  }

  setPos(pct) {
    const clamped = Math.max(2, Math.min(98, pct));
    this.root.style.setProperty('--pos', clamped + '%');
    this.handle.setAttribute('aria-valuenow', Math.round(clamped));
  }

  bind() {
    const move = clientX => {
      const rect = this.frame.getBoundingClientRect();
      this.setPos(((clientX - rect.left) / rect.width) * 100);
    };
    this.frame.addEventListener('pointerdown', e => {
      this.frame.setPointerCapture(e.pointerId);
      this.dragging = true;
      move(e.clientX);
    });
    this.frame.addEventListener('pointermove', e => { if (this.dragging) move(e.clientX); });
    this.frame.addEventListener('pointerup', () => { this.dragging = false; });
    this.frame.addEventListener('pointercancel', () => { this.dragging = false; });
    this.handle.addEventListener('keydown', e => {
      const cur = parseFloat(this.root.style.getPropertyValue('--pos')) || 50;
      if (e.key === 'ArrowLeft') { this.setPos(cur - 4); e.preventDefault(); }
      if (e.key === 'ArrowRight') { this.setPos(cur + 4); e.preventDefault(); }
    });
  }

  load(leftSrc, rightSrc) {
    this.over.src = leftSrc;
    this.under.src = rightSrc;
    this.over.load();
    this.under.load();
    this.group.restart();
  }
}

/* ── Chip helpers ────────────────────────────────────────────────── */
function buildChips(container, items, onSelect) {
  items.forEach((item, i) => {
    const b = document.createElement('button');
    b.className = 'chip' + (i === 0 ? ' active' : '');
    b.setAttribute('role', 'tab');
    b.innerHTML = item.label + (item.long ? ' <span class="chip-dur">13s</span>' : '');
    b.addEventListener('click', () => {
      container.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      b.classList.add('active');
      onSelect(item);
    });
    container.appendChild(b);
  });
}

/* ── Comparison with baselines: slider + tabs + reference strip ──── */
const cmpSlider = new CompareSlider(document.getElementById('cmpSlider'));
const rightTag = document.getElementById('cmpSliderRightTag');
const refStrip = document.getElementById('refStrip');
let cmpCase = CASES[0];
let cmpBaseline = 'genhoi';

function updateCmpSlider() {
  rightTag.textContent = METHOD_NAMES[cmpBaseline];
  refStrip.src = `assets/images/refpanels/${cmpCase.id}.png`;
  cmpSlider.load(caseSrc(cmpCase.id, 'ours'), caseSrc(cmpCase.id, cmpBaseline));
}

buildChips(document.getElementById('baselineTabs'),
  BASELINES.map(b => ({ label: METHOD_NAMES[b], value: b })),
  item => { cmpBaseline = item.value; updateCmpSlider(); });

buildChips(document.getElementById('cmpSliderChips'), CASES, item => {
  cmpCase = item;
  if (!item.methods.includes(cmpBaseline)) {
    cmpBaseline = 'genhoi';
    const tabs = document.getElementById('baselineTabs');
    tabs.querySelectorAll('.chip').forEach((c, i) => c.classList.toggle('active', i === 0));
  }
  updateCmpSlider();
});

updateCmpSlider();

/* ── Demo gallery: source video + reenacted targets per row ──────── */
const demoHost = document.getElementById('demoGrid');

function demoCard({ file, ref, label, isSource }) {
  const card = document.createElement('div');
  card.className = 'demo-card' + (isSource ? ' source' : '');
  const vid = document.createElement('video');
  vid.muted = true; vid.loop = true; vid.playsInline = true;
  vid.preload = 'metadata';
  vid.src = `${V}/demos/${file}`;
  card.appendChild(vid);
  if (ref) {
    const img = document.createElement('img');
    img.className = 'ref-chip';
    img.alt = `Target reference: ${label}`;
    img.src = `assets/images/demo_refs/${ref}`;
    card.appendChild(img);
  }
  const span = document.createElement('span');
  span.className = 'demo-label';
  span.textContent = label;
  card.appendChild(span);
  return card;
}

DEMO_GROUPS.forEach(g => {
  const row = document.createElement('div');
  row.className = 'demo-row';
  row.appendChild(demoCard({ file: g.source, ref: null, label: 'Source video', isSource: true }));
  g.items.forEach(d => row.appendChild(demoCard(d)));
  demoHost.appendChild(row);
  registerGroup(row, new SyncGroup([...row.querySelectorAll('video')]));
});

/* ── BibTeX copy ─────────────────────────────────────────────────── */
document.getElementById('copyBib').addEventListener('click', async e => {
  const text = document.getElementById('bibText').textContent;
  try {
    await navigator.clipboard.writeText(text);
    e.target.textContent = 'Copied!';
    setTimeout(() => { e.target.textContent = 'Copy'; }, 1600);
  } catch {
    e.target.textContent = 'Select & copy';
  }
});
