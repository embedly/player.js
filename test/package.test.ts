// Checks the built package (dist/, from `npm run build`) the way consumers
// load it: require() and import through package.json "exports", and the UMD
// file as a <script>, AMD module, or CommonJS module. All of this runs in
// Node with no DOM, so it also checks that loading player.js without a
// window (SSR, e.g. Next.js) doesn't throw.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vite-plus/test';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

// Keys of window.playerjs (also checked in the browser by e2e/api.spec.ts).
const NAMESPACE_KEYS = [
  'DEBUG',
  'VERSION',
  'CONTEXT',
  'POST_MESSAGE',
  'origin',
  'addEvent',
  'log',
  'isString',
  'isObject',
  'isArray',
  'isNone',
  'has',
  'indexOf',
  'assert',
  'Keeper',
  'Player',
  'EVENTS',
  'METHODS',
  'READIED',
  'Receiver',
  'HTML5Adapter',
  'JWPlayerAdapter',
  'MockAdapter',
  'VideoJSAdapter',
].sort();

/** Run a script with plain Node from the repo root and parse its JSON output. */
function node(args: string[], script: string): any {
  const out = execFileSync(process.execPath, [...args, '-e', script], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  return JSON.parse(out);
}

function describeNamespace(p: any) {
  return {
    keys: Object.keys(p).sort(),
    version: p.VERSION,
    postMessage: p.POST_MESSAGE,
    player: typeof p.Player,
  };
}

describe('package exports', () => {
  it("require('player.js') returns the playerjs namespace", () => {
    const r = node(
      [],
      `const p = require('player.js');
       console.log(JSON.stringify({ keys: Object.keys(p).sort(), version: p.VERSION,
         postMessage: p.POST_MESSAGE, player: typeof p.Player, hasDefault: 'default' in p }));`,
    );
    expect(r).toEqual({
      keys: NAMESPACE_KEYS,
      version,
      postMessage: false,
      player: 'function',
      hasDefault: false,
    });
  });

  it("import from 'player.js' gives the namespace as default plus named exports", () => {
    const r = node(
      ['--input-type=module'],
      `import playerjs, { Player, Receiver, MockAdapter, EVENTS } from 'player.js';
       console.log(JSON.stringify({ keys: Object.keys(playerjs).sort(), version: playerjs.VERSION,
         named: Player === playerjs.Player && Receiver === playerjs.Receiver &&
           MockAdapter === playerjs.MockAdapter && EVENTS === playerjs.EVENTS }));`,
    );
    expect(r).toEqual({ keys: NAMESPACE_KEYS, version, named: true });
  });
});

describe('UMD bundle', () => {
  for (const file of ['dist/player.js', 'dist/player.min.js']) {
    const code = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

    describe(file, () => {
      it('sets the playerjs global in a plain <script> context', () => {
        const context: Record<string, any> = {};
        runInNewContext(code, context);
        expect(describeNamespace(context.playerjs)).toEqual({
          keys: NAMESPACE_KEYS,
          version,
          postMessage: false,
          player: 'function',
        });
      });

      it('assigns module.exports under CommonJS', () => {
        const module = { exports: {} as any };
        runInNewContext(code, { module, exports: module.exports });
        expect(describeNamespace(module.exports).keys).toEqual(NAMESPACE_KEYS);
      });

      it('defines an anonymous AMD module', () => {
        let defined: any;
        const define = (deps: string[], factory: () => unknown) => {
          defined = { deps, value: factory() };
        };
        define.amd = {};
        runInNewContext(code, { define });
        expect(defined.deps).toEqual([]);
        expect(describeNamespace(defined.value).keys).toEqual(NAMESPACE_KEYS);
      });
    });
  }
});
