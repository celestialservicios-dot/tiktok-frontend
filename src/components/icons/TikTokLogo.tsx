import React from 'react';

interface TikTokLogoProps {
  className?: string;
}

export const TikTokLogo: React.FC<TikTokLogoProps> = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    {/* Iconic TikTok Chromatic Note */}
    <path
      fill="#25F4EE"
      d="M16.6 5.82s.51.5 0 0A4.28 4.28 0 0 1 15.54 3h-2.1v11.13a2.6 2.6 0 1 1-1.84-2.48V9.38a4.91 4.91 0 1 0 4.2 4.75V8.12A6.53 6.53 0 0 0 19.38 9V6.8a4.57 4.57 0 0 1-2.78-.98z"
      transform="translate(-0.8, -0.6)"
      opacity="0.9"
    />
    <path
      fill="#FE2C55"
      d="M16.6 5.82s.51.5 0 0A4.28 4.28 0 0 1 15.54 3h-2.1v11.13a2.6 2.6 0 1 1-1.84-2.48V9.38a4.91 4.91 0 1 0 4.2 4.75V8.12A6.53 6.53 0 0 0 19.38 9V6.8a4.57 4.57 0 0 1-2.78-.98z"
      transform="translate(0.8, 0.6)"
      opacity="0.9"
    />
    <path
      fill="currentColor"
      d="M16.6 5.82s.51.5 0 0A4.28 4.28 0 0 1 15.54 3h-2.1v11.13a2.6 2.6 0 1 1-1.84-2.48V9.38a4.91 4.91 0 1 0 4.2 4.75V8.12A6.53 6.53 0 0 0 19.38 9V6.8a4.57 4.57 0 0 1-2.78-.98z"
    />
  </svg>
);
