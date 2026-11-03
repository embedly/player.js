import { assert, callable, type Callable } from '../core';
import { Receiver } from '../receiver';

/** The parts of a Video.js player this adapter uses. */
export interface VideoJSPlayer {
  on(event: string, cb: (e?: unknown) => void): void;
  play(): unknown;
  pause(): unknown;
  paused(): boolean;
  currentTime(): number;
  currentTime(value: number): unknown;
  duration(): number;
  volume(): number;
  volume(value: number): unknown;
  loop(): boolean;
  loop(value: boolean): unknown;
}

/** Exposes a Video.js player over player.js. */
class VideoJSAdapterImpl {
  receiver!: Receiver;

  constructor(player: VideoJSPlayer) {
    this.init(player);
  }

  init(player: VideoJSPlayer): void {
    assert(player, 'playerjs.VideoJSReceiver requires a player object');

    // Set up the actual receiver
    const receiver = (this.receiver = new Receiver());

    /* EVENTS */
    player.on('pause', function () {
      receiver.emit('pause');
    });

    player.on('play', function () {
      receiver.emit('play');
    });

    player.on('timeupdate', function () {
      const seconds = player.currentTime();
      const duration = player.duration();

      if (!seconds || !duration) {
        return;
      }

      const value = {
        seconds: seconds,
        duration: duration,
      };
      receiver.emit('timeupdate', value);
    });

    player.on('ended', function () {
      receiver.emit('ended');
    });

    player.on('error', function () {
      receiver.emit('error');
    });

    /* METHODS */
    receiver.on('play', function () {
      player.play();
    });

    receiver.on('pause', function () {
      player.pause();
    });

    receiver.on('getPaused', function (callback) {
      callback(player.paused());
    });

    receiver.on('getCurrentTime', function (callback) {
      callback(player.currentTime());
    });

    receiver.on('setCurrentTime', function (value) {
      player.currentTime(value);
    });

    receiver.on('getDuration', function (callback) {
      callback(player.duration());
    });

    receiver.on('getVolume', function (callback) {
      callback(player.volume() * 100);
    });

    receiver.on('setVolume', function (value) {
      player.volume(value / 100);
    });

    receiver.on('mute', function () {
      player.volume(0);
    });

    receiver.on('unmute', function () {
      player.volume(1);
    });

    receiver.on('getMuted', function (callback) {
      callback(player.volume() === 0);
    });

    receiver.on('getLoop', function (callback) {
      callback(player.loop());
    });

    receiver.on('setLoop', function (value) {
      player.loop(value);
    });
  }

  /* Call when the video.js is ready */
  ready(): void {
    this.receiver.ready();
  }
}

export type VideoJSAdapter = VideoJSAdapterImpl;
export const VideoJSAdapter: Callable<[player: VideoJSPlayer], VideoJSAdapterImpl> =
  callable(VideoJSAdapterImpl);
