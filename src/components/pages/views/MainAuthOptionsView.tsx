import React from 'react';
import {
  QrIcon,
  UserPhoneIcon,
  GoogleIcon,
  FacebookIcon,
  AppleIcon,
  TwitterIcon,
  InstagramIcon,
} from '../../icons';
import type { AuthView } from '../../../types/auth';

interface MainAuthOptionsViewProps {
  isSignUp: boolean;
  darkMode: boolean;
  onSelectView: (view: AuthView) => void;
  onSocialClick: (provider: string) => void;
  showToast: (msg: string) => void;
}

export const MainAuthOptionsView: React.FC<MainAuthOptionsViewProps> = ({
  isSignUp,
  darkMode,
  onSelectView,
  onSocialClick,
  showToast,
}) => {
  return (
    <div className="flex flex-col items-center text-center animate-fade-in">
      <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight mb-2">
        {isSignUp ? 'Regístrate en TikTok' : 'Iniciar sesión en TikTok'}
      </h1>
      <p className={`text-sm max-w-[320px] mb-7 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        {isSignUp
          ? 'Crea un perfil, sigue otras cuentas, crea tus propios vídeos y mucho más.'
          : 'Gestiona tu cuenta, lee notificaciones, comenta en vídeos y más.'}
      </p>

      {/* Login Methods List */}
      <div className="w-full space-y-3">
        {/* Method: QR Code (Only on login) */}
        {!isSignUp && (
          <button
            onClick={() => onSelectView('QR')}
            className={`w-full relative flex items-center justify-center h-11 px-4 rounded-xs border font-medium text-sm transition-all duration-150 active:scale-[0.98] cursor-pointer ${
              darkMode
                ? 'border-gray-700 hover:bg-white/5 text-white'
                : 'border-[#e3e3e4] hover:bg-[#F8F8F8] text-[#161823]'
            }`}
          >
            <span className="absolute left-4">
              <QrIcon />
            </span>
            <span>Usar código QR</span>
          </button>
        )}

        {/* Method: Phone / Email / Username */}
        <button
          onClick={() => onSelectView('PHONE_EMAIL')}
          className={`w-full relative flex items-center justify-center h-11 px-4 rounded-xs border font-medium text-sm transition-all duration-150 active:scale-[0.98] cursor-pointer ${
            darkMode
              ? 'border-gray-700 hover:bg-white/5 text-white'
              : 'border-[#e3e3e4] hover:bg-[#F8F8F8] text-[#161823]'
          }`}
        >
          <span className="absolute left-4">
            <UserPhoneIcon />
          </span>
          <span>{isSignUp ? 'Usar teléfono o correo' : 'Usar teléfono / correo / nombre de usuario'}</span>
        </button>

        {/* Method: Google */}
        <button
          onClick={() => onSocialClick('Google')}
          className={`w-full relative flex items-center justify-center h-11 px-4 rounded-xs border font-medium text-sm transition-all duration-150 active:scale-[0.98] cursor-pointer ${
            darkMode
              ? 'border-gray-700 hover:bg-white/5 text-white'
              : 'border-[#e3e3e4] hover:bg-[#F8F8F8] text-[#161823]'
          }`}
        >
          <span className="absolute left-4">
            <GoogleIcon />
          </span>
          <span>Continuar con Google</span>
        </button>

        {/* Method: Facebook */}
        <button
          onClick={() => onSocialClick('Facebook')}
          className={`w-full relative flex items-center justify-center h-11 px-4 rounded-xs border font-medium text-sm transition-all duration-150 active:scale-[0.98] cursor-pointer ${
            darkMode
              ? 'border-gray-700 hover:bg-white/5 text-white'
              : 'border-[#e3e3e4] hover:bg-[#F8F8F8] text-[#161823]'
          }`}
        >
          <span className="absolute left-4">
            <FacebookIcon />
          </span>
          <span>Continuar con Facebook</span>
        </button>

        {/* Method: Apple */}
        <button
          onClick={() => onSocialClick('Apple')}
          className={`w-full relative flex items-center justify-center h-11 px-4 rounded-xs border font-medium text-sm transition-all duration-150 active:scale-[0.98] cursor-pointer ${
            darkMode
              ? 'border-gray-700 hover:bg-white/5 text-white'
              : 'border-[#e3e3e4] hover:bg-[#F8F8F8] text-[#161823]'
          }`}
        >
          <span className="absolute left-4">
            <AppleIcon />
          </span>
          <span>Continuar con Apple</span>
        </button>

        {/* Method: Twitter / X */}
        <button
          onClick={() => onSocialClick('Twitter / X')}
          className={`w-full relative flex items-center justify-center h-11 px-4 rounded-xs border font-medium text-sm transition-all duration-150 active:scale-[0.98] cursor-pointer ${
            darkMode
              ? 'border-gray-700 hover:bg-white/5 text-white'
              : 'border-[#e3e3e4] hover:bg-[#F8F8F8] text-[#161823]'
          }`}
        >
          <span className="absolute left-4">
            <TwitterIcon />
          </span>
          <span>Continuar con Twitter</span>
        </button>

        {/* Method: Instagram (Only in Login) */}
        {!isSignUp && (
          <button
            onClick={() => onSocialClick('Instagram')}
            className={`w-full relative flex items-center justify-center h-11 px-4 rounded-xs border font-medium text-sm transition-all duration-150 active:scale-[0.98] cursor-pointer ${
              darkMode
                ? 'border-gray-700 hover:bg-white/5 text-white'
                : 'border-[#e3e3e4] hover:bg-[#F8F8F8] text-[#161823]'
            }`}
          >
            <span className="absolute left-4">
              <InstagramIcon />
            </span>
            <span>Continuar con Instagram</span>
          </button>
        )}
      </div>

      {/* Terms and conditions notice */}
      <div className="mt-8 text-center text-[12px] leading-relaxed max-w-[340px] text-gray-500">
        Al continuar con una cuenta ubicada en tu país, aceptas nuestras{' '}
        <a
          href="#terminos"
          onClick={(e) => {
            e.preventDefault();
            showToast('Términos de servicio');
          }}
          className="font-semibold text-black dark:text-white hover:underline"
        >
          Condiciones del servicio
        </a>{' '}
        y confirmas que has leído nuestra{' '}
        <a
          href="#privacidad"
          onClick={(e) => {
            e.preventDefault();
            showToast('Política de privacidad');
          }}
          className="font-semibold text-black dark:text-white hover:underline"
        >
          Política de privacidad
        </a>
        .
      </div>
    </div>
  );
};
