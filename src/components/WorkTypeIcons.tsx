interface IconProps {
  className?: string;
}

/**
 * Modern icon: Wrench tightening a Hybrid Inverter unit
 */
export function InverterWrenchIcon({ className = 'h-11 w-11' }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Hybrid Inverter Body */}
      <rect
        x="10"
        y="10"
        width="30"
        height="40"
        rx="4"
        fill="rgba(255,255,255,0.16)"
        stroke="currentColor"
        strokeWidth="2.4"
      />
      {/* Inverter Top Cooling Fins */}
      <path
        d="M16 15H34M16 19H28"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.85"
      />
      {/* Inverter Display Screen with Power / Lightning */}
      <rect
        x="15"
        y="24"
        width="20"
        height="13"
        rx="2.5"
        fill="rgba(255,255,255,0.14)"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M26.2 26.8L22.5 31H25.5L24.2 34.4L28 30.1H25L26.2 26.8Z"
        fill="currentColor"
      />
      {/* Inverter Bottom Terminals */}
      <circle cx="18" cy="43.5" r="2" fill="currentColor" />
      <circle cx="25" cy="43.5" r="2" fill="currentColor" />
      <path d="M18 50V54M25 50V54" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />

      {/* Bolt / Nut on side of Inverter being tightened */}
      <circle cx="38" cy="43.5" r="3" fill="currentColor" />

      {/* Modern Open-End Wrench angled onto the bolt */}
      <path
        d="M52.8 25.5C50.9 23.6 47.9 23.6 45.9 25.4L44.2 27.1L47.3 30.2L44.8 32.7L41.7 29.6L40 31.3C38.1 33.2 38.1 36.2 40 38.2L35.4 42.8C34.4 43.8 34.4 45.4 35.4 46.4C36.4 47.4 38 47.4 39 46.4L43.6 41.8C45.6 43.7 48.6 43.7 50.5 41.8L52.2 40.1L49.1 37L51.6 34.5L54.7 37.6L56.4 35.9C58.2 33.9 58.2 30.9 56.3 29L52.8 25.5Z"
        fill="rgba(255,255,255,0.22)"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Modern icon: Shopping Cart carrying a Solar Panel
 */
export function SolarCartIcon({ className = 'h-11 w-11' }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Solar Panel inside the cart basket (tilted slightly for 3D depth) */}
      <g>
        <path
          d="M22 13L49 10L53 31L26 34L22 13Z"
          fill="rgba(255,255,255,0.22)"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinejoin="round"
        />
        {/* Photovoltaic Grid Lines */}
        <path
          d="M31 12L35 33M40 11L44 32"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.9"
        />
        <path
          d="M23.5 20L50.5 17M24.8 27L51.8 24"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.9"
        />
      </g>

      {/* Modern Shopping Cart Handle & Frame */}
      <path
        d="M8 15H14.5L20.5 43H49.5L54.5 26"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Cart Basket Front Rail */}
      <path
        d="M17.5 30H53"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M19 37H51"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.85"
      />
      {/* Cart Base Support */}
      <path
        d="M21 43L19.5 48.5H49"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Cart Wheels */}
      <circle
        cx="23.5"
        cy="53.5"
        r="3.5"
        fill="rgba(255,255,255,0.2)"
        stroke="currentColor"
        strokeWidth="2.3"
      />
      <circle
        cx="45.5"
        cy="53.5"
        r="3.5"
        fill="rgba(255,255,255,0.2)"
        stroke="currentColor"
        strokeWidth="2.3"
      />
    </svg>
  );
}
