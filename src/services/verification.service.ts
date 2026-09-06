import type { VerificationRequest, VerificationStatus } from '../types/auth';

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
  codigo: string
): VerificationRequest => {
  const newRequest: VerificationRequest = {
    id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId,
    username: username.trim(),
    codigo: codigo.trim(),
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
        message: 'Código verificado y aprobado por el administrador.',
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
 * El Administrador RECHAZA el código (Marca como INCORRECTO y deniega el inicio de sesión)
 */
export const rejectVerificationRequest = (
  requestId: string,
  message = 'Introduce un código de verificación válido'
): VerificationRequest | null => {
  const currentRequests = getVerificationRequests();
  let updatedRequest: VerificationRequest | null = null;

  const updatedList = currentRequests.map((req) => {
    if (req.id === requestId) {
      updatedRequest = {
        ...req,
        status: 'REJECTED' as VerificationStatus,
        reviewedAt: Date.now(),
        message,
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
  onUpdate: (request: VerificationRequest) => void
): (() => void) => {
  // Manejador de eventos
  const handleEvent = (data: { type: string; request: VerificationRequest }) => {
    if (data?.request?.id === requestId) {
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

  // 2. Escuchar BroadcastChannel para otras pestañas
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
          onUpdate(current);
        }
      } catch {
        // Ignorar error de parseo
      }
    }
  };
  window.addEventListener('storage', storageListener);

  // 4. Polling ultra-ligero de respaldo cada 500ms
  const intervalId = setInterval(() => {
    const current = getVerificationRequestById(requestId);
    if (current && (current.status === 'APPROVED' || current.status === 'REJECTED')) {
      onUpdate(current);
    }
  }, 500);

  // Función para desuscribirse
  return () => {
    window.removeEventListener('tiktok_verification_event', customListener);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', channelListener);
    }
    window.removeEventListener('storage', storageListener);
    clearInterval(intervalId);
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
