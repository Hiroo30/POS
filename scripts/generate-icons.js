const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const dir = path.join(process.cwd(), 'public', 'icons');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

function getSvg(size, isMaskable = false) {
  const pad = isMaskable ? Math.round(size * 0.15) : Math.round(size * 0.05);
  const innerSize = size - (pad * 2);
  const rx = isMaskable ? 0 : Math.round(size * 0.22);

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#006c49" />
        <stop offset="100%" stop-color="#004d34" />
      </linearGradient>
      <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#10b981" />
        <stop offset="100%" stop-color="#34d399" />
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="${rx}" fill="url(#bg)" />
    <g transform="translate(${pad}, ${pad})">
      <!-- Storefront / Store Bag Icon -->
      <path d="M ${innerSize*0.2} ${innerSize*0.35} L ${innerSize*0.8} ${innerSize*0.35} L ${innerSize*0.75} ${innerSize*0.85} Q ${innerSize*0.75} ${innerSize*0.9} ${innerSize*0.7} ${innerSize*0.9} L ${innerSize*0.3} ${innerSize*0.9} Q ${innerSize*0.25} ${innerSize*0.9} ${innerSize*0.25} ${innerSize*0.85} Z" fill="#ffffff" opacity="0.95"/>
      <!-- Basket handles -->
      <path d="M ${innerSize*0.35} ${innerSize*0.35} C ${innerSize*0.35} ${innerSize*0.15}, ${innerSize*0.65} ${innerSize*0.15}, ${innerSize*0.65} ${innerSize*0.35}" fill="none" stroke="#ffffff" stroke-width="${innerSize*0.06}" stroke-linecap="round"/>
      <!-- Ribbon accent -->
      <path d="M ${innerSize*0.2} ${innerSize*0.35} L ${innerSize*0.8} ${innerSize*0.35} L ${innerSize*0.77} ${innerSize*0.48} L ${innerSize*0.23} ${innerSize*0.48} Z" fill="url(#accent)"/>
      <!-- Store Text DEWI -->
      <text x="${innerSize*0.5}" y="${innerSize*0.72}" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="${innerSize*0.17}" fill="#006c49" text-anchor="middle" letter-spacing="1">DEWI</text>
    </g>
  </svg>`;
}

async function run() {
  const sizes = [
    { name: 'icon-192.png', size: 192, maskable: false },
    { name: 'icon-512.png', size: 512, maskable: false },
    { name: 'icon-maskable-192.png', size: 192, maskable: true },
    { name: 'icon-maskable-512.png', size: 512, maskable: true },
    { name: 'apple-touch-icon.png', size: 180, maskable: false },
    { name: 'favicon-64.png', size: 64, maskable: false },
  ];

  for (const item of sizes) {
    const svg = getSvg(item.size, item.maskable);
    const dest = path.join(dir, item.name);
    await sharp(Buffer.from(svg)).png().toFile(dest);
    console.log('Created ' + item.name);
  }
}

run().catch(console.error);
