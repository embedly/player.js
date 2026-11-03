import { version } from '../package.json';

/** A player.js message as it goes over postMessage (JSON-encoded). */
export interface Message {
  context?: string;
  version?: string;
  method?: string;
  event?: string;
  value?: any;
  listener?: string | null;
}

export type Callback = (this: any, value?: any) => void;

const hasWindow = typeof window !== 'undefined';

/**
 * Settings that live on the public `playerjs` namespace and may be changed at
 * runtime (e.g. `playerjs.DEBUG = true`), so code reads them from here.
 */
export const config: { DEBUG: boolean; VERSION: string; CONTEXT: string; POST_MESSAGE: boolean } = {
  DEBUG: false,
  VERSION: version,
  CONTEXT: 'player.js',
  POST_MESSAGE: hasWindow && !!window.postMessage,
};

/* Utils. */

/** The origin (scheme://host:port) of a URL. Protocol-relative URLs use the page's protocol. */
export function origin(url: string): string {
  if (url.substr(0, 2) === '//') {
    url = window.location.protocol + url;
  }
  return url.split('/').slice(0, 3).join('/');
}

export function addEvent(elem: any, type: string, eventHandle: (e: any) => void): void {
  if (!elem) {
    return;
  }
  if (elem.addEventListener) {
    elem.addEventListener(type, eventHandle, false);
  } else if (elem.attachEvent) {
    elem.attachEvent('on' + type, eventHandle);
  } else {
    elem['on' + type] = eventHandle;
  }
}

// usage: log('inside coolFunc',this,arguments);
// http://paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
export const log: ((...args: any[]) => void) & { history?: IArguments[] } = function (
  this: unknown,
) {
  log.history = log.history || [];
  log.history.push(arguments);
  if (hasWindow && window.console && config.DEBUG) {
    window.console.log(Array.prototype.slice.call(arguments));
  }
};

export function isString(obj: unknown): obj is string {
  return Object.prototype.toString.call(obj) === '[object String]';
}

export function isObject(obj: unknown): obj is Record<string, any> {
  return Object.prototype.toString.call(obj) === '[object Object]';
}

export function isArray(obj: unknown): obj is any[] {
  return Object.prototype.toString.call(obj) === '[object Array]';
}

export function isNone(obj: unknown): obj is null | undefined {
  return obj === null || obj === undefined;
}

export function has(obj: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function indexOf<T>(array: ArrayLike<T> | null | undefined, item: T): number {
  if (array == null) {
    return -1;
  }
  for (let i = 0; i < array.length; i++) {
    if (array[i] === item) {
      return i;
    }
  }
  return -1;
}

/** Throws `msg` (a string, not an Error) when `test` is falsy. */
export function assert(test: unknown, msg?: string): asserts test {
  if (!test) {
    // oxlint-disable-next-line no-throw-literal -- thrown as a string since 0.0.x
    throw msg || 'Player.js Assert Failed';
  }
}

/**
 * Wrap a class so it can be called with or without `new`, like the original
 * prototype-based constructors (`playerjs.Player(iframe)` works too).
 */
export interface Callable<A extends any[], T> {
  new (...args: A): T;
  (...args: A): T;
  prototype: T;
}

export function callable<A extends any[], T>(Impl: new (...args: A) => T): Callable<A, T> {
  const Ctor = function (...args: A): T {
    return new Impl(...args);
  } as any;
  Ctor.prototype = Impl.prototype;
  return Ctor;
}

/** Events and methods defined by the spec, plus `all()` to list them. */
function withAll<T extends Record<string, string>>(values: T): T & { all(): string[] } {
  const obj = values as T & { all(): string[] };
  obj.all = function () {
    const all: string[] = [];
    for (const key in obj) {
      if (has(obj, key) && isString(obj[key])) {
        all.push(obj[key] as string);
      }
    }
    return all;
  };
  return obj;
}

export const EVENTS = withAll({
  READY: 'ready',
  PLAY: 'play',
  PAUSE: 'pause',
  ENDED: 'ended',
  TIMEUPDATE: 'timeupdate',
  PROGRESS: 'progress',
  ERROR: 'error',
});

export const METHODS = withAll({
  PLAY: 'play',
  PAUSE: 'pause',
  GETPAUSED: 'getPaused',
  MUTE: 'mute',
  UNMUTE: 'unmute',
  GETMUTED: 'getMuted',
  SETVOLUME: 'setVolume',
  GETVOLUME: 'getVolume',
  GETDURATION: 'getDuration',
  SETCURRENTTIME: 'setCurrentTime',
  GETCURRENTTIME: 'getCurrentTime',
  SETLOOP: 'setLoop',
  GETLOOP: 'getLoop',
  REMOVEEVENTLISTENER: 'removeEventListener',
  ADDEVENTLISTENER: 'addEventListener',
});
