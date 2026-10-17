# स्वयंघोषणापत्र तयार करा

Static web app that generates the चतु:सिमा + पिक पेरणी self-declaration PDF from a form.

## Structure
```
index.html                 page markup + form
css/style.css              all styles (+ @font-face rules)
js/app.js                  app logic
fonts/*.woff2              Hind, Mukta, Noto Serif Devanagari (self-hosted)
vendor/html2canvas.min.js  html2canvas 1.4.1 (loaded on demand)
vendor/jspdf.umd.min.js    jsPDF 2.5.1 (loaded on demand)
```

## Deploy on GitHub Pages
1. Push this folder's contents to the root of a repository.
2. Settings → Pages → Source: "Deploy from a branch" → `main` / `(root)` → Save.
3. Site goes live at `https://<user>.github.io/<repo>/`.

All paths are relative, so it works in a project sub-path. Opening `index.html`
directly from disk (file://) also works.
