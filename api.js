const urlParams = new URLSearchParams(window.location.search);
const animeId = urlParams.get('id');


let savedEpisode = parseInt(localStorage.getItem(`lastEpisode_${animeId}`)) || null;
let currentEpisode = parseInt(urlParams.get('ep')) || savedEpisode || 1;
let activeServerSelectionCode = parseInt(localStorage.getItem('selectedServer')) || 1;


const watchQuery = `
query ($id: Int) {
  Media (id: $id, type: ANIME) {
    title { english romaji }
    episodes
    nextAiringEpisode { episode }
  }
}`;

const watchSearchQuery = `
query ($search: String) {
  Page(page: 1, perPage: 10) {
    media(type: ANIME, search: $search) {
      id
      title { english romaji }
      coverImage { large }
    }
  }
}`;


function executePlayerUrlRefresh() {
  const videoIframe = document.getElementById("videoPlayer");
  document.getElementById("episodeIndicator").textContent = "Episode " + currentEpisode;
  const finalAnimeId = animeId ? animeId : "1";
  const finalEpisode = currentEpisode ? currentEpisode : "1";

  if (activeServerSelectionCode === 1) {
    // MegaPlay Sub
    videoIframe.src = `https://megaplay.buzz/stream/ani/${finalAnimeId}/${finalEpisode}/sub?autostart=true`;
  } else if (activeServerSelectionCode === 2) {
    // MegaPlay Dub
    videoIframe.src = `https://megaplay.buzz/stream/ani/${finalAnimeId}/${finalEpisode}/dub?autoplay=1&muted=0`;
  } else if (activeServerSelectionCode === 3) {
    // VidNest Sub (AnimePahe)
    videoIframe.src = `https://vidnest.fun/animepahe/${finalAnimeId}/${finalEpisode}/sub?autostart=true`;
  } else if (activeServerSelectionCode === 4) {
    // VidNest Dub (AnimePahe)
    videoIframe.src = `https://vidnest.fun/animepahe/${finalAnimeId}/${finalEpisode}/dub?autostart=true`;
  } else if (activeServerSelectionCode === 5) {
    // VidNest Sub (Anime tab)
    videoIframe.src = `https://vidnest.fun/anime/${finalAnimeId}/${finalEpisode}/sub?autostart=true`;
  } else if (activeServerSelectionCode === 6) {
    // VidNest Dub (Anime tab)
    videoIframe.src = `https://vidnest.fun/anime/${finalAnimeId}/${finalEpisode}/dub?autostart=true`;
  }
}



async function checkServerAvailability(serverCode, episodeNum) {
  const finalAnimeId = animeId ? animeId : "1";
  let url;

  if (serverCode === 1) {
    url = `https://megaplay.buzz/stream/ani/${finalAnimeId}/${episodeNum}/sub`;
  } else if (serverCode === 2) {
    url = `https://megaplay.buzz/stream/ani/${finalAnimeId}/${episodeNum}/dub`;
  } else if (serverCode === 3) {
    url = `https://vidnest.fun/animepahe/${finalAnimeId}/${episodeNum}/sub`;
  } else if (serverCode === 4) {
    url = `https://vidnest.fun/animepahe/${finalAnimeId}/${episodeNum}/dub`;
  } else if (serverCode === 5) {
    url = `https://vidnest.fun/anime/${finalAnimeId}/${episodeNum}/sub`;
  } else if (serverCode === 6) {
    url = `https://vidnest.fun/anime/${finalAnimeId}/${episodeNum}/dub`;
  }

  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}


async function ensureServerAvailability() {
  const isAvailable = await checkServerAvailability(activeServerSelectionCode, currentEpisode);
  if (!isAvailable) {
    const serversToTry = [1, 2, 3, 4, 5, 6].filter(s => s !== activeServerSelectionCode);
    for (const serverCode of serversToTry) {
      const available = await checkServerAvailability(serverCode, currentEpisode);
      if (available) {
        activeServerSelectionCode = serverCode;
        localStorage.setItem('selectedServer', serverCode);
        updateServerButtons();
        break;
      }
    }
  } else {
    // Keep the current server highlighted if it's still good
    updateServerButtons();
  }
}


function changeActiveServer(serverNumberCode) {
  if (activeServerSelectionCode === serverNumberCode) return;
  activeServerSelectionCode = serverNumberCode;
  localStorage.setItem('selectedServer', serverNumberCode);
  updateServerButtons();
  executePlayerUrlRefresh();
}

function updateServerButtons() {
  const btn1 = document.getElementById("btn-server1");
  const btn2 = document.getElementById("btn-server2");
  const btn3 = document.getElementById("btn-server3");
  const btn4 = document.getElementById("btn-server4");
  const btn5 = document.getElementById("btn-server5");
  const btn6 = document.getElementById("btn-server6");

  [btn1, btn2, btn3, btn4, btn5, btn6].forEach(btn => btn && btn.classList.remove("active"));

  if (activeServerSelectionCode === 1 && btn1) btn1.classList.add("active");
  else if (activeServerSelectionCode === 2 && btn2) btn2.classList.add("active");
  else if (activeServerSelectionCode === 3 && btn3) btn3.classList.add("active");
  else if (activeServerSelectionCode === 4 && btn4) btn4.classList.add("active");
  else if (activeServerSelectionCode === 5 && btn5) btn5.classList.add("active");
  else if (activeServerSelectionCode === 6 && btn6) btn6.classList.add("active");
}

