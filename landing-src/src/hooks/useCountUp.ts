import { useEffect, useRef, useState } from 'react';

// Animates the numeric portion of a stat value (e.g. "100%", "4") from 0 up to its
// target once the element scrolls into view. Runs once per mount via IntersectionObserver.
export function useCountUp(value: string, durationMs = 900) {
  const match = value.match(/^(\d+)(.*)$/);
  const target = match ? Number(match[1]) : null;
  const suffix = match ? match[2] : '';

  const [display, setDisplay] = useState(target === null ? value : `0${suffix}`);
  const ref = useRef<HTMLDivElement | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (target === null || !ref.current) return;
    const node = ref.current;
    const targetValue = target;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || hasRun.current) return;
        hasRun.current = true;
        const start = performance.now();

        function tick(now: number) {
          const progress = Math.min(1, (now - start) / durationMs);
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplay(`${Math.round(eased * targetValue)}${suffix}`);
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [target, suffix, durationMs]);

  return { ref, display };
}
