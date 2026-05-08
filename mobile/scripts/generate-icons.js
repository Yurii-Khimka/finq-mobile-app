const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');

const BG = '#0A0A0A';
const PRIMARY = '#6366F1';
const WHITE = '#F5F5F5';

function drawQ(ctx, size, bgColor, letterColor, showLabel) {
  // Background
  if (bgColor) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);
  }

  // "Q" lettermark — bold, centred
  const qSize = Math.round(size * 0.55);
  ctx.fillStyle = letterColor;
  ctx.font = `bold ${qSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const yOffset = showLabel ? -size * 0.04 : 0;
  ctx.fillText('Q', size / 2, size / 2 + yOffset);

  // Optional "finQ" label below
  if (showLabel) {
    const labelSize = Math.round(size * 0.09);
    ctx.font = `600 ${labelSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    ctx.fillStyle = WHITE;
    ctx.fillText('finQ', size / 2, size / 2 + qSize * 0.45);
  }
}

function generateIcon(filename, size, bgColor, letterColor, showLabel = false) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  drawQ(ctx, size, bgColor, letterColor, showLabel);
  const buf = canvas.toBuffer('image/png');
  const outPath = path.join(ASSETS_DIR, filename);
  fs.writeFileSync(outPath, buf);
  console.log(`  ${filename} (${size}x${size}) — ${(buf.length / 1024).toFixed(1)} KB`);
}

console.log('Generating finQ app icons...\n');

// icon.png — 1024x1024, dark bg + indigo Q
generateIcon('icon.png', 1024, BG, PRIMARY);

// adaptive-icon.png — 1024x1024, same as icon
generateIcon('adaptive-icon.png', 1024, BG, PRIMARY);

// splash-icon.png — 200x200, transparent bg + white Q with label
generateIcon('splash-icon.png', 200, null, PRIMARY, true);

// favicon.png — 48x48, dark bg + indigo Q
generateIcon('favicon.png', 48, BG, PRIMARY);

console.log('\nDone. Assets written to mobile/assets/');
