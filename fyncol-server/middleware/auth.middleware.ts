import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Interfaz mejorada
export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
    companyId: number | null;
    iat?: number;
    exp?: number;
  };
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Acceso denegado. No hay token.",
      });
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'fyncol_secret_key';

    // Verificamos el token
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // --- LOG PARA DEPURACIÓN EN RENDER ---
    // Revisa los "Logs" de tu Web Service en el dashboard de Render. 
    // Ahí verás si el companyId viene o no.
    console.log("LOG: Contenido del Token decodificado:", decoded);

    // Asignamos el objeto decodificado al request
    // Nos aseguramos de mapear el companyId explícitamente por si acaso
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      companyId: decoded.companyId // <--- Vital que este nombre coincida con el del login
    };

    return next();
  } catch (error) {
    console.error("LOG: Error al verificar JWT:", error);
    return res.status(401).json({
      success: false,
      message: "Token inválido o expirado.",
    });
  }
};