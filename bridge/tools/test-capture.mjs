/* capture the bridge stream for 4s and summarize what the wallpaper would receive */
const req = await fetch('http://127.0.0.1:52771/stream');
const reader = req.body.getReader();
const dec = new TextDecoder();
let buf = '', frames = 0, tokenFrames = 0, last = null, sampleTokens = [];
const t0 = Date.now();
while (Date.now() - t0 < 10000) {
  const { value, done } = await Promise.race([
    reader.read(),
    new Promise((r) => setTimeout(() => r({ done: true }), 10000 - (Date.now() - t0))),
  ]);
  if (done) break;
  buf += dec.decode(value, { stream: true });
  let i;
  while ((i = buf.indexOf('\n\n')) >= 0) {
    const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
    if (!chunk.startsWith('data:')) continue;
    frames++;
    try {
      const s = JSON.parse(chunk.slice(5).trim());
      last = s;
      if (s.tokens && s.tokens.length) { tokenFrames++; for (const t of s.tokens) if (sampleTokens.length < 14) sampleTokens.push(t); }
    } catch { /* skip */ }
  }
}
console.log(JSON.stringify({
  frames, tokenFrames,
  running: last?.running, sessionPresent: last?.sessionPresent,
  thinking: last?.thinking, streaming: last?.streaming,
  activity: last?.activity, model: last?.model,
  tools: last?.tools,
  sampleTokens,
}, null, 1));
process.exit(0);
