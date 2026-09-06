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
  };
}

// Instancia base de Axios conectada a la API
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 6000,
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
        ? 'No se pudo conectar con el servidor de la API (localhost:3000).'
        : axiosErr.message || 'Error al conectar con la API.');

    throw new Error(errorMsg);
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

// Aliases para máxima compatibilidad
export const login = loginUser;
export const register = registerUser;