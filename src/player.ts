/*
 * Player.js is a javascript library for interacting with iframes via
 * postMessage that use an Open Player Spec
 */

import {
  EVENTS,
  METHODS,
  addEvent,
  assert,
  callable,
  config,
  indexOf,
  isArray,
  isString,
  log,
  origin,
  type Callable,
  type Callback,
  type Message,
} from './core';
import { Keeper } from './keeper';

/** iframe srcs that have sent 'ready' (kept for compatibility). */
export const READIED: string[] = [];

const hasWindow = typeof window !== 'undefined';

// Windows that have sent 'ready', so a Player created later can recognize its
// iframe even when the iframe's URL no longer matches its src attribute
// (redirects, history.replaceState). Weak so removed iframes can be collected.
const readiedWindows: WeakSet<object> | null = typeof WeakSet === 'function' ? new WeakSet() : null;

// Is this ready message from the given iframe? Match the sending window, so
// it works even if the iframe's URL has changed since src was set. Matching
// the src the receiver reports is kept so nothing that worked before breaks.
// An iframe that has been removed from the page has no window and can't be
// the sender, so a stale Player doesn't pick up a new iframe's ready (#93).
function isFromFrame(e: MessageEvent, data: Message, elem: HTMLIFrameElement): boolean {
  if (!elem.contentWindow) {
    return false;
  }
  if (e.source === elem.contentWindow) {
    return true;
  }
  return !!(data.value && data.value.src === elem.src);
}

type Getter = (callback: Callback, ctx?: unknown) => void;

export class PlayerImpl {
  // Generated from METHODS onto the prototype (see the bottom of this file).
  declare play: () => void;
  declare pause: () => void;
  declare getPaused: Getter;
  declare mute: () => void;
  declare unmute: () => void;
  declare getMuted: Getter;
  declare setVolume: (value: number) => void;
  declare getVolume: Getter;
  declare getDuration: Getter;
  declare setCurrentTime: (value: number) => void;
  declare getCurrentTime: Getter;
  declare setLoop: (value: boolean) => void;
  declare getLoop: Getter;
  declare removeEventListener: (event: string) => void;
  declare addEventListener: (event: string) => void;

  elem!: HTMLIFrameElement;
  origin!: string;
  keeper!: Keeper;
  isReady!: boolean;
  loaded?: boolean;
  destroyed?: boolean;
  queue!: Message[];
  events!: string[];
  methods!: string[];
  _onMessage?: (e: MessageEvent) => void;

  constructor(elem: HTMLIFrameElement | string, options?: unknown) {
    this.init(elem, options);
  }

  init(elem: HTMLIFrameElement | string, _options?: unknown): void {
    if (isString(elem)) {
      elem = document.getElementById(elem) as HTMLIFrameElement;
    }

    this.elem = elem;

    // make sure we have an iframe
    assert(
      elem.nodeName === 'IFRAME',
      'playerjs.Player constructor requires an Iframe, got "' + elem.nodeName + '"',
    );
    assert(elem.src, "playerjs.Player constructor requires a Iframe with a 'src' attribute.");

    // Figure out the origin of where we are sending messages.
    this.origin = origin(elem.src);

    // Event handling.
    this.keeper = new Keeper();

    // Queuing before ready.
    this.isReady = false;
    this.queue = [];

    // Assume that everything is supported, unless we know otherwise.
    this.events = EVENTS.all();
    this.methods = METHODS.all();

    if (config.POST_MESSAGE) {
      // Set up the reciever. Keep a reference so destroy() can remove it.
      this._onMessage = (e) => {
        this.receive(e);
      };
      addEvent(window, 'message', this._onMessage);
    } else {
      log('Post Message is not Available.');
    }

    // See if we caught the src event first, otherwise assume we haven't loaded
    if (
      indexOf(READIED, elem.src) > -1 ||
      (readiedWindows && elem.contentWindow && readiedWindows.has(elem.contentWindow))
    ) {
      this.loaded = true;
    } else {
      // Try the onload event, just lets us give another test.
      this.elem.onload = () => {
        this.loaded = true;
      };
    }
  }

  send(data: Message, callback?: Callback, ctx?: unknown): boolean {
    if (this.destroyed) {
      return false;
    }

    // Add the context and version to the data.
    data.context = config.CONTEXT;
    data.version = config.VERSION;

    // We are expecting a response.
    if (callback) {
      // Create a UUID
      const id = this.keeper.getUUID();

      // Set the listener.
      data.listener = id;

      // Only hang on to this listener once.
      this.keeper.one(id, data.method!, callback, ctx);
    }

    if (!this.isReady && data.value !== 'ready') {
      log('Player.queue', data);
      this.queue.push(data);
      return false;
    }

    log('Player.send', data, this.origin);

    if (this.loaded === true && this.elem.contentWindow) {
      this.elem.contentWindow.postMessage(JSON.stringify(data), this.origin);
    }

    return true;
  }

