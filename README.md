# THE HOUSE — Om Kashyap

A pixel-art casino floating in orbit. This is my portfolio.

Plain HTML/CSS/JS with no build step and no dependencies.

## Edit content
Everything lives in **`data.js`**:
- `SITE.resumeUrl`: your resume link (the chip buttons + receipt)
- `SITE.email`, `SITE.linkedin`: these stay hidden until you fill them in
- `PROJECTS`: the cards on the table (4–6 recommended)

The About text and house rules are in `index.html`. Search for `Placeholder`.

## Run locally
```bash
python3 -m http.server 8080
```

## Deploy (GitHub Pages)
Settings → Pages → Source: **Deploy from a branch** → `main` / `(root)` → Save.
Your site goes live at `https://ketchup-69.github.io/PerPortfolio/`.

## Files
- `index.html`: structure
- `styles.css`: design system and layout
- `main.js`: pixel scene (canvas), parallax, spotlight table and synthesized sound
- `data.js`: your content
