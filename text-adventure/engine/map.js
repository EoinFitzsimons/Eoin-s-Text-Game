// Map drawing and city layout logic
import { cityMap, mainLocations } from '../story.js';
import { player, state } from '../gameplay.js';

export function drawCityMap(ctx, cityMap, state) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.save();
  ctx.globalAlpha = 0.13;
  for (let gx = 0; gx <= 400; gx += 40) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, 300);
    ctx.strokeStyle = '#0ff2';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  for (let gy = 0; gy <= 300; gy += 30) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(400, gy);
    ctx.strokeStyle = '#0ff2';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

export function getLocationCoords(cityMap, location) {
  return cityMap[location] || { x: 0, y: 0 };
}

export function movePlayer(state, nextLocation) {
  if (cityMap[nextLocation]) {
    state.scene = nextLocation;
    return true;
  }
  return false;
}
