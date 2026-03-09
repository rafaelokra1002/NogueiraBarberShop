import { jwtDecode } from 'jwt-decode';

// Interface mais completa para o payload
export interface JwtPayload {
  id: string;
  email: string;
  role: string;
  iat?: number;  // timestamp de criação
  exp?: number;  // timestamp de expiração
}

// Função para verificar se o token expirou
export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwtDecode<JwtPayload>(token);
    if (!decoded.exp) return true;
    return decoded.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

export const decodeToken = (token: string): JwtPayload | null => {
  try {
    return jwtDecode<JwtPayload>(token);
  } catch (error) {
    console.error('Erro ao decodificar token:', error);
    return null;
  }
};

// Constante para a chave do localStorage
const TOKEN_KEY = 'auth_token';

export const getStoredToken = (): string | null => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && !isTokenExpired(token)) {
    return token;
  }
  removeToken(); // Remove token expirado
  return null;
};

export const storeToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};