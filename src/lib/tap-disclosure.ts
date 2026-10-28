const usesTapInteraction = window.matchMedia(
  "(max-width: 1023px)",
);

export const setupTapDisclosure = (selector: string) => {
  document.querySelectorAll<HTMLElement>(selector).forEach((card) => {
    const toggle = () => {
      if (!usesTapInteraction.matches) return;
      const expanded = card.getAttribute("aria-expanded") === "true";
      card.setAttribute("aria-expanded", String(!expanded));
    };

    card.addEventListener("click", toggle);
    card.addEventListener("keydown", (event) => {
      if (event.target !== card || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault();
      toggle();
    });
  });
};
