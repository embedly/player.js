// The player.js API contract, run against each receiver implementation.
//
// These drive a real Player in the parent page talking to a real Receiver in a
// cross-origin iframe.

import { expect, test } from '@playwright/test';
import { openPlayer } from './helpers';

declare const player: any;
declare function get(name: string, ms?: number): Promise<any>;
declare function nextEvent(name: string, ms?: number): Promise<any>;

const RECEIVERS = [
  { name: 'MockAdapter', fixture: 'mock.html', duration: 20 },
  { name: 'HTML5Adapter', fixture: 'html5.html', duration: null },
];

for (const r of RECEIVERS) {
  test.describe(r.name, () => {
    test.beforeEach(async ({ page }) => {
      await openPlayer(page, r.fixture);
    });

    test('play() fires play and timeupdate', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const play = nextEvent('play');
        const time = nextEvent('timeupdate');
        player.play();
        return { play: await play, time: await time };
      });

      expect(result.play).toBeNull(); // play carries no payload
      expect(result.time).toEqual({
        seconds: expect.any(Number),
        duration: expect.any(Number),
      });
    });

    test('pause() fires pause and getPaused reports true', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const play = nextEvent('play');
        player.play();
        await play;
        const before = await get('getPaused');

        const pause = nextEvent('pause');
        player.pause();
        return { before, pause: await pause, after: await get('getPaused') };
      });

      expect(result.before).toBe(false);
      expect(result.pause).toBeNull();
      expect(result.after).toBe(true);
    });

    test('getDuration()', async ({ page }) => {
      const duration = await page.evaluate(() => get('getDuration'));
      if (r.duration === null) {
        expect(duration).toBeGreaterThan(0);
      } else {
        expect(duration).toBe(r.duration);
      }
    });

    test('setCurrentTime() / getCurrentTime()', async ({ page }) => {
      const t = await page.evaluate(async () => {
        player.setCurrentTime(5);
        return get('getCurrentTime');
      });
      expect(t).toBe(5);
    });

    test('setVolume() / getVolume() on a 0-100 scale', async ({ page }) => {
      const v = await page.evaluate(async () => {
        player.setVolume(87);
        return get('getVolume');
      });
      expect(v).toBe(87);
    });

    test('mute() / unmute() / getMuted()', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const initial = await get('getMuted');
        player.mute();
        const muted = await get('getMuted');
        player.unmute();
        const unmuted = await get('getMuted');
        return { initial, muted, unmuted };
      });
      expect(result).toEqual({ initial: false, muted: true, unmuted: false });
    });

    test('setLoop() / getLoop()', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const initial = await get('getLoop');
        player.setLoop(true);
        const on = await get('getLoop');
        player.setLoop(false);
        return { initial, on, off: await get('getLoop') };
      });
      expect(result).toEqual({ initial: false, on: true, off: false });
    });

    test('ready advertises every event and method', async ({ page }) => {
      const supported = await page.evaluate(() => ({ events: player.events, methods: player.methods }));
      expect(supported.events).toEqual(['ready', 'play', 'pause', 'ended', 'timeupdate', 'progress', 'error']);
      expect(supported.methods).toEqual([
        'play', 'pause', 'getPaused', 'mute', 'unmute', 'getMuted', 'setVolume', 'getVolume',
        'getDuration', 'setCurrentTime', 'getCurrentTime', 'setLoop', 'getLoop',
        'removeEventListener', 'addEventListener',
      ]);
    });
  });
}

test.describe('HTML5Adapter specifics', () => {
  test.beforeEach(async ({ page }) => {
    await openPlayer(page, 'html5.html');
  });

  test('fires ended when playback reaches the end', async ({ page }) => {
    const ended = await page.evaluate(async () => {
      const duration = await get('getDuration');
      player.setCurrentTime(duration - 0.3);
      const ended = nextEvent('ended', 5000);
      player.play();
      return ended;
    });
    expect(ended).toBeNull();
  });

  test('timeupdate reports the video position and duration', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const duration = await get('getDuration');
      const time = nextEvent('timeupdate');
      player.play();
      return { duration, time: await time };
    });
    expect(result.time.duration).toBe(result.duration);
    expect(result.time.seconds).toBeGreaterThanOrEqual(0);
  });

  // Regression: the adapter used to emit only 'buffered' (not in the spec),
  // so player.on('progress') never fired (#79).
  test('fires progress with how far the media has buffered', async ({ page }) => {
    // preload="none" (?early=1) so buffering starts only once we play, after
    // the listener is in place, and a throttled download (?throttle=1) so the
    // browser reports progress instead of receiving the file in one go.
    await openPlayer(page, 'html5.html?early=1&throttle=1');
    const progress = await page.evaluate(async () => {
      const p = nextEvent('progress', 4000);
      player.play();
      return p;
    });
    expect(progress).toEqual({
      seconds: expect.any(Number),
      duration: expect.any(Number),
      percent: expect.any(Number),
    });
    expect(progress.seconds).toBeGreaterThan(0);
    expect(progress.seconds).toBeLessThanOrEqual(progress.duration);
    expect(progress.percent).toBeCloseTo(progress.seconds / progress.duration, 5);
    expect(progress.percent).toBeLessThanOrEqual(1);
  });

  // Compatibility: the legacy, non-spec 'buffered' event is still emitted
  // with its original payload, where "percent" is the number of buffered
  // time ranges. Existing embedders listen for it.
  test('still fires the legacy buffered event', async ({ page }) => {
    await openPlayer(page, 'html5.html?early=1&throttle=1');
    const buffered = await page.evaluate(async () => {
      const p = nextEvent('buffered', 4000);
      player.play();
      return p;
    });
    expect(buffered).toEqual({ percent: expect.any(Number) });
    expect(Number.isInteger(buffered.percent)).toBe(true);
    expect(buffered.percent).toBeGreaterThanOrEqual(0);
  });
});

test.describe('HTML5Adapter ready before metadata (?early=1)', () => {
  // The original test page called ready() immediately with preload="none".
  // Duration is NaN at that point, and NaN goes over the wire as JSON null.
  // A switch to structured-clone messaging would change this to NaN.
  test('getDuration() answers null before metadata loads', async ({ page }) => {
    await openPlayer(page, 'html5.html?early=1');
    expect(await page.evaluate(() => get('getDuration'))).toBeNull();
  });
});
