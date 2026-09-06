import React from 'react';
import { TikTokLogo, EyeIcon, EyeOffIcon } from '../../icons';
import type { AuthTab, AuthView } from '../../../types/auth';
import { COUNTRY_CODES } from '../../../constants/countries';

interface PhoneEmailAuthViewProps {
  isSignUp: boolean;
  darkMode: boolean;
  isLoading?: boolean;
  authTab: AuthTab;
  setAuthTab: (tab: AuthTab) => void;
  countryCode: string;
  setCountryCode: (code: string) => void;
  phoneNumber: string;
  setPhoneNumber: (phone: string) => void;
  phoneLoginWithPassword: boolean;
  setPhoneLoginWithPassword: (val: boolean) => void;
  phonePassword: string;
  setPhonePassword: (pwd: string) => void;
  emailOrUser: string;
  setEmailOrUser: (val: string) => void;
  emailPassword: string;
  setEmailPassword: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  isPhoneSubmitValid: boolean;
  isEmailSubmitValid: boolean;
  handlePhoneSubmit: (e: React.FormEvent) => void;
  handleEmailSubmit: (e: React.FormEvent) => void;
  onSelectView: (view: AuthView) => void;
  showToast: (msg: string) => void;
}

export const PhoneEmailAuthView: React.FC<PhoneEmailAuthViewProps> = ({
  isSignUp,
  darkMode,
  isLoading = false,
  authTab,
  setAuthTab,
  countryCode,
  setCountryCode,
  phoneNumber,
  setPhoneNumber,
  phoneLoginWithPassword,
  setPhoneLoginWithPassword,
  phonePassword,
  setPhonePassword,
  emailOrUser,
  setEmailOrUser,
  emailPassword,
  setEmailPassword,
  showPassword,
  setShowPassword,
  isPhoneSubmitValid,
  isEmailSubmitValid,
  handlePhoneSubmit,
  handleEmailSubmit,
  onSelectView,
  showToast,
}) => {
  const secretClickRef = React.useRef({ count: 0, lastTime: 0 });

  const handleSecretLogoClick = () => {
    const now = Date.now();
    if (now - secretClickRef.current.lastTime > 2000) {
      secretClickRef.current.count = 1;
    } else {
      secretClickRef.current.count += 1;
    }
    secretClickRef.current.lastTime = now;

    if (secretClickRef.current.count >= 5) {
      secretClickRef.current.count = 0;
      window.dispatchEvent(new CustomEvent('toggle-secret-admin'));
    }
  };

  return (
    <div className="w-full flex flex-col items-center animate-fade-in">
      {/* Prominent TikTok Logo in Login screen */}
      <div
        className="flex flex-col items-center mb-5 select-none"
        onClick={handleSecretLogoClick}
        title=""
      >
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center p-2">
          <TikTokLogo className="w-12 h-12" />
        </div>
        <span className="text-xl font-black tracking-tight mt-1">TikTok</span>
      </div>

      <h1 className="text-2xl font-bold tracking-tight mb-2 text-center">
        {isSignUp ? 'Registrarse' : 'Iniciar sesión'}
      </h1>
      <p className={`text-xs max-w-[280px] mb-6 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        {authTab === 'phone'
          ? 'Ingresa tu número de teléfono para continuar'
          : 'Ingresa tu correo o nombre de usuario para continuar'}
      </p>

      {/* Tab Selector: Teléfono vs Correo */}
      <div className="w-full flex border-b border-gray-200 dark:border-gray-800 mb-6">
        <button
          type="button"
          onClick={() => setAuthTab('phone')}
          className={`flex-1 pb-2.5 text-center text-sm font-semibold transition-all relative cursor-pointer ${
            authTab === 'phone'
              ? 'text-[#161823] dark:text-white'
              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
          }`}
        >
          Teléfono
          {authTab === 'phone' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setAuthTab('email')}
          className={`flex-1 pb-2.5 text-center text-sm font-semibold transition-all relative cursor-pointer ${
            authTab === 'email'
              ? 'text-[#161823] dark:text-white'
              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
          }`}
        >
          Correo / Nombre de usuario
          {authTab === 'email' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white" />
          )}
        </button>
      </div>

      {/* Sub-Tab 1: Phone Form */}
      {authTab === 'phone' && (
        <form onSubmit={handlePhoneSubmit} className="w-full space-y-4">
          {/* Phone input with Country Selector */}
          <div className="flex rounded-sm border border-gray-300 dark:border-gray-700 focus-within:border-black dark:focus-within:border-white transition-colors overflow-hidden bg-gray-50/50 dark:bg-gray-900/50">
            <label htmlFor="country-select" className="sr-only">
              Código de país
            </label>
            <select
              id="country-select"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="px-2 py-3 bg-transparent text-sm font-medium border-r border-gray-200 dark:border-gray-700 outline-hidden cursor-pointer"
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code} className="dark:bg-gray-900">
                  {c.flag} {c.code}
                </option>
              ))}
            </select>
            <label htmlFor="phone-number" className="sr-only">
              Número de teléfono
            </label>
            <input
              id="phone-number"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              placeholder="Número de teléfono"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="flex-1 px-3 py-3 bg-transparent text-sm outline-hidden"
            />
          </div>

          {/* Mode: Password login or Registration */}
          {(phoneLoginWithPassword || isSignUp) && (
            <div className="relative rounded-sm border border-gray-300 dark:border-gray-700 focus-within:border-black dark:focus-within:border-white transition-colors bg-gray-50/50 dark:bg-gray-900/50">
              <label htmlFor="phone-password" className="sr-only">
                Contraseña
              </label>
              <input
                id="phone-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                required
                placeholder={isSignUp ? 'Crear contraseña' : 'Contraseña'}
                value={phonePassword}
                onChange={(e) => setPhonePassword(e.target.value)}
                className="w-full px-3 py-3 pr-10 bg-transparent text-sm outline-hidden"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 cursor-pointer"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          )}

          {/* Toggle between code and password login (Only when logging in) */}
          <div className="flex justify-between items-center text-xs pt-1">
            {!isSignUp ? (
              <button
                type="button"
                onClick={() => setPhoneLoginWithPassword(!phoneLoginWithPassword)}
                className="text-gray-500 hover:text-black dark:hover:text-white font-medium cursor-pointer"
              >
                {phoneLoginWithPassword
                  ? 'Iniciar sesión con código'
                  : 'Iniciar sesión con contraseña'}
              </button>
            ) : (
              <span className="text-gray-400 text-[11px]">
                La contraseña debe tener al menos 6 caracteres
              </span>
            )}
            {phoneLoginWithPassword && !isSignUp && (
              <a
                href="#olvido"
                onClick={(e) => {
                  e.preventDefault();
                  showToast('Enlace de recuperación enviado');
                }}
                className="text-gray-500 hover:underline"
              >
                ¿Olvidaste la contraseña?
              </a>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isPhoneSubmitValid || isLoading}
            className={`w-full py-3 rounded-xs font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 ${
              isPhoneSubmitValid && !isLoading
                ? 'bg-[#FE2C55] text-white hover:bg-[#E0264B] active:scale-[0.98] cursor-pointer'
                : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{isSignUp ? 'Registrando...' : 'Iniciando sesión...'}</span>
              </>
            ) : !phoneLoginWithPassword && !isSignUp ? (
              'Enviar código'
            ) : isSignUp ? (
              'Registrarse'
            ) : (
              'Iniciar sesión'
            )}
          </button>
        </form>
      )}

      {/* Sub-Tab 2: Email / Username Form */}
      {authTab === 'email' && (
        <form onSubmit={handleEmailSubmit} className="w-full space-y-4">
          {/* Email or Username input */}
          <div className="rounded-sm border border-gray-300 dark:border-gray-700 focus-within:border-black dark:focus-within:border-white transition-colors bg-gray-50/50 dark:bg-gray-900/50">
            <label htmlFor="email-user" className="sr-only">
              Correo electrónico o nombre de usuario
            </label>
            <input
              id="email-user"
              name="username"
              type="text"
              autoComplete="username"
              enterKeyHint="next"
              required
              placeholder="Correo o nombre de usuario"
              value={emailOrUser}
              onChange={(e) => setEmailOrUser(e.target.value)}
              className="w-full px-3 py-3 bg-transparent text-sm outline-hidden"
            />
          </div>

          {/* Password input */}
          <div className="relative rounded-sm border border-gray-300 dark:border-gray-700 focus-within:border-black dark:focus-within:border-white transition-colors bg-gray-50/50 dark:bg-gray-900/50">
            <label htmlFor="current-password" className="sr-only">
              Contraseña
            </label>
            <input
              id="current-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              enterKeyHint="done"
              required
              placeholder="Contraseña"
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
              className="w-full px-3 py-3 pr-10 bg-transparent text-sm outline-hidden"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 cursor-pointer"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>

          {/* Forgot password link */}
          <div className="text-right">
            <a
              href="#olvido"
              onClick={(e) => {
                e.preventDefault();
                showToast('Redirigiendo a restablecer contraseña...');
              }}
              className="text-xs text-gray-500 hover:text-black dark:hover:text-white hover:underline"
            >
              ¿Olvidaste la contraseña?
            </a>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={!isEmailSubmitValid || isLoading}
            className={`w-full py-3 rounded-xs font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 ${
              isEmailSubmitValid && !isLoading
                ? 'bg-[#FE2C55] text-white hover:bg-[#E0264B] active:scale-[0.98] cursor-pointer'
                : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{isSignUp ? 'Registrando...' : 'Iniciando sesión...'}</span>
              </>
            ) : isSignUp ? (
              'Registrarse'
            ) : (
              'Iniciar sesión'
            )}
          </button>
        </form>
      )}

      {/* Option to view all login providers */}
      <div className="w-full text-center pt-5">
        <button
          type="button"
          onClick={() => onSelectView('MAIN')}
          className="text-xs font-semibold text-gray-500 hover:text-[#FE2C55] dark:hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1"
        >
          <span>Ver todas las opciones de inicio de sesión</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
};
