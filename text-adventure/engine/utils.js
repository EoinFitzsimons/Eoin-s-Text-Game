// General utility functions
import { render } from './engine.js';
// Example: randomInt, clamp, formatText

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function formatText(text) {
  return text.replace(/\n/g, '<br>');
}

// ...add more utility functions as needed
