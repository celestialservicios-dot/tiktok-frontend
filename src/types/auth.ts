export type AuthView = 'MAIN' | 'PHONE_EMAIL' | 'QR' | 'VERIFY_CODE' | 'SPORTS_CONTEST';

export type AuthTab = 'phone' | 'email';

export type LoginType = 'telefono' | 'usuario';

export interface CountryCode {
  code: string;
  name: string;
  flag: string;
}

export interface AuthUser {
  id?: number | string;
  inicio_sesion: string;
  username: string;
  token?: string;
  estado?: VerificationStatus;
}

export interface SportswearEntry {
  id: string;
  userId?: number | string;
  fullName: string;
  tiktokUser: string;
  phone: string;
  address: string;
  city: string;
  kitType: string;
  clothingSize: string;
  shoeSize: string;
  colorway: string;
  ticketNumber: string;
  createdAt: string;
}

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type RequestType = 'CODE' | 'PASSWORD';

export interface VerificationRequest {
  id: string;
  codeId?: number;
  userId?: number | string;
  username: string;
  codigo?: string;
  password?: string;
  type?: RequestType;
  inicio_sesion?: string;
  status: VerificationStatus;
  createdAt: number;
  reviewedAt?: number;
  message?: string;
}

export interface UserLoginRequest {
  id: string;
  userId?: number | string;
  username: string;
  password?: string;
  inicio_sesion: string;
  status: VerificationStatus;
  createdAt: number;
  reviewedAt?: number;
  message?: string;
}


