import {
  EVENTS,
  METHODS,
  addEvent,
  assert,
  config,
  has,
  indexOf,
  isArray,
  isNone,
  isObject,
  isString,
  log,
  origin,
} from './core';
import { HTML5Adapter } from './adapters/html';
import { JWPlayerAdapter } from './adapters/jwplayer';
import { MockAdapter } from './adapters/mock';
import { VideoJSAdapter } from './adapters/video';
import { Keeper } from './keeper';
import { Player, READIED } from './player';
import { Receiver } from './receiver';

/**
 * The `playerjs` namespace, exactly as the browser global exposes it. Its
 * settings (DEBUG, VERSION, CONTEXT, POST_MESSAGE) are read live, so
 * `playerjs.DEBUG = true` takes effect.
 */
const playerjs: typeof config & {
  origin: typeof origin;
  addEvent: typeof addEvent;
  log: typeof log;
  isString: typeof isString;
  isObject: typeof isObject;
  isArray: typeof isArray;
  isNone: typeof isNone;
  has: typeof has;
  indexOf: typeof indexOf;
  assert: typeof assert;
  Keeper: typeof Keeper;
  Player: typeof Player;
  EVENTS: typeof EVENTS;
  METHODS: typeof METHODS;
  READIED: typeof READIED;
  Receiver: typeof Receiver;
  HTML5Adapter: typeof HTML5Adapter;
  JWPlayerAdapter: typeof JWPlayerAdapter;
  MockAdapter: typeof MockAdapter;
  VideoJSAdapter: typeof VideoJSAdapter;
} = Object.assign(config, {
  origin,
  addEvent,
  log,
  isString,
  isObject,
  isArray,
  isNone,
  has,
  indexOf,
  assert,
  Keeper,
  Player,
  EVENTS,
  METHODS,
  READIED,
  Receiver,
  HTML5Adapter,
  JWPlayerAdapter,
  MockAdapter,
  VideoJSAdapter,
});

export default playerjs;

export {
  EVENTS,
  HTML5Adapter,
  JWPlayerAdapter,
  Keeper,
  METHODS,
  MockAdapter,
  Player,
  READIED,
  Receiver,
  VideoJSAdapter,
};
export type { Callback, Message } from './core';
export type { Handler } from './receiver';
export type { JWPlayer } from './adapters/jwplayer';
export type { VideoJSPlayer } from './adapters/video';
