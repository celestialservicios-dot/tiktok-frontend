import React from 'react';
import { TikTokLogo } from '../icons';

interface SuccessModalProps {
  message: string | null;
  onClose: () => void;
  darkMode: boolean;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  message,
  onClose,
  darkMode,
}) => {
  if (!message) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className={`w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl transition-all scale-100 ${
          darkMode ? 'bg-[#1E1E1E] text-white border border-gray-800' : 'bg-white text-[#161823]'
        }`}
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FE2C55]/10 flex items-center justify-center">
          <TikTokLogo className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold mb-2">Autenticación Exitosa</h3>
        <p className="text-sm opacity-80 mb-6">{message}</p>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-md bg-[#FE2C55] text-white font-semibold text-sm hover:bg-[#E0264B] active:scale-[0.98] transition-all cursor-pointer"
        >
          Continuar
        </button>
      </div>
    </div>
  );
};
