import React from 'react';

interface LogoProps {
  className?: string;
}

export const SuwasiriLogo: React.FC<LogoProps> = ({ className = 'w-10 h-10' }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="32" cy="32" r="30" stroke="#2D5A27" strokeWidth="2.5" fill="#F4EFE6" />
    {/* Mortar bowl */}
    <path
      d="M18 37C18 45.5 24 51 32 51C40 51 46 45.5 46 37H18Z"
      fill="#1B4332"
    />
    <rect x="16" y="34" width="32" height="4" rx="2" fill="#2D5A27" />
    {/* Pestle */}
    <path
      d="M23 34L17 22C16.2 20.5 18 19 19.5 20L29 34"
      fill="#40916C"
    />
    {/* Healing leaves */}
    <path
      d="M32 34C32 23 39 15 47 14C46 23 40 31 32 34Z"
      fill="#40916C"
    />
    <path
      d="M32 34C30 25 25 20 20 19C21 26 26 32 32 34Z"
      fill="#74C69D"
    />
    <circle cx="35" cy="14" r="3" fill="#2D5A27" />
  </svg>
);
