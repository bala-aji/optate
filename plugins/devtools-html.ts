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
<meta name="theme-color" content="#0a0a0b"/>
<link rel="manifest" href="/__optate/manifest.json"/>
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
#layout{display:flex;flex:1;overflow:hidden;min-height:0}
body{display:flex;flex-direction:column}

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



/* Pop-out button */
.tb-btn-popout{
  background:rgba(168,85,247,.1)!important;
  border-color:rgba(168,85,247,.25)!important;
  color:rgba(168,85,247,.85)!important;
}
.tb-btn-popout:hover{
  background:rgba(168,85,247,.2)!important;
  color:rgba(168,85,247,1)!important;
}

/* Install App button */
#installBtn{
  display:none;
  background:rgba(34,197,94,.1)!important;
  border-color:rgba(34,197,94,.3)!important;
  color:rgba(34,197,94,.9)!important;
}
#installBtn:hover{
  background:rgba(34,197,94,.2)!important;
  color:rgba(34,197,94,1)!important;
}
/* Install tip banner */
#install-tip{
  display:none;align-items:center;justify-content:center;gap:10px;
  padding:7px 16px;
  background:rgba(34,197,94,.06);border-bottom:1px solid rgba(34,197,94,.15);
  font-size:11.5px;color:rgba(34,197,94,.75);flex-shrink:0;
}
#install-tip strong{color:rgba(34,197,94,.95)}

/* Redirect screen — shown in the original tab after popup opens */
#redirect-screen{
  display:none;position:fixed;inset:0;z-index:9999;
  background:#0a0a0b;
  flex-direction:column;align-items:center;justify-content:center;
  gap:20px;font-family:-apple-system,BlinkMacSystemFont,'Inter',system-ui,sans-serif;
}
.rs-icon{
  width:56px;height:56px;border-radius:14px;
  background:rgba(168,85,247,.12);border:1px solid rgba(168,85,247,.25);
  display:flex;align-items:center;justify-content:center;
}
.rs-title{font-size:17px;font-weight:600;color:rgba(235,235,245,.9);margin-top:4px}
.rs-sub{font-size:13px;color:rgba(235,235,245,.35);text-align:center;line-height:1.6}
.rs-actions{display:flex;gap:10px;margin-top:4px}
.rs-btn{
  padding:7px 18px;border-radius:8px;font-size:13px;font-weight:500;
  cursor:pointer;font-family:inherit;transition:all .15s;border:none;
}
.rs-btn-primary{
  background:rgba(168,85,247,.2);border:1px solid rgba(168,85,247,.35);
  color:rgba(168,85,247,.9);
}
.rs-btn-primary:hover{background:rgba(168,85,247,.3)}
.rs-btn-ghost{
  background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);
  color:rgba(235,235,245,.4);
}
.rs-btn-ghost:hover{background:rgba(255,255,255,.08);color:rgba(235,235,245,.7)}

/* Popup-blocked fallback banner */
#blocked-banner{
  display:none;align-items:center;justify-content:center;gap:10px;
  padding:8px 16px;
  background:rgba(168,85,247,.07);border-bottom:1px solid rgba(168,85,247,.15);
  font-size:11.5px;color:rgba(168,85,247,.7);flex-shrink:0;
}
#blocked-banner button{
  display:flex;align-items:center;gap:5px;
  padding:3px 10px;background:rgba(168,85,247,.15);
  border:1px solid rgba(168,85,247,.3);border-radius:5px;
  color:rgba(168,85,247,.9);font-size:11px;font-weight:500;
  cursor:pointer;font-family:inherit;
}
#blocked-banner button:hover{background:rgba(168,85,247,.25)}
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
  <div class="tb-sep" id="popout-sep"></div>
  <button class="tb-btn tb-btn-popout" id="popOutBtn" title="Open as standalone window (no browser UI)">
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <rect x="1" y="4" width="10" height="10" rx="1.5"/>
      <path d="M7 1h8v8M10 1h5v5"/>
    </svg>
    Pop out
  </button>
  <button class="tb-btn" id="installBtn" title="Install as app — removes the address bar permanently">
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 2v8M5 7l3 3 3-3"/>
      <path d="M2 12h12v2H2z"/>
    </svg>
    Install App
  </button>
</div>

<!-- Install tip — shown once PWA is already installed -->
<div id="install-tip">
  ✓ <strong>Optate DevTools is installed.</strong> Open from your Applications / dock for a chrome-free experience.
  <button onclick="document.getElementById('install-tip').style.display='none'"
    style="background:none;border:none;color:rgba(34,197,94,.5);cursor:pointer;font-size:13px;padding:0 4px">✕</button>
</div>

<!-- Redirect screen (shown in original tab after popup auto-opens) -->
<div id="redirect-screen">
  <div class="rs-icon">
    <svg width="26" height="26" viewBox="0 0 16 16" fill="none" stroke="rgba(168,85,247,.85)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <rect x="1" y="4" width="10" height="10" rx="1.5"/><path d="M7 1h8v8M10 1h5v5"/>
    </svg>
  </div>
  <div class="rs-title">DevTools opened in standalone window</div>
  <div class="rs-sub">The DevTools are running in a separate window<br/>without browser UI for a cleaner experience.</div>
  <div class="rs-actions">
    <button class="rs-btn rs-btn-primary" onclick="reopenStandalone()">Reopen standalone</button>
    <button class="rs-btn rs-btn-ghost" onclick="window.close()">Close this tab</button>
  </div>
