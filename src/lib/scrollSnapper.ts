import { gsap } from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

gsap.registerPlugin(ScrollToPlugin);

const DESKTOP_BREAKPOINT = 1280;
const EDGE_TOLERANCE = 5;
const MAX_SECTION_GAP = 50;
const MIN_TOUCH_DELTA = 30;

const getRealContainer = (section: HTMLElement) =>
  section.parentElement?.classList.contains("pin-spacer")
    ? section.parentElement
    : section;

export const initGlobalScrollSnap = (): (() => void) | undefined => {
  const sections = Array.from(
    document.querySelectorAll<HTMLElement>("[data-scroll-snap]"),
  );

  if (sections.length < 2) return;

  let isAnimating = false;
  let currentIndex = -1;
  let touchStartY = 0;
  let destroyed = false;
  let scrollTween: gsap.core.Tween | undefined;

  const isDesktop = () => window.innerWidth > DESKTOP_BREAKPOINT;

  const findCurrentIndex = () => {
    const viewportCenter = window.scrollY + window.innerHeight / 2;

    return sections.findIndex((section) => {
      const rect = getRealContainer(section).getBoundingClientRect();
      const top = window.scrollY + rect.top;
      const bottom = window.scrollY + rect.bottom;

      return viewportCenter >= top && viewportCenter <= bottom;
    });
  };

  const updateIndex = () => {
    if (!isAnimating) currentIndex = findCurrentIndex();
  };

  const goToSection = (index: number, fromBottom = false) => {
    if (index < 0 || index >= sections.length || isAnimating || !isDesktop()) return;

    const rect = getRealContainer(sections[index]).getBoundingClientRect();
    const maxScroll = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
    );
    const requestedY = fromBottom
      ? window.scrollY + rect.bottom - window.innerHeight
      : window.scrollY + rect.top;
    const targetY = Math.max(0, Math.min(maxScroll, requestedY));

    isAnimating = true;
    currentIndex = index;
    scrollTween = gsap.to(window, {
      scrollTo: { y: targetY, autoKill: false },
      duration: 0.3,
      ease: "power2.out",
      onComplete: () => {
        if (destroyed) return;
        scrollTween = undefined;
        isAnimating = false;
        updateIndex();
      },
      onInterrupt: () => {
        if (destroyed) return;
        scrollTween = undefined;
        isAnimating = false;
        updateIndex();
      },
    });
  };

  const trySnap = (deltaY: number) => {
    if (!isDesktop() || deltaY === 0) return false;

    currentIndex = findCurrentIndex();
    if (currentIndex < 0) return false;

    if (deltaY > 0 && currentIndex < sections.length - 1) {
      const currentRect = getRealContainer(sections[currentIndex]).getBoundingClientRect();
      const nextRect = getRealContainer(sections[currentIndex + 1]).getBoundingClientRect();
      const distanceToNext = nextRect.top - currentRect.bottom;

      if (
        currentRect.bottom - deltaY <= window.innerHeight + EDGE_TOLERANCE &&
        distanceToNext < MAX_SECTION_GAP
      ) {
        goToSection(currentIndex + 1);
        return true;
      }
    }

    if (deltaY < 0 && currentIndex > 0) {
      const currentRect = getRealContainer(sections[currentIndex]).getBoundingClientRect();
      const previousRect = getRealContainer(sections[currentIndex - 1]).getBoundingClientRect();
      const distanceToPrevious = currentRect.top - previousRect.bottom;

      if (
        currentRect.top - deltaY >= -EDGE_TOLERANCE &&
        distanceToPrevious < MAX_SECTION_GAP
      ) {
        goToSection(currentIndex - 1, true);
        return true;
      }
    }

    return false;
  };

  const handleWheel = (event: WheelEvent) => {
    if (!isDesktop()) return;
    if (isAnimating) {
      event.preventDefault();
      return;
    }

    if (trySnap(event.deltaY)) event.preventDefault();
  };

  const handleTouchStart = (event: TouchEvent) => {
    if (event.touches.length === 1) touchStartY = event.touches[0].clientY;
  };

  const handleTouchMove = (event: TouchEvent) => {
    if (!isDesktop() || event.touches.length !== 1) return;
    if (isAnimating) {
      event.preventDefault();
      return;
    }

    const touchEndY = event.touches[0].clientY;
    const deltaY = touchStartY - touchEndY;
    if (Math.abs(deltaY) < MIN_TOUCH_DELTA) return;

    if (trySnap(deltaY)) event.preventDefault();
  };

  const previousScrollBehavior = document.documentElement.style.scrollBehavior;
  const updateScrollBehavior = () => {
    document.documentElement.style.scrollBehavior = isDesktop()
      ? "auto"
      : previousScrollBehavior;
  };

  const handleResize = () => {
    updateScrollBehavior();
    updateIndex();
  };

  updateScrollBehavior();
  updateIndex();
  window.addEventListener("wheel", handleWheel, { passive: false });
  window.addEventListener("touchstart", handleTouchStart, { passive: true });
  window.addEventListener("touchmove", handleTouchMove, { passive: false });
  window.addEventListener("scroll", updateIndex, { passive: true });
  window.addEventListener("resize", handleResize);

  return () => {
    destroyed = true;
    scrollTween?.kill();
    window.removeEventListener("wheel", handleWheel);
    window.removeEventListener("touchstart", handleTouchStart);
    window.removeEventListener("touchmove", handleTouchMove);
    window.removeEventListener("scroll", updateIndex);
    window.removeEventListener("resize", handleResize);
    document.documentElement.style.scrollBehavior = previousScrollBehavior;
  };
};
