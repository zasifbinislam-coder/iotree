# Deployment notes

This project is a 100% static site. It can run in three places:

1. **GitHub Pages** (live, default) — https://zasifbinislam-coder.github.io/iotree/
2. **Custom domain** — point a domain you own at the Pages host
3. **As a desktop app** — wrap with Electron (see `desktop/README.md`)

## Custom domain (GitHub Pages)

Once you own a domain — say `plantsim.zasbiz.dev` — pointing it at this site
takes about 10 minutes plus DNS propagation.

### 1. Add DNS records at your registrar

For an **apex** domain (`plantsim.dev`), create FOUR `A` records pointing at
GitHub Pages:

```
A    @    185.199.108.153
A    @    185.199.109.153
A    @    185.199.110.153
A    @    185.199.111.153
```

For a **subdomain** (`plantsim.zasbiz.dev`), use a single `CNAME`:

```
CNAME    plantsim    zasifbinislam-coder.github.io.
```

(Note the trailing dot.)

### 2. Tell GitHub about your domain

From the repo root, with the GitHub CLI signed in:

```sh
echo "plantsim.zasbiz.dev" > CNAME
git add CNAME
git commit -m "Add custom domain"
git push
```

GitHub Pages picks up the `CNAME` file automatically and starts serving
your site at the new domain (usually within a minute).

### 3. Enable HTTPS

In **Settings → Pages** on github.com, tick **Enforce HTTPS** once GitHub
has provisioned a certificate (Let's Encrypt, takes ~10 min after DNS
propagates). Your site is then live at `https://plantsim.zasbiz.dev/`.

## Cloudflare Pages (alternative)

If GitHub Pages feels slow in your region, mirror to Cloudflare for global
edge caching:

1. dash.cloudflare.com → **Pages → Create application → Connect to Git**
2. Pick the `iotree` repo, accept defaults (build command empty, output dir
   `/`).
3. Cloudflare deploys in ~30 s and gives you a `*.pages.dev` URL.

Then in Cloudflare DNS, you can `CNAME` your apex/subdomain at the
`*.pages.dev` host instead of the GitHub IPs.

## Local development

```sh
# from the iotree/ folder
python -m http.server 8000
# then visit http://localhost:8000/
```

Or `npx serve` if you prefer Node.

## What's checked in

- `index.html` — landing page hub
- `plant-sim-ide/` — the browser IDE (Monaco + PWA + service worker)
- `plant-simulator.html` — standalone animation
- `plant-wiring-diagram.html` — wiring guide + parts list
- `plant_communicator/` — production Arduino sketch
- `wokwi/` — Wokwi simulator project files
- `desktop/` — Electron wrapper config (no `node_modules` in repo)

## What's not

- `node_modules/` — `cd desktop && npm install` to fetch
- `dist/` — built distributables, generated on demand
- Any secrets or API keys — bot tokens stay in your own copy of the sketch
