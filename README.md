# Memory

A classic **flip-and-match memory card game** in the browser. The frontend is plain HTML, CSS, and JavaScript; a small Node.js server serves the static files from the `files` folder.

## Run locally

Requires **Node.js** (v18+ recommended).

```bash
npm start
```

Then open **http://localhost:3011** in your browser.

The server maps `/` to `files/index.html` and serves other assets (CSS, JS, SVG) with sensible `Content-Type` headers.
