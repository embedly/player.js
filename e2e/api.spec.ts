// Public JavaScript API characterization: constructor, argument validation,
// listener management and exported globals.

import { expect, test } from '@playwright/test';
import { childFrame, openParent, openPlayer } from './helpers';

declare const player: any;
declare const playerjs: any;
declare const adapter: any;
declare function addFrame(path: string): HTMLIFrameElement;
declare function whenReady(p: any, ms?: number): Promise<void>;
declare function get(name: string, ms?: number): Promise<any>;
declare function nextEvent(name: string, ms?: number): Promise<any>;
declare function timeout<T>(ms: number, value?: T): Promise<T>;
declare const __received: { origin: string; data: unknown }[];

// Run fn in the page and return what it threw (player.js throws strings).
const thrown = (fn: string) => `(() => { try { (${fn})(); return null; } catch (e) { return { type: typeof e, value: String(e) }; } })()`;

test.describe('globals', () => {
  test.beforeEach(async ({ page }) => {
    await openParent(page);
  });

  test('exposes window.playerjs with constants', async ({ page }) => {
    const g = await page.evaluate(() => ({
      keys: Object.keys(playerjs).sort(),
      context: playerjs.CONTEXT,
      events: playerjs.EVENTS.all(),
      methods: playerjs.METHODS.all(),
      PLAY: playerjs.EVENTS.PLAY,
      GETDURATION: playerjs.METHODS.GETDURATION,
    }));
    expect(g.keys).toEqual(
      [
        'DEBUG', 'VERSION', 'CONTEXT', 'POST_MESSAGE', 'origin', 'addEvent', 'log', 'isString', 'isObject',
        'isArray', 'isNone', 'has', 'indexOf', 'assert', 'Keeper', 'Player', 'EVENTS', 'METHODS', 'READIED',
        'Receiver', 'HTML5Adapter', 'JWPlayerAdapter', 'MockAdapter', 'VideoJSAdapter',
      ].sort(),
    );
    expect(g.context).toBe('player.js');
    expect(g.events).toEqual(['ready', 'play', 'pause', 'ended', 'timeupdate', 'progress', 'error']);
    expect(g.methods).toHaveLength(15);
    expect(g.PLAY).toBe('play');
    expect(g.GETDURATION).toBe('getDuration');
  });

  test('playerjs.origin()', async ({ page }) => {
    const o = await page.evaluate(() => [
      playerjs.origin('https://example.com/a/b?c=d'),
      playerjs.origin('//example.com:8080/x'),
      playerjs.origin('http://example.com'),
    ]);
    expect(o).toEqual(['https://example.com', 'http://example.com:8080', 'http://example.com']);
  });
});

test.describe('constructor', () => {
  test.beforeEach(async ({ page }) => {
    await openParent(page);
  });

  test('accepts an iframe element, an id string, and works without new', async ({ page }) => {
    const ok = await page.evaluate(async () => {
      const a = addFrame('/e2e/fixtures/mock.html');
      const b = addFrame('/e2e/fixtures/mock.html');
      const p1 = new playerjs.Player(a);
      const p2 = playerjs.Player(b.id);
      await Promise.all([whenReady(p1), whenReady(p2)]);
      return {
        p1: p1 instanceof playerjs.Player,
        p2: p2 instanceof playerjs.Player,
        elem: p2.elem === b,
        origin: p1.origin,
      };
    });
    expect(ok).toEqual({ p1: true, p2: true, elem: true, origin: 'http://127.0.0.1:8003' });
  });

  test('throws for a non-iframe element', async ({ page }) => {
    const e = await page.evaluate(thrown(`() => new playerjs.Player(document.body)`));
    expect(e).toEqual({ type: 'string', value: 'playerjs.Player constructor requires an Iframe, got "BODY"' });
  });

  test('throws for an iframe without src', async ({ page }) => {
    const e = await page.evaluate(
      thrown(`() => { const f = document.createElement('iframe'); document.body.appendChild(f); new playerjs.Player(f); }`),
    );
    expect(e).toEqual({ type: 'string', value: "playerjs.Player constructor requires a Iframe with a 'src' attribute." });
  });
});

