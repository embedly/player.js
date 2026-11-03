import { callable, type Callable } from '../core';
import { Receiver } from '../receiver';

/** A fake 20-second player, for testing player.js integrations. */
class MockAdapterImpl {
  receiver!: Receiver;

  constructor() {
    this.init();
  }

  init(): void {
    // Our mock video
    const video = {
      duration: 20,
      currentTime: 0,
      interval: null as ReturnType<typeof setInterval> | null,
      timeupdate: function (_data: { seconds: number; duration: number }) {},
      volume: 100,
      mute: false,
      playing: false,
      loop: false,
      play: function () {
        video.interval = setInterval(function () {
          video.currentTime += 0.25;
          video.timeupdate({
            seconds: video.currentTime,
            duration: video.duration,
          });
        }, 250);
        video.playing = true;
      },
      pause: function () {
        clearInterval(video.interval!);
        video.playing = false;
      },
    };

    // Set up the actual receiver
    const receiver = (this.receiver = new Receiver());

    receiver.on('play', function () {
      video.play();
      this.emit('play');
      video.timeupdate = (data) => {
        this.emit('timeupdate', data);
      };
    });

    receiver.on('pause', function () {
      video.pause();
      this.emit('pause');
    });

    receiver.on('getPaused', function (callback) {
      callback(!video.playing);
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
      callback(video.volume);
    });

    receiver.on('setVolume', function (value) {
      video.volume = value;
    });

    receiver.on('mute', function () {
      video.mute = true;
    });

    receiver.on('unmute', function () {
      video.mute = false;
    });

    receiver.on('getMuted', function (callback) {
      callback(video.mute);
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

export type MockAdapter = MockAdapterImpl;
export const MockAdapter: Callable<[], MockAdapterImpl> = callable(MockAdapterImpl);
