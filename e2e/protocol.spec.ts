// Wire-protocol characterization: message format, origin checks, errors,
// ready handshake and pre-ready queuing.
//
// Existing iframes in the wild speak this protocol, so a rewrite must keep
// these passing (or change them deliberately).

import { expect, test } from '@playwright/test';
import { CHILD, childFrame, openParent, openPlayer } from './helpers';

declare const player: any;
declare const playerjs: any;
declare const adapter: any;
declare function addFrame(path: string, attrs?: Record<string, unknown>): HTMLIFrameElement;
declare function whenReady(p: any, ms?: number): Promise<void>;
declare function get(name: string, ms?: number): Promise<any>;
declare function nextEvent(name: string, ms?: number): Promise<any>;
declare function childMessages(): any[];
declare function timeout<T>(ms: number, value?: T): Promise<T>;
declare const __messages: { origin: string; data: unknown }[];
declare const __received: { origin: string; data: unknown }[];

// Version sent on the wire; must track package.json.
const VERSION: string = require('../package.json').version;

const LISTENER_ID = /^listener-[0-9a-f]{12}4[0-9a-f]{3}[89ab][0-9a-f]{15}$/;
const MOCK_URL = `${CHILD}/e2e/fixtures/mock.html`;

test.describe('message format', () => {
  test.beforeEach(async ({ page }) => {
    await openPlayer(page, 'mock.html');
  });

  test('child -> parent messages are JSON strings', async ({ page }) => {
    await page.evaluate(() => get('getDuration'));
    const raw = await page.evaluate(() => __messages.filter((m) => m.origin === 'http://127.0.0.1:8003'));
    expect(raw.length).toBeGreaterThan(0);
    for (const m of raw) expect(typeof m.data).toBe('string');
  });

  test('parent -> child messages are JSON strings', async ({ page }) => {
    await page.evaluate(() => get('getDuration'));
    const raw = await childFrame(page, 'mock').evaluate(() => __received);
    expect(raw.length).toBeGreaterThan(0);
    for (const m of raw) {
      expect(m.origin).toBe('http://localhost:8004');
      expect(typeof m.data).toBe('string');
    }
  });

  test('ready payload carries src, events and methods', async ({ page }) => {
    const ready = await page.evaluate(() => childMessages().find((m) => m.event === 'ready'));
    expect(ready).toEqual({
      context: 'player.js',
      version: VERSION,
      event: 'ready',
      value: {
        src: MOCK_URL,
        events: expect.any(Array),
        methods: expect.any(Array),
      },
    });
  });

  test('getter request and response', async ({ page }) => {
    await page.evaluate(() => get('getDuration'));
    const sent = await childFrame(page, 'mock').evaluate(() =>
      __received.map((m) => JSON.parse(m.data as string)).filter((d) => d.method === 'getDuration'),
    );
    expect(sent).toEqual([
      { method: 'getDuration', context: 'player.js', version: VERSION, listener: expect.stringMatching(LISTENER_ID) },
    ]);

    const reply = await page.evaluate(() => childMessages().filter((m) => m.event === 'getDuration'));
    expect(reply).toEqual([
      { context: 'player.js', version: VERSION, event: 'getDuration', value: 20, listener: sent[0].listener },
    ]);
  });

  test('setter and plain method requests', async ({ page }) => {
    await page.evaluate(async () => {
      player.setVolume(42);
      player.mute();
      await get('getVolume'); // round-trip so both have arrived
    });
    const sent = await childFrame(page, 'mock').evaluate(() =>
      __received.map((m) => JSON.parse(m.data as string)).filter((d) => d.method === 'setVolume' || d.method === 'mute'),
    );
    expect(sent).toEqual([
      { method: 'setVolume', value: 42, context: 'player.js', version: VERSION },
      { method: 'mute', context: 'player.js', version: VERSION },
    ]);
  });

  test('addEventListener request and event delivery', async ({ page }) => {
    await page.evaluate(async () => {
      const p = nextEvent('play');
      player.play();
      await p;
    });
    const add = await childFrame(page, 'mock').evaluate(() =>
      __received.map((m) => JSON.parse(m.data as string)).filter((d) => d.method === 'addEventListener' && d.value === 'play'),
    );
    expect(add).toEqual([
      { method: 'addEventListener', value: 'play', listener: expect.stringMatching(LISTENER_ID), context: 'player.js', version: VERSION },
    ]);

    const evt = await page.evaluate(() => childMessages().filter((m) => m.event === 'play'));
    expect(evt).toEqual([{ context: 'player.js', version: VERSION, event: 'play', listener: add[0].listener }]);
  });

  test('VERSION matches package.json', async ({ page }) => {
    expect(await page.evaluate(() => playerjs.VERSION)).toBe(VERSION);
  });
});

