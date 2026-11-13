
/* LEONIDA WHISPERS - WEBSITE FUNCTIONS */

document.addEventListener("DOMContentLoaded", () => {

  // ==========================================
  // MOBILE NAVIGATION
  // ==========================================

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


  // ==========================================
  // ARTICLE SYSTEM
  // ==========================================

  const articleGrid = document.querySelector("#articleGrid");
  const searchInput = document.querySelector("#searchInput");
  const filters = [...document.querySelectorAll(".filter")];
  const emptyState = document.querySelector("#emptyState");

  let activeFilter = "all";
  let allCards = [];

  function categoryFilter(category) {
    const value = (category || "").toLowerCase();

    if (value.includes("guide")) return "guides";

    if (
      value.includes("secret") ||
      value.includes("rumour") ||
      value.includes("mystery")
    ) {
      return "secrets";
    }

    return "news";
  }

  function createArticleCard(article) {
    const card = document.createElement("article");
    card.className = "article-card dynamic-article";
    card.dataset.category = categoryFilter(article.category);

    card.dataset.search = [
      article.title,
      article.excerpt,
      article.category,
      article.slug
    ].join(" ").toLowerCase();

    const artwork = document.createElement("div");
    artwork.className = "article-art art-sunset";

    if (article.cover_image_url) {
      const image = document.createElement("img");
      image.src = article.cover_image_url;
      image.alt = article.title || "Article cover";
      image.loading = "lazy";
      image.style.width = "100%";
      image.style.height = "100%";
      image.style.objectFit = "cover";

      image.addEventListener("error", () => image.remove());

      artwork.appendChild(image);
    } else {
      const titleArt = document.createElement("div");
      titleArt.className = "art-city";
      titleArt.textContent = "LEONIDA";
      artwork.appendChild(titleArt);
    }

    const label = document.createElement("span");
    label.className = "art-label";
    label.textContent = article.featured
      ? "FEATURED INTEL"
      : "LATEST DISPATCH";

    artwork.appendChild(label);

    const info = document.createElement("div");
    info.className = "article-info";

    const category = document.createElement("span");
    category.className = "category";

    const filterCategory = categoryFilter(article.category);
    if (filterCategory === "guides") category.classList.add("cyan");

    category.textContent = (article.category || "NEWS").toUpperCase();

    const heading = document.createElement("h3");
    heading.textContent = article.title || "Untitled report";

    const excerpt = document.createElement("p");
    excerpt.textContent = article.excerpt || "Read the latest intelligence from Leonida Whispers.";

    const link = document.createElement("a");
    link.className = "read-link";
    link.href = "article.html?slug=" + encodeURIComponent(article.slug);
    link.textContent = "READ THE INTEL →";

    info.append(category, heading, excerpt, link);
    card.append(artwork, info);

    return card;
  }


  // ==========================================
  // LOAD PUBLISHED ARTICLES FROM CLOUDFLARE
  // ==========================================

  
async function loadPublishedArticles() {
  if (!articleGrid) return;

  try {
    const response = await fetch("/api/articles", {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin"
    });

    if (!response.ok) {
      throw new Error("Unable to retrieve published articles");
    }

    const data = await response.json();

    if (!Array.isArray(data.articles)) return;

    // FEATURED INTELLIGENCE BANNER
    const featuredArticle = data.articles.find(article =>
      article.featured === true || Number(article.featured) === 1
    );

    if (featuredArticle) {
      const featuredSection = document.querySelector("#featuredIntel");

if (featuredSection) {
  featuredSection.hidden = false;
}
      const featuredImage = document.querySelector("#featuredImage");
      const featuredTitle = document.querySelector("#featuredTitle");
      const featuredExcerpt = document.querySelector("#featuredExcerpt");
      const featuredLink = document.querySelector("#featuredLink");

      if (featuredImage && featuredArticle.cover_image_url) {
        featuredImage.style.backgroundImage =
          `linear-gradient(0deg, rgba(9,7,19,.85), transparent 100%), url("${featuredArticle.cover_image_url}")`;
      }

      if (featuredTitle) {
        featuredTitle.textContent = featuredArticle.title;
      }

      if (featuredExcerpt) {
        featuredExcerpt.textContent = featuredArticle.excerpt || "";
      }

      if (featuredLink) {
        featuredLink.href =
          "article.html?slug=" + encodeURIComponent(featuredArticle.slug);
      }
    }

    // REMOVE PREVIOUS DATABASE ARTICLES
    articleGrid.querySelectorAll(".dynamic-article").forEach(card => {
      card.remove();
    });

    // LOAD PUBLISHED ARTICLES
    data.articles.forEach(article => {
      if (!article.slug || !article.title) return;

      const card = createArticleCard(article);
      articleGrid.appendChild(card);
    });

    updateArticles();

  } catch (error) {
    console.error("Leonida Whispers article feed:", error);
  }
}



  // ==========================================
  // SEARCH AND CATEGORY FILTERS
  // ==========================================

  function updateArticles() {
    if (!articleGrid) return;

    const query = (searchInput?.value || "").trim().toLowerCase();

    const cards = [...articleGrid.querySelectorAll(".article-card")];

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


  // ==========================================
  // COPYRIGHT YEAR
  // ==========================================

  const year = document.querySelector("#year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }


  // ==========================================
  // INITIALISE WEBSITE
  // ==========================================

  updateArticles();
  loadPublishedArticles();

});
