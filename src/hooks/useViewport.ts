import { useEffect, useState } from "react";

export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [breakpoint]);

  return isMobile;
}

export interface VisualViewportState {
  width: number;
  height: number;
  offsetTop: number;
  keyboardInset: number;
}

function readVisualViewport(): VisualViewportState {
  if (typeof window === "undefined") {
    return { width: 1024, height: 768, offsetTop: 0, keyboardInset: 0 };
  }
  const vv = window.visualViewport;
  if (!vv) {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      offsetTop: 0,
      keyboardInset: 0,
    };
  }
  const keyboardInset = Math.max(
    0,
    Math.round(window.innerHeight - (vv.height + vv.offsetTop))
  );
  return {
    width: vv.width,
    height: vv.height,
    offsetTop: vv.offsetTop,
    keyboardInset,
  };
}

export function useVisualViewport(): VisualViewportState {
  const [viewport, setViewport] = useState<VisualViewportState>(readVisualViewport);

  useEffect(() => {
    const update = () => {
      setViewport((prev) => {
        const next = readVisualViewport();
        if (
          prev.width === next.width &&
          prev.height === next.height &&
          prev.offsetTop === next.offsetTop &&
          prev.keyboardInset === next.keyboardInset
        ) {
          return prev;
        }
        return next;
      });
    };

    const vv = window.visualViewport;
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return viewport;
}