test.describe('Player-side message filtering', () => {
  test.beforeEach(async ({ page }) => {
    await openPlayer(page, 'mock.html');
  });

  test('ignores player.js messages from origins other than the iframe', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const p = nextEvent('play', 500);
      window.postMessage(JSON.stringify({ context: 'player.js', event: 'play' }), '*');
      return p;
    });
    expect(result).toBe('timeout');
  });

  // Characterization: an event without a listener id is delivered to every
  // listener for that event. Any script on the iframe origin can do this.
  test('delivers listener-less events from the iframe origin to all listeners', async ({ page }) => {
    const p = page.evaluate(() => nextEvent('play', 2000));
    await page.waitForTimeout(100); // let addEventListener reach the child
    await childFrame(page, 'mock').evaluate(() =>
      window.parent.postMessage(JSON.stringify({ context: 'player.js', event: 'play', value: 'forged' }), '*'),
    );
    expect(await p).toBe('forged');
  });

  test('ignores wrong context and non-JSON messages from the iframe', async ({ page }) => {
    const p = page.evaluate(() => nextEvent('play', 800));
    await page.waitForTimeout(100);
    await childFrame(page, 'mock').evaluate(() => {
      window.parent.postMessage(JSON.stringify({ context: 'other.js', event: 'play' }), '*');
      window.parent.postMessage('not json', '*');
      window.parent.postMessage({ context: 'player.js', event: 'play' }, '*'); // object, not string
    });
    expect(await p).toBe('timeout');
  });
});

test.describe('Receiver-side message filtering', () => {
  test.beforeEach(async ({ page }) => {
    await openPlayer(page, 'mock.html');
  });

  test('ignores messages not from the parent origin', async ({ page }) => {
    await childFrame(page, 'mock').evaluate(() =>
      window.postMessage(JSON.stringify({ context: 'player.js', method: 'play' }), '*'),
    );
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => get('getPaused'))).toBe(true);
  });

  test('ignores messages with the wrong context', async ({ page }) => {
    await page.evaluate(() => {
      const f = document.querySelector('iframe')!;
      f.contentWindow!.postMessage(JSON.stringify({ context: 'other.js', method: 'play' }), 'http://127.0.0.1:8003');
    });
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => get('getPaused'))).toBe(true);
  });

  // Characterization: the receiver also accepts structured (non-string) data,
  // even though the Player itself only ever sends strings.
  test('accepts object (non-string) messages', async ({ page }) => {
    await page.evaluate(() => {
      const f = document.querySelector('iframe')!;
      f.contentWindow!.postMessage({ context: 'player.js', method: 'play' }, 'http://127.0.0.1:8003');
    });
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => get('getPaused'))).toBe(false);
  });

  test('emits error code 2 for a method outside the spec', async ({ page }) => {
    const err = await page.evaluate(async () => {
      const e = nextEvent('error');
      await timeout(100);
      const f = document.querySelector('iframe')!;
      f.contentWindow!.postMessage(
        JSON.stringify({ context: 'player.js', method: 'explode' }),
        'http://127.0.0.1:8003',
      );
      return e;
    });
    expect(err).toEqual({ code: 2, msg: 'Invalid Method "explode"' });
  });

  test('is inert when not inside an iframe', async ({ page }) => {
    await page.goto(MOCK_URL);
    const result = await page.evaluate(() => ({
      reject: adapter.receiver.reject,
      send: adapter.receiver.send('play'),
    }));
    expect(result).toEqual({ reject: true, send: false });
  });
});

