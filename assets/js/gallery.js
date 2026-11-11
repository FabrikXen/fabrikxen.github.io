// Builds the Archive, single work and FabrikXen pages from the JSON files in
// data/. Archive tiles link to a page per work (work.html?id=…); FabrikXen
// posts and a work's photos open in a lightbox with swipeable photos and videos.
// A page opts in with e.g. <div data-gallery="archive"></div>, "work" or "fabrikxen".

const root = document.querySelector("[data-gallery]");

if (root) {
  const kind = root.dataset.gallery;
  const lightbox = createLightbox();

  const file = kind === "fabrikxen" ? "data/fabrikxen.json" : "data/archive.json";
  const render = { archive: renderArchive, work: renderWork, fabrikxen: renderFeed }[kind];

  fetch(file)
    .then((response) => {
      if (!response.ok) throw new Error(`${file}: ${response.status}`);
      return response.json();
    })
    .then((data) => render(validEntries(kind, data), lightbox))
    .catch((error) => {
      console.error(error);
      root.replaceChildren(el("p", "notice", "The gallery could not be loaded."));
    });
}

// Skips entries with missing required fields (and says which in the browser
// console), so one mistake in a JSON file doesn't blank the whole page.
function validEntries(kind, data) {
  const isValid = kind === "fabrikxen"
    ? (post) => post.date && post.folder && Array.isArray(post.media) && post.media.length > 0
    : (work) => work.title && work.year;
  return data.filter((entry, i) => {
    if (isValid(entry)) return true;
    console.warn(`Skipping entry ${i + 1} in data/${kind === "fabrikxen" ? "fabrikxen" : "archive"}.json: missing fields`, entry);
    return false;
  });
}

// ---------- Archive: grouped by year, newest year first ----------

function renderArchive(works) {
  if (works.length === 0) {
    root.replaceChildren(el("p", "notice", "New work coming soon."));
    return;
  }

  const sorted = sortWorks(works);
  const years = [...new Set(sorted.map((work) => work.year))];

  for (const year of years) {
    const section = el("section", "year");
    section.append(el("h2", "year__title", year));

    const grid = el("div", "grid grid--archive");
    for (const work of sorted.filter((w) => w.year === year)) {
      const item = {
        alt: work.title,
        photos: workPhotos(work),
        vimeo: work.vimeo,
        label: workDate(work), // like andygoldsworthystudio.com: only the date under each tile
        film: Boolean(work.vimeo),
        href: `work.html?id=${workId(work)}`,
      };
      grid.append(createTile(item));
    }
    section.append(grid);
    root.append(section);
  }
}

// ---------- Single work page ----------

function renderWork(works, lightbox) {
  const sorted = sortWorks(works);
  const id = new URLSearchParams(location.search).get("id");
  const index = sorted.findIndex((work) => workId(work) === id);

  if (index === -1) {
    const back = el("a", null, "Back to the archive");
    back.href = "archive.html";
    root.replaceChildren(el("p", "notice", "This work could not be found. "), back);
    return;
  }

  const work = sorted[index];
  document.title = `${work.title} — Xenia von Planta`;

  const article = el("article", "work");
  article.append(el("h1", "work__title", work.title));

  if (work.vimeo) {
    const player = el("iframe");
    player.src = vimeoPlayerUrl(work.vimeo);
    player.title = work.title;
    player.allow = "fullscreen; picture-in-picture";
    player.allowFullscreen = true;
    const video = el("div", "work__video");
    video.append(player);
    article.append(video);
  }

  // Every photo whole, in its own shape (never cropped), one below the other.
  // Clicking one opens them all full screen in the lightbox.
  const photos = workPhotos(work);
  if (photos.length > 0 && !(work.vimeo && photos.length === 1)) {
    const item = { alt: work.title, photos, caption: [el("p", null, work.title)] };
    const list = el("div", "work__photos");
    photos.forEach((photo, i) => {
      const button = el("button", "work__photo");
      button.type = "button";
      button.setAttribute("aria-label", `Enlarge ${work.title} (photo ${i + 1})`);
      const img = el("img");
      img.src = photo;
      img.alt = photos.length > 1 ? `${work.title} (photo ${i + 1} of ${photos.length})` : work.title;
      img.loading = i === 0 ? "eager" : "lazy";
      button.append(img);
      button.addEventListener("click", () => lightbox.open(item, i));
      list.append(button);
    });
    article.append(list);
  }

  const text = el("div", "work__text");
  if (work.description) text.append(el("p", null, work.description));
  const details = [work.medium, work.size, work.location, workDate(work)].filter(Boolean).join(" · ");
  if (details) text.append(el("p", "work__details", details));
  if (work.availability) text.append(el("p", "availability", work.availability));
  article.append(text);

  // Previous / next follow the order of the archive page.
  const nav = el("nav", "work__nav");
  nav.setAttribute("aria-label", "More work");
  const newer = sorted[index - 1];
  const older = sorted[index + 1];
  nav.append(
    newer ? workLink(newer, "\u2190 ") : el("span"),
    older ? workLink(older, "", " \u2192") : el("span"),
  );
  article.append(nav);

  root.replaceChildren(article);
}

