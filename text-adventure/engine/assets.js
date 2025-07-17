// Asset preloading and management
import { render } from './engine.js';
// Example: preloadImages, getAsset

const _assets = {};

export function preloadImages(imageList, callback) {
  let loaded = 0;
  imageList.forEach(src => {
    const img = new Image();
    img.onload = () => {
      _assets[src] = img;
      loaded++;
      if (loaded === imageList.length && typeof callback === 'function') {
        callback();
      }
    };
    img.src = src;
  });
}

export function getAsset(src) {
  return _assets[src] || null;
}

