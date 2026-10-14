# Adding new work

Test locally with Go Live (opening the HTML file directly won't load the galleries).

If a page says "The gallery could not be loaded", the JSON file has a
typo (usually a missing or extra comma): paste it into jsonlint.com to find it.

## Prepare photos first

Shrink photos and remove their hidden data (phone photos can contain the
GPS location where they were taken):

```sh
magick mogrify -strip -resize '1600x1600>' assets/img/fabrikxen/2026-11-03_blue-waves/*.jpg
```

(Or export from Photos with "Include location" switched off.)

## New FabrikXen post

Works like posting on Instagram: newest post at the top.

1. Make a folder: date, underscore, a short name:
   `assets/img/fabrikxen/2026-11-03_blue-waves/` (lowercase, dashes, no people's names).
2. Put the photos and/or videos (`.mp4`) in it, named `1.jpg`, `2.jpg`, …
   The first one is shown in the grid.
3. Add an entry at the **top** of `data/fabrikxen.json`:

```json
  {
    "date": "2026-11-03",
    "caption": "Blue Waves. Painted for Anna.",
    "folder": "2026-11-03_blue-waves",
    "media": ["1.jpg", "2.jpg", "3.mp4"]
  },
```

Mind the commas: every entry except the last one ends with `},`.

## New work in the archive (artwork or film)

1. Make a folder: `assets/img/archive/<year>_<title>/`
   (lowercase, dashes, e.g. `2024_blue-waves`) and put the photos in it,
   named `1.jpg`, `2.jpg`, …
2. Add an entry anywhere in `data/archive.json`:

```json
  {
    "title": "Blue Waves",
    "year": 2024,
    "month": 5,
    "folder": "2024_blue-waves",
    "medium": "Acrylic on canvas",
    "size": "60 × 80 cm",
    "location": "Caracas, Venezuela",
    "description": "One or two sentences.",
    "availability": "Available",
    "photos": ["1.jpg", "2.jpg"]
  },
```

The page sorts works by year, then by month (newest first); works without a
month come after those with one, in the order of the file. `"month"` is
optional (1 = January … 12 = December). Leave any other field as `""` to hide it.

The first photo is the one in the grid; all photos show on the work's own page
(`work.html?id=blue-waves`, made from the title automatically). Two works with
the same title need an `"id"` each, e.g. `"id": "untitled-2024"`.

For a **film**, use a Vimeo link instead of photos:

```json
  {
    "title": "Title",
    "year": 2026,
    "medium": "Video, 4 min",
    "size": "",
    "description": "",
    "availability": "",
    "vimeo": "https://vimeo.com/123456789"
  },
```

The tile uses Vimeo's thumbnail. To pick your own still, add
`"folder": "2022_amoeba"` and `"photos": ["still.jpg"]`. A single photo on a
film is only used as the still; it isn't shown again on the film's page.

## Home page (featured work or poster)

The home page shows one thing. To swap it, edit the "Featured" block in
`index.html`: the link, the image, its description and the two lines of text.
The steps are in the comment above the block. A recent work can use its photo
from `assets/img/archive/`; for a poster, create `assets/img/home/` and put it there.

## Header and footer

The nav and the social links are copied in all four pages (`index.html`,
`fabrikxen.html`, `archive.html`, `work.html`): change them in each one.

## Publishing

Commit, then `git push origin main`. GitHub Pages updates the site within a
minute or two.

Commits from this folder use GitHub's private address
`113900829+FabrikXen@users.noreply.github.com` instead of a personal email
(set with `git config user.email` inside this repo). Check it with:

```sh
git config user.email
```

On GitHub, Settings → Emails has "Keep my email addresses private" and
"Block command line pushes that expose my email" switched on, so a push
with a personal address is refused.
