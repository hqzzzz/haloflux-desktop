/* fake session pusher for bridge E2E test: pretends to be the harness client half */
const words = '部署 完成 光环 正在 读取 会话 数据 词元 工具 调用 步骤 上下文 全部 实时 同步 到 桌面 壁纸 上'.split(' ');
let i = 0;
const post = async (p) => {
  await fetch('http://127.0.0.1:52771/push', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(p),
  });
};
setInterval(() => {
  const toks = [];
  for (let k = 0; k < 3; k++) toks.push(words[(i++) % words.length]);
  post({
    ts: Date.now(),
    sessionPresent: true, running: true, thinking: false, streaming: true,
    activity: 0.85, model: 'Qwen3.8-Flash-Next',
    tools: [{ name: 'edit', state: 'done' }, { name: 'pwsh', state: 'running' }],
    lastToolAt: Date.now() - 900,
    tokens: toks,
  }).catch(() => {});
}, 220);
console.log('pusher running');
