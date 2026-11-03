import { callable, isNone, type Callable, type Callback } from './core';

interface Entry {
  id: string | null | undefined;
  event: string;
  cb: Callback;
  ctx: unknown;
  one: boolean;
}

/** Keeps track of callbacks by event and listener id. */
class KeeperImpl {
  data!: Record<string, Entry[]>;

  constructor() {
    this.init();
  }

  init(): void {
    this.data = {};
  }

  getUUID(): string {
    // Create a random id. #http://stackoverflow.com/a/2117523/564191
    return 'listener-xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  has(event: string | undefined, id?: string | null): boolean {
    if (event === undefined || !Object.prototype.hasOwnProperty.call(this.data, event)) {
      return false;
    }

    if (isNone(id)) {
      return true;
    }

    // Figure out if we have the event.
    const events = this.data[event]!;
    for (let i = 0; i < events.length; i++) {
      if (events[i]!.id === id) {
        return true;
      }
    }

    return false;
  }

  add(
    id: string | null | undefined,
    event: string,
    cb: Callback,
    ctx: unknown,
    one: boolean,
  ): void {
    const d: Entry = { id, event, cb, ctx, one };

    if (this.has(event)) {
      this.data[event]!.push(d);
    } else {
      this.data[event] = [d];
    }
  }

  execute(
    event: string | undefined,
    id: string | null | undefined,
    data: unknown,
    ctx: unknown,
  ): false | void {
    if (event === undefined || !this.has(event, id)) {
      return false;
    }

    const keep: Entry[] = [];
    const execute: { cb: Callback; ctx: unknown; data: unknown }[] = [];

    const entries = this.data[event]!;
    for (let i = 0; i < entries.length; i++) {
      const d = entries[i]!;

      // There are omni events, in that they do not have an id. i.e "ready".
      // Or there is an ID and we only want to execute the right id'd method.
      if (isNone(id) || (!isNone(id) && d.id === id)) {
        execute.push({
          cb: d.cb,
          ctx: d.ctx ? d.ctx : ctx,
          data: data,
        });

        // If we only wanted to execute this once.
        if (d.one === false) {
          keep.push(d);
        }
      } else {
        keep.push(d);
      }
    }

    if (keep.length === 0) {
      delete this.data[event];
    } else {
      this.data[event] = keep;
    }

    // We need to execute everything after we deal with the one stuff. otherwise
    // we have issues to order of operations.
    for (let n = 0; n < execute.length; n++) {
      const e = execute[n]!;
      e.cb.call(e.ctx, e.data);
    }
  }

  on(id: string | null | undefined, event: string, cb: Callback, ctx?: unknown): void {
    this.add(id, event, cb, ctx, false);
  }

  one(id: string | null | undefined, event: string, cb: Callback, ctx?: unknown): void {
    this.add(id, event, cb, ctx, true);
  }

  off(event: string, cb?: Callback): string[] {
    // We should probably restructure so this is a bit less of a pain.
    const listeners: string[] = [];

    if (!Object.prototype.hasOwnProperty.call(this.data, event)) {
      return listeners;
    }

    const keep: Entry[] = [];
    const entries = this.data[event]!;

    // Loop through everything.
    for (let i = 0; i < entries.length; i++) {
      const data = entries[i]!;
      // If we only keep if there was a CB and the CB is there.
      if (!isNone(cb) && data.cb !== cb) {
        keep.push(data);
      } else if (!isNone(data.id)) {
        listeners.push(data.id);
      }
    }

    if (keep.length === 0) {
      delete this.data[event];
    } else {
      this.data[event] = keep;
    }

    return listeners;
  }
}

export type Keeper = KeeperImpl;
export const Keeper: Callable<[], KeeperImpl> = callable(KeeperImpl);
