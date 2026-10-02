import { useEffect, useRef, useState } from 'react';

// Splash de inicio con el logo nuevo (toro/oso "HC") — reemplaza al video de
// 9s del logo anterior (public/intro-splash.mp4, ya sin uso). No se generó
// un video nuevo: no hay forma de recrear con IA una animación fiel al
// logo real sin introducir artefactos sobre el texto/las figuras — esto usa
// el PNG real del logo con una animación CSS (fade + scale-in + brillo),
// más corto y sin ese riesgo. Ver public/splash-logo.png (emblema + texto,
// fondo transparente, recortado del logo que pasó el usuario).
const HOLD_MS = 1400; // cuánto queda el logo quieto en pantalla tras la entrada
const ENTER_MS = 700; // duración de la animación .splash-logo (index.css)
const TOTAL_MS = ENTER_MS + HOLD_MS;

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [fadingOut, setFadingOut] = useState(false);
  const doneRef = useRef(false);

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    setFadingOut(true);
    setTimeout(onDone, 300);
  }

  useEffect(() => {
    const timer = setTimeout(finish, TOTAL_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300"
      style={{ background: '#1a1a19', opacity: fadingOut ? 0 : 1 }}
    >
      <img
        src="/splash-logo.png"
        alt="Hikman Capital"
        className="splash-logo pulse-glow w-full max-w-md px-10"
        style={{ ['--glow-color' as string]: 'rgba(255,255,255,0.85)' }}
      />
    </div>
  );
}
