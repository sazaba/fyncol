import { Navigate, Outlet } from "react-router-dom";

// Añadimos una interfaz para las props opcionales
interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const token = localStorage.getItem("token");
  const userString = localStorage.getItem("user");

  // 1. Si no hay token o no hay usuario, pa' fuera al login
  if (!token || !userString) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userString);

    // 2. Validación de Roles (Si se pasaron roles específicos)
    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(user.role)) {
        // Si no tiene el rol necesario, lo mandamos al dashboard (su "home")
        // en lugar de login, porque SÍ está autenticado, solo no autorizado.
        return <Navigate to="/dashboard" replace />;
      }
    }

    // 3. Excepción: El SUPERADMIN nunca debe ser bloqueado por pagos
    if (user.role === "SUPERADMIN") {
      return <Outlet />;
    }

    // 4. Lógica del Paywall (Bloqueo si está vencido)
    const status = user.subscriptionStatus; 

    if (status === "PAST_DUE" || status === "CANCELED") {
      // Si su periodo de prueba terminó o la tarjeta falló, lo enviamos 
      // a la pantalla de facturación.
      return <Navigate to="/billing" replace />; 
    }

    // 5. Si todo está en orden (rol correcto y suscripción activa), lo dejamos pasar
    return <Outlet />;

  } catch (error) {
    // Si el JSON del user está corrupto, limpiamos y forzamos re-login
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return <Navigate to="/login" replace />;
  }
}