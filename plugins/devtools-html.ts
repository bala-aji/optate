/**
 * Generates the standalone Optate DevTools HTML page.
 * Served at /__optate/devtools by the Vite plugin.
 */
export function buildDevtoolsHtml(): string {
  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Optate DevTools</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;overflow:hidden;background:#0a0a0b;color:#e5e5ea;
  font-family:-apple-system,BlinkMacSystemFont,'Inter',system-ui,sans-serif;font-size:13px}

/* ── Toolbar ── */
#toolbar{
  display:flex;align-items:center;gap:10px;
  height:42px;padding:0 14px;
  background:#111113;border-bottom:1px solid rgba(255,255,255,0.07);
  flex-shrink:0;
}
.toolbar-brand{display:flex;align-items:center;gap:7px;font-weight:600;font-size:13px;color:#e5e5ea}
.toolbar-badge{font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
  color:rgba(168,85,247,.9);background:rgba(168,85,247,.12);border:1px solid rgba(168,85,247,.2);
  padding:2px 7px;border-radius:20px}
#urlBar{
  flex:1;height:26px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);
  border-radius:6px;padding:0 10px;color:#e5e5ea;font-size:12px;font-family:inherit;outline:none;
  max-width:500px;
}
#urlBar:focus{border-color:rgba(168,85,247,.5)}
.tb-btn{
  display:flex;align-items:center;justify-content:center;gap:5px;
  height:26px;padding:0 10px;background:rgba(255,255,255,.05);
  border:1px solid rgba(255,255,255,.08);border-radius:6px;
  color:rgba(235,235,245,.6);font-size:11px;font-weight:500;font-family:inherit;cursor:pointer;
  transition:all .15s;white-space:nowrap;
}
.tb-btn:hover{background:rgba(255,255,255,.09);color:rgba(235,235,245,.9)}
.tb-btn.active{background:rgba(168,85,247,.15);border-color:rgba(168,85,247,.3);color:rgba(168,85,247,.9)}
.tb-sep{width:1px;height:20px;background:rgba(255,255,255,.07);flex-shrink:0}
.viewport-btns{display:flex;gap:4px}

/* ── Layout ── */
#layout{display:flex;height:calc(100vh - 42px);overflow:hidden}

/* ── Preview pane ── */
#preview-wrap{
  flex:1;min-width:0;display:flex;flex-direction:column;
  background:#000;position:relative;overflow:hidden;
}
#preview-inner{
  flex:1;display:flex;align-items:center;justify-content:center;
  background:repeating-conic-gradient(rgba(255,255,255,.03) 0% 25%,transparent 0% 50%) 0 0/20px 20px;
  overflow:auto;
}
#previewFrame{
  border:none;background:#fff;
  transition:width .2s ease,height .2s ease;
  box-shadow:0 0 0 1px rgba(255,255,255,.08),0 8px 40px rgba(0,0,0,.5);
}
#previewFrame.desktop{width:100%;height:100%}
#previewFrame.tablet{width:768px;height:90%;border-radius:8px}
#previewFrame.mobile{width:390px;height:90%;border-radius:12px}

/* Hover overlay drawn over iframe */
#hover-overlay{
  position:absolute;top:0;left:0;width:100%;height:100%;
  pointer-events:none;z-index:10;
}

/* ── Resize handle ── */
#resizer{
  width:4px;background:rgba(255,255,255,.06);flex-shrink:0;cursor:col-resize;
  transition:background .15s;position:relative;
}
#resizer:hover,#resizer.dragging{background:rgba(168,85,247,.5)}
#resizer::after{
  content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  width:12px;height:40px;border-radius:3px;
  background:rgba(255,255,255,.06);
}