  receive(e: MessageEvent): false | void {
    log('Player.receive', e);

    if (e.origin !== this.origin) {
      return false;
    }

    let data: Message;
    try {
      data = JSON.parse(e.data);
    } catch {
      // Not a valid response.
      return false;
    }

    // abort if this message wasn't a player.js message
    if (!data || data.context !== config.CONTEXT) {
      return false;
    }

    // We need to determine if we are ready. A ready from any other iframe
    // (another player, or a new iframe after ours was removed) is not ours:
    // ignore it so it doesn't fire our ready callbacks.
    if (data.event === 'ready') {
      if (!isFromFrame(e, data, this.elem)) {
        return false;
      }
      if (data.value) {
        this.ready(data);
      }
    }

    if (this.keeper.has(data.event, data.listener)) {
      this.keeper.execute(data.event, data.listener, data.value, this);
    }
  }

  ready(data: Message): false | void {
    if (this.isReady === true) {
      return false;
    }

    // If we got a list of supported methods, we should set them.
    if (data.value.events) {
      this.events = data.value.events;
    }
    if (data.value.methods) {
      this.methods = data.value.methods;
    }

    // set ready.
    this.isReady = true;
    this.loaded = true;

    // Clear the queue
    for (let i = 0; i < this.queue.length; i++) {
      const obj = this.queue[i]!;

      log('Player.dequeue', obj);

      if (data.event === 'ready') {
        this.keeper.execute(obj.event, obj.listener, true, this);
      }
      this.send(obj);
    }
    this.queue = [];
  }

  on(event: string, callback: Callback, ctx?: unknown): boolean {
    const id = this.keeper.getUUID();

    if (event === 'ready') {
      // We only want to call ready once.
      this.keeper.one(id, event, callback, ctx);
    } else {
      this.keeper.on(id, event, callback, ctx);
    }

    this.send({
      method: 'addEventListener',
      value: event,
      listener: id,
    });

    return true;
  }

  off(event: string, callback?: Callback): boolean {
    const listeners = this.keeper.off(event, callback);
    log('Player.off', listeners);

    // Tell the receiver to drop every listener we removed, not just the first.
    for (let i = 0; i < listeners.length; i++) {
      this.send({
        method: 'removeEventListener',
        value: event,
        listener: listeners[i],
      });
    }

    return listeners.length > 0;
  }

  // Stop the player handling messages and sending calls, e.g. when the iframe
  // is removed. Safe to call more than once.
  destroy(): void {
    window.removeEventListener('message', this._onMessage!, false);
    this.destroyed = true;
  }

  // Based on what ready passed back, we can determine if the events/method are
  // supported by the player.
  supports(evtOrMethod: 'method' | 'event', names: string | string[]): boolean {
    assert(
      indexOf(['method', 'event'], evtOrMethod) > -1,
      'evtOrMethod needs to be either "event" or "method" got ' + evtOrMethod,
    );

    // Make everything an array.
    const list = isArray(names) ? names : [names];

    const all = evtOrMethod === 'event' ? this.events : this.methods;

    for (let i = 0; i < list.length; i++) {
      if (indexOf(all, list[i]) === -1) {
        return false;
      }
    }

    return true;
  }
}

// create function to add to the Player prototype
function createPrototypeFunction(name: string) {
  return function (this: PlayerImpl, ...rest: any[]) {
    const data: Message = {
      method: name,
    };

    let args: any[] = rest;

    // for getters add the passed parameters to the arguments for the send call
    if (name.startsWith('get')) {
      assert(args.length > 0, 'Get methods require a callback.');
      args.unshift(data);
    } else {
      // for setter add the first arg to the value field
      if (name.startsWith('set')) {
        assert(args.length !== 0, 'Set methods require a value.');
        data.value = args[0];
      }
      args = [data];
    }

    this.send.apply(this, args as [Message, Callback?, unknown?]);
  };
}

// Loop through the methods to add them to the prototype.
const methodNames = METHODS.all();
for (let i = 0; i < methodNames.length; i++) {
  const methodName = methodNames[i]!;

  // We don't want to overwrite existing methods.
  if (!Object.prototype.hasOwnProperty.call(PlayerImpl.prototype, methodName)) {
    (PlayerImpl.prototype as any)[methodName] = createPrototypeFunction(methodName);
  }
}

// We need to catch all ready events in case the iframe is ready before the
// player is invoked.
if (hasWindow) {
  addEvent(window, 'message', function (e: MessageEvent) {
    let data: Message;
    try {
      data = JSON.parse(e.data);
    } catch {
      return false;
    }

    // abort if this message wasn't a player.js message
    if (!data || data.context !== config.CONTEXT) {
      return false;
    }

    // We need to determine if we are ready.
    if (data.event === 'ready' && data.value && data.value.src) {
      READIED.push(data.value.src);
      if (readiedWindows && e.source) {
        readiedWindows.add(e.source);
      }
    }
  });
}

export type Player = PlayerImpl;
export const Player: Callable<[elem: HTMLIFrameElement | string, options?: unknown], PlayerImpl> =
  callable(PlayerImpl);
