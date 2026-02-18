import { FaInstagram, FaLinkedinIn, FaXTwitter, FaFacebookF } from "react-icons/fa6";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mx-auto w-full max-w-6xl px-4 pb-12 md:px-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
        <div className="grid gap-10 md:grid-cols-3">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5">
                <span className="text-sm font-bold text-emerald-200">F</span>
              </span>
              <div className="text-lg font-semibold text-white">Fyncol</div>
            </div>

            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
              Control simple de pagos y cartera para negocios que quieren orden,
              claridad y seguimiento sin fricción.
            </p>

            <div className="mt-5 flex gap-3">
              {[
                { Icon: FaInstagram, href: "#" },
                { Icon: FaXTwitter, href: "#" },
                { Icon: FaLinkedinIn, href: "#" },
                { Icon: FaFacebookF, href: "#" },
              ].map(({ Icon, href }, i) => (
                <a
                  key={i}
                  href={href}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:text-white"
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div>
            <div className="text-sm font-semibold text-white">Plataforma</div>
            <ul className="mt-4 space-y-3 text-sm text-white/65">
              <li><a className="hover:text-white" href="#funcionalidades">Funcionalidades</a></li>
              <li><a className="hover:text-white" href="#como-funciona">Cómo funciona</a></li>
              <li><a className="hover:text-white" href="#precios">Planes y Precios</a></li>
              <li><a className="hover:text-white" href="#faqs">Preguntas Frecuentes</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <div className="text-sm font-semibold text-white">Legal y Privacidad</div>
            <ul className="mt-4 space-y-3 text-sm text-white/65">
              <li><a className="hover:text-white" href="#">Términos y Condiciones</a></li>
              <li><a className="hover:text-white" href="#">Política de Privacidad</a></li>
              <li>
                <a className="text-red-300 hover:text-red-200" href="#">
                  • ELIMINAR MIS DATOS
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="my-8 h-px w-full bg-white/10" />

        <div className="flex flex-col items-start justify-between gap-3 text-xs text-white/50 md:flex-row md:items-center">
          <div>© {year} Fyncol Inc. Todos los derechos reservados.</div>
          <div>
            Hecho con <span className="text-red-300">♥</span> para negocios que cobran mejor
          </div>
        </div>
      </div>
    </footer>
  );
}