/* ── Source pane ── */
#source-pane{
  width:380px;min-width:280px;max-width:560px;
  display:flex;flex-direction:column;
  background:#111113;border-left:1px solid rgba(255,255,255,.07);
  overflow:hidden;
}
.pane-header{
  display:flex;align-items:center;justify-content:space-between;
  padding:0 14px;height:38px;
  border-bottom:1px solid rgba(255,255,255,.06);flex-shrink:0;
}
.pane-title{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:rgba(235,235,245,.3)}
#pane-actions{display:flex;gap:6px}
.act-btn{
  display:flex;align-items:center;gap:4px;font-size:10px;font-weight:500;
  padding:3px 8px;border-radius:5px;border:1px solid rgba(255,255,255,.09);
  background:rgba(255,255,255,.04);color:rgba(235,235,245,.5);cursor:pointer;font-family:inherit;
  transition:all .12s;
}
.act-btn:hover{background:rgba(255,255,255,.08);color:rgba(235,235,245,.85)}
.act-btn:active{transform:scale(.96)}

#pane-body{flex:1;overflow-y:auto;padding:14px}
#pane-body::-webkit-scrollbar{width:4px}
#pane-body::-webkit-scrollbar-track{background:transparent}
#pane-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}

/* ── Empty state ── */
#empty-state{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  height:100%;gap:10px;color:rgba(235,235,245,.2);text-align:center;padding:32px;
}
#empty-state svg{opacity:.25}
#empty-state p{font-size:12px;line-height:1.6}

/* ── Element info sections ── */
.info-section{margin-bottom:16px}
.info-section:last-child{margin-bottom:0}
.info-label{
  font-size:10px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;
  color:rgba(235,235,245,.25);margin-bottom:7px;
}

/* Element breadcrumb */
#el-breadcrumb{
  display:flex;align-items:center;gap:4px;flex-wrap:wrap;
  background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);
  border-radius:7px;padding:8px 10px;font-size:11px;
}
.bc-tag{color:#22d3ee;font-weight:600}
.bc-id{color:rgba(235,235,245,.4)}
.bc-sep{color:rgba(235,235,245,.2);font-size:10px}

/* Component chain */
#el-components{display:flex;flex-wrap:wrap;gap:5px}
.comp-chip{
  display:flex;align-items:center;gap:4px;
  font-size:11px;font-weight:500;padding:3px 9px;border-radius:5px;
  background:rgba(168,85,247,.1);border:1px solid rgba(168,85,247,.2);color:rgba(168,85,247,.85);
}
.comp-arrow{color:rgba(235,235,245,.2);font-size:10px}

/* File path */
#el-file{
  display:flex;align-items:center;gap:7px;
  background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);
  border-radius:7px;padding:7px 10px;
  font-size:11px;font-family:'JetBrains Mono','Fira Code',monospace;
  color:rgba(235,235,245,.55);cursor:pointer;transition:all .15s;
}
#el-file:hover{background:rgba(255,255,255,.07);color:rgba(235,235,245,.85)}
#el-file svg{flex-shrink:0;color:rgba(235,235,245,.3)}
.file-line{color:rgba(168,85,247,.7);margin-left:auto;flex-shrink:0}

/* Classes */
#el-classes{display:flex;flex-wrap:wrap;gap:5px}
.class-chip{
  font-size:11px;padding:2px 8px;border-radius:4px;font-family:'JetBrains Mono','Fira Code',monospace;
  border:1px solid transparent;cursor:pointer;transition:all .12s;
}
.class-chip:hover{filter:brightness(1.3)}
.class-chip.tw{background:rgba(34,211,238,.08);border-color:rgba(34,211,238,.2);color:rgba(34,211,238,.85)}
.class-chip.other{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.1);color:rgba(235,235,245,.5)}
.no-classes{font-size:11px;color:rgba(235,235,245,.2);font-style:italic}

/* Inline style */
#el-inline{
  font-size:11px;font-family:'JetBrains Mono','Fira Code',monospace;
  background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);
  border-radius:7px;padding:8px 10px;color:rgba(235,235,245,.55);
  word-break:break-all;line-height:1.6;
}

