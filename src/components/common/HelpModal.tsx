import React from 'react';
import { HelpIcon, CloseIcon } from '../icons';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  showToast: (msg: string) => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({
  isOpen,
  onClose,
  darkMode,
  showToast,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className={`w-full max-w-md rounded-2xl p-6 shadow-2xl relative ${
          darkMode ? 'bg-[#1E1E1E] text-white border border-gray-800' : 'bg-white text-[#161823]'
        }`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-500/10 cursor-pointer"
          aria-label="Cerrar ayuda"
        >
          <CloseIcon />
        </button>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <HelpIcon /> Comentarios y ayuda
        </h3>
        <div className="space-y-3 text-sm">
          <button
            onClick={() => {
              onClose();
              showToast('Redirigiendo a recuperación de cuenta...');
            }}
            className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-colors ${
              darkMode ? 'hover:bg-white/5 border border-white/5' : 'hover:bg-gray-50 border border-gray-100'
            }`}
          >
            <span>¿Problemas para iniciar sesión?</span>
            <span className="text-xs text-gray-400">→</span>
          </button>
          <button
            onClick={() => {
              onClose();
              showToast('Formulario de restablecimiento enviado');
            }}
            className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-colors ${
              darkMode ? 'hover:bg-white/5 border border-white/5' : 'hover:bg-gray-50 border border-gray-100'
            }`}
          >
            <span>Restablecer contraseña</span>
            <span className="text-xs text-gray-400">→</span>
          </button>
          <button
            onClick={() => {
              onClose();
              showToast('Centro de seguridad de TikTok');
            }}
            className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-colors ${
              darkMode ? 'hover:bg-white/5 border border-white/5' : 'hover:bg-gray-50 border border-gray-100'
            }`}
          >
            <span>Centro de ayuda de TikTok</span>
            <span className="text-xs text-gray-400">→</span>
          </button>
        </div>
      </div>
    </div>
  );
};
