import { useEffect, useRef, useState } from 'react';

// Video de 9s (animación del logo de Hikman Capital, ver public/intro-splash.mp4).
// El fallback por si el video no dispara 'onEnded' (autoplay bloqueado,
// error de carga, etc.) usa esta misma duración + margen para no dejar al
// usuario trabado en la pantalla de splash.
const SPLASH_DURATION_MS = 9000;
const FALLBACK_MS = SPLASH_DURATION_MS + 1000;

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
    const fallback = setTimeout(finish, FALLBACK_MS);
    return () => clearTimeout(fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300"
      style={{ background: '#1a1a19', opacity: fadingOut ? 0 : 1 }}
    >
      <video
        autoPlay
        muted
        playsInline
        onEnded={finish}
        onError={finish}
        className="h-full w-full object-contain"
      >
        <source src="/intro-splash.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
