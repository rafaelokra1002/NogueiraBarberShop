// lib/auth.ts (Node-safe helpers)
import bcrypt from 'bcryptjs';

// ATENÇÃO: Este arquivo deve ser usado apenas no back-end (Node.js).
// Funções de JWT foram movidas para lib/token.ts para evitar bundling no front-end.

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

// Funções apenas para o back-end
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// As funções de token foram movidas para evitar importar 'jsonwebtoken' no front-end.
// Veja: src/lib/token.ts

