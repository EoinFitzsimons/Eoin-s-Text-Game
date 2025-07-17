// Save/load system using localStorage
import { player, state } from '../gameplay.js';
import { render } from './engine.js';

export function saveGame(state) {
  try {
    localStorage.setItem('cyberpunkGameSave', JSON.stringify(state));
    return true;
  } catch (e) {
    console.error('Save failed:', e);
    return false;
  }
}

export function loadGame() {
  try {
    const data = localStorage.getItem('cyberpunkGameSave');
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('Load failed:', e);
    return null;
  }
}

export function clearSave() {
  localStorage.removeItem('cyberpunkGameSave');
}
