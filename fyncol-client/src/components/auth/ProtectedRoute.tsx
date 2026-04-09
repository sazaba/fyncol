import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute() {
  const token = localStorage.getItem("token");
  const userString = localStorage.getItem("user");

  // 1. Si no hay token o no hay usuario, pa' fuera
  if (!token || !userString) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userString);

    // 2. Excepción: El SUPERADMIN (tú) nunca debe ser bloqueado por pagos
    if (user.role === "SUPERADMIN") {
      return <Outlet />;
    }

    // 3. Lógica del Paywall (Bloqueo si está vencido)
    // Asumimos que tu controlador de Login y Register inyectan 'subscriptionStatus'
    const status = user.subscriptionStatus; 

    if (status === "PAST_DUE" || status === "CANCELED") {
      // Si su periodo de prueba terminó o la tarjeta falló, lo enviamos 
      // a una pantalla dedicada para que ingrese su tarjeta de crédito.
      return <Navigate to="/billing" replace />; 
    }

    // 4. Si es TRIAL o ACTIVE, puede pasar libremente
    return <Outlet />;

  } catch (error) {
    // Si el JSON del user está corrupto en localStorage, forzar re-login
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return <Navigate to="/login" replace />;
  }
}