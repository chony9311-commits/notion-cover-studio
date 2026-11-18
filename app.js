/* Notion Cover Studio — canvas renderer + UI
   Everything runs in the browser. No server, no upload, no tracking. */
(function () {
  'use strict';

  var FORMATS = {
    cover: { w: 1500, h: 600, tag: 'notion-cover' },
    wallpaper: { w: 1080, h: 1920, tag: 'wallpaper' }
  };

  var FONTS = {
    'Inter': { css: 'Inter, system-ui, -apple-system, sans-serif', weight: 600, tracking: -0.02 },
    'Playfair Display': { css: '"Playfair Display", Georgia, serif', weight: 400, tracking: -0.015 },
    'Lora': { css: 'Lora, Georgia, serif', weight: 400, tracking: -0.01 },
    'Space Mono': { css: '"Space Mono", ui-monospace, monospace', weight: 700, tracking: -0.02 }
  };

  var PRESETS = [
    { id: 'sunset',     name: 'Sunset Blush', kind: 'gradient', colors: ['#ffe7d8', '#f8c7be', '#d9a3a6'], angle: 135, ink: '#241c1a' },
    { id: 'sage',       name: 'Sage Mist',    kind: 'gradient', colors: ['#eaefe4', '#cfdcc8', '#a9bda2'], angle: 160, ink: '#1f2a22' },
    { id: 'arctic',     name: 'Arctic Fog',   kind: 'gradient', colors: ['#eef3f8', '#d8e2ee', '#b8c8da'], angle: 120, ink: '#1b2733' },
    { id: 'lavender',   name: 'Lavender Haze', kind: 'gradient', colors: ['#f3ebf8', '#ded0ec', '#bfa9d7'], angle: 145, ink: '#241f2e' },
    { id: 'sand',       name: 'Warm Sand',    kind: 'gradient', colors: ['#f7f0e4', '#ecdfc9', '#d9c4a6'], angle: 130, ink: '#2a231b' },
    { id: 'charcoal',   name: 'Charcoal Night', kind: 'gradient', colors: ['#2f2f33', '#1b1b1e', '#3c3a36'], angle: 150, ink: '#f5f1e9' },
    { id: 'terracotta', name: 'Terracotta',   kind: 'gradient', colors: ['#f4dbcd', '#e2ae95', '#c08168'], angle: 140, ink: '#2c1d16' },
    { id: 'olive',      name: 'Olive Fog',    kind: 'gradient', colors: ['#eae8d8', '#d2d0b6', '#a9a98c'], angle: 155, ink: '#24251b' },
    { id: 'cotton',     name: 'Cotton Paper', kind: 'paper',    colors: ['#faf7f1', '#f0ebe2', '#faf7f1'], angle: 95,  ink: '#22201d' },
    { id: 'linen',      name: 'Linen Weave',  kind: 'paper',    colors: ['#efe8db', '#e3d9ca', '#f4eee4'], angle: 100, ink: '#2a2620' },
    { id: 'graph',      name: 'Graph Paper',  kind: 'grid',     colors: ['#fcfbf8', '#f4f1ea', '#fcfbf8'], angle: 90,  ink: '#2a2a28' },
    { id: 'dots',       name: 'Dot Grid',     kind: 'dots',     colors: ['#f7f6f2', '#ece9e2', '#f7f6f2'], angle: 90,  ink: '#232323' },
    { id: 'mist',       name: 'Morning Mist', kind: 'gradient', colors: ['#eaf0ef', '#cfdcda', '#aec3c1'], angle: 165, ink: '#1c2a29' },
    { id: 'powder',     name: 'Powder',       kind: 'gradient', colors: ['#f5eeee', '#e0d5d6', '#c5b6b8'], angle: 130, ink: '#251f20' },
    { id: 'rings',      name: 'Quiet Rings',  kind: 'rings',    colors: ['#f5f1e9', '#e9e2d6', '#f5f1e9'], angle: 90,  ink: '#26221c' },
    { id: 'dusk',       name: 'Dusk',         kind: 'gradient', colors: ['#e8dfe6', '#c9b9c9', '#9d8ea3'], angle: 120, ink: '#221c26' }
  ];

  var DEFAULTS = {
    format: 'cover',
    preset: 'sunset',
    headline: 'Ideas worth keeping',
    subtitle: '',
    font: 'Inter',
    align: 'center',
    size: 100,
    ink: '#241c1a'
  };

  var STORE_KEY = 'notion-cover-studio.v1';
  var state = Object.assign({}, DEFAULTS);

  var $ = function (sel) { return document.querySelector(sel); };
  var canvas = $('#canvas');
  var ctx = canvas.getContext('2d');
  var toastEl = $('#toast');
  var toastTimer = null;

  /* ---------- helpers ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function hexToRgb(hex) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) { h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; }
    var n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgba(hex, a) {
    var c = hexToRgb(hex);
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  }

  function luminance(hex) {
    var c = hexToRgb(hex);
    return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
  }

  function getPreset(id) {
    for (var i = 0; i < PRESETS.length; i++) { if (PRESETS[i].id === id) { return PRESETS[i]; } }
    return PRESETS[0];
  }

  function linearGradient(ctx, w, h, colors, angleDeg) {
    var rad = (angleDeg - 90) * Math.PI / 180;
    var cx = w / 2, cy = h / 2;
    var len = Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad));
    var x0 = cx - Math.cos(rad) * len / 2, y0 = cy - Math.sin(rad) * len / 2;
    var x1 = cx + Math.cos(rad) * len / 2, y1 = cy + Math.sin(rad) * len / 2;
    var g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (var i = 0; i < colors.length; i++) {
      g.addColorStop(i / Math.max(1, colors.length - 1), colors[i]);
    }
    return g;
  }

  /* paper grain, cached per size */
  var grainCache = {};
  function grainLayer(w, h) {
    var key = w + 'x' + h;
    if (grainCache[key]) { return grainCache[key]; }
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w / 2));
    c.height = Math.max(1, Math.round(h / 2));
    var g = c.getContext('2d');
    var img = g.createImageData(c.width, c.height);
    var rnd = mulberry32(w * 7 + h * 13);
    for (var i = 0; i < img.data.length; i += 4) {
      var v = rnd();
      var shade = v > 0.5 ? 255 : 0;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = shade;
      img.data[i + 3] = Math.round(rnd() * (v > 0.5 ? 26 : 34));
    }
    g.putImageData(img, 0, 0);
    grainCache[key] = c;
    return c;
  }

  function drawBase(ctx, w, h, preset) {
    ctx.fillStyle = linearGradient(ctx, w, h, preset.colors, preset.angle);
    ctx.fillRect(0, 0, w, h);
  }

  function drawPattern(ctx, w, h, preset) {
    var rnd = mulberry32(preset.id.length * 977 + w);
    var i;
    if (preset.kind === 'paper') {
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.drawImage(grainLayer(w, h), 0, 0, w, h);
      ctx.restore();
      /* soft light from the top left */
      var g = ctx.createRadialGradient(w * 0.22, h * 0.12, 0, w * 0.22, h * 0.12, Math.max(w, h) * 0.9);
      g.addColorStop(0, 'rgba(255,255,255,0.42)');
      g.addColorStop(0.55, 'rgba(255,255,255,0.06)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      /* a few long fibres */
      ctx.strokeStyle = rgba(preset.ink, 0.05);
      ctx.lineWidth = 1;
      for (i = 0; i < 90; i++) {
        var x = rnd() * w, y = rnd() * h, len = 20 + rnd() * (w * 0.12);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + len, y + (rnd() - 0.5) * 6);
        ctx.stroke();
      }
    } else if (preset.kind === 'grid') {
      var step = Math.round(w / 26);
      ctx.lineWidth = Math.max(1, w / 1500);
      for (i = 0; i <= w; i += step) {
        var heavy = Math.round(i / step) % 5 === 0;
        ctx.strokeStyle = rgba(preset.ink, heavy ? 0.10 : 0.055);
        ctx.beginPath(); ctx.moveTo(i + 0.5, 0); ctx.lineTo(i + 0.5, h); ctx.stroke();
      }
      for (i = 0; i <= h; i += step) {
        var heavy2 = Math.round(i / step) % 5 === 0;
        ctx.strokeStyle = rgba(preset.ink, heavy2 ? 0.10 : 0.055);
        ctx.beginPath(); ctx.moveTo(0, i + 0.5); ctx.lineTo(w, i + 0.5); ctx.stroke();
      }
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.drawImage(grainLayer(w, h), 0, 0, w, h);
      ctx.restore();
    } else if (preset.kind === 'dots') {
      var s = Math.round(w / 34);
      var r = Math.max(1.1, w / 1100);
      ctx.fillStyle = rgba(preset.ink, 0.16);
      for (var y = s; y < h; y += s) {
        for (var x2 = s; x2 < w; x2 += s) {
          ctx.beginPath(); ctx.arc(x2, y, r, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.drawImage(grainLayer(w, h), 0, 0, w, h);
      ctx.restore();
    } else if (preset.kind === 'rings') {
      var cx = w * 0.82, cy = h * 0.16;
      var maxR = Math.sqrt(w * w + h * h);
      ctx.lineWidth = Math.max(1, w / 900);
      for (var ring = w / 16; ring < maxR; ring += w / 16) {
        ctx.strokeStyle = rgba(preset.ink, 0.09);
        ctx.beginPath(); ctx.arc(cx, cy, ring, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.drawImage(grainLayer(w, h), 0, 0, w, h);
      ctx.restore();
    }
  }

  function drawDepth(ctx, w, h, preset) {
    var dark = luminance(preset.colors[preset.colors.length - 1]) < 0.35;
    var g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.78);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, dark ? 'rgba(0,0,0,0.30)' : 'rgba(40,32,24,0.10)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  function wrapLines(ctx, text, maxWidth) {
    var out = [];
    var paragraphs = String(text).split('\n');
    for (var p = 0; p < paragraphs.length; p++) {
      var words = paragraphs[p].split(/\s+/).filter(Boolean);
      if (!words.length) { out.push(''); continue; }
      var line = words[0];
      for (var i = 1; i < words.length; i++) {
        var test = line + ' ' + words[i];
        if (ctx.measureText(test).width > maxWidth && line) {
          out.push(line);
          line = words[i];
        } else {
          line = test;
        }
      }
      out.push(line);
    }
    return out;
  }

  function drawTracked(ctx, text, x, y, tracking, align) {
    var chars = Array.from(text);
    var widths = [], total = 0, i;
    for (i = 0; i < chars.length; i++) {
      widths[i] = ctx.measureText(chars[i]).width;
      total += widths[i];
    }
    total += tracking * Math.max(0, chars.length - 1);
    var start = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    var prevAlign = ctx.textAlign;
    ctx.textAlign = 'left';
    for (i = 0; i < chars.length; i++) {
      ctx.fillText(chars[i], start, y);
      start += widths[i] + tracking;
    }
    ctx.textAlign = prevAlign;
  }

  function drawText(ctx, w, h) {
    var preset = getPreset(state.preset);
    var font = FONTS[state.font] || FONTS.Inter;
    var align = state.align;
    var margin = w * (align === 'center' ? 0.13 : 0.09);
    var maxWidth = w - margin * 2;
    var size = Number(state.size) || 100;
    var tracking = font.tracking * size;

    ctx.fillStyle = state.ink || preset.ink;
    ctx.textBaseline = 'middle';
    ctx.textAlign = align;

    var x = align === 'center' ? w / 2 : align === 'right' ? w - margin : margin;

    /* headline */
    ctx.font = font.weight + ' ' + size + 'px ' + font.css;
    if ('letterSpacing' in ctx) { ctx.letterSpacing = tracking + 'px'; }
    var lines = wrapLines(ctx, state.headline || ' ', maxWidth).slice(0, 5);
    var lh = size * 1.16;
    var subSize = Math.max(11, Math.round(size * 0.24));
    var gap = state.subtitle ? Math.round(size * 0.5) : 0;
    var subBlock = state.subtitle ? subSize * 1.2 + gap : 0;
    var totalH = lines.length * lh + subBlock;
    var y = (h - totalH) / 2 + lh / 2;

    for (var i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x, y + i * lh);
    }

    /* subtitle, small and tracked */
    if (state.subtitle) {
      ctx.font = '500 ' + subSize + 'px ' + font.css;
      if ('letterSpacing' in ctx) { ctx.letterSpacing = '0px'; }
      var subY = (h - totalH) / 2 + lines.length * lh + gap + subSize * 0.6;
      ctx.globalAlpha = 0.72;
      var subTracking = Math.max(1, subSize * 0.18);
      drawTracked(ctx, state.subtitle.toUpperCase(), x, subY, subTracking, align);
      ctx.globalAlpha = 1;
    }
    if ('letterSpacing' in ctx) { ctx.letterSpacing = '0px'; }
  }

  function render() {
    var fmt = FORMATS[state.format] || FORMATS.cover;
    var preset = getPreset(state.preset);
    if (canvas.width !== fmt.w) { canvas.width = fmt.w; }
    if (canvas.height !== fmt.h) { canvas.height = fmt.h; }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, fmt.w, fmt.h);
    drawBase(ctx, fmt.w, fmt.h, preset);
    if (preset.kind !== 'gradient') { drawPattern(ctx, fmt.w, fmt.h, preset); }
    drawDepth(ctx, fmt.w, fmt.h, preset);
    drawText(ctx, fmt.w, fmt.h);
    canvas.dataset.format = state.format;
  }

  /* ---------- UI ---------- */
  function buildPresets() {
    var wrap = $('#presets');
    wrap.innerHTML = '';
    PRESETS.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(p.id === state.preset));
      b.setAttribute('aria-label', p.name);
      b.dataset.id = p.id;
      b.style.background = swatchCss(p);
      var label = document.createElement('span');
      label.textContent = p.name;
      b.appendChild(label);
      b.addEventListener('click', function () {
        state.preset = p.id;
        state.ink = p.ink;
        syncInputs();
        save();
        render();
        markPreset();
      });
      wrap.appendChild(b);
    });
    $('#preset-count').textContent = PRESETS.length + ' presets';
    markPreset();
  }

  function swatchCss(p) {
    var base = 'linear-gradient(' + (p.angle || 90) + 'deg,' + p.colors.join(',') + ')';
    if (p.kind === 'grid') {
      return 'repeating-linear-gradient(0deg,rgba(0,0,0,.10) 0 1px,transparent 1px 7px),repeating-linear-gradient(90deg,rgba(0,0,0,.10) 0 1px,transparent 1px 7px),' + base;
    }
    if (p.kind === 'dots') {
      return 'radial-gradient(rgba(0,0,0,.22) .9px,transparent 1px) 0 0/8px 8px,' + base;
    }
    if (p.kind === 'rings') {
      return 'radial-gradient(circle at 82% 16%,transparent 0 27%,rgba(0,0,0,.10) 27% 28.5%,transparent 28.5% 42%,rgba(0,0,0,.10) 42% 43.5%,transparent 43.5%),' + base;
    }
    return base;
  }

  function markPreset() {
    var swatches = document.querySelectorAll('.swatch');
    for (var i = 0; i < swatches.length; i++) {
      swatches[i].setAttribute('aria-checked', String(swatches[i].dataset.id === state.preset));
    }
  }

  function syncInputs() {
    $('#headline').value = state.headline;
    $('#subtitle').value = state.subtitle;
    $('#font').value = state.font;
    $('#align').value = state.align;
    $('#size').value = state.size;
    $('#size-out').textContent = state.size;
    $('#ink').value = state.ink;
    $('#ink-out').textContent = String(state.ink).toUpperCase();
    var tabs = document.querySelectorAll('.segmented button');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].setAttribute('aria-selected', String(tabs[i].dataset.format === state.format));
    }
    canvas.dataset.format = state.format;
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) { return; }
      var parsed = JSON.parse(raw);
      Object.keys(DEFAULTS).forEach(function (k) {
        if (parsed[k] !== undefined && parsed[k] !== null) { state[k] = parsed[k]; }
      });
    } catch (e) { /* ignore */ }
  }

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2600);
  }

  function download() {
    var fmt = FORMATS[state.format];
    var preset = getPreset(state.preset);
    var name = fmt.tag + '-' + preset.id + '.png';
    if (canvas.toBlob) {
      canvas.toBlob(function (blob) {
        if (!blob) { fallbackDownload(name); return; }
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        showToast('Saved ' + name);
      }, 'image/png');
    } else {
      fallbackDownload(name);
    }
  }

  function fallbackDownload(name) {
    var a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Saved ' + name);
  }

  function shuffle() {
    var pool = PRESETS.filter(function (p) { return p.id !== state.preset; });
    var pick = pool[Math.floor(Math.random() * pool.length)];
    state.preset = pick.id;
    state.ink = pick.ink;
    syncInputs();
    markPreset();
    save();
    render();
  }

  function bind() {
    $('#headline').addEventListener('input', function (e) { state.headline = e.target.value; save(); render(); });
    $('#subtitle').addEventListener('input', function (e) { state.subtitle = e.target.value; save(); render(); });
    $('#font').addEventListener('change', function (e) { state.font = e.target.value; save(); render(); });
    $('#align').addEventListener('change', function (e) { state.align = e.target.value; save(); render(); });
    $('#size').addEventListener('input', function (e) {
      state.size = Number(e.target.value);
      $('#size-out').textContent = state.size;
      save(); render();
    });
    $('#ink').addEventListener('input', function (e) {
      state.ink = e.target.value;
      $('#ink-out').textContent = String(e.target.value).toUpperCase();
      save(); render();
    });
    var tabs = document.querySelectorAll('.segmented button');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function () {
        state.format = this.dataset.format;
        syncInputs();
        save();
        render();
      });
    }
    $('#download').addEventListener('click', download);
    $('#shuffle').addEventListener('click', shuffle);
    $('#reset').addEventListener('click', function () {
      state = Object.assign({}, DEFAULTS);
      syncInputs();
      markPreset();
      save();
      render();
      showToast('Back to defaults');
    });
    document.addEventListener('keydown', function (e) {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) { return; }
      if (e.key === 'r' || e.key === 'R') { shuffle(); }
    });
  }

  function fontsReady() {
    if (!document.fonts || !document.fonts.load) { return Promise.resolve(); }
    var jobs = [];
    Object.keys(FONTS).forEach(function (name) {
      var w = FONTS[name].weight;
      jobs.push(document.fonts.load(w + ' 100px ' + FONTS[name].css));
      jobs.push(document.fonts.load('500 14px ' + FONTS[name].css));
    });
    return Promise.all(jobs).catch(function () { return null; });
  }

  function init() {
    load();
    buildPresets();
    syncInputs();
    bind();
    render();
    fontsReady().then(function () {
      render();
      if (document.fonts && document.fonts.ready) { document.fonts.ready.then(render); }
    });
    window.addEventListener('resize', function () { /* preview scales in CSS */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* expose a tiny hook for printing a specific render in testing */
  window.__coverStudio = { state: state, render: render, presets: PRESETS, setState: function (patch) { Object.assign(state, patch); syncInputs(); markPreset(); render(); } };
})();