/* Source code block */
#el-source{
  background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.07);
  border-radius:8px;overflow:auto;max-height:300px;
}
#el-source::-webkit-scrollbar{width:3px;height:3px}
#el-source::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}
.source-lines{padding:10px 0;min-width:0}
.source-line{
  display:flex;align-items:flex-start;gap:0;padding:1px 0;
  font-size:11px;font-family:'JetBrains Mono','Fira Code',monospace;line-height:1.65;
  white-space:pre;
}
.source-line.target{background:rgba(168,85,247,.12)}
.line-num{
  min-width:36px;padding:0 8px;text-align:right;
  color:rgba(235,235,245,.2);user-select:none;flex-shrink:0;
}
.source-line.target .line-num{color:rgba(168,85,247,.6)}
.line-code{padding:0 12px;color:rgba(235,235,245,.7);overflow:hidden}
.source-line.target .line-code{color:rgba(235,235,245,.95)}

/* Syntax colors */
.s-tag{color:#22d3ee}.s-attr{color:#a5f3fc}.s-str{color:#a3e635}.s-kw{color:#c084fc}
.s-comment{color:#4b5563;font-style:italic}

/* Loading / error */
.pane-loading{display:flex;align-items:center;justify-content:center;height:60px;
  color:rgba(235,235,245,.2);font-size:12px;gap:8px}
.spinner{width:14px;height:14px;border:2px solid rgba(168,85,247,.3);
  border-top-color:rgba(168,85,247,.8);border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
</style>
</head>
<body>

<!-- Toolbar -->
<div id="toolbar">
  <div class="toolbar-brand">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="3" fill="rgba(168,85,247,0.2)" stroke="rgba(168,85,247,0.5)" stroke-width="1.2"/>
      <path d="M4 8h8M8 4v8" stroke="rgba(168,85,247,0.9)" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
    optate
    <span class="toolbar-badge">DevTools</span>
  </div>
  <div class="tb-sep"></div>
  <input id="urlBar" type="text" value="/" placeholder="/" spellcheck="false"/>
  <button class="tb-btn" id="goBtn" title="Navigate">
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 3l5 5-5 5M3 8h10"/></svg>
  </button>
  <button class="tb-btn" id="reloadBtn" title="Reload">
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M13.5 8A5.5 5.5 0 1 1 10 3.07"/><path d="M13.5 2v3.5H10"/></svg>
  </button>
  <div class="tb-sep"></div>
  <div class="viewport-btns">
    <button class="tb-btn active" id="vp-desktop" title="Desktop" data-vp="desktop">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="1" y="2" width="14" height="10" rx="1.5"/><path d="M5 14h6M8 12v2"/></svg>
    </button>
    <button class="tb-btn" id="vp-tablet" title="Tablet" data-vp="tablet">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="1" width="12" height="14" rx="1.5"/><circle cx="8" cy="12.5" r=".8" fill="currentColor"/></svg>
    </button>
    <button class="tb-btn" id="vp-mobile" title="Mobile" data-vp="mobile">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4" y="1" width="8" height="14" rx="1.5"/><circle cx="8" cy="12.5" r=".7" fill="currentColor"/></svg>
    </button>
  </div>
  <div class="tb-sep"></div>
  <button class="tb-btn" id="inspectToggle" title="Toggle inspect mode">
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="6" cy="6" r="4"/><path d="M10 10l4 4"/></svg>
    Inspect
  </button>
</div>

<!-- Main layout -->
<div id="layout">

  <!-- Preview pane -->
  <div id="preview-wrap">
    <div id="preview-inner">
      <canvas id="hover-overlay"></canvas>
      <iframe id="previewFrame" class="desktop" src="/?__optate_devtools=1" allow="same-origin"></iframe>
    </div>
  </div>

  <!-- Resize handle -->
  <div id="resizer"></div>

  <!-- Source pane -->
  <div id="source-pane">
    <div class="pane-header">
      <span class="pane-title">Inspector</span>
      <div id="pane-actions" style="display:none">
        <button class="act-btn" id="copyClassesBtn">
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="4" width="9" height="9" rx="1.5"/><path d="M3 11H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v1"/></svg>
          Copy classes
        </button>
        <button class="act-btn" id="openEditorBtn">
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 2h5v5M14 2l-7 7M6 3H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-3"/></svg>
          Open in editor
        </button>
      </div>
    </div>

    <div id="pane-body">
      <div id="empty-state">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <p>Click any element in the preview<br/>to inspect its source code</p>
      </div>
      <div id="el-info" style="display:none"></div>
    </div>
  </div>

</div>

<script>
// ── State ─────────────────────────────────────────────────────────────────────
let selectedEl = null;
let inspectMode = false;
let editorUrl = null;

// ── Toolbar ───────────────────────────────────────────────────────────────────
const frame = document.getElementById('previewFrame');
const urlBar = document.getElementById('urlBar');

document.getElementById('goBtn').addEventListener('click', navigate);
urlBar.addEventListener('keydown', e => { if (e.key === 'Enter') navigate(); });
document.getElementById('reloadBtn').addEventListener('click', () => frame.contentWindow?.location.reload());

function navigate() {
  let url = urlBar.value.trim() || '/';
  if (!url.startsWith('/')) url = '/' + url;
  const sep = url.includes('?') ? '&' : '?';
  frame.src = url + sep + '__optate_devtools=1';
}

frame.addEventListener('load', () => {
  try {
    const loc = frame.contentWindow.location;
    let path = loc.pathname + (loc.search ? loc.search.replace('?__optate_devtools=1','').replace('&__optate_devtools=1','') : '');
    urlBar.value = path || '/';
  } catch {}
});

// ── Viewport ──────────────────────────────────────────────────────────────────
document.querySelectorAll('[data-vp]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-vp]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    frame.className = btn.dataset.vp;
  });
});

