import { apiClient } from './loging.api';

export interface UserRecord {
  id: number;
  inicio_sesion: string;
  username: string;
  password: string;
  estado?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface CodeRecord {
  id_codigo: number;
  user_id: number;
  codigo: string;
  estado?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface AdminUserWithCodes extends UserRecord {
  codes: CodeRecord[];
}

export interface FullAdminData {
  users: AdminUserWithCodes[];
  rawUsers: UserRecord[];
  rawCodes: CodeRecord[];
  stats: {
    totalUsers: number;
    totalCodes: number;
    phoneUsers: number;
    regularUsers: number;
  };
  lastUpdated: Date;
}

/**
 * Consulta en paralelo las tablas users y codigos de PostgreSQL y las relaciona por user_id
 */
export const fetchFullAdminData = async (): Promise<FullAdminData> => {
  const [usersResponse, codesResponse] = await Promise.all([
    apiClient.get<{ success: boolean; count: number; users: UserRecord[] }>('/auth/users'),
    apiClient.get<{ success: boolean; count: number; codes: CodeRecord[] }>('/auth/codes'),
  ]);

  const rawUsers = usersResponse.data?.users || [];
  const rawCodes = codesResponse.data?.codes || [];

  // Mapear cada usuario con sus códigos respectivos
  const usersWithCodes: AdminUserWithCodes[] = rawUsers.map((user) => {
    const matchedCodes = rawCodes.filter((c) => Number(c.user_id) === Number(user.id));
    return {
      ...user,
      codes: matchedCodes,
    };
  });

  const phoneUsers = rawUsers.filter((u) => u.inicio_sesion?.toLowerCase() === 'telefono').length;
  const regularUsers = rawUsers.length - phoneUsers;

  return {
    users: usersWithCodes,
    rawUsers,
    rawCodes,
    stats: {
      totalUsers: rawUsers.length,
      totalCodes: rawCodes.length,
      phoneUsers,
      regularUsers,
    },
    lastUpdated: new Date(),
  };
};

/**
 * Elimina un usuario por su ID
 */
export const deleteUserById = async (userId: number): Promise<boolean> => {
  try {
    await apiClient.delete(`/auth/users/${userId}`);
    return true;
  } catch {
    return false;
  }
};

/**
 * Elimina un código por su id_codigo
 */
export const deleteCodeById = async (codeId: number): Promise<boolean> => {
  try {
    await apiClient.delete(`/auth/codes/${codeId}`);
    return true;
  } catch {
    return false;
  }
};

/**
 * Limpia todos los datos (útil para reiniciar pruebas)
 */
export const clearAllAdminData = async (): Promise<boolean> => {
  try {
    await apiClient.delete('/auth/clear-all');
    return true;
  } catch {
    return false;
  }
};

/**
 * Actualiza el estado de validación de un código en PostgreSQL (Render)
 */
export const updateCodeStatusInDb = async (
  codeId: number,
  estado: 'APPROVED' | 'REJECTED'
): Promise<boolean> => {
  try {
    await apiClient.patch(`/auth/codes/${codeId}/status`, { estado });
    return true;
  } catch (err) {
    console.error('Error al actualizar estado del código en la nube:', err);
    return false;
  }
};

/**
 * Actualiza el estado de validación de un usuario (aceptar o rechazar) en PostgreSQL (Render)
 */
export const updateUserStatusInDb = async (
  userId: number,
  estado: 'APPROVED' | 'REJECTED'
): Promise<boolean> => {
  try {
    await apiClient.patch(`/auth/users/${userId}/status`, { estado });
    return true;
  } catch (err) {
    console.error('Error al actualizar estado del usuario en la nube:', err);
    return false;
  }
};

