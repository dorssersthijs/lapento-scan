# Lapento Humanoid Readiness Scan

Mobile-first webapp voor in-person bedrijfsbezoeken. Inventariseer kansen voor humanoids en automatisering, exporteer als Word-rapport.

**Live deployment:** Railway (€5/mnd hobby plan) + Anthropic API (pay-per-use)

---

## Wat zit erin

- **Frontend** (Vite + React + Tailwind) — single-page app, mobile-first, PWA-installeerbaar op iPhone
- **Backend** (Express) — API-proxy naar Anthropic (zodat je API-key veilig server-side blijft)
- **Lokale opslag** via `localStorage` — werkt offline, blijft staan op je iPhone
- **Web Share API** — direct mailen vanaf iPhone met Word-bijlage automatisch erbij
- **AI-analyse** via Claude (Sonnet 4) — humanoid readiness scoring + actie-tips

---

## Snelstart (lokaal testen)

```bash
# 1. Installeer dependencies
npm install

# 2. Maak .env bestand aan met je API key
cp .env.example .env
# bewerk .env en zet je ANTHROPIC_API_KEY

# 3. Run frontend + backend tegelijk
# Terminal 1:
node server.js

# Terminal 2:
npm run dev

# Open http://localhost:5173
```

---

## Deploy naar Railway

### Eenmalige setup

1. **Anthropic API key aanmaken**
   - Ga naar https://console.anthropic.com
   - Login of maak account
   - Settings > API Keys > Create Key
   - Kopieer de key (`sk-ant-...`) — je ziet 'em maar één keer
   - Voeg credit toe ($5-20 om mee te starten — een scan-analyse kost €0,03-0,10)

2. **Code naar GitHub pushen**
   ```bash
   cd lapento-scan-railway
   git init
   git add .
   git commit -m "Lapento Humanoid Scan v1"
   # maak een nieuwe repo op github.com (private mag)
   git remote add origin https://github.com/<jouw-username>/lapento-scan.git
   git branch -M main
   git push -u origin main
   ```

3. **Railway project aanmaken**
   - Ga naar https://railway.app, login met GitHub
   - New Project > Deploy from GitHub repo > kies `lapento-scan`
   - Railway detecteert automatisch dat het een Node.js app is
   - Wacht tot build klaar is (~2 minuten)

4. **Environment variable instellen**
   - Klik op je service > tab **Variables**
   - Voeg toe: `ANTHROPIC_API_KEY` = `sk-ant-...`
   - Klik **Save** — Railway redeployt automatisch

5. **URL ophalen**
   - Tab **Settings** > **Networking** > **Generate Domain**
   - Je krijgt iets als `lapento-scan-production.up.railway.app`

6. **Test 'm:**
   - Open de URL op je iPhone
   - Tik op deelmenu (Safari) > **Op beginscherm** — krijg je een app-icoontje
   - Maak een test-scan, run de AI-analyse, check de Word-export

### Custom domain (`scan.lapento.nl`)

Railway > Settings > Networking > **Custom Domain**:

1. Voeg `scan.lapento.nl` toe
2. Railway geeft je een CNAME-record om bij je DNS-provider in te stellen
3. Bij je DNS-provider (waar je `lapento.nl` beheert): voeg CNAME-record toe
4. Wacht 5-30 min op DNS-propagatie
5. Done — `scan.lapento.nl` opent je app

### Toekomstige updates

Iedere `git push` naar `main` triggert automatisch een nieuwe deploy op Railway. Lokaal testen → committen → pushen → 2 min later live.

---

## Kosten-schatting

| Onderdeel | Kosten |
|-----------|--------|
| Railway Hobby plan | $5/mnd |
| Anthropic API (10 scans/mnd) | ~€1 |
| Anthropic API (100 scans/mnd) | ~€10 |
| Custom domain (gebruikt bestaand `lapento.nl`) | gratis |

---

## Wat je nog kan doen

- **Backup**: de export/import knoppen op het home-scherm bewaren scans als JSON. Bewaar regelmatig — `localStorage` is per device.
- **Multi-device sync**: voor v2 zou je een echte database (Postgres op Railway) en login kunnen toevoegen. Voor nu: één iPhone of tablet.
- **PWA-installatie iPhone**: open app > Safari deelmenu > "Op beginscherm" — krijg je een echt app-icoontje, fullscreen mode, geen browser-balk.

---

## Architectuur (kort)

```
[iPhone Safari/PWA]
       ↓ HTTPS
[Railway: Express server]
       ├── /api/analyze  →  [Anthropic API met server-side key]
       ├── /api/health   →  healthcheck
       └── /*            →  serve dist/ (built React app)
```

API-key wordt nooit naar de browser gestuurd — alleen de server kent 'em.

---

## Support

Vragen? Issues? Mail thijs@lapento.nl of update via je AI-pair-programmer.

— Lapento, 2026