test.describe('method argument validation', () => {
  test.beforeEach(async ({ page }) => {
    await openPlayer(page, 'mock.html');
  });

  test('getters require a callback', async ({ page }) => {
    expect(await page.evaluate(thrown(`() => player.getDuration()`))).toEqual({
      type: 'string',
      value: 'Get methods require a callback.',
    });
  });

  test('setters require a value', async ({ page }) => {
    expect(await page.evaluate(thrown(`() => player.setVolume()`))).toEqual({
      type: 'string',
      value: 'Set methods require a value.',
    });
  });

  test('setters accept falsy values', async ({ page }) => {
    const v = await page.evaluate(async () => {
      player.setVolume(0);
      return get('getVolume');
    });
    expect(v).toBe(0);
  });

  test('supports() rejects anything but "method" or "event"', async ({ page }) => {
    expect(await page.evaluate(thrown(`() => player.supports('thing', 'play')`))).toEqual({
      type: 'string',
      value: 'evtOrMethod needs to be either "event" or "method" got thing',
    });
  });

  test('getter callbacks run with the player as this, or a given context', async ({ page }) => {
    const r = await page.evaluate(async () => {
      const ctx = { name: 'ctx' };
      const a = await new Promise((res) => player.getDuration(function (this: any) { res(this === player); }));
      const b = await new Promise((res) => player.getDuration(function (this: any) { res(this === ctx); }, ctx));
      return { a, b };
    });
    expect(r).toEqual({ a: true, b: true });
  });
});

test.describe('event listeners', () => {
  test.beforeEach(async ({ page }) => {
    await openPlayer(page, 'mock.html');
  });

  test('multiple listeners on one event all fire', async ({ page }) => {
    const calls = await page.evaluate(async () => {
      const calls: number[] = [];
      player.on('play', () => calls.push(0));
      player.on('play', () => calls.push(1));
      player.on('play', () => calls.push(2));
      player.play();
      await timeout(300);
      return calls.sort();
    });
    expect(calls).toEqual([0, 1, 2]);
  });

  test('listeners run with the player as this, or a given context', async ({ page }) => {
    const r = await page.evaluate(async () => {
      const ctx = {};
      const out: Record<string, boolean> = {};
      player.on('play', function (this: any) { out.default = this === player; });
      player.on('play', function (this: any) { out.ctx = this === ctx; }, ctx);
      player.play();
      await timeout(300);
      return out;
    });
    expect(r).toEqual({ default: true, ctx: true });
  });

  test('off(event, cb) removes only that callback', async ({ page }) => {
    const calls = await page.evaluate(async () => {
      const calls: string[] = [];
      const a = () => calls.push('a');
      const b = () => calls.push('b');
      player.on('pause', a);
      player.on('pause', b);
      await timeout(100);
      player.off('pause', a);
      player.play();
      player.pause();
      await timeout(300);
      return calls;
    });
    expect(calls).toEqual(['b']);
  });

  test('off(event) stops all callbacks for that event locally', async ({ page }) => {
    const r = await page.evaluate(async () => {
      let calls = 0;
      player.on('pause', () => calls++);
      player.on('pause', () => calls++);
      await timeout(100);
      const removed = player.off('pause');
      player.play();
      player.pause();
      await timeout(300);
      return { removed, calls };
    });
    expect(r).toEqual({ removed: true, calls: 0 });
  });

  test('off() returns false when there is nothing to remove', async ({ page }) => {
    expect(await page.evaluate(() => player.off('ended'))).toBe(false);
  });

  test('off(event, cb) unregisters the listener in the receiver', async ({ page }) => {
    await page.evaluate(async () => {
      const a = () => {};
      player.on('pause', a);
      await timeout(100);
      player.off('pause', a);
      await timeout(100);
    });
    expect(await childFrame(page, 'mock').evaluate(() => adapter.receiver.eventListeners.pause)).toBeUndefined();
  });

  // Regression: off() used to return inside its loop, so only the first
  // listener was removed in the iframe and the rest kept sending events.
  test('off(event) unregisters every listener in the receiver', async ({ page }) => {
    await page.evaluate(async () => {
      player.on('pause', () => {});
      player.on('pause', () => {});
      player.on('pause', () => {});
      await timeout(100);
      player.off('pause');
      await timeout(100);
    });
    expect(await childFrame(page, 'mock').evaluate(() => adapter.receiver.eventListeners.pause)).toBeUndefined();
  });

  test('getter callbacks fire once', async ({ page }) => {
    const n = await page.evaluate(async () => {
      let n = 0;
      player.getDuration(() => n++);
      await timeout(300);
      return n;
    });
    expect(n).toBe(1);
  });
});

