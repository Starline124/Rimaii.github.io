const homepageQuery = `
query {
  recommended: Page (page: 1, perPage: 15) { 
    media (type: ANIME, sort: SCORE_DESC) {
      id
      title { english romaji }
      coverImage { large }
      episodes
      format
      nextAiringEpisode { episode }
    }
  }
  trending: Page (page: 1, perPage: 50) { 
    media (type: ANIME, sort: TRENDING_DESC) {
      id
      title { english romaji }
      coverImage { large }
      bannerImage
      genres
      episodes
      format
      nextAiringEpisode { episode }
    }
  }
}`;

function generateCardHtml(anime) {
    const mainTitle = anime.title.english || anime.title.romaji;
    const posterUrl = anime.coverImage.large;
    const animeFormat = anime.format || "TV";
    
    let totalEpisodes = "?";

// If AniList knows the next airing episode, only show up to the last aired one
if (anime.nextAiringEpisode) {
    totalEpisodes = anime.nextAiringEpisode.episode - 1;
} else if (anime.episodes) {
    // If the show is complete, AniList sets episodes to the full count
    totalEpisodes = anime.episodes;
} else {
    totalEpisodes = 1; // fallback
}


    return `
  <div class="anime-card">
  <div class="poster-container">
    <a href="anime-details.html?id=${anime.id}" class="poster-link">
      <img src="${posterUrl}" alt="${mainTitle}" class="poster-image" loading="lazy">
    </a>
    <span class="format-badge">${animeFormat}</span>
    <span class="play-hint"><i class="fas fa-play"></i></span>
    <div class="info-overlay">
      <span class="ep-count">
        <i class="fas fa-layer-group"></i> ${totalEpisodes} EP
      </span>
    </div>
  </div>
  <h4 class="card-title">
    <a href="anime-details.html?id=${anime.id}" title="${mainTitle}">
      ${mainTitle}
    </a>
  </h4>
</div>`;
}

let trendingAnimeList = [];
let trendingPage = 1;
const trendingPageSize = 16;

function renderTrendingPage(page = 1) {
    const trendingContainer = document.getElementById("trending-container");
    const prevBtn = document.getElementById("trending-prev-btn");
    const nextBtn = document.getElementById("trending-next-btn");
    const pageIndicator = document.getElementById("trending-page-indicator");
    if (!trendingContainer || !prevBtn || !nextBtn || !pageIndicator) return;

    const pageCount = Math.max(1, Math.ceil(trendingAnimeList.length / trendingPageSize));
    trendingPage = Math.min(Math.max(page, 1), pageCount);
    const startIndex = (trendingPage - 1) * trendingPageSize;
    const pageItems = trendingAnimeList.slice(startIndex, startIndex + trendingPageSize);

    trendingContainer.innerHTML = "";
    if (pageItems.length === 0) {
        trendingContainer.innerHTML = "<p style='padding-left: 5px; color: #a48cff; width: 100%; grid-column: 1 / -1;'>No trending anime available.</p>";
    } else {
        trendingContainer.insertAdjacentHTML("beforeend", pageItems.map(anime => generateCardHtml(anime)).join(""));
    }

    pageIndicator.textContent = `Page ${trendingPage} of ${pageCount}`;
    prevBtn.disabled = trendingPage <= 1;
    nextBtn.disabled = trendingPage >= pageCount;
}

function buildHeroSpotlight(anime) {
    const heroSection = document.getElementById("heroSpotlight");
    if (!heroSection || !anime) return;

    const mainTitle = anime.title.english || anime.title.romaji;
    const backdrop = anime.bannerImage || anime.coverImage.large;
    const animeFormat = anime.format || "TV";

    let totalEpisodes = "?";
    if (anime.nextAiringEpisode) {
        totalEpisodes = anime.nextAiringEpisode.episode - 1;
    } else if (anime.episodes) {
        totalEpisodes = anime.episodes;
    } else {
        totalEpisodes = 1;
    }

    const genreChips = (anime.genres || [])
        .slice(0, 3)
        .map(g => `<span class="hero-meta-chip">${g}</span>`)
        .join("");

    document.getElementById("heroBackdrop").style.backgroundImage = `url('${backdrop}')`;
    document.getElementById("heroTitle").textContent = mainTitle;
    document.getElementById("heroMeta").innerHTML = `
        <span class="hero-meta-chip hero-meta-chip-solid">${animeFormat}</span>
        <span class="hero-meta-chip">${totalEpisodes} EP</span>
        ${genreChips}
    `;
    document.getElementById("heroWatchBtn").href = `watch.html?id=${anime.id}`;
    document.getElementById("heroInfoBtn").href = `anime-details.html?id=${anime.id}`;
    heroSection.classList.add("is-loaded");
}


