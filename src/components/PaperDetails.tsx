export function InkArrow({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 105 53" fill="none" aria-hidden="true">
      <path d="M4 43C26 8 57 10 94 17M80 7C86 8 94 12 99 17C94 23 88 25 81 27" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PaperLayers() {
  return (
    <svg className="layer-sketch" viewBox="0 0 230 132" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="layer-top" x1="42" y1="4" x2="159" y2="94" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffd1a4" stopOpacity=".75" />
          <stop offset=".58" stopColor="#ffe7c9" stopOpacity=".42" />
          <stop offset="1" stopColor="#fff3d8" stopOpacity=".88" />
        </linearGradient>
        <linearGradient id="layer-edge" x2="0" y2="1">
          <stop stopColor="#ffebca" />
          <stop offset="1" stopColor="#ffae6d" />
        </linearGradient>
      </defs>
      <g stroke="#fff0d2" strokeOpacity=".65">
        <path d="M5 82 109 47 224 82 122 128Z" fill="url(#layer-top)" />
        <path d="M5 82 122 128 224 82v8l-102 43L5 91Z" fill="url(#layer-edge)" />
        <path d="M5 55 109 20 224 55 122 101Z" fill="url(#layer-top)" />
        <path d="M5 55 122 101 224 55v8l-102 44L5 64Z" fill="url(#layer-edge)" />
        <path d="M41 31 110 4 188 30 120 60Z" fill="url(#layer-top)" />
        <path d="M41 31 120 60 188 30v7l-68 30-79-28Z" fill="url(#layer-edge)" />
        <path d="m76 17 80 28m-77 1 72-28" strokeOpacity=".33" />
      </g>
    </svg>
  );
}
