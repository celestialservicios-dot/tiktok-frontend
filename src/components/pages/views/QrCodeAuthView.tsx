import React from 'react';
import { TikTokLogo } from '../../icons';

interface QrCodeAuthViewProps {
  darkMode: boolean;
  onSimulateScan: () => void;
}

export const QrCodeAuthView: React.FC<QrCodeAuthViewProps> = ({
  darkMode,
  onSimulateScan,
}) => {
  return (
    <div className="w-full flex flex-col items-center text-center animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight mb-2">
        Iniciar sesión con código QR
      </h1>
      <p className={`text-xs max-w-[280px] mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        Escanea el código con la app de TikTok desde tu móvil para iniciar sesión al instante.
      </p>

      {/* QR Code Container with Animated Scan Laser */}
      <div className="relative p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white shadow-lg inline-block mb-6">
        <div className="relative w-52 h-52 bg-white flex items-center justify-center overflow-hidden rounded-lg">
          {/* Laser Scan Animation */}
          <div
            className="absolute left-0 right-0 h-1 bg-linear-to-r from-transparent via-[#FE2C55] to-transparent shadow-[0_0_12px_#FE2C55] animate-pulse pointer-events-none"
            style={{
              animation: 'qrLaser 2.6s ease-in-out infinite alternate',
            }}
          />

          {/* Procedural QR Code Vector Simulation */}
          <svg className="w-full h-full" viewBox="0 0 100 100" fill="#161823">
            {/* Top Left Marker */}
            <rect x="5" y="5" width="28" height="28" rx="2" fill="#161823" />
            <rect x="9" y="9" width="20" height="20" rx="1" fill="#fff" />
            <rect x="13" y="13" width="12" height="12" rx="1" fill="#161823" />

            {/* Top Right Marker */}
            <rect x="67" y="5" width="28" height="28" rx="2" fill="#161823" />
            <rect x="71" y="9" width="20" height="20" rx="1" fill="#fff" />
            <rect x="75" y="13" width="12" height="12" rx="1" fill="#161823" />

            {/* Bottom Left Marker */}
            <rect x="5" y="67" width="28" height="28" rx="2" fill="#161823" />
            <rect x="9" y="71" width="20" height="20" rx="1" fill="#fff" />
            <rect x="13" y="75" width="12" height="12" rx="1" fill="#161823" />

            {/* QR Pixel Matrix */}
            <rect x="38" y="8" width="5" height="5" />
            <rect x="48" y="14" width="6" height="5" />
            <rect x="57" y="8" width="5" height="5" />
            <rect x="38" y="24" width="8" height="5" />
            <rect x="52" y="20" width="5" height="7" />
            <rect x="10" y="38" width="5" height="5" />
            <rect x="22" y="44" width="7" height="6" />
            <rect x="8" y="52" width="6" height="8" />
            <rect x="22" y="55" width="5" height="5" />
            <rect x="70" y="38" width="5" height="5" />
            <rect x="82" y="42" width="6" height="6" />
            <rect x="75" y="52" width="5" height="5" />
            <rect x="86" y="58" width="5" height="5" />
            <rect x="38" y="68" width="6" height="6" />
            <rect x="50" y="65" width="5" height="5" />
            <rect x="42" y="78" width="6" height="5" />
            <rect x="55" y="75" width="6" height="6" />
            <rect x="68" y="72" width="6" height="6" />
            <rect x="80" y="70" width="7" height="5" />
            <rect x="72" y="85" width="6" height="5" />
            <rect x="85" y="82" width="6" height="6" />
          </svg>

          {/* Centered TikTok Badge */}
          <div className="absolute w-11 h-11 rounded-full bg-black flex items-center justify-center shadow-lg border-2 border-white">
            <TikTokLogo className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Instructions Steps */}
      <div className="text-left space-y-2 text-xs max-w-xs text-gray-500 dark:text-gray-400 mb-6">
        <p className="flex items-start gap-2">
          <span className="font-bold text-black dark:text-white">1.</span>
          <span>Abre la aplicación de TikTok en tu móvil.</span>
        </p>
        <p className="flex items-start gap-2">
          <span className="font-bold text-black dark:text-white">2.</span>
          <span>Ve a Perfil y luego pulsa en el menú ≡.</span>
        </p>
        <p className="flex items-start gap-2">
          <span className="font-bold text-black dark:text-white">3.</span>
          <span>Toca <strong>Mi código QR</strong> y luego el icono de escáner.</span>
        </p>
        <p className="flex items-start gap-2">
          <span className="font-bold text-black dark:text-white">4.</span>
          <span>Escanea este código y confirma el acceso.</span>
        </p>
      </div>

      {/* Simulate Scan Button */}
      <button
        onClick={onSimulateScan}
        className="w-full py-3 rounded-xs font-semibold text-sm bg-[#FE2C55] text-white hover:bg-[#E0264B] active:scale-[0.98] transition-all cursor-pointer"
      >
        Simular escaneo de QR
      </button>

      {/* Embedded CSS for Laser Keyframe */}
      <style>{`
        @keyframes qrLaser {
          0% { top: 4%; }
          100% { top: 94%; }
        }
      `}</style>
    </div>
  );
};
