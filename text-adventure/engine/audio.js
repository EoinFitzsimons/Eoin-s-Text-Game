// Audio engine for sound/music playback
import { render } from './engine.js';
// Example: playSound, playMusic, stopMusic

export function playSound(src) {
  const audio = new Audio(src);
  audio.volume = 0.5;
  audio.play();
}

let _musicAudio = null;
export function playMusic(src) {
  if (_musicAudio) {
    _musicAudio.pause();
    _musicAudio = null;
  }
  _musicAudio = new Audio(src);
  _musicAudio.loop = true;
  _musicAudio.volume = 0.3;
  _musicAudio.play();
}

export function stopMusic() {
  if (_musicAudio) {
    _musicAudio.pause();
    _musicAudio = null;
  }
}