async function loadHomepageDatabase() {
    const recommendedContainer = document.getElementById("recommended-container");
    const trendingContainer = document.getElementById("trending-container");
    
    if(!recommendedContainer || !trendingContainer) return;

    recommendedContainer.innerHTML = "<p style='padding-left: 5px; color: #a48cff; width: 100%; grid-column: 1 / -1;'>⏳ Loading recommendations...</p>";
    trendingContainer.innerHTML = "<p style='padding-left: 5px; color: #a48cff; width: 100%; grid-column: 1 / -1;'>⏳ Loading trending database...</p>";

    try {
        const response = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ query: homepageQuery })
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        const jsonResponse = await response.json();
        
        const recommendedList = jsonResponse.data.recommended.media;
        const trendingList = jsonResponse.data.trending.media;

        recommendedContainer.innerHTML = "";
        trendingContainer.innerHTML = "";

        const recommendedMarkup = recommendedList.map(anime => generateCardHtml(anime)).join("");
        recommendedContainer.insertAdjacentHTML("beforeend", recommendedMarkup + recommendedMarkup);

        trendingAnimeList = trendingList;
        renderTrendingPage(1);

        if (trendingList.length > 0) {
            const spotlightPool = trendingList.slice(0, 5);
            const spotlightPick = spotlightPool[Math.floor(Math.random() * spotlightPool.length)];
            buildHeroSpotlight(spotlightPick);
        }

    } catch (error) {
        const errorTemplate = `<p style="color: #ff3e6c; padding-left: 5px; grid-column: 1 / -1;">Error loading row contents: ${error.message}</p>`;
        recommendedContainer.innerHTML = errorTemplate;
        trendingContainer.innerHTML = errorTemplate;
        const heroSection = document.getElementById("heroSpotlight");
        if (heroSection) heroSection.style.display = "none";
    }
}

const searchInput = document.getElementById("animeSearchBox");
const searchButton = document.getElementById("animeSearchBtn");

function handleSearchRedirect() {
    if (!searchInput) return;
    const keyword = searchInput.value.trim();
    if (keyword) {
        window.location.href = `all-anime-index.html?search=${encodeURIComponent(keyword)}`;
    }
}

if (searchButton) {
    searchButton.addEventListener("click", handleSearchRedirect);
}

if (searchInput) {
    searchInput.addEventListener("keyup", (event) => {
        if (event.key === "Enter") {
            handleSearchRedirect();
        }
    });
}

document.querySelectorAll(".genre-link").forEach(button => {
    button.addEventListener("click", () => {
        window.location.href = `all-anime-index.html?genre=${encodeURIComponent(button.dataset.genre)}`;
    });
});

document.querySelectorAll(".types-link").forEach(button => {
    button.addEventListener("click", () => {
        window.location.href = `all-anime-index.html?type=${encodeURIComponent(button.dataset.type)}`;
    });
});

document.querySelectorAll(".dropdown-toggle").forEach(toggle => {
    toggle.addEventListener("click", (event) => {
        event.preventDefault();
        const parentDropdown = toggle.closest(".nav-dropdown");
        if (!parentDropdown) return;
        
        parentDropdown.classList.toggle("open");
        const isExpanded = parentDropdown.classList.contains("open");
        toggle.setAttribute("aria-expanded", isExpanded ? "true" : "false");
    });
});

document.addEventListener("click", (event) => {
    document.querySelectorAll(".nav-dropdown.open").forEach(dropdown => {
        if (!dropdown.contains(event.target)) {
            dropdown.classList.remove("open");
            const toggle = dropdown.querySelector(".dropdown-toggle");
            if (toggle) toggle.setAttribute("aria-expanded", "false");
        }
    });
});

const trendingPrevButton = document.getElementById("trending-prev-btn");
const trendingNextButton = document.getElementById("trending-next-btn");
if (trendingPrevButton && trendingNextButton) {
    trendingPrevButton.addEventListener("click", () => renderTrendingPage(trendingPage - 1));
    trendingNextButton.addEventListener("click", () => renderTrendingPage(trendingPage + 1));
}

loadHomepageDatabase();

const video = document.getElementById('hero-video');
const image = document.getElementById('hero-image');

if (video && image) {
    video.addEventListener('ended', function() {
        video.classList.add('fade-out');
        image.classList.add('fade-in');
        setTimeout(() => {
            video.style.display = 'none';
        }, 1000); 
    });
}

