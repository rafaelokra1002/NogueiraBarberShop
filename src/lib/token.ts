// lib/token.ts (Node-only JWT helpers)
// Use este arquivo apenas no ambiente Node.js (ex: rotas de API, server).
import jwt from 'jsonwebtoken';

export interface JwtPayloadBase {
  id: string;
  email: string;
  role: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export const generateToken = (payload: JwtPayloadBase): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string): JwtPayloadBase | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayloadBase;
  } catch {
    return null;
  }
};
