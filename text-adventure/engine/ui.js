// UI helpers for dialogs, buttons, notifications, and animations
import { render } from './engine.js';

export function showModal(title, message, onClose) {
  const modal = document.createElement('div');
  modal.style.position = 'fixed';
  modal.style.top = '50%';
  modal.style.left = '50%';
  modal.style.transform = 'translate(-50%, -50%)';
  modal.style.background = '#181828';
  modal.style.color = '#0ff';
  modal.style.padding = '32px';
  modal.style.borderRadius = '16px';
  modal.style.boxShadow = '0 0 24px #0ff, 0 0 48px #f0f';
  modal.style.zIndex = '9999';
  modal.innerHTML = `<h2>${title}</h2><p>${message}</p><button id='close-modal-btn'>Close</button>`;
  document.body.appendChild(modal);
  document.getElementById('close-modal-btn').onclick = function() {
    document.body.removeChild(modal);
    if (typeof onClose === 'function') onClose();
  };
}

export function showNotification(msg, duration = 2000) {
  const note = document.createElement('div');
  note.style.position = 'fixed';
  note.style.bottom = '32px';
  note.style.right = '32px';
  note.style.background = '#222';
  note.style.color = '#0ff';
  note.style.padding = '16px 32px';
  note.style.borderRadius = '8px';
  note.style.boxShadow = '0 0 12px #0ff';
  note.style.fontFamily = 'Orbitron, Segoe UI, sans-serif';
  note.style.zIndex = '9999';
  note.textContent = msg;
  document.body.appendChild(note);
  setTimeout(() => document.body.removeChild(note), duration);
}

export function animateButton(btn) {
  btn.style.transition = 'box-shadow 0.2s';
  btn.style.boxShadow = '0 0 12px #0ff, 0 0 24px #f0f';
  setTimeout(() => {
    btn.style.boxShadow = '';
  }, 300);
}

