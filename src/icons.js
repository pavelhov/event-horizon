// Shared outline icons keep controls consistent across system fonts and devices.
const paths = {
  arrow: 'M4 20 20 4M7 4h13v13',
  forward: 'M4 12h16m-6-6 6 6-6 6',
  shield: 'M12 3 4.5 6v5c0 4.5 3 7.5 7.5 10 4.5-2.5 7.5-5.5 7.5-10V6Z',
  reactor: 'm13.5 2-9 12h7l-1 8 9-12h-7Z',
  sparkle: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z',
  warning: 'M12 3 2 21h20ZM12 9v5m0 3v.5',
  sound: 'M11 4 6 8H3v8h3l5 4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
  muted: 'M11 4 6 8H3v8h3l5 4Zm5 5 5 6m0-6-5 6',
  fullscreen: 'M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6',
  pause: 'M8 5v14M16 5v14',
  star: 'M12 3v18M3 12h18M5.6 5.6l12.8 12.8m0-12.8L5.6 18.4',
};
export function createIcon(name, className = '') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [key, value] of Object.entries({ viewBox: '0 0 24 24', width: '24', height: '24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.25', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false', class: `ui-icon ${className}`.trim() })) svg.setAttribute(key, value);
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', paths[name] || paths.sparkle);
  svg.append(path);
  return svg;
}
export function initializeIcons() {
  for (const host of document.querySelectorAll('[data-icon]')) host.replaceChildren(createIcon(host.dataset.icon));
}
