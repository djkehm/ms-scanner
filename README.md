<p align="center">
  <img src="public/icon.svg" width="64" height="64" alt="MS Scanner" />
</p>

<h1 align="center">MS Scanner</h1>

<p align="center">
  A fast, open-source Minecraft server scanner for Java &amp; Bedrock editions.<br/>
  Check live status, players, MOTD, latency, and more — without opening the game.
</p>

<p align="center">
  <a href="https://ms-scanner.vercel.app">Live Demo</a> · <a href="https://github.com/ItsAzni/ms-scanner/issues">Report Bug</a> · <a href="https://github.com/ItsAzni/ms-scanner/issues">Request Feature</a>
</p>

---

## Features

- **Java & Bedrock** — Full protocol support for both editions
- **Multi-port scanning** — Scan single ports, comma-separated lists, or ranges (e.g. `25560-25570`)
- **Concurrent workers** — Configurable thread count for parallel scanning
- **Server details** — MOTD, version, protocol, player list, favicon, game mode
- **Favorites** — Bookmark servers and access them across sessions
- **Scan history** — Persistent local history with pagination
- **Dynamic OpenGraph** — Auto-generated preview images per server for link sharing

## Tech Stack

| Layer        | Technology                                                                                          |
| ------------ | --------------------------------------------------------------------------------------------------- |
| Framework    | [React Router v7](https://reactrouter.com) (SSR)                                                    |
| UI           | [HeroUI v3 Beta](https://v3.heroui.com) + [Tailwind CSS v4](https://tailwindcss.com)                |
| State        | [Zustand](https://zustand.docs.pmnd.rs) with localStorage persistence                               |
| Server pings | [@minescope/mineping](https://github.com/minescope/mineping)                                        |
| OG images    | [Satori](https://github.com/vercel/satori) + [resvg-js](https://github.com/nicolo-ribaudo/resvg-js) |
| Icons        | [Lucide React](https://lucide.dev)                                                                  |
| Deploy       | [Vercel](https://vercel.com) / Docker                                                               |

## Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **pnpm** (recommended) or npm

### Install

```bash
git clone https://github.com/ItsAzni/ms-scanner.git
cd ms-scanner
pnpm install
```

### Configure

Copy the example env file and set your public URL:

```bash
cp .env.example .env
```

```env
VITE_PUBLIC_URL=http://localhost:5173
```

> On production, set `VITE_PUBLIC_URL` to your deployed domain (e.g. `https://ms-scanner.vercel.app`).

### Development

```bash
pnpm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Production Build

```bash
pnpm run build
pnpm run start
```

### Docker

```bash
docker build -t ms-scanner .
docker run -p 3000:3000 ms-scanner
```

## Project Structure

```
app/
├── components/
│   ├── logo.tsx            # Animated SVG logo
│   ├── server-card.tsx     # Server result card + skeleton
│   └── server-modal.tsx    # Server detail overlay
├── routes/
│   ├── layout.tsx          # Root layout with nav + modal
│   ├── home.tsx            # Scanner page with stats
│   ├── favorites.tsx       # Bookmarked servers
│   ├── history.tsx         # Scan history with export
│   ├── settings.tsx        # Timeout, concurrency, data mgmt
│   ├── api.scan.ts         # POST /api/scan — server ping endpoint
│   └── api.og.tsx          # GET /api/og — dynamic OG image
├── store.ts                # Zustand store (favorites, scans, settings)
├── root.tsx                # HTML shell, fonts, meta
└── app.css                 # Tailwind v4 entry
```

## API

### `POST /api/scan`

Ping a Minecraft server and return its status.

**Body:**

```json
{
  "ip": "mc.hypixel.net",
  "port": 25565,
  "type": "java",
  "timeout": 5000
}
```

**Response (online):**

```json
{
  "ip": "mc.hypixel.net",
  "port": 25565,
  "type": "java",
  "online": true,
  "motd": "Hypixel Network",
  "version": "1.8-1.21",
  "playersOnline": 42000,
  "playersMax": 200000,
  "latency": 128,
  "scannedAt": 1772752012918
}
```

### `GET /api/og?server=ip:port`

Returns a 1200×630 PNG OpenGraph image with server status. Used for social media link previews.

## Environment Variables

| Variable          | Description                       | Default                         |
| ----------------- | --------------------------------- | ------------------------------- |
| `VITE_PUBLIC_URL` | Base URL for OpenGraph image URLs | `https://ms-scanner.vercel.app` |

## License

[MIT](LICENSE)
