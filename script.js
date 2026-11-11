const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".main-nav");
menuToggle?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(open));
});
nav?.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
  nav.classList.remove("open");
  menuToggle?.setAttribute("aria-expanded", "false");
}));

const searchInput = document.querySelector("#searchInput");
const filters = [...document.querySelectorAll(".filter")];
const cards = [...document.querySelectorAll(".article-card")];
const emptyState = document.querySelector("#emptyState");
let activeFilter = "all";

function updateArticles() {
  const query = (searchInput?.value || "").trim().toLowerCase();
  let visible = 0;
  cards.forEach(card => {
    const categoryMatch = activeFilter === "all" || card.dataset.category === activeFilter;
    const searchMatch = (card.dataset.search + " " + card.innerText).toLowerCase().includes(query);
    const show = categoryMatch && searchMatch;
    card.hidden = !show;
    if (show) visible++;
  });
  if (emptyState) emptyState.hidden = visible !== 0;
}
filters.forEach(button => button.addEventListener("click", () => {
  filters.forEach(item => item.classList.remove("active"));
  button.classList.add("active");
  activeFilter = button.dataset.filter;
  updateArticles();
}));
searchInput?.addEventListener("input", updateArticles);

document.querySelector("#year").textContent = new Date().getFullYear();
document.querySelector("#signupForm")?.addEventListener("submit", event => {
  event.preventDefault();
  const note = document.querySelector("#formNote");
  note.textContent = "Demo only: connect your Beehiiv signup form before collecting email addresses.";
  note.style.color = "#4deaff";
});