// ── Inspect toggle ─────────────────────────────────────────────────────────────
const inspectBtn = document.getElementById('inspectToggle');
inspectBtn.addEventListener('click', () => {
  inspectMode = !inspectMode;
  inspectBtn.classList.toggle('active', inspectMode);
  frame.contentWindow?.postMessage({ type: 'optate:inspect-mode', enabled: inspectMode }, '*');
});

// ── Resize handle ─────────────────────────────────────────────────────────────
const resizer = document.getElementById('resizer');
const sourcePane = document.getElementById('source-pane');
let isResizing = false, startX = 0, startW = 0;

resizer.addEventListener('mousedown', e => {
  isResizing = true;
  startX = e.clientX;
  startW = sourcePane.getBoundingClientRect().width;
  resizer.classList.add('dragging');
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
});
document.addEventListener('mousemove', e => {
  if (!isResizing) return;
  const delta = startX - e.clientX;
  const newW = Math.min(560, Math.max(280, startW + delta));
  sourcePane.style.width = newW + 'px';
});
document.addEventListener('mouseup', () => {
  if (!isResizing) return;
  isResizing = false;
  resizer.classList.remove('dragging');
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
});

// ── postMessage receiver ──────────────────────────────────────────────────────
window.addEventListener('message', async (e) => {
  if (e.source !== frame.contentWindow) return;
  const msg = e.data;

  if (msg?.type === 'optate:element') {
    if (msg.event === 'select') {
      selectedEl = msg;
      await loadSource(msg);
    } else if (msg.event === 'hover') {
      drawHover(msg.rect, msg.label);
    }
  }
});

// ── Hover canvas overlay ───────────────────────────────────────────────────────
const canvas = document.getElementById('hover-overlay');
const canvasCtx = canvas.getContext('2d');

function resizeCanvas() {
  const wrap = document.getElementById('preview-inner');
  canvas.width  = wrap.clientWidth;
  canvas.height = wrap.clientHeight;
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.pointerEvents = 'none';
}
new ResizeObserver(resizeCanvas).observe(document.getElementById('preview-inner'));
resizeCanvas();

