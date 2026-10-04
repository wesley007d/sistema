/**
 * Ilustração do banner do painel: fachada de loja de autopeças com uma moto na
 * frente. Toldo e letreiro usam a cor primária da empresa (var(--primary)),
 * então acompanham o tema escolhido em Configurações.
 */
export function PaisagemAutoPecas({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 640 280"
      preserveAspectRatio="xMaxYMax slice"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ap-ceu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dbeafe" />
          <stop offset="1" stopColor="#f8fafc" />
        </linearGradient>
        <linearGradient id="ap-predio" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e5e7eb" />
        </linearGradient>
      </defs>

      <rect width="640" height="280" fill="url(#ap-ceu)" />
      {/* sol e nuvens */}
      <circle cx="560" cy="70" r="46" fill="#fde68a" opacity="0.85" />
      <g fill="#ffffff" opacity="0.9">
        <ellipse cx="170" cy="58" rx="38" ry="12" />
        <ellipse cx="196" cy="50" rx="24" ry="12" />
        <ellipse cx="420" cy="40" rx="30" ry="9" />
      </g>
      {/* cidade ao fundo */}
      <g fill="#cbd5e1" opacity="0.7">
        <rect x="40" y="150" width="46" height="80" rx="2" />
        <rect x="92" y="128" width="34" height="102" rx="2" />
        <rect x="560" y="140" width="40" height="90" rx="2" />
        <rect x="604" y="160" width="36" height="70" rx="2" />
      </g>

      {/* calçada e rua */}
      <rect y="228" width="640" height="18" fill="#d1d5db" />
      <rect y="246" width="640" height="34" fill="#4b5563" />
      <g fill="#f8fafc" opacity="0.8">
        <rect x="30" y="261" width="44" height="4" rx="2" />
        <rect x="130" y="261" width="44" height="4" rx="2" />
        <rect x="230" y="261" width="44" height="4" rx="2" />
        <rect x="330" y="261" width="44" height="4" rx="2" />
        <rect x="430" y="261" width="44" height="4" rx="2" />
        <rect x="530" y="261" width="44" height="4" rx="2" />
      </g>

      {/* prédio da loja */}
      <rect x="250" y="88" width="300" height="140" fill="url(#ap-predio)" stroke="#d1d5db" />
      {/* letreiro */}
      <rect x="290" y="96" width="220" height="34" rx="6" style={{ fill: "var(--primary)" }} />
      <text
        x="400"
        y="119"
        textAnchor="middle"
        fontSize="17"
        fontWeight="800"
        letterSpacing="3"
        fill="#ffffff"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        AUTO PEÇAS
      </text>
      {/* toldo listrado */}
      <path d="M250 138 h300 l-12 22 h-276 z" style={{ fill: "var(--primary)" }} />
      <g fill="#ffffff" opacity="0.85">
        <path d="M280 138 h24 l-4 22 h-24 z" />
        <path d="M328 138 h24 l-3 22 h-24 z" />
        <path d="M376 138 h24 l-1 22 h-24 z" />
        <path d="M424 138 h24 l1 22 h-24 z" />
        <path d="M472 138 h24 l3 22 h-24 z" />
        <path d="M520 138 h18 l2 22 h-20 z" />
      </g>
      {/* vitrine com pneus e peças */}
      <rect x="268" y="168" width="170" height="56" rx="3" fill="#e0f2fe" stroke="#94a3b8" />
      <g>
        <circle cx="296" cy="200" r="17" fill="#1f2937" />
        <circle cx="296" cy="200" r="7" fill="#9ca3af" />
        <circle cx="336" cy="200" r="17" fill="#1f2937" />
        <circle cx="336" cy="200" r="7" fill="#9ca3af" />
      </g>
      {/* engrenagem */}
      <g transform="translate(395 196)" fill="#64748b">
        <circle r="13" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <rect key={a} x="-3.5" y="-18" width="7" height="8" rx="1" transform={`rotate(${a})`} />
        ))}
        <circle r="5" fill="#e0f2fe" />
      </g>
      {/* porta */}
      <rect x="456" y="168" width="58" height="60" rx="3" fill="#475569" />
      <rect x="463" y="175" width="44" height="30" rx="2" fill="#bae6fd" opacity="0.8" />
      <circle cx="506" cy="210" r="2.5" fill="#fbbf24" />

      {/* moto na frente */}
      <g transform="translate(110 186)">
        <circle cx="0" cy="40" r="20" fill="none" stroke="#111827" strokeWidth="7" />
        <circle cx="0" cy="40" r="5" fill="#6b7280" />
        <circle cx="92" cy="40" r="20" fill="none" stroke="#111827" strokeWidth="7" />
        <circle cx="92" cy="40" r="5" fill="#6b7280" />
        {/* quadro e tanque */}
        <path d="M0 40 L30 14 H62 L92 40" fill="none" stroke="#374151" strokeWidth="5" strokeLinejoin="round" />
        <path d="M28 14 q14 -16 36 -6 l6 10 h-46 z" style={{ fill: "var(--primary)" }} />
        {/* banco */}
        <path d="M14 10 h22 q4 0 4 4 v2 h-30 z" fill="#111827" />
        {/* motor */}
        <rect x="40" y="22" width="22" height="16" rx="3" fill="#6b7280" />
        {/* guidão e farol */}
        <path d="M70 10 L84 -4 h10" fill="none" stroke="#111827" strokeWidth="4" strokeLinecap="round" />
        <circle cx="90" cy="6" r="6" fill="#fde68a" stroke="#111827" strokeWidth="2" />
      </g>
    </svg>
  );
}
