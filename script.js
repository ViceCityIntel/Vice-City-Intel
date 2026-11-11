
/* LEONIDA WHISPERS - WEBSITE FUNCTIONS */

document.addEventListener("DOMContentLoaded", () => {

  // Mobile navigation
  const menuToggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".main-nav");

  menuToggle?.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute(
      "aria-label",
      open ? "Close navigation" : "Open navigation"
    );
  });

  nav?.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      menuToggle?.setAttribute("aria-expanded", "false");
      menuToggle?.setAttribute("aria-label", "Open navigation");
    });
  });

  // Article search
  const searchInput = document.querySelector("#searchInput");
  const filters = [...document.querySelectorAll(".filter")];
  const cards = [...document.querySelectorAll(".article-card")];
  const emptyState = document.querySelector("#emptyState");

  let activeFilter = "all";

  function updateArticles() {
    const query = (searchInput?.value || "").trim().toLowerCase();
    let visible = 0;

    cards.forEach(card => {
      const categoryMatch =
        activeFilter === "all" ||
        card.dataset.category === activeFilter;

      const searchMatch =
        `${card.dataset.search || ""} ${card.innerText}`
          .toLowerCase()
          .includes(query);

      const show = categoryMatch && searchMatch;

      card.hidden = !show;

      if (show) visible++;
    });

    if (emptyState) {
      emptyState.hidden = visible !== 0;
    }
  }

  filters.forEach(button => {
    button.addEventListener("click", () => {
      filters.forEach(item => item.classList.remove("active"));

      button.classList.add("active");
      activeFilter = button.dataset.filter || "all";

      updateArticles();
    });
  });

  searchInput?.addEventListener("input", updateArticles);

  // Automatic copyright year
  const year = document.querySelector("#year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  // Initial article display
  updateArticles();

});