document.addEventListener("DOMContentLoaded", () => {
  const btn1 = document.getElementById("btn-server1");
  const btn2 = document.getElementById("btn-server2");
  const btn3 = document.getElementById("btn-server3");
  const btn4 = document.getElementById("btn-server4");
  const btn5 = document.getElementById("btn-server5");
  const btn6 = document.getElementById("btn-server6");

  if (btn1) btn1.addEventListener("click", () => changeActiveServer(1));
  if (btn2) btn2.addEventListener("click", () => changeActiveServer(2));
  if (btn3) btn3.addEventListener("click", () => changeActiveServer(3));
  if (btn4) btn4.addEventListener("click", () => changeActiveServer(4));
  if (btn5) btn5.addEventListener("click", () => changeActiveServer(5));
  if (btn6) btn6.addEventListener("click", () => changeActiveServer(6));
});




async function initializeWatchPlayer() {
  const animeTitleHeader = document.getElementById("animeTitleHeader");
  const episodeGrid = document.getElementById("episodeListContainer");
  if (!animeId) {
    animeTitleHeader.textContent = "Error: No Anime Selected";
    return;
  }
  try {
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ query: watchQuery, variables: { id: parseInt(animeId) } })
    });
    const jsonResult = await response.json();
    const anime = jsonResult.data.Media;
    const mainTitle = anime.title.english || anime.title.romaji;

    
    let totalEpisodesCount;
    if (anime.nextAiringEpisode) {
      totalEpisodesCount = anime.nextAiringEpisode.episode - 1;
    } else if (anime.episodes) {
      totalEpisodesCount = anime.episodes;
    } else {
      totalEpisodesCount = 1;
    }

    document.title = `Watching ${mainTitle} Ep ${currentEpisode} - MiraiAnime`;
    animeTitleHeader.textContent = mainTitle;
    document.getElementById("animeDescription").textContent = "Loading stream data and synopsis...";
    document.getElementById("episodeIndicator").textContent = `Episode ${currentEpisode}`;

    await ensureServerAvailability();
    updateServerButtons();
    executePlayerUrlRefresh();

    episodeGrid.innerHTML = "";
    for (let i = 1; i <= totalEpisodesCount; i++) {
      const epBtn = document.createElement("a");
      epBtn.className = "ep-item";
      if (i === currentEpisode) epBtn.classList.add("active");
      epBtn.textContent = `Episode ${i}`;
      epBtn.href = "#";
      epBtn.addEventListener("click", (e) => {
        e.preventDefault();
        currentEpisode = i;
        localStorage.setItem(`lastEpisode_${animeId}`, currentEpisode);
        ensureServerAvailability();
        executePlayerUrlRefresh();
        document.querySelectorAll(".ep-item").forEach(btn => btn.classList.remove("active"));
        epBtn.classList.add("active");
      });
      episodeGrid.appendChild(epBtn);
    }

    
    const videoPlayer = document.getElementById("videoPlayer");
    if (videoPlayer && videoPlayer.tagName.toLowerCase() === "video") {
      videoPlayer.addEventListener("ended", () => {
        if (currentEpisode < totalEpisodesCount) {
          currentEpisode++;
          localStorage.setItem(`lastEpisode_${animeId}`, currentEpisode);
          ensureServerAvailability();
          executePlayerUrlRefresh();
          document.querySelectorAll(".ep-item").forEach(btn => btn.classList.remove("active"));
          const nextBtn = [...document.querySelectorAll(".ep-item")].find(el => el.textContent.includes(currentEpisode));
          if (nextBtn) nextBtn.classList.add("active");
        }
      });
    }

  } catch (error) {
    animeTitleHeader.textContent = "Failed to connect to AniList";
  }
}

initializeWatchPlayer();


async function executeAnimeSearch(keyword) {
  const dropdown = document.getElementById("nav-search-dropdown");
  if (!dropdown) return;
  const trimmedKeyword = (keyword || "").trim();
  if (!trimmedKeyword) {
    dropdown.innerHTML = "";
    dropdown.style.display = "none";
    return;
  }
  try {
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ query: watchSearchQuery, variables: { search: trimmedKeyword } })
    });
    const jsonResult = await response.json();
    const resultsList = jsonResult.data.Page.media || [];
    dropdown.innerHTML = "";
    if (resultsList.length === 0) {
      dropdown.innerHTML = "<div class='dropdown-item'>❌ No anime found</div>";
      dropdown.style.display = "block";
      return;
    }
    resultsList.forEach(anime => {
      const mainTitle = anime.title.english || anime.title.romaji;
      dropdown.insertAdjacentHTML("beforeend", `
        <div class="dropdown-item" 
             style="padding:6px; cursor:pointer; border-bottom:1px solid #334155;"
             onclick="window.location.href='watch.html?id=${anime.id}'">
          ${mainTitle}
        </div>
      `);
    });
    dropdown.style.display = "block";
  } catch (err) {
    dropdown.innerHTML = `<div class='dropdown-item'>Error: ${err.message}</div>`;
    dropdown.style.display = "block";
  }
}

const navSearchInput = document.getElementById("animeSearchBox");
const navSearchButton = document.getElementById("animeSearchBtn");

if (navSearchButton && navSearchInput) {
  navSearchButton.addEventListener("click", () => {
    executeAnimeSearch(navSearchInput.value);
  });

  navSearchInput.addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
      executeAnimeSearch(navSearchInput.value);
    } else {
      
      executeAnimeSearch(navSearchInput.value);
    }
  });
}