function drawHover(rect, label) {
  if (!rect) { canvasCtx.clearRect(0, 0, canvas.width, canvas.height); return; }

  // Map iframe-relative rect to overlay-relative rect
  const frameRect = frame.getBoundingClientRect();
  const wrapRect  = document.getElementById('preview-inner').getBoundingClientRect();

  const scaleX = frameRect.width  / frame.scrollWidth  || 1;
  const scaleY = frameRect.height / frame.scrollHeight || 1;

  const x = frameRect.left - wrapRect.left + rect.left * scaleX;
  const y = frameRect.top  - wrapRect.top  + rect.top  * scaleY;
  const w = rect.width  * scaleX;
  const h = rect.height * scaleY;

  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

  // Fill
  canvasCtx.fillStyle = 'rgba(168,85,247,0.12)';
  canvasCtx.fillRect(x, y, w, h);
  // Border
  canvasCtx.strokeStyle = 'rgba(168,85,247,0.7)';
  canvasCtx.lineWidth = 1.5;
  canvasCtx.strokeRect(x, y, w, h);

  // Label
  if (label) {
    const lx = x, ly = y > 20 ? y - 20 : y + h + 4;
    canvasCtx.fillStyle = 'rgba(168,85,247,0.9)';
    canvasCtx.font = '10px -apple-system,system-ui,sans-serif';
    const tw = canvasCtx.measureText(label).width;
    canvasCtx.fillRect(lx, ly, tw + 12, 18);
    canvasCtx.fillStyle = '#fff';
    canvasCtx.fillText(label, lx + 6, ly + 13);
  }
}

