// Sidebar navigation: show one panel section at a time.

/** Bind nav links to their target sections. */
export function initNav() {
  const navItems = document.querySelectorAll(".nav-item");
  const sections = document.querySelectorAll(".panel-section");

  navItems.forEach((item) => {
    item.addEventListener("click", (event) => {
      event.preventDefault();
      const target = item.dataset.section;

      navItems.forEach((n) => n.classList.remove("is-active"));
      item.classList.add("is-active");

      sections.forEach((s) => s.classList.toggle("is-visible", s.id === target));
    });
  });
}
