import { useEffect, useRef, useState } from "react";
import { HEADER_REVEAL_SCROLL_Y } from "../data/mockData";

export interface ScrolledHeaderState {
  readonly atTop: boolean;
}

function pageIsAtTop(): boolean {
  return typeof window === "undefined" || window.scrollY <= HEADER_REVEAL_SCROLL_Y;
}

export function useScrolledHeader(): ScrolledHeaderState {
  const [atTop, setAtTop] = useState(pageIsAtTop);
  const frameRef = useRef(0);

  useEffect(() => {
    const update = () => {
      frameRef.current = 0;
      setAtTop(pageIsAtTop());
    };
    const onScroll = () => {
      if (frameRef.current === 0) {
        frameRef.current = window.requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frameRef.current !== 0) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return { atTop };
}
