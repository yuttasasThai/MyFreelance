interface IconProps {
  className?: string;
}

/**
 * Modern vivid-orange icon: Hybrid Inverter with a screwdriver pressing down onto it
 */
export function InverterWrenchIcon({ className = 'h-14 w-14' }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Hybrid Inverter Chassis */}
      <rect
        x="13"
        y="24"
        width="38"
        height="34"
        rx="5"
        fill="#FFF7ED"
        stroke="#EA580C"
        strokeWidth="2.6"
      />
      {/* Top Mounting Lip / Heatsink Plate */}
      <path
        d="M18 24V21.5C18 20.67 18.67 20 19.5 20H31.5C32.33 20 33 20.67 33 21.5V24"
        fill="#FFEDD5"
        stroke="#EA580C"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Inverter Cooling Fins */}
      <path
        d="M19 29H31M19 32.5H27"
        stroke="#F97316"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Hybrid Inverter Digital Display Screen */}
      <rect
        x="18.5"
        y="36.5"
        width="27"
        height="13.5"
        rx="2.8"
        fill="#F97316"
        stroke="#C2410C"
        strokeWidth="1.8"
      />
      {/* Hybrid Power Lightning Symbol inside LCD */}
      <path
        d="M27.8 38.8L23.6 43.8H26.9L25.4 47.8L30.2 42.6H26.8L27.8 38.8Z"
        fill="#FFFFFF"
      />
      {/* Solar / Battery Status Bars on LCD */}
      <path
        d="M34 40.5H41.5M34 43.3H39.5M34 46.1H41.5"
        stroke="#FFEDD5"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Bottom Inverter Cable Terminals */}
      <circle cx="22" cy="54" r="1.9" fill="#EA580C" />
      <circle cx="32" cy="54" r="1.9" fill="#EA580C" />
      <circle cx="42" cy="54" r="1.9" fill="#EA580C" />
      <path
        d="M22 58V61.5M32 58V61.5M42 58V61.5"
        stroke="#EA580C"
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {/* Terminal Screw Head on Top of Hybrid Inverter */}
      <rect
        x="37.5"
        y="21.2"
        width="9"
        height="3.2"
        rx="1.2"
        fill="#FB923C"
        stroke="#C2410C"
        strokeWidth="1.6"
      />

      {/* Screwdriver Pointing Straight Down (ไขควงจิ้มลง) */}
      {/* Ergonomic Fluted Orange Handle */}
      <rect
        x="37.2"
        y="2.5"
        width="9.6"
        height="11.5"
        rx="3.4"
        fill="#F97316"
        stroke="#C2410C"
        strokeWidth="2.2"
      />
      {/* Handle Grip Lines */}
      <path
        d="M40.3 5.2V11.2M43.7 5.2V11.2"
        stroke="#FFEDD5"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Collar */}
      <rect
        x="39.4"
        y="14"
        width="5.2"
        height="2.6"
        rx="0.8"
        fill="#EA580C"
      />
      {/* Driver Shaft & Tip Pressing Down into Screw */}
      <path
        d="M42 16.6V21.2"
        stroke="#C2410C"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      {/* Subtle Downward Press Motion Accents */}
      <path
        d="M34.2 14.5L35.4 17.5M49.8 14.5L48.6 17.5"
        stroke="#FB923C"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Modern vivid-orange icon: Shopping Cart carrying Solar Cell Equipment
 */
export function SolarCartIcon({ className = 'h-14 w-14' }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Solar Panel inside Cart Basket */}
      <path
        d="M25 11L49.5 7.5L53 28.5L28.5 32L25 11Z"
        fill="#F97316"
        stroke="#C2410C"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Solar Panel Cell Grid */}
      <path
        d="M33.2 9.8L36.7 30.8M41.3 8.6L44.8 29.6"
        stroke="#FFEDD5"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M26.2 18L50.7 14.5M27.3 25L51.8 21.5"
        stroke="#FFEDD5"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* Compact Solar Equipment / Battery Box beside Panel inside Cart */}
      <rect
        x="18.5"
        y="20.5"
        width="13.5"
        height="15.5"
        rx="2.4"
        fill="#FFEDD5"
        stroke="#EA580C"
        strokeWidth="2.1"
      />
      <path
        d="M25.8 23.6L23 27.9H25.3L24.2 31.6L27.7 27H25.2L25.8 23.6Z"
        fill="#EA580C"
      />

      {/* Cart Basket Translucent Orange Body */}
      <path
        d="M15.2 25.5H54.5L50 43H19.5L15.2 25.5Z"
        fill="rgba(249, 115, 22, 0.16)"
      />

      {/* Shopping Cart Handle & Main Frame */}
      <path
        d="M6.5 16H13.2L19.5 43H49.8L54.8 25.5H15.6"
        stroke="#EA580C"
        strokeWidth="2.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Cart Basket Horizontal Rails */}
      <path
        d="M17.2 32H52.8M18.6 37.8H51.2"
        stroke="#F97316"
        strokeWidth="2.1"
        strokeLinecap="round"
      />

      {/* Cart Lower Frame */}
      <path
        d="M20.2 43L18.8 48.2H49.2"
        stroke="#EA580C"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Cart Wheels */}
      <circle
        cx="23"
        cy="53.2"
        r="4"
        fill="#FFEDD5"
        stroke="#EA580C"
        strokeWidth="2.6"
      />
      <circle cx="23" cy="53.2" r="1.4" fill="#C2410C" />

      <circle
        cx="45.8"
        cy="53.2"
        r="4"
        fill="#FFEDD5"
        stroke="#EA580C"
        strokeWidth="2.6"
      />
      <circle cx="45.8" cy="53.2" r="1.4" fill="#C2410C" />
    </svg>
  );
}