test.describe('remounting an embed with the same src', () => {
  // As SPA frameworks do: remove the iframe, add a new one with the same src.
  // The removed Player used to pick up the new iframe's ready and, before
  // #94, crashed sending its queue to a null contentWindow (#93, #75).
  const remount = (page: any, destroyFirst: boolean) =>
    page.evaluate(async (destroyFirst: boolean) => {
      const w = window as any;
      const a = addFrame('/e2e/fixtures/mock.html?delay=500');
      const old = new playerjs.Player(a);
      const counts = { oldReady: 0, oldPlay: 0, newPlay: 0 };
      old.on('ready', () => counts.oldReady++);
      old.on('play', () => counts.oldPlay++);
      old.getDuration(() => {});
      await timeout(100);
      if (destroyFirst) old.destroy();
      a.remove();

      const b = addFrame('/e2e/fixtures/mock.html?delay=500');
      const p = (w.player = new playerjs.Player(b));
      await whenReady(p);
      p.on('play', () => counts.newPlay++);
      await timeout(100);
      p.play();
      await timeout(500);
      return { ...counts, oldIsReady: old.isReady, newDuration: await get('getDuration') };
    }, destroyFirst);

  test.beforeEach(async ({ page }) => {
    await openParent(page);
  });

  for (const destroyFirst of [false, true]) {
    test(`${destroyFirst ? 'after destroy()' : 'without destroy()'}: no errors and the old player stays asleep`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const r = await remount(page, destroyFirst);
      expect(errors).toEqual([]);
      expect(r).toEqual({ oldReady: 0, oldPlay: 0, newPlay: 1, oldIsReady: false, newDuration: 20 });
    });
  }
});

test.describe('destroy()', () => {
  // Methods that reached the mock receiver, per its raw message log.
  const sentToReceiver = (page: any, methods: string[]) =>
    childFrame(page, 'mock').evaluate(
      (methods: string[]) => __received.map((m) => JSON.parse(m.data as string).method).filter((m) => methods.includes(m)),
      methods,
    );

  test.beforeEach(async ({ page }) => {
    await openParent(page);
  });

  test('stops handling messages and sending calls', async ({ page }) => {
    await page.evaluate(() => (window as any).createPlayer('/e2e/fixtures/mock.html'));
    const result = page.evaluate(async () => {
      const calls = { play: 0, getter: 0, receive: 0 };
      player.on('play', () => calls.play++);
      await timeout(100);

      player.destroy();
      player.destroy(); // safe to call twice

      // If the window listener were still attached, this would be called.
      player.receive = () => calls.receive++;

      const send = player.send({ method: 'play' });
      player.play();
      player.setVolume(10);
      player.getDuration(() => calls.getter++);
      await timeout(600);
      return { send, calls };
    });
    // A listener-less event from the iframe would reach every play listener.
    await page.waitForTimeout(200);
    await childFrame(page, 'mock').evaluate(() =>
      window.parent.postMessage(JSON.stringify({ context: 'player.js', event: 'play' }), '*'),
    );
    expect(await result).toEqual({ send: false, calls: { play: 0, getter: 0, receive: 0 } });
    expect(await sentToReceiver(page, ['play', 'setVolume', 'getDuration'])).toEqual([]);
  });

  test('before ready: queued calls are never sent', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.evaluate(async () => {
      const p = new playerjs.Player(addFrame('/e2e/fixtures/mock.html?delay=500'));
      p.setVolume(42);
      p.play();
      p.destroy();
      await timeout(1000);
    });
    expect(await sentToReceiver(page, ['setVolume', 'play'])).toEqual([]);
    expect(errors).toEqual([]);
  });
});
