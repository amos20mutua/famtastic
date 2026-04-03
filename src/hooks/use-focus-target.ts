import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export function useFocusTarget() {
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get("focus");

  useEffect(() => {
    if (!focusId || typeof document === "undefined") {
      return;
    }

    const timer = window.setTimeout(() => {
      const target = document.querySelector<HTMLElement>(`[data-focus-id="${focusId}"]`);

      if (!target) {
        return;
      }

      target.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
      target.focus({
        preventScroll: true
      });
    }, 140);

    return () => {
      window.clearTimeout(timer);
    };
  }, [focusId]);

  return {
    focusId,
    isFocused: (id: string) => focusId === id
  };
}