</div>

<!-- Popup-blocked fallback banner -->
<div id="blocked-banner">
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="rgba(168,85,247,.7)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <rect x="1" y="4" width="10" height="10" rx="1.5"/><path d="M7 1h8v8M10 1h5v5"/>
  </svg>
  Popup was blocked — click to open DevTools without browser UI
  <button onclick="openStandalone()">Open standalone</button>
</div>

<!-- Main layout -->
<div id="layout">

  <!-- Preview pane -->
  <div id="preview-wrap">
    <div id="preview-inner">
      <canvas id="hover-overlay"></canvas>
      <iframe id="previewFrame" class="desktop" name="__optate_devtools" src="/" allow="same-origin"></iframe>
    </div>
  </div>


</div>

<script>
// ── Standalone popup ──────────────────────────────────────────────────────────
const IS_POPUP = window.opener !== null || new URLSearchParams(location.search).has('_pop');

function _doOpen() {
  const sw = screen.availWidth  || window.screen.width;
  const sh = screen.availHeight || window.screen.height;
  const sl = screen.availLeft   || 0;
  const st = screen.availTop    || 0;
  const url = location.origin + location.pathname + '?_pop=1';
  return window.open(url, 'optate_devtools_standalone',
    'popup=1,resizable=yes' +
    ',width='  + sw +
    ',height=' + sh +
    ',left='   + sl +
    ',top='    + st
  );
}

function openStandalone()   { const w = _doOpen(); if (w) w.focus(); }
function reopenStandalone() { const w = _doOpen(); if (w) w.focus(); }

// ── Auto-open: always launch as standalone on a regular tab visit ─────────────
(function autoOpen() {
  if (IS_POPUP) {
    // Already standalone — hide pop-out button (redundant in popup)
    const btn = document.getElementById('popOutBtn');
    const sep = document.getElementById('popout-sep');
    if (btn) btn.style.display = 'none';
    if (sep) sep.style.display = 'none';
    return;
  }

  // Regular tab → try to auto-open popup
  const popup = _doOpen();
  const toolbar  = document.getElementById('toolbar');
  const layout   = document.getElementById('layout');
  const redirect = document.getElementById('redirect-screen');
  const blocked  = document.getElementById('blocked-banner');

  if (popup) {
    // Success — show redirect screen, hide the DevTools UI
    popup.focus();
    if (toolbar)  toolbar.style.display  = 'none';
    if (layout)   layout.style.display   = 'none';
    if (redirect) redirect.style.display = 'flex';
  } else {
    // Popup blocked — fall back to banner so user can click manually
    if (blocked) blocked.style.display = 'flex';
  }
})();

// ── PWA Install ───────────────────────────────────────────────────────────────
let _installPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _installPrompt = e;
  const btn = document.getElementById('installBtn');
  if (btn) btn.style.display = 'flex';
});

window.addEventListener('appinstalled', () => {
  const btn = document.getElementById('installBtn');
  const tip = document.getElementById('install-tip');
  if (btn) btn.style.display = 'none';
  if (tip) tip.style.display = 'flex';
  _installPrompt = null;
});

document.getElementById('installBtn').addEventListener('click', async () => {
  if (!_installPrompt) return;
  _installPrompt.prompt();
  const { outcome } = await _installPrompt.userChoice;
  if (outcome === 'accepted') {
    document.getElementById('installBtn').style.display = 'none';
  }
  _installPrompt = null;
});

// ── State ─────────────────────────────────────────────────────────────────────
let inspectMode = false;

// ── Toolbar ───────────────────────────────────────────────────────────────────
const frame = document.getElementById('previewFrame');
const urlBar = document.getElementById('urlBar');

document.getElementById('goBtn').addEventListener('click', navigate);
urlBar.addEventListener('keydown', e => { if (e.key === 'Enter') navigate(); });
document.getElementById('reloadBtn').addEventListener('click', () => {
  frame.contentWindow?.location.reload();
});

function navigate() {
  let url = urlBar.value.trim() || '/';
  if (!url.startsWith('/')) url = '/' + url;
  frame.src = url;
}

// Every time the iframe finishes loading, activate bridge mode via postMessage.
// This handles: initial load, in-app navigation, manual reloads.
frame.addEventListener('load', () => {
  // Activate bridge mode — window.name is already "__optate_devtools"
  // but send postMessage too as belt-and-suspenders
  try {
    frame.contentWindow.postMessage({ type: 'optate:devtools-mode', enabled: true }, '*');
  } catch {}
  // Update URL bar
  try {
    const loc = frame.contentWindow.location;
    urlBar.value = loc.pathname + (loc.search || '') + (loc.hash || '') || '/';
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

// ── postMessage receiver (hover only) ────────────────────────────────────────
window.addEventListener('message', (e) => {
  if (e.source !== frame.contentWindow) return;
  const msg = e.data;
  if (msg?.type === 'optate:element' && msg.event === 'hover') {
    drawHover(msg.rect, msg.label);
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

</script>
</body>
</html>`;
}
