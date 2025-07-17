// Input handling for keyboard/mouse/touch
import { render } from './engine.js';
import { player, state } from '../gameplay.js';
// Example: addInputListeners, handleKeyPress

export function addInputListeners() {
  window.addEventListener('keydown', handleKeyPress);
  // ...add mouse/touch listeners as needed
}

export function handleKeyPress(e) {
  switch (e.key) {
    case 'ArrowUp':
      // Move up or select previous
      break;
    case 'ArrowDown':
      // Move down or select next
      break;

  }
}