// ── Source loader ─────────────────────────────────────────────────────────────
async function loadSource(msg) {
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('el-info').style.display = 'block';
  document.getElementById('pane-actions').style.display = 'flex';
  editorUrl = null;

  renderSkeleton();

  const src = msg.debugSource;
  let sourceData = null;

  if (src?.fileName) {
    // Strip project root prefix if present (fileName can be absolute)
    const file = src.fileName.replace(/^\\/[^\\/]+\\/[^\\/]+\\/[^\\/]+\\//, '').replace(/^.*\\/src\\//, 'src/');
    try {
      const res = await fetch(\`/__optate/source?file=\${encodeURIComponent(src.fileName)}&line=\${src.lineNumber || 1}\`);
      if (res.ok) sourceData = await res.json();
    } catch {}
  }

  // Fallback: search by component name
  if (!sourceData && msg.componentName) {
    try {
      const res = await fetch(\`/__optate/source?component=\${encodeURIComponent(msg.componentName)}&line=1\`);
      if (res.ok) sourceData = await res.json();
    } catch {}
  }

  if (sourceData?.editorUrl) editorUrl = sourceData.editorUrl;

  renderInfo(msg, sourceData);
}

function renderSkeleton() {
  document.getElementById('el-info').innerHTML = \`
    <div class="pane-loading"><div class="spinner"></div>Loading source…</div>
  \`;
}

function renderInfo(msg, src) {
  const classes  = msg.classList || [];
  const inlineSt = msg.inlineStyle || '';
  const compChain = msg.componentChain || (msg.componentName ? [msg.componentName] : []);

  // Detect tailwind classes: contain a dash or known single-word utilities
  const TW_SINGLES = new Set(['flex','grid','block','inline','hidden','static','relative','absolute','fixed','sticky','truncate','italic','underline','capitalize','uppercase','lowercase','overflow-hidden','container','sr-only']);
  function isTW(cls) {
    return cls.includes('-') || TW_SINGLES.has(cls);
  }

  const classHtml = classes.length
    ? classes.map(c => \`<span class="class-chip \${isTW(c)?'tw':'other'}" onclick="copyText('\${c}')" title="Click to copy">\${c}</span>\`).join('')
    : '<span class="no-classes">No classes</span>';

  const chainHtml = compChain.length
    ? compChain.map((c, i) => \`\${i > 0 ? '<span class="comp-arrow">›</span>' : ''}<span class="comp-chip">\${c}</span>\`).join('')
    : '<span style="font-size:11px;color:rgba(235,235,245,.25)">Unknown component</span>';

  const fileHtml = src
    ? \`<span>\${src.file || '—'}</span><span class="file-line">:\${src.line}</span>\`
    : \`<span style="color:rgba(235,235,245,.25);font-style:italic">Source not found</span>\`;

  editorUrl = src?.editorUrl || null;

  const label = msg.componentName || msg.tagName || '';

  let html = \`
    <div class="info-section">
      <div class="info-label">Element</div>
      <div id="el-breadcrumb">
        <span class="bc-tag">&lt;\${msg.tagName || 'div'}</span>
        \${msg.id ? \`<span class="bc-id">#\${msg.id}</span>\` : ''}
        <span class="bc-sep">·</span>
        <span style="font-size:10px;color:rgba(235,235,245,.35)">\${classes.slice(0,3).join(' ')}\${classes.length>3?'…':''}</span>
        <span class="bc-tag">&gt;</span>
      </div>
    </div>

    <div class="info-section">
      <div class="info-label">Component</div>
      <div id="el-components">\${chainHtml}</div>
    </div>

    <div class="info-section">
      <div class="info-label">File</div>
      <div id="el-file" onclick="openEditor()" title="Open in editor">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 2h5v5M14 2l-6 6M6 3H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-3"/></svg>
        \${fileHtml}
      </div>
    </div>

    <div class="info-section">
      <div class="info-label">Classes (\${classes.length})</div>
      <div id="el-classes">\${classHtml}</div>
    </div>
  \`;

  if (inlineSt) {
    html += \`
      <div class="info-section">
        <div class="info-label">Inline style</div>
        <div id="el-inline">\${escHtml(inlineSt)}</div>
      </div>
    \`;
  }

  if (src?.context) {
    html += \`
      <div class="info-section">
        <div class="info-label">Source — \${escHtml(src.file || '')}</div>
        <div id="el-source"><div class="source-lines">\${renderSource(src)}</div></div>
      </div>
    \`;
  }

  document.getElementById('el-info').innerHTML = html;
}

function renderSource(src) {
  const lines = src.context.split('\\n');
  const startLine = src.contextStart || 1;
  return lines.map((l, i) => {
    const ln = startLine + i;
    const isTarget = ln === src.line;
    return \`<div class="source-line \${isTarget ? 'target' : ''}">
      <span class="line-num">\${ln}</span>
      <span class="line-code">\${highlightJSX(l)}</span>
    </div>\`;
  }).join('');
}

function highlightJSX(line) {
  let s = escHtml(line);
  // Strings
  s = s.replace(/(&quot;|&#39;)([^&]*?)\\1/g, '<span class="s-str">$1$2$1</span>');
  // JSX opening/closing tags
  s = s.replace(/(&lt;\\/?)([A-Z][a-zA-Z0-9]*)/g, '$1<span class="s-tag">$2</span>');
  s = s.replace(/(&lt;\\/?)([a-z][a-zA-Z0-9-]*)/g, '$1<span class="s-tag">$2</span>');
  // Attributes (word=)
  s = s.replace(/\\b([a-zA-Z][a-zA-Z0-9]*)=/g, '<span class="s-attr">$1</span>=');
  // Keywords
  s = s.replace(/\\b(const|let|var|return|function|import|export|from|default|class|extends|if|else|for|while)\\b/g,'<span class="s-kw">$1</span>');
  // Comments
  s = s.replace(/(\\/\\/.*)$/, '<span class="s-comment">$1</span>');
  return s;
}

function escHtml(s) {
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── Actions ───────────────────────────────────────────────────────────────────
document.getElementById('copyClassesBtn').addEventListener('click', () => {
  if (!selectedEl) return;
  const classes = (selectedEl.classList || []).join(' ');
  copyText(classes);
  flashBtn('copyClassesBtn', 'Copied!');
});

document.getElementById('openEditorBtn').addEventListener('click', openEditor);

function openEditor() {
  if (editorUrl) window.open(editorUrl, '_blank');
}

function copyText(text) {
  navigator.clipboard?.writeText(text).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
  });
}
function flashBtn(id, text) {
  const btn = document.getElementById(id);
  if (!btn) return;
  const orig = btn.textContent;
  btn.textContent = text;
  setTimeout(() => { btn.textContent = orig; }, 1500);
}
</script>
</body>
</html>`;
}
