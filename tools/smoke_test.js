/* Headless smoke test: mocks just enough DOM/Canvas to execute app.js
   and exercise every preset, format, font and alignment. */
(function () {
  var calls = { fillText: 0, fillRect: 0, arc: 0, stroke: 0, drawImage: 0, putImageData: 0 };
  var lastFillTexts = [];

  function makeCtx() {
    var ctx = {
      font: '600 100px Inter',
      fillStyle: '#000',
      strokeStyle: '#000',
      lineWidth: 1,
      globalAlpha: 1,
      textAlign: 'left',
      textBaseline: 'alphabetic',
      letterSpacing: '0px',
      measureText: function (t) {
        var m = /(\d+(?:\.\d+)?)px/.exec(this.font);
        var size = m ? parseFloat(m[1]) : 16;
        return { width: String(t).length * size * 0.52 };
      },
      createLinearGradient: function () { return { addColorStop: function () {} }; },
      createRadialGradient: function () { return { addColorStop: function () {} }; },
      createImageData: function (w, h) { return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h }; },
      putImageData: function () { calls.putImageData++; },
      drawImage: function () { calls.drawImage++; },
      fillRect: function () { calls.fillRect++; },
      clearRect: function () {},
      setTransform: function () {},
      save: function () {},
      restore: function () {},
      beginPath: function () {},
      closePath: function () {},
      moveTo: function () {},
      lineTo: function () {},
      arc: function () { calls.arc++; },
      fill: function () {},
      stroke: function () { calls.stroke++; },
      fillText: function (t) { calls.fillText++; lastFillTexts.push(t); }
    };
    return ctx;
  }

  var ctx = makeCtx();

  function makeCanvas() {
    var c = {
      width: 1500,
      height: 600,
      dataset: {},
      style: {},
      getContext: function () { return ctx; },
      toBlob: function (cb) { cb({ type: 'image/png' }); },
      toDataURL: function () { return 'data:image/png;base64,AAA'; }
    };
    return c;
  }

  function el(id) {
    var e = {
      id: id, value: '', textContent: '', innerHTML: '', dataset: {}, style: {},
      addEventListener: function () {}, setAttribute: function () {}, appendChild: function () {},
      classList: { add: function () {}, remove: function () {} },
      tagName: 'DIV'
    };
    return e;
  }

  var elements = {};
  function get(sel) {
    if (!elements[sel]) {
      if (sel === '#canvas') { elements[sel] = makeCanvas(); }
      else if (sel === '#presets') { elements[sel] = el('presets'); }
      else { elements[sel] = el(sel); }
    }
    return elements[sel];
  }

  var tabs = ['cover', 'wallpaper'].map(function (f) {
    var t = el('tab-' + f); t.dataset.format = f; return t;
  });

  var document = {
    readyState: 'complete',
    activeElement: { tagName: 'BODY' },
    body: { appendChild: function () {}, removeChild: function () {} },
    querySelector: get,
    querySelectorAll: function (sel) {
      if (sel === '.segmented button') { return tabs; }
      if (sel === '.swatch') { return swatches; }
      return [];
    },
    createElement: function (tag) {
      if (tag === 'canvas') { return makeCanvas(); }
      return el(tag);
    },
    addEventListener: function () {},
    fonts: {
      load: function () { return Promise.resolve(); },
      ready: Promise.resolve()
    }
  };

  var swatches = [];
  var store = {};
  var window = {
    addEventListener: function () {},
    document: document
  };

  globalThis.document = document;
  globalThis.window = window;
  globalThis.localStorage = {
    getItem: function (k) { return store[k] === undefined ? null : store[k]; },
    setItem: function (k, v) { store[k] = v; }
  };
  globalThis.URL = { createObjectURL: function () { return 'blob:x'; }, revokeObjectURL: function () {} };
  globalThis.setTimeout = function (fn) { return 0; };
  globalThis.clearTimeout = function () {};
  globalThis.Promise = Promise;
  globalThis.console = console;

  var code = __APP_SOURCE__;
  (0, eval)(code);

  var api = window.__coverStudio || globalThis.__coverStudio;
  if (!api) { throw new Error('app did not expose __coverStudio'); }

  var results = [];
  var formats = ['cover', 'wallpaper'];
  var fonts = ['Inter', 'Playfair Display', 'Lora', 'Space Mono'];
  var aligns = ['center', 'left', 'right'];

  api.presets.forEach(function (p) {
    formats.forEach(function (f) {
      calls.fillText = 0;
      lastFillTexts = [];
      api.setState({ preset: p.id, format: f, ink: p.ink, size: 100, headline: 'Ideas worth keeping', subtitle: 'weekly notes' });
      if (calls.fillText === 0) { throw new Error('no text drawn for ' + p.id + '/' + f); }
      if (ctx.fillStyle !== p.ink) { throw new Error('inline ink not applied for ' + p.id); }
      results.push(p.id + '/' + f + ' ok (' + calls.fillText + ' text calls)');
    });
  });

  fonts.forEach(function (f) {
    aligns.forEach(function (a) {
      calls.fillText = 0;
      api.setState({ font: f, align: a, format: 'cover', headline: 'A very long headline that should wrap across at least two or maybe three lines of text', subtitle: '' });
      if (calls.fillText < 2) { throw new Error('wrap failed for ' + f + '/' + a); }
    });
  });

  /* size extremes and empty strings */
  api.setState({ size: 48, headline: 'Short', subtitle: '' });
  api.setState({ size: 200, headline: 'Long headline for the biggest size test', subtitle: 'sub' });
  api.setState({ headline: '', subtitle: null });

  /* persisted state shape */
  var raw = store['notion-cover-studio.v1'];
  if (!raw) { throw new Error('state not persisted'); }
  var saved = JSON.parse(raw);
  if (saved.format !== 'cover') { throw new Error('persisted format mismatch'); }

  results.push('fonts/aligns ok');
  results.push('persisted: ' + Object.keys(saved).join(','));
  return results.join('\n');
})();