function injectSafeTutorialModal() {
    if (localStorage.getItem("MTCH Enterprise_seen_guide_v2")) return;

    // This tutorial only makes sense on the homepage (search bar, genre filters,
    // clicking into cards) — don't show it on watch/details/browse pages where
    // it would just sit on top of the page blocking clicks with irrelevant copy.
    if (!document.getElementById("heroSpotlight")) return;

    const cssStyle = document.createElement("style");
    cssStyle.textContent = `
        .m-modal-overlay {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(5px);
            z-index: 9999999; display: flex; align-items: center; justify-content: center;
            opacity: 0; transition: opacity 0.4s ease; font-family: 'Poppins', sans-serif;
            padding: 20px; box-sizing: border-box;
        }
        .m-modal-card {
            background: #1c1229; border: 1px solid #3a2c50; color: #fff;
            padding: 30px; border-radius: 12px; max-width: 460px; width: 100%;
            box-shadow: 0 15px 35px rgba(0,0,0,0.7); transform: translateY(-20px);
            transition: transform 0.4s ease; position: relative; box-sizing: border-box;
        }
        .m-modal-close {
            position: absolute; top: 15px; right: 20px; color: #a89bc2;
            font-size: 26px; cursor: pointer; transition: color 0.2s;
        }
        .m-modal-close:hover { color: #e74c3c; }
        .m-title { color: #a48cff; font-size: 22px; margin: 0 0 5px 0; font-weight: 600; }
        .m-subtitle { color: #a89bc2; font-size: 13px; margin: 0 0 20px 0; line-height: 1.4; }
        .m-step { display: flex; align-items: flex-start; gap: 15px; margin-bottom: 20px; }
        .m-icon { background: rgba(164, 140, 255, 0.1); color: #a48cff; min-width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; }
        .m-text { font-size: 13.5px; color: #cbc3db; line-height: 1.5; }
        .m-text strong { color: #fff; display: block; margin-bottom: 2px; }
        .m-btn { width: 100%; background: #7c4dff; color: #fff; border: none; padding: 12px; font-size: 14px; font-weight: bold; border-radius: 6px; cursor: pointer; transition: background 0.2s; margin-top: 10px; }
        .m-btn:hover { background: #6738e0; }
    `;
    document.head.appendChild(cssStyle);

    const overlay = document.createElement("div");
    overlay.className = "m-modal-overlay";
    overlay.innerHTML = `
        <div class="m-modal-card">
            <span class="m-modal-close">&times;</span>
            <h3 class="m-title"><i class="fas fa-rocket"></i> Welcome to MTCH EnterpriseAnime!</h3>
            <p class="m-subtitle">Let's show you how to navigate our player system smoothly.</p>
            <div class="m-step">
                <div class="m-icon"><i class="fas fa-search"></i></div>
                <div class="m-text"><strong>Instant Smart Search</strong>Type any name in the bar up top to pull titles instantly.</div>
            </div>
            <div class="m-step">
                <div class="m-icon"><i class="fas fa-th-list"></i></div>
                <div class="m-text"><strong>Categorized Filters</strong>Browse using the "Genre" or "Types" tabs to sort lists immediately.</div>
            </div>
            <div class="m-step">
                <div class="m-icon"><i class="fas fa-play"></i></div>
                <div class="m-text"><strong>Seamless Stream Play</strong>Click into any card item wrapper details and press "Play Now".</div>
            </div>
            <button class="m-btn">Got it, let's explore!</button>
        </div>
    `;

    document.body.appendChild(overlay);

    setTimeout(() => {
        overlay.style.opacity = "1";
        overlay.querySelector(".m-modal-card").style.transform = "translateY(0)";
    }, 800);

    const closeGuide = () => {
        overlay.style.opacity = "0";
        overlay.querySelector(".m-modal-card").style.transform = "translateY(-20px)";
        setTimeout(() => {
            overlay.remove();
            localStorage.setItem("MTCH Enterprise_seen_guide_v2", "true");
        }, 400);
    };

    overlay.querySelector(".m-modal-close").addEventListener("click", closeGuide);
    overlay.querySelector(".m-btn").addEventListener("click", closeGuide);
    // Safety net: clicking the dimmed backdrop itself should also dismiss the
    // guide, so it can never get stuck covering the page with no obvious way out.
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeGuide();
    });
}

