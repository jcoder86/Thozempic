# Thozempic

Single-file HTML5 canvas spel. Geen backend, geen build step — gewoon één
`index.html` die door nginx geserveerd wordt.

## Lokaal testen

Snel:

    open index.html in je browser

Of via Docker (zoals het ook op de VPS draait):

    docker compose up --build

Dan: <http://localhost:3002>

## Productie

Deployed via Dokploy op de VPS (Compose-service, host-poort 3002 → container
80). Push naar `main` triggert een deploy.
