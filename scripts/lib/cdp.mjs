// Adapted from the local browser-test skill harness; no npm dependencies.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

export async function launchClean({ port = 0, headless = false, profileRoot = tmpdir() } = {}) {
  const profile = mkdtempSync(join(profileRoot, 'cdp-clean-'));
  const args = [
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${port}`,
    '--incognito',
    '--disable-extensions',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--window-size=1440,1000',
    'about:blank',
  ];
  if (headless) args.unshift('--headless=new');
  const proc = spawn(CHROME, args, { stdio: 'ignore', detached: false });

  const kill = async () => {
    // Chrome writes its profile during shutdown; remove it only after exit.
    if (proc.pid && proc.exitCode === null && proc.signalCode === null) {
      await new Promise(resolve => {
        const timer = setTimeout(() => proc.kill('SIGKILL'), 5000);
        proc.once('exit', () => { clearTimeout(timer); resolve(); });
        proc.kill('SIGTERM');
      });
    }
    rmSync(profile, { recursive: true, force: true });
  };
  let spawnError;
  proc.on('error', error => { spawnError = error; });
  let version;
  for (let i = 0; i < 60; i++) {
    if (spawnError) break;
    try {
      if (!port) port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]);
      version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  if (!version) {
    await kill();
    throw spawnError || new Error('Chrome failed to start');
  }
  return { port, proc, profile, kill };
}

export async function attachPage(port) {
  let target;
  for (let i = 0; i < 40; i++) {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    target = list.find((t) => t.type === 'page');
    if (target?.webSocketDebuggerUrl) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!target) throw new Error('No page target available');
  return connect(target.webSocketDebuggerUrl);
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  const pending = new Map();
  const listeners = [];
  let id = 0;

  const ready = new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });

  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    } else if (msg.method) {
      for (const fn of listeners) fn(msg.method, msg.params);
    }
  });

  return {
    ready,
    on: (fn) => {
      listeners.push(fn);
      return () => { const index = listeners.indexOf(fn); if (index !== -1) listeners.splice(index, 1); };
    },
    send: (method, params = {}) =>
      new Promise((resolve, reject) => {
        const msgId = ++id;
        pending.set(msgId, { resolve, reject });
        ws.send(JSON.stringify({ id: msgId, method, params }));
      }),
    close: () => ws.close(),
  };
}

/** Collect console errors, uncaught exceptions and failed requests. */
export function collectErrors(cdp) {
  const consoleErrors = [];
  const exceptions = [];
  const failedRequests = [];
  const urls = new Map();

  cdp.on((method, p) => {
    if (method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(p.type)) {
      const text = (p.args || []).map((a) => a.value ?? a.description ?? a.unserializableValue ?? `[${a.type}]`).join(' ');
      consoleErrors.push({ level: p.type, text: text.slice(0, 600) });
    }
    if (method === 'Runtime.exceptionThrown') {
      const d = p.exceptionDetails;
      exceptions.push({
        text: (d.exception?.description || d.text || '').slice(0, 600),
        url: d.url,
        line: d.lineNumber,
      });
    }
    if (method === 'Log.entryAdded' && ['error', 'warning'].includes(p.entry.level)) {
      consoleErrors.push({ level: `log:${p.entry.level}`, text: `${p.entry.text} ${p.entry.url || ''}`.slice(0, 600) });
    }
    if (method === 'Network.requestWillBeSent') urls.set(p.requestId, p.request.url);
    if (method === 'Network.loadingFailed' && !p.canceled) {
      failedRequests.push({ url: urls.get(p.requestId) || '?', error: p.errorText, type: p.type });
    }
  });

  return { consoleErrors, exceptions, failedRequests };
}

export async function enable(cdp) {
  await cdp.ready;
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Page.enable');
  await cdp.send('Network.enable');
  await cdp.send('DOM.enable');
}

export async function goto(cdp, url, { waitMs = 4000 } = {}) {
  let timer;
  let unsubscribe;
  const loaded = new Promise((resolve, reject) => {
    unsubscribe = cdp.on(method => { if (method === 'Page.loadEventFired') resolve(); });
    timer = setTimeout(() => reject(new Error(`Page load timed out: ${url}`)), 25000);
  });
  try {
    const result = await cdp.send('Page.navigate', { url });
    if (result.errorText) throw new Error(result.errorText);
    await loaded;
    await new Promise(resolve => setTimeout(resolve, waitMs));
  } finally {
    clearTimeout(timer);
    unsubscribe();
  }
}

export async function evaluate(cdp, expression) {
  const res = await cdp.send('Runtime.evaluate', {
    expression: `(() => { ${expression} })()`,
    returnByValue: true,
    awaitPromise: true,
  });
  if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
  return res.result.value;
}

export async function screenshot(cdp, path, clip) {
  const params = { format: 'png', captureBeyondViewport: !!clip };
  if (clip) params.clip = { ...clip, scale: 2 };
  const { data } = await cdp.send('Page.captureScreenshot', params);
  const { writeFileSync } = await import('node:fs');
  writeFileSync(path, Buffer.from(data, 'base64'));
  return path;
}
