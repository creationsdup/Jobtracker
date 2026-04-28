interface JobTrackerLogoProps {
  size?: number
  /** Sur fond coloré, masque le carré et rend les lettres en blanc pur */
  onColor?: boolean
}

export function JobTrackerLogo({ size = 36, onColor = false }: JobTrackerLogoProps) {
  const id = `jt-grad-${size}`
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="JobTracker"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
      </defs>

      {/* Rounded square background */}
      {!onColor && <rect width="36" height="36" rx="9" fill={`url(#${id})`} />}

      {/* J — descends with a curved tail */}
      <path
        d="M11 10h5v12c0 2.5-1.5 4-4 4a4 4 0 0 1-3-1.2l1.6-2c.3.4.8.7 1.4.7.8 0 1.3-.5 1.3-1.5V10h-2.3V10z"
        fill="white"
        fillRule="evenodd"
      />

      {/* T — crossbar and stem */}
      <path
        d="M18 10h10v2.5h-3.7V26h-2.6V12.5H18V10z"
        fill="white"
      />

      {/* Subtle bottom-right dot — accent */}
      <circle cx="29" cy="29" r="2.5" fill="white" fillOpacity="0.25" />
    </svg>
  )
}