test.describe('partial receivers', () => {
  test.beforeEach(async ({ page }) => {
    await openPlayer(page, 'minimal.html');
  });

  test('supports() reflects what ready advertised', async ({ page }) => {
    const s = await page.evaluate(() => ({
      play: player.supports('method', 'play'),
      getDuration: player.supports('method', 'getDuration'),
      both: player.supports('method', ['play', 'getDuration']),
      readyPlay: player.supports('event', ['ready', 'play']),
      ended: player.supports('event', 'ended'),
    }));
    expect(s).toEqual({ play: true, getDuration: false, both: false, readyPlay: true, ended: false });
  });

  test('emits error code 3 for an unimplemented method and never answers', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const e = nextEvent('error');
      await timeout(100);
      const value = get('getDuration', 800);
      return { error: await e, value: await value };
    });
    expect(result).toEqual({ error: { code: 3, msg: 'Method Not Supported"getDuration"' }, value: 'timeout' });
  });

  test('implemented methods still work', async ({ page }) => {
    const evt = await page.evaluate(async () => {
      const p = nextEvent('play');
      player.play();
      return p;
    });
    expect(evt).toBeNull();
    expect(await childFrame(page, 'minimal').evaluate(() => (window as any).plays)).toBe(1);
  });
});

test.describe('ready handshake', () => {
  test.beforeEach(async ({ page }) => {
    await openParent(page);
  });

  test('works when the Player is created before the iframe loads', async ({ page }) => {
    await page.evaluate(() => {
      const f = addFrame('/e2e/fixtures/mock.html');
      (window as any).player = new playerjs.Player(f);
      return whenReady((window as any).player);
    });
    expect(await page.evaluate(() => get('getDuration'))).toBe(20);
  });

  test('works when the Player is created after the iframe is already ready', async ({ page }) => {
    await page.evaluate(async () => {
      const f = addFrame('/e2e/fixtures/mock.html');
      await new Promise((r) => f.addEventListener('load', r, { once: true }));
      await timeout(200);
      (window as any).player = new playerjs.Player(f);
      return whenReady((window as any).player);
    });
    expect(await page.evaluate(() => get('getDuration'))).toBe(20);
  });

  test('records ready iframes in playerjs.READIED', async ({ page }) => {
    await page.evaluate(async () => {
      const f = addFrame('/e2e/fixtures/mock.html');
      await new Promise((r) => f.addEventListener('load', r, { once: true }));
      await timeout(200);
    });
    expect(await page.evaluate(() => playerjs.READIED)).toEqual([MOCK_URL]);
  });

  test('a late ready subscriber fires once, earlier ones do not re-fire', async ({ page }) => {
    const counts = await page.evaluate(async () => {
      const f = addFrame('/e2e/fixtures/mock.html');
      const p = new playerjs.Player(f);
      const counts = { first: 0, late: 0 };
      p.on('ready', () => counts.first++);
      await whenReady(p);
      p.on('ready', () => counts.late++);
      await timeout(500);
      return counts;
    });
    // whenReady adds its own listener, so 'first' is the explicit one only.
    expect(counts).toEqual({ first: 1, late: 1 });
  });

  test('calls made before ready are queued and flushed in order', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const f = addFrame('/e2e/fixtures/mock.html?delay=600');
      const p = ((window as any).player = new playerjs.Player(f));
      p.setVolume(42);
      p.setCurrentTime(3);
      const volume = new Promise((r) => p.getVolume(r));
      const time = new Promise((r) => p.getCurrentTime(r));
      const queued = p.queue.length;
      const isReadyBefore = p.isReady;
      await whenReady(p);
      return { queued, isReadyBefore, volume: await volume, time: await time, queueAfter: p.queue.length };
    });
    expect(result).toEqual({ queued: 4, isReadyBefore: false, volume: 42, time: 3, queueAfter: 0 });
  });
});