document.addEventListener("DOMContentLoaded", () => {
    injectSafeTutorialModal();

    const navMenu = document.querySelector(".menu");
    if (navMenu) {
        const existingAllAnimeLink = Array.from(navMenu.querySelectorAll("a")).find(a => a.textContent.includes("All Anime"));
        if (!existingAllAnimeLink) {
            const allAnimeBtn = document.createElement("li");
            allAnimeBtn.innerHTML = `<a href="all-anime-index.html">All Anime</a>`;
            const homeLink = navMenu.querySelector("li");
            if (homeLink) {
                homeLink.insertAdjacentElement('afterend', allAnimeBtn);
            } else {
                navMenu.prepend(allAnimeBtn);
            }
        }
    }

    const allAnimeContainer = document.getElementById("all-anime-container");
    if (allAnimeContainer) {
        let currentPage = 1;
        
        const pageUrlParams = new URLSearchParams(window.location.search);
        let requestedGenre = pageUrlParams.get('genre') || "";
        let requestedType = pageUrlParams.get('type') || "";
        let requestedSearch = pageUrlParams.get('search') || "";
        let requestedYear = "";
        let requestedStatus = "";
        let requestedSeason = "";

        if(requestedGenre) document.getElementById("filter-genre").value = requestedGenre;
        if(requestedType) document.getElementById("filter-type").value = requestedType;

        const titleElement = document.querySelector("#main-homepage-content h2");
        function updateTitleText() {
            if (!titleElement) return;
            if (requestedSearch) {
                titleElement.innerHTML = `<i class="fas fa-search"></i> Search Results for "${requestedSearch}"`;
            } else if (requestedGenre || requestedType || requestedYear || requestedStatus || requestedSeason) {
                titleElement.innerHTML = `<i class="fas fa-filter"></i> Filtered Anime Index`;
            } else {
                titleElement.innerHTML = `<i class="fas fa-th-list"></i> All Anime`;
            }
        }

        async function loadAllAnimePaginated(page) {
            allAnimeContainer.innerHTML = `<p style="color: #a48cff; width: 100%; text-align: center; grid-column: 1 / -1;">Loading...</p>`;
            
            const query = `
            query ($page: Int, $genre: String, $format: MediaFormat, $search: String, $seasonYear: Int, $status: MediaStatus, $season: MediaSeason) { 
                Page (page: $page, perPage: 21) { 
                    media (type: ANIME, sort: POPULARITY_DESC, genre: $genre, format: $format, search: $search, seasonYear: $seasonYear, status: $status, season: $season) { 
                        id 
                        title { english romaji } 
                        coverImage { large } 
                        episodes 
                        format 
                    } 
                } 
            }`;
            
            const variables = { page: page };
            if (requestedGenre) variables.genre = requestedGenre;
            if (requestedType) variables.format = requestedType;
            if (requestedSearch) variables.search = requestedSearch;
            if (requestedYear && !isNaN(requestedYear)) variables.seasonYear = parseInt(requestedYear);
            if (requestedStatus) variables.status = requestedStatus;
            if (requestedSeason) variables.season = requestedSeason;

            try {
                const response = await fetch("https://graphql.anilist.co", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ query, variables })
                });
                const json = await response.json();
                allAnimeContainer.innerHTML = "";
                
                const results = json.data.Page.media;
                if (!results || results.length === 0) {
                    allAnimeContainer.innerHTML = `<p style="color: #ff3e6c; width: 100%; text-align: center; grid-column: 1 / -1;">No anime found matching your criteria.</p>`;
                    return;
                }

                results.forEach(anime => {
                    allAnimeContainer.insertAdjacentHTML("beforeend", generateCardHtml(anime));
                });
                document.getElementById("page-indicator").textContent = `Page ${page}`;
                updateTitleText();
            } catch (err) {
                allAnimeContainer.innerHTML = `<p style="color: #ff3e6c; grid-column: 1 / -1;">Error loading content.</p>`;
            }
        }

        const applyFilters = () => {
            requestedYear = document.getElementById("filter-year").value;
            requestedGenre = document.getElementById("filter-genre").value;
            requestedType = document.getElementById("filter-type").value;
            requestedStatus = document.getElementById("filter-status").value;
            requestedSeason = document.getElementById("filter-season").value;
            requestedSearch = ""; 
            currentPage = 1;
            loadAllAnimePaginated(currentPage);
        };

        document.getElementById("filter-year").addEventListener("change", applyFilters);
        document.getElementById("filter-genre").addEventListener("change", applyFilters);
        document.getElementById("filter-type").addEventListener("change", applyFilters);
        document.getElementById("filter-status").addEventListener("change", applyFilters);
        document.getElementById("filter-season").addEventListener("change", applyFilters);

        const prevBtn = document.getElementById("prev-page");
        const nextBtn = document.getElementById("next-page");

        if(prevBtn) {
            prevBtn.addEventListener("click", () => {
                if (currentPage > 1) {
                    currentPage--;
                    loadAllAnimePaginated(currentPage);
                }
            });
        }

        if(nextBtn) {
            nextBtn.addEventListener("click", () => {
                currentPage++;
                loadAllAnimePaginated(currentPage);
            });
        }

        loadAllAnimePaginated(currentPage);
    }
});