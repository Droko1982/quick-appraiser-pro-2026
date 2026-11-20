import { raw } from './html.mjs';

// 24×24 line icons drawn for this site. Decorative: always aria-hidden.
const PATHS = {
  pen: '<path d="M4 20h4L18.5 9.5a2.12 2.12 0 0 0-3-3L5 17v3Z"/><path d="m13.5 8.5 2 2"/><path d="M13 20h7"/>',
  folder:
    '<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H9l2 2h8.5A1.5 1.5 0 0 1 21 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-10Z"/><path d="M3 11h18"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
  map: '<path d="m9 4-5.5 2v14L9 18l6 2 5.5-2V4L15 6 9 4Z"/><path d="M9 4v14M15 6v14"/>',
  doc: '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
  check:
    '<path d="M9 4.5h6v2.5H9z"/><path d="M9 5.75H7a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6.75a1 1 0 0 0-1-1h-2"/><path d="m9 14 2 2 4-4"/>',
  shield: '<path d="M12 3 19 6v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3Z"/><path d="m9 12 2 2 4-4"/>',
  api: '<path d="m8 7-5 5 5 5M16 7l5 5-5 5M13.5 5l-3 14"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  tick: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
  wifiOff:
    '<path d="m3 3 18 18"/><path d="M8.5 16.4a5 5 0 0 1 7 0"/><path d="M5 12.9a10 10 0 0 1 5-2.7"/><path d="M16.9 11.1A10 10 0 0 1 19 12.9"/><path d="M2 8.8a15 15 0 0 1 4.3-2.6"/><path d="M10.6 5.1A15 15 0 0 1 22 8.8"/><path d="M12 20h.01"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  camera:
    '<path d="M4 8a1 1 0 0 1 1-1h3l1.5-2h5L16 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8Z"/><circle cx="12" cy="13" r="3.5"/>',
  signIn: '<path d="m10 17 5-5-5-5M15 12H3"/><path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};

export function icon(name, className = 'icon') {
  const body = PATHS[name];
  if (!body) throw new Error(`Unknown icon: ${name}`);
  return raw(
    `<svg class="${className}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`
  );
}