test.describe('several players from the same origin', () => {
  // A listener-less ready from one iframe used to fire the ready callbacks
  // of every Player on the page from that origin, even ones whose own
  // iframe never became ready (README: "inconsistencies if you have
  // multiple players on the page").
  test("another iframe's ready doesn't fire this player's ready", async ({ page }) => {
    await openParent(page);
    const r = await page.evaluate(async () => {
      const slow = new playerjs.Player(addFrame('/e2e/fixtures/mock.html?delay=60000'));
      const fast = new playerjs.Player(addFrame('/e2e/fixtures/mock.html'));
      const counts = { slow: 0, fast: 0 };
      slow.on('ready', () => counts.slow++);
      fast.on('ready', () => counts.fast++);
      await timeout(1000);
      return { ...counts, slowIsReady: slow.isReady, fastIsReady: fast.isReady };
    });
    expect(r).toEqual({ slow: 0, fast: 1, slowIsReady: false, fastIsReady: true });
  });
});

test.describe('referrer-less iframes', () => {
  // Characterization of a security/robustness problem: the Receiver derives
  // the parent origin from document.referrer. With no referrer its origin is
  // "", so it posts to '*' (any parent can listen) and rejects every incoming
  // message because e.origin is never "". Ready still arrives; nothing else
  // works.
  test('ready arrives but commands are never answered', async ({ page }) => {
    await openParent(page);
    await page.evaluate(() => (window as any).createPlayer('/e2e/fixtures/mock.html', { referrerPolicy: 'no-referrer' }));
    expect(await childFrame(page, 'mock').evaluate(() => adapter.receiver.origin)).toBe('');
    expect(await page.evaluate(() => get('getDuration', 800))).toBe('timeout');
  });
});

// The ready handshake identifies the iframe by the window that sent the
// message, not by comparing its URL to iframe.src. Before this, an iframe that
// redirected or rewrote its own URL never became ready: ready callbacks fired
// but commands stayed queued if the Player was created before load (#82,
// #100), and ready never fired if it was created after (#67).
test.describe('iframe URL differs from its src', () => {
  const CASES = [
    { name: 'src redirects', path: '/redirect?to=/e2e/fixtures/mock.html' },
    { name: 'receiver rewrites its URL', path: '/e2e/fixtures/mock.html?replaceState=1' },
  ];

  // Create a Player before or after the iframe loads, then report what the
  // embedder would observe.
  const observe = (page: any, path: string, afterLoad: boolean) =>
    page.evaluate(
      async ({ path, afterLoad }: { path: string; afterLoad: boolean }) => {
        const f = addFrame(path);
        if (afterLoad) {
          await new Promise((r) => f.addEventListener('load', r, { once: true }));
          await timeout(300);
        }
        const p = ((window as any).player = new playerjs.Player(f));
        let readyFired = 0;
        p.on('ready', () => readyFired++);
        await timeout(800);
        const duration = await get('getDuration', 800);
        return { readyFired, isReady: p.isReady, queued: p.queue.map((q: any) => q.method), duration };
      },
      { path, afterLoad },
    );

  test.beforeEach(async ({ page }) => {
    await openParent(page);
  });

  for (const c of CASES) {
    for (const afterLoad of [false, true]) {
      test(`${c.name}, Player created ${afterLoad ? 'after' : 'before'} load: ready fires once and commands work`, async ({ page }) => {
        expect(await observe(page, c.path, afterLoad)).toEqual({
          readyFired: 1,
          isReady: true,
          queued: [],
          duration: 20,
        });
      });
    }
  }
});
