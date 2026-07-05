import { useState, useEffect } from 'react';

/**
 * Breakpoints alineados con Tailwind:
 * phone  < 640px
 * tablet 640–1023px
 * desktop >= 1024px
 */
export function useBreakpoint() {
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return {
    width,
    isPhone: width < 640,
    isTablet: width >= 640 && width < 1024,
    isDesktop: width >= 1024,
    /** Tabla solo en pantallas muy anchas; cards en tablet y móvil */
    useTableLayout: width >= 1280,
  };
}
