import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

export default function Landing() {
  const handleLogin = () => {
    // luego lo conectamos con /login o modal
    alert("Ir a login (pendiente)");
  };

  return (
    <div className="min-h-screen bg-[#070A12] text-white">
      {/* background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute top-40 right-[-140px] h-[520px] w-[520px] rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="absolute bottom-[-200px] left-[-140px] h-[520px] w-[520px] rounded-full bg-purple-500/15 blur-3xl" />
      </div>

      <Navbar onLogin={handleLogin} />

      {/* placeholder (por ahora nada más) */}
      <main className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white/70">
          (Landing en construcción — por ahora solo Navbar + Footer)
        </div>
      </main>

      <Footer />
    </div>
  );
}
