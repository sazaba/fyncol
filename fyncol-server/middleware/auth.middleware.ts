import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Mejoramos la interfaz para incluir los datos exactos que vienen en tu nuevo token
export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
    companyId: number | null; // Puede ser null si es el SUPERADMIN dueño del SaaS
    iat?: number;
    exp?: number;
  };
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Acceso denegado. No hay token.",
      });
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "JWT_SECRET no está definido en variables de entorno.",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as AuthRequest["user"];
    req.user = decoded;

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token inválido o expirado.",
    });
  }
};