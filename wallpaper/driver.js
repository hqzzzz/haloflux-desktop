/**
 * HALOFLUX desktop driver — standalone wallpaper host for HalofluxEngine.
 *
 * Runs without DeepSeek Harness: only the engine + state fragments are loaded.
 * A mock `live` feed keeps the ring in a slow run/rest breathing rhythm so the
 * wallpaper feels alive even though no AI session drives it.
 *
 * Tuning from devtools: haloflux.tune({ scale: 0.8, runLevel: 1.2 })
 */
(function () {
  'use strict';

  var canvas = document.getElementById('fx');
  if (!canvas || typeof HalofluxEngine === 'undefined') return;

  /* mock session feed — the engine reads these fields defensively each frame */
  var live = {
    sessionPresent: true,
    running: true,
    activity: 1,
    tools: [],
    model: '',
    thinking: true,
    streaming: true,
    lastToolAt: 0,
    /* filled by the bridge: real session data replaces the mock rhythm */
    pullTokens: function (n) { return tokenBuf.splice(0, n); }
  };
  var tokenBuf = [];

  /* desktop-oriented overrides: this is the wallpaper, not a UI background */
  var DESKTOP = {
    dataMode: 0,      // 纯动画档：光环文字来自原作示例词表与随机数
    opacity: 0.85,    // 叠在人物壁纸上：光环清晰但不抢画面（纯暗底时可给 1）
    blend: 0,         // screen：亮底上的加色发光，暗部保留壁纸原样
    centerX: 0, centerY: -0.02, scale: 0.9,
    backdrop: 0,      // 深色底由 CSS 提供，画布保持透明光层
    guardOn: 0, guardColW: 0, guardBlur: 0, fieldBlur: 0, // 桌面没有正文静区可言
    hudOn: 0, feedOn: 0,
    idleMotion: 0.35, runLevel: 1, voidLevel: 0.35,
    idleSleepMs: 0,
    camera: 0
  };

  function desktopParams() {
    var base = {};
    try { base = HalofluxState.baseParams(); } catch (e) { base = {}; }
    return Object.assign(base, DESKTOP);
  }

  var params = desktopParams();
  var engine = HalofluxEngine.create({ canvas: canvas, live: live, params: params });
  engine.start();

  /* blend + opacity CSS (mount.js does this inside DSH; mirrored here) */
  var BLEND = ['screen', 'lighten', 'normal'];
  function css() {
    var b = Math.round(Number(params.blend) || 0);
    canvas.style.mixBlendMode = BLEND[b] || 'screen';
    var o = Number(params.opacity);
    if (!isFinite(o)) o = 1;
    canvas.style.opacity = String(Math.max(0, Math.min(1, o)));
  }
  css();

  /* resize: the engine re-measures on demand, debounce into one frame */
  var raf = 0;
  function onResize() {
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = 0; engine.resize(); });
  }
  window.addEventListener('resize', onResize);

  /* stop burning frames while hidden (Lively suspends occluded wallpaper too) */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) engine.stop(); else engine.start();
  });

  /* ---- live bridge: dsh-haloflux-bridge relay on 127.0.0.1:52771 ----
     While Harness is running, real session data drives the ring (dataMode 2).
     Without the feed we fall back to the mock rhythm (dataMode 0, pure animation). */
  var BRIDGE = 'http://127.0.0.1:52771/stream';
  var connected = false;
  var lastMsgAt = 0;

  function setConnected(on) {
    if (on === connected) return;
    connected = on;
    engine.setParams(Object.assign(params, { dataMode: on ? 2 : 0 }));
    if (!on) {
      /* hand the ring back to the mock feed */
      live.running = burst;
      live.thinking = burst;
      live.streaming = burst;
      live.tools = [];
      live.model = '';
      live.sessionPresent = true;
      live.pullTokens = function (n) { return tokenBuf.splice(0, n); };
    }
  }

  var es = null;
  try {
    es = new EventSource(BRIDGE);
    es.onmessage = function (ev) {
      var s;
      try { s = JSON.parse(ev.data); } catch (e) { return; }
      lastMsgAt = Date.now();
      setConnected(true);
      var toks = s.tokens;
      delete s.tokens;
      for (var k in s) {
        if (k === 'ts' || k === 'pullTokens') continue;
        try { live[k] = s[k]; } catch (e) { /* readonly on purpose */ }
      }
      if (toks && toks.length) {
        for (var i = 0; i < toks.length && tokenBuf.length < 2000; i++) tokenBuf.push(toks[i]);
      }
    };
    /* EventSource reconnects on its own (server "retry: 2000"); nothing else to do */
  } catch (e) { /* no EventSource: stay in animation mode */ }

  /* breathing rhythm: run bursts, then quiet rests, with a slow activity sine.
     Paused while the real feed is connected. */
  var burst = true;
  function scheduleRhythm() {
    var ms = burst ? 45000 + Math.random() * 50000 : 18000 + Math.random() * 17000;
    setTimeout(function () {
      if (!connected) {
        burst = !burst;
        live.running = burst;
        live.thinking = burst;
        live.streaming = burst;
      }
      scheduleRhythm();
    }, ms);
  }
  scheduleRhythm();
  setInterval(function () {
    if (connected) {
      /* drop the feed view if Harness stopped pushing (host closed, page crashed) */
      if (Date.now() - lastMsgAt > 4000) setConnected(false);
      return;
    }
    var t = Date.now();
    live.activity = burst
      ? 0.72 + 0.28 * Math.sin(t / 2400)
      : 0.30 + 0.16 * Math.sin(t / 3600);
  }, 250);

  /* handle for devtools / future settings */
  window.haloflux = {
    engine: engine, live: live, params: params,
    tune: function (partial) {
      Object.assign(params, partial);
      engine.setParams(params);
      css();
    }
  };
})();
