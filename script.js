
/* ==========================================
   LEONIDA WHISPERS
   CINEMATIC WEBSITE FUNCTIONS
   MASTER REPLACEMENT
   GUIDES + CLASSIFIED PAGE SUPPORT
========================================== */

document.addEventListener("DOMContentLoaded", () => {

  // 01 — MOBILE NAVIGATION

  const menuToggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".main-nav");

  menuToggle?.addEventListener("click", () => {
    if (!nav) return;

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


  // 02 — PAGE DETECTION

  const page = document.body.dataset.page || "";

  const isGuidesPage = page === "guides";
  const isClassifiedPage = page === "classified";


  // 03 — ARTICLE ELEMENTS

  const articleGrid = document.querySelector("#articleGrid");
  const searchInput = document.querySelector("#searchInput");
  const filters = [...document.querySelectorAll(".filter")];
  const emptyState = document.querySelector("#emptyState");

  let activeFilter = "all";


  // 04 — CATEGORY DETECTION

  function categoryFilter(category) {

    const value = (category || "")
      .toLowerCase()
      .trim();

    if (
      value.includes("tip") ||
      value.includes("trick")
    ) return "tips";

    if (
      value.includes("guide") ||
      value.includes("beginner")
    ) return "guides";

    if (
      value.includes("secret") ||
      value.includes("rumour") ||
      value.includes("rumor") ||
      value.includes("mystery") ||
      value.includes("classified") ||
      value.includes("discovery") ||
      value.includes("discoveries") ||
      value.includes("easter egg") ||
      value.includes("hidden")
    ) return "secrets";

    return "news";
  }


  // 05 — CINEMATIC FALLBACK ARTWORK

  function createFallbackArtwork(category) {

    const fallback = document.createElement("div");

    fallback.className = "article-fallback";

    fallback.style.cssText = `
      position:absolute;
      inset:0;
      display:flex;
      align-items:center;
      justify-content:center;
      overflow:hidden;
      background:
        radial-gradient(
          circle at 50% 45%,
          rgba(255,79,200,.35),
          transparent 55%
        ),
        linear-gradient(
          145deg,
          #301348,
          #101027 65%,
          #061d32
        );
    `;

    const symbols = {
      news: "VI",
      guides: "FIELD",
      tips: "TIPS",
      secrets: "?"
    };

    const symbol = document.createElement("div");

    symbol.textContent = symbols[category] || "LEONIDA";

    symbol.style.cssText = `
      font-family:Orbitron,sans-serif;
      font-size:${category === "secrets" ? "110px" : "65px"};
      font-weight:800;
      letter-spacing:5px;
      color:${category === "guides" || category === "tips"
        ? "#4deaff"
        : "#ff4fc8"};
      text-shadow:
        0 0 12px currentColor,
        0 0 35px currentColor;
      opacity:.9;
    `;

    fallback.appendChild(symbol);

    const caption = document.createElement("span");

    caption.textContent = "LEONIDA WHISPERS";

    caption.style.cssText = `
      position:absolute;
      bottom:18px;
      right:16px;
      color:white;
      font:8px Orbitron,sans-serif;
      letter-spacing:3px;
      opacity:.8;
    `;

    fallback.appendChild(caption);

    return fallback;
  }


  // 06 — CREATE ARTICLE CARDS

  function createArticleCard(article) {

    const categoryType = categoryFilter(article.category);

    const card = document.createElement("article");

    card.className = "article-card dynamic-article";

    card.dataset.category = categoryType;

    card.dataset.search = [
      article.title,
      article.excerpt,
      article.category,
      article.slug
    ].join(" ").toLowerCase();


    // ARTWORK

    const artwork = document.createElement("div");

    artwork.className = `article-art article-art-${categoryType}`;

    artwork.style.position = "relative";
    artwork.style.overflow = "hidden";
    artwork.style.backgroundColor = "#100b20";

    const fallback = createFallbackArtwork(categoryType);

    artwork.appendChild(fallback);


    // COVER IMAGE

    if (
      article.cover_image_url &&
      typeof article.cover_image_url === "string"
    ) {

      const image = document.createElement("img");

      image.src = article.cover_image_url;
      image.alt = article.title || "Leonida Whispers article artwork";
      image.loading = "lazy";
      image.decoding = "async";

      image.style.cssText = `
        position:absolute;
        inset:0;
        width:100%;
        height:100%;
        object-fit:cover;
        object-position:center;
        z-index:1;
        transition:transform .6s ease,filter .4s ease;
      `;

      image.addEventListener("error", () => image.remove());

      image.addEventListener("load", () => fallback.remove());

      artwork.appendChild(image);
    }


    // ARTWORK LABEL

    const label = document.createElement("span");

    label.className = "art-label";

    label.textContent =
      article.featured === true ||
      Number(article.featured) === 1
        ? "FEATURED INTEL"
        : "LATEST DISPATCH";

    label.style.zIndex = "3";

    artwork.appendChild(label);


    // IMAGE OVERLAY

    const overlay = document.createElement("div");

    overlay.style.cssText = `
      position:absolute;
      inset:0;
      z-index:2;
      pointer-events:none;
      background:linear-gradient(
        180deg,
        rgba(9,7,19,.05) 35%,
        rgba(9,7,19,.65) 100%
      );
    `;

    artwork.appendChild(overlay);


    // ARTICLE INFORMATION

    const info = document.createElement("div");

    info.className = "article-info";


    // CATEGORY

    const category = document.createElement("span");

    category.className = "category";

    if (
      categoryType === "guides" ||
      categoryType === "tips"
    ) {
      category.classList.add("cyan");
    }

    category.textContent =
      (article.category || "NEWS").toUpperCase();


    // TITLE

    const heading = document.createElement("h3");

    heading.textContent = article.title || "Untitled report";


    // EXCERPT

    const excerpt = document.createElement("p");

    excerpt.textContent =
      article.excerpt ||
      "Read the latest intelligence from Leonida Whispers.";


    // ARTICLE LINK

    const link = document.createElement("a");

    link.className = "read-link";

    link.href =
      "article.html?slug=" +
      encodeURIComponent(article.slug);

    link.innerHTML = `
      <span>READ THE INTEL</span>
      <span>→</span>
    `;

    info.append(category, heading, excerpt, link);

    card.append(artwork, info);

    return card;
  }


  // 07 — FEATURED INTELLIGENCE BANNER

  function updateFeaturedArticle(articles) {

    const featuredSection =
      document.querySelector("#featuredIntel");

    if (!featuredSection) return;

    const featuredArticle = articles.find(article =>
      article.featured === true ||
      Number(article.featured) === 1
    );

    if (!featuredArticle) {
      featuredSection.hidden = true;
      return;
    }

    const featuredImage =
      document.querySelector("#featuredImage");

    const featuredTitle =
      document.querySelector("#featuredTitle");

    const featuredExcerpt =
      document.querySelector("#featuredExcerpt");

    const featuredLink =
      document.querySelector("#featuredLink");

    featuredSection.hidden = false;

    if (featuredImage) {

      if (featuredArticle.cover_image_url) {

        featuredImage.style.backgroundImage = `
          linear-gradient(
            90deg,
            rgba(9,7,19,.92),
            rgba(9,7,19,.45) 70%,
            rgba(9,7,19,.15)
          ),
          url("${featuredArticle.cover_image_url}")
        `;

      } else {

        featuredImage.style.backgroundImage =
          "linear-gradient(135deg,#35134b,#101027,#06283b)";
      }
    }

    if (featuredTitle) {
      featuredTitle.textContent = featuredArticle.title || "";
    }

    if (featuredExcerpt) {
      featuredExcerpt.textContent = featuredArticle.excerpt || "";
    }

    if (featuredLink) {
      featuredLink.href =
        "article.html?slug=" +
        encodeURIComponent(featuredArticle.slug);
    }
  }


  // 08 — SEARCH AND FILTERS

  function updateArticles() {

    if (!articleGrid) return;

    const query =
      (searchInput?.value || "").trim().toLowerCase();

    const cards = [
      ...articleGrid.querySelectorAll(".article-card")
    ];

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


  // 09 — LOAD PUBLISHED ARTICLES
  // CLOUDFLARE API

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

      if (!Array.isArray(data.articles)) {
        throw new Error("Invalid article feed");
      }

      const allArticles = data.articles.filter(article =>
        article.slug && article.title
      );


      // GUIDES PAGE
      // BEGINNER GUIDES, TIPS & TRICKS,
      // SECRETS & DISCOVERIES

      if (isGuidesPage) {

        const guideArticles = allArticles.filter(article => {

          const category = categoryFilter(article.category);

          return [
            "guides",
            "tips",
            "secrets"
          ].includes(category);
        });

        guideArticles.forEach(article => {
          articleGrid.appendChild(createArticleCard(article));
        });

        updateArticles();

        console.log(
          "Leonida Whispers: Guides loaded.",
          guideArticles.length
        );

        return;
      }


      // CLASSIFIED PAGE
      // SECRETS, MYSTERIES AND DISCOVERIES

      if (isClassifiedPage) {

        const classifiedArticles = allArticles.filter(article =>
          categoryFilter(article.category) === "secrets"
        );

        classifiedArticles.forEach(article => {
          articleGrid.appendChild(createArticleCard(article));
        });

        updateArticles();

        console.log(
          "Leonida Whispers: Classified files loaded.",
          classifiedArticles.length
        );

        return;
      }


      // HOMEPAGE FEATURED BANNER

      updateFeaturedArticle(allArticles);


      // REMOVE OLD DYNAMIC CARDS

      articleGrid
        .querySelectorAll(".dynamic-article")
        .forEach(card => card.remove());


      // ADD ALL PUBLISHED ARTICLES

      allArticles.forEach(article => {
        articleGrid.appendChild(createArticleCard(article));
      });

      updateArticles();

      console.log(
        "Leonida Whispers: Published articles loaded.",
        allArticles.length
      );

    } catch (error) {

      console.error(
        "Leonida Whispers article feed:",
        error
      );

      if (emptyState) {
        emptyState.hidden = false;
        emptyState.textContent =
          "Unable to load articles right now. Please try again shortly.";
      }
    }
  }


  // 10 — HOMEPAGE FILTER BUTTONS

  filters.forEach(button => {

    button.addEventListener("click", () => {

      filters.forEach(item =>
        item.classList.remove("active")
      );

      button.classList.add("active");

      activeFilter = button.dataset.filter || "all";

      updateArticles();
    });
  });


  // 11 — SEARCH INPUT

  searchInput?.addEventListener("input", updateArticles);


  // 12 — COPYRIGHT YEAR

  const year = document.querySelector("#year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }


  // 13 — INITIALISE WEBSITE

  updateArticles();

  loadPublishedArticles();


  // END LEONIDA WHISPERS FUNCTIONS

});
