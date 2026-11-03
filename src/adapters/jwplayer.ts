// http://www.longtailvideo.com/support/jw-player/28851/javascript-api-reference

import { assert, callable, type Callable } from '../core';
import { Receiver } from '../receiver';

/** The parts of a JW Player instance this adapter uses. */
export interface JWPlayer {
  on(event: string, cb: (e: any) => void): void;
  play(state?: boolean): unknown;
  pause(state?: boolean): unknown;
  seek(position: number): unknown;
  getState(): string;
  getPosition(): number;
  getDuration(): number;
  getVolume(): number;
  setVolume(volume: number): unknown;
  getMute(): boolean;
  setMute(state: boolean): unknown;
}

/** Exposes a JW Player instance over player.js. */
class JWPlayerAdapterImpl {
  receiver!: Receiver;
  looped!: boolean;

  constructor(player: JWPlayer) {
    this.init(player);
  }

  init(player: JWPlayer): void {
    assert(player, 'playerjs.JWPlayerAdapter requires a player object');

    // Set up the actual receiver
    const receiver = (this.receiver = new Receiver());

    // JWPlayer doesn't have a seLoop, so we can do it ourself.
    this.looped = false;

    /* EVENTS */
    player.on('pause', function () {
      receiver.emit('pause');
    });

    player.on('play', function () {
      receiver.emit('play');
    });

    player.on('time', function (e) {
      const seconds = e.position;
      const duration = e.duration;

      if (!seconds || !duration) {
        return false;
      }

      const value = {
        seconds: seconds,
        duration: duration,
      };
      receiver.emit('timeupdate', value);
    });

    player.on('complete', () => {
      // Fake the looping
      if (this.looped === true) {
        // By default jwplayer seeks after play.
        player.seek(0);
      } else {
        // Else throw the ended event.
        receiver.emit('ended');
      }
    });

    player.on('error', function () {
      receiver.emit('error');
    });

    /* METHODS */
    receiver.on('play', function () {
      player.play(true);
    });

    receiver.on('pause', function () {
      player.pause(true);
    });

    receiver.on('getPaused', function (callback) {
      callback(player.getState().toLowerCase() !== 'PLAYING'.toLowerCase());
    });

    receiver.on('getCurrentTime', function (callback) {
      callback(player.getPosition());
    });

    receiver.on('setCurrentTime', function (value) {
      player.seek(value);
    });

    receiver.on('getDuration', function (callback) {
      callback(player.getDuration());
    });

    receiver.on('getVolume', function (callback) {
      callback(player.getVolume());
    });

    receiver.on('setVolume', function (value) {
      player.setVolume(value);
    });

    receiver.on('mute', function () {
      player.setMute(true);
    });

    receiver.on('unmute', function () {
      player.setMute(false);
    });

    receiver.on('getMuted', function (callback) {
      callback(player.getMute() === true);
    });

    // BUG (kept as-is): these use `this`, which is the Receiver, not the
    // adapter, so they read and write receiver.looped while the 'complete'
    // handler above checks the adapter's `looped`. Looping never takes
    // effect. The original passed the adapter as a third argument to
    // receiver.on(), which ignores it.
    receiver.on('getLoop', function (callback) {
      callback((this as any).looped);
    });

    receiver.on('setLoop', function (value) {
      (this as any).looped = value;
    });
  }

  /* Call when the video.js is ready */
  ready(): void {
    this.receiver.ready();
  }
}

export type JWPlayerAdapter = JWPlayerAdapterImpl;
export const JWPlayerAdapter: Callable<[player: JWPlayer], JWPlayerAdapterImpl> =
  callable(JWPlayerAdapterImpl);
