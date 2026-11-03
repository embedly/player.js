import { assert, callable, type Callable } from '../core';
import { Receiver } from '../receiver';

/** Exposes an HTML5 <video> or <audio> element over player.js. */
class HTML5AdapterImpl {
  receiver!: Receiver;

  constructor(video: HTMLMediaElement) {
    this.init(video);
  }

  init(video: HTMLMediaElement): void {
    assert(video, 'playerjs.HTML5Adapter requires a video element');

    // Set up the actual receiver
    const receiver = (this.receiver = new Receiver());

    /* EVENTS */
    video.addEventListener('playing', function () {
      receiver.emit('play');
    });

    video.addEventListener('pause', function () {
      receiver.emit('pause');
    });

    video.addEventListener('ended', function () {
      receiver.emit('ended');
    });

    video.addEventListener('timeupdate', function () {
      receiver.emit('timeupdate', {
        seconds: video.currentTime,
        duration: video.duration,
      });
    });

    video.addEventListener('progress', function () {
      const buffered = video.buffered;

      // Legacy, non-spec event kept for existing listeners. Its "percent" is
      // the number of buffered time ranges, not a fraction; use 'progress'.
      receiver.emit('buffered', {
        percent: buffered.length,
      });

      if (!buffered || buffered.length === 0) {
        return;
      }

      // How far the media has buffered: the end of the last buffered range.
      // seconds/duration follow SPEC.rst; percent (0-1) is what the README
      // documents.
      const seconds = buffered.end(buffered.length - 1);
      const duration = video.duration;
      const known = isFinite(duration) && duration > 0;

      receiver.emit('progress', {
        seconds: seconds,
        duration: known ? duration : null,
        percent: known ? Math.min(1, seconds / duration) : null,
      });
    });

    /* Methods */
    receiver.on('play', function () {
      void video.play();
    });

    receiver.on('pause', function () {
      video.pause();
    });

    receiver.on('getPaused', function (callback) {
      callback(video.paused);
    });

    receiver.on('getCurrentTime', function (callback) {
      callback(video.currentTime);
    });

    receiver.on('setCurrentTime', function (value) {
      video.currentTime = value;
    });

    receiver.on('getDuration', function (callback) {
      callback(video.duration);
    });

    receiver.on('getVolume', function (callback) {
      callback(video.volume * 100);
    });

    receiver.on('setVolume', function (value) {
      video.volume = value / 100;
    });

    receiver.on('mute', function () {
      video.muted = true;
    });

    receiver.on('unmute', function () {
      video.muted = false;
    });

    receiver.on('getMuted', function (callback) {
      callback(video.muted);
    });

    receiver.on('getLoop', function (callback) {
      callback(video.loop);
    });

    receiver.on('setLoop', function (value) {
      video.loop = value;
    });
  }

  /* Call when the video has loaded */
  ready(): void {
    this.receiver.ready();
  }
}

export type HTML5Adapter = HTML5AdapterImpl;
export const HTML5Adapter: Callable<[video: HTMLMediaElement], HTML5AdapterImpl> =
  callable(HTML5AdapterImpl);
