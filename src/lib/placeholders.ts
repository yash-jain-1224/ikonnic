const palettes = [
  ["#fee2e2", "#fecaca", "#991b1b"],
  ["#ede9fe", "#ddd6fe", "#5b21b6"],
  ["#dbeafe", "#bfdbfe", "#1d4ed8"],
  ["#dcfce7", "#bbf7d0", "#166534"],
  ["#fef3c7", "#fde68a", "#92400e"],
  ["#fce7f3", "#fbcfe8", "#9d174d"],
];

export function placeholderImage(seed: number, label: string) {
  const [from, to, ink] = palettes[Math.abs(seed) % palettes.length];
  const safeLabel = label
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const initials = safeLabel
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="680" viewBox="0 0 900 680">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>
    <filter id="s"><feDropShadow dx="0" dy="14" stdDeviation="20" flood-opacity=".16"/></filter>
  </defs>
  <rect width="900" height="680" fill="url(#g)"/>
  <circle cx="130" cy="120" r="78" fill="#fff" opacity=".42"/>
  <circle cx="790" cy="570" r="120" fill="#fff" opacity=".35"/>
  <g filter="url(#s)">
    <rect x="245" y="100" width="410" height="440" rx="${seed % 3 === 0 ? 205 : 34}" fill="#fff" stroke="${ink}" stroke-width="10"/>
    <rect x="275" y="130" width="350" height="300" rx="18" fill="${to}"/>
    <path d="M305 380 L395 285 L470 345 L535 255 L598 380Z" fill="${ink}" opacity=".35"/>
    <circle cx="370" cy="225" r="52" fill="#fff" opacity=".75"/>
    <text x="450" y="493" text-anchor="middle" font-family="Arial, sans-serif" font-size="52" font-weight="700" fill="${ink}">${initials}</text>
  </g>
  <rect x="275" y="570" width="350" height="42" rx="21" fill="#fff" opacity=".7"/>
  <text x="450" y="598" text-anchor="middle" font-family="Arial, sans-serif" font-size="21" font-weight="700" fill="${ink}">${safeLabel.slice(0, 30)}</text>
</svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
