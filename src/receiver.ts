/*
 * Does all the wiring up for the backend.
 *
 * var receiver = new playerjs.Receiver();
 * receiver.on('play', function(){ video.play() });
 * receiver.on('getDuration', function(callback){ callback(video.duration) });
 * receiver.emit('timeupdate', {});
 */

import {
  EVENTS,
  METHODS,
  addEvent,
  callable,
  config,
  indexOf,
  isNone,
  isObject,
  log,
  origin,
  type Callable,
  type Message,
} from './core';

/**
 * A method handler. Getters (`get*`) receive a callback to answer with;
 * everything else receives the value sent by the parent. `this` is the
 * Receiver.
 */
export type Handler = (this: ReceiverImpl, value: any) => void;

class ReceiverImpl {
  isReady!: boolean;
  origin!: string;
  methods!: Record<string, Handler>;
  supported!: { events: string[]; methods: string[] };
  eventListeners!: Record<string, (string | null)[]>;
  reject!: boolean;

  constructor(events?: string[], methods?: string[]) {
    this.init(events, methods);
  }

  init(events?: string[], methods?: string[]): void {
    // Deal with the ready crap.
    this.isReady = false;

    // Bind the window message.
    this.origin = origin(document.referrer);

    // Create a holder for all the methods.
    this.methods = {};

    // holds all the information about what's supported
    this.supported = {
      events: events ? events : EVENTS.all(),
      methods: methods ? methods : METHODS.all(),
    };

    // Deals with the adding and removing of event listeners.
    this.eventListeners = {};

    // We can't send any messages.
    this.reject = !(window.self !== window.top && config.POST_MESSAGE);

    // We aren't in an iframe, don't listen.
    if (!this.reject) {
      addEvent(window, 'message', (e: MessageEvent) => {
        this.receive(e);
      });
    }
  }

  receive(e: MessageEvent): false | void {
    // Only want to listen to events that came from our origin.
    if (e.origin !== this.origin) {
      return false;
    }

    // Browsers that support postMessage also support JSON.
    let data: Message = {};
    if (isObject(e.data)) {
      data = e.data;
    } else {
      try {
        data = window.JSON.parse(e.data) || {};
      } catch (err) {
        log('JSON Parse Error', err);
      }
    }

    log('Receiver.receive', e, data);

    // Nothing for us to do.
    if (!data.method) {
      return false;
    }

    // make sure the context is correct.
    if (data.context !== config.CONTEXT) {
      return false;
    }

    // Make sure we have a valid method.
    if (indexOf(METHODS.all(), data.method) === -1) {
      this.emit('error', {
        code: 2,
        msg: 'Invalid Method "' + data.method + '"',
      });
      return false;
    }

    // See if we added a listener
    const listener = !isNone(data.listener) ? data.listener : null;

    if (data.method === 'addEventListener') {
      // Add Event Listener.
      if (Object.prototype.hasOwnProperty.call(this.eventListeners, data.value)) {
        // If the listener is the same, i.e. null only add it once.
        if (indexOf(this.eventListeners[data.value], listener) === -1) {
          this.eventListeners[data.value]!.push(listener);
        }
      } else {
        this.eventListeners[data.value] = [listener];
      }

      if (data.value === 'ready' && this.isReady) {
        this.ready();
      }
    } else if (data.method === 'removeEventListener') {
      // Remove the event listener.
      if (Object.prototype.hasOwnProperty.call(this.eventListeners, data.value)) {
        const index = indexOf(this.eventListeners[data.value], listener);

        // if we find the element, remove it.
        if (index > -1) {
          this.eventListeners[data.value]!.splice(index, 1);
        }

        if (this.eventListeners[data.value]!.length === 0) {
          delete this.eventListeners[data.value];
        }
      }
    } else {
      // Go get it.
      this.get(data.method, data.value, listener);
    }
  }

  get(method: string, value: unknown, listener: string | null): false | void {
    // Now lets do it.
    if (!Object.prototype.hasOwnProperty.call(this.methods, method)) {
      this.emit('error', {
        code: 3,
        msg: 'Method Not Supported"' + method + '"',
      });
      return false;
    }

    const func = this.methods[method]!;

    if (method.substr(0, 3) === 'get') {
      const callback = (val: unknown) => {
        this.send(method, val, listener);
      };
      func.call(this, callback);
    } else {
      func.call(this, value);
    }
  }

  on(event: string, callback: Handler): void {
    this.methods[event] = callback;
  }

  send(event: string, value?: unknown, listener?: string | null): false | void {
    log('Receiver.send', event, value, listener);

    if (this.reject) {
      // We are not in a frame, or we don't support POST_MESSAGE
      log('Receiver.send.reject', event, value, listener);
      return false;
    }

    const data: Message = {
      context: config.CONTEXT,
      version: config.VERSION,
      event: event,
    };

    if (!isNone(value)) {
      data.value = value;
    }

    if (!isNone(listener)) {
      data.listener = listener;
    }

    const msg = JSON.stringify(data);
    window.parent.postMessage(msg, this.origin === '' ? '*' : this.origin);
  }

  emit(event: string, value?: unknown): boolean {
    if (!Object.prototype.hasOwnProperty.call(this.eventListeners, event)) {
      return false;
    }

    log('Instance.emit', event, value, this.eventListeners[event]);

    const listeners = this.eventListeners[event]!;
    for (let i = 0; i < listeners.length; i++) {
      this.send(event, value, listeners[i]);
    }

    return true;
  }

  ready(): void {
    log('Receiver.ready');
    this.isReady = true;

    const data = {
      src: window.location.toString(),
      events: this.supported.events,
      methods: this.supported.methods,
    };

    if (!this.emit('ready', data)) {
      this.send('ready', data);
    }
  }
}

export type Receiver = ReceiverImpl;
export const Receiver: Callable<[events?: string[], methods?: string[]], ReceiverImpl> =
  callable(ReceiverImpl);