function workLink(work, before = "", after = "") {
  const link = el("a", null, `${before}${work.title}${after}`);
  link.href = `work.html?id=${workId(work)}`;
  return link;
}

// Newest year first; within a year newest month first, works without a
// month after those with one, then the order of data/archive.json.
function sortWorks(works) {
  return works
    .map((work, i) => ({ work, i }))
    .sort((a, b) => b.work.year - a.work.year || (b.work.month || 0) - (a.work.month || 0) || a.i - b.i)
    .map(({ work }) => work);
}

// "July 2026" when the work has a month (1–12), otherwise just "2026".
function workDate(work) {
  if (!work.month) return String(work.year);
  const month = new Date(2000, work.month - 1, 1).toLocaleDateString("en-GB", { month: "long" });
  return `${month} ${work.year}`;
}

// Each work has its own folder in assets/img/archive/, e.g. 2024_blue-waves/
function workPhotos(work) {
  return (work.photos || []).map((photo) => `assets/img/archive/${work.folder}/${photo}`);
}

// A work's address uses its "id" if given, otherwise its title,
// e.g. "Blue Waves" -> work.html?id=blue-waves
function workId(work) {
  return work.id || work.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ---------- FabrikXen: Instagram-style feed, newest post first ----------

function renderFeed(posts, lightbox) {
  if (posts.length === 0) {
    root.replaceChildren(el("p", "notice", "New pieces coming soon."));
    return;
  }

  const grid = el("div", "grid grid--square");
  for (const post of posts) {
    const date = formatDate(post.date);
    const item = {
      alt: post.caption ? shorten(post.caption, 100) : `FabrikXen, ${date}`,
      photos: post.media.map((file) => `assets/img/fabrikxen/${post.folder}/${file}`),
      showCount: true,
      caption: [
        post.caption && el("p", "lightbox__text", post.caption),
        el("p", "lightbox__date", date),
      ].filter(Boolean),
    };
    grid.append(createTile(item, () => lightbox.open(item)));
  }
  root.append(grid);
}

// "2024-08-07" -> "7 August 2024"
function formatDate(isoDate) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function shorten(text, length) {
  return text.length > length ? `${text.slice(0, length).trim()}…` : text;
}

function isVideoFile(path) {
  return /\.(mp4|mov|webm)$/i.test(path);
}

// ---------- Tiles ----------

// A tile is the image (media) plus, on the archive, the date underneath.
// It is a link when the item has an href, otherwise a button calling onClick.
function createTile(item, onClick) {
  const tile = el(item.href ? "a" : "button", "tile");
  if (item.href) {
    tile.href = item.href;
  } else {
    tile.type = "button";
    tile.addEventListener("click", onClick);
  }

  const media = el("span", "tile__media");
  // A post that starts with a video shows the video's first frame.
  const firstIsVideo = item.photos.length > 0 && isVideoFile(item.photos[0]);
  const img = el(firstIsVideo ? "video" : "img");
  if (firstIsVideo) {
    img.muted = true;
    img.playsInline = true;
    img.preload = "metadata";
    tile.setAttribute("aria-label", item.alt); // a video has no alt text
  } else {
    img.alt = item.alt;
    img.loading = "lazy";
  }
  // If an image is missing, show an empty grey tile instead of a broken image.
  const showMissing = () => {
    img.remove();
    media.classList.add("tile__media--missing");
    if (!item.label) media.append(el("span", null, item.alt));
  };
  img.addEventListener("error", showMissing);
  media.append(img);
  tile.append(media);

  // Films use their own photo as the still if one is given, otherwise Vimeo's thumbnail.
  if (item.photos.length > 0) {
    img.src = firstIsVideo ? `${item.photos[0]}#t=0.1` : item.photos[0];
  } else if (item.vimeo) {
    vimeoThumbnail(item.vimeo).then((url) => (img.src = url)).catch(showMissing);
  } else {
    showMissing();
  }

  // Films in the archive get a small play symbol on their still.
  if (item.film) {
    const play = el("span", "tile__play");
    play.setAttribute("aria-hidden", "true");
    media.append(play);
  }

  const hasVideo = item.photos.some(isVideoFile);
  if (item.showCount && (item.photos.length > 1 || hasVideo)) {
    const badge = el("span", "tile__badge", hasVideo ? "\u25B6" : `1/${item.photos.length}`);
    badge.setAttribute("aria-hidden", "true");
    media.append(badge);
  }

  if (item.label) {
    tile.append(el("span", "tile__label", item.label));
  }

  return tile;
}

// ---------- Lightbox ----------

function createLightbox() {
  const dialog = el("dialog", "lightbox");
  dialog.setAttribute("aria-label", "Image viewer");
  dialog.innerHTML = `
    <button class="lightbox__close" type="button" aria-label="Close">&times;</button>
    <figure class="lightbox__figure">
      <div class="lightbox__stage">
        <img class="lightbox__img" alt="">
        <div class="lightbox__video"></div>
        <button class="lightbox__prev" type="button" aria-label="Previous photo">&lsaquo;</button>
        <button class="lightbox__next" type="button" aria-label="Next photo">&rsaquo;</button>
        <span class="lightbox__count"></span>
      </div>
      <figcaption class="lightbox__caption"></figcaption>
    </figure>`;
  document.body.append(dialog);

  const img = dialog.querySelector(".lightbox__img");
  const prev = dialog.querySelector(".lightbox__prev");
  const next = dialog.querySelector(".lightbox__next");
  const count = dialog.querySelector(".lightbox__count");
  const caption = dialog.querySelector(".lightbox__caption");
  const video = dialog.querySelector(".lightbox__video");

  let item = null;
  let index = 0;

  function show(i) {
    const total = item.photos.length;
    index = (i + total) % total;
    const file = item.photos[index];

    if (isVideoFile(file)) {
      img.hidden = true;
      img.removeAttribute("src");
      const player = el("video");
      player.src = file;
      player.controls = true;
      player.playsInline = true;
      video.replaceChildren(player);
    } else {
      video.replaceChildren();
      img.hidden = false;
      img.src = file;
      img.alt = total > 1 ? `${item.alt} (photo ${index + 1} of ${total})` : item.alt;
    }
    count.textContent = total > 1 ? `${index + 1} / ${total}` : "";
  }

  function open(newItem, start = 0) {
    item = newItem;
    caption.replaceChildren(...item.caption);
    const multiple = item.photos.length > 1;
    prev.hidden = !multiple;
    next.hidden = !multiple;
    show(start);
    dialog.showModal();
  }

  // Removing the player stops a video when the lightbox closes.
  dialog.addEventListener("close", () => video.replaceChildren());

  prev.addEventListener("click", () => show(index - 1));
  next.addEventListener("click", () => show(index + 1));
  dialog.querySelector(".lightbox__close").addEventListener("click", () => dialog.close());

  // Clicking the dark area around the picture closes it.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener("keydown", (event) => {
    // Arrow keys on a video's controls should seek, not change photo.
    if (item.photos.length < 2 || event.target.tagName === "VIDEO") return;
    if (event.key === "ArrowLeft") show(index - 1);
    if (event.key === "ArrowRight") show(index + 1);
  });

  // Swipe left/right on phones.
  let touchStartX = null;
  dialog.addEventListener("touchstart", (event) => {
    touchStartX = event.touches[0].clientX;
  }, { passive: true });
  dialog.addEventListener("touchend", (event) => {
    if (touchStartX === null || item.photos.length < 2) return;
    const distance = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(distance) > 40) show(distance < 0 ? index + 1 : index - 1);
    touchStartX = null;
  });

  return { open };
}

// ---------- Vimeo ----------

// Accepts links like https://vimeo.com/123456789, the vimeo.com/manage/videos/…
// link from your account, and for unlisted videos https://vimeo.com/123456789/abcdef1234.
function vimeoPlayerUrl(link) {
  const match = link.match(/vimeo\.com\/(?:manage\/videos\/|video\/)?(\d+)(?:\/([0-9a-f]+))?/);
  if (!match) return "about:blank";
  const [, id, hash] = match;
  return `https://player.vimeo.com/video/${id}?dnt=1${hash ? `&h=${hash}` : ""}`;
}

function vimeoThumbnail(link) {
  const publicLink = link.replace("/manage/videos/", "/");
  return fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(publicLink)}&width=1280`)
    .then((response) => {
      if (!response.ok) throw new Error(`Vimeo thumbnail: ${response.status}`);
      return response.json();
    })
    .then((info) => info.thumbnail_url);
}

// ---------- Helpers ----------

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}
