# Rechner-Setup (einmalig, unabhängig vom einzelnen Projekt)

Das hier musst du **einmal pro Rechner** einrichten – nicht pro Projekt. Neuer Laptop, neuer Kollege, Rechner neu aufgesetzt: hier anfangen, bevor du überhaupt ein Projekt aus dem Template startest.

---

## 1. Software installieren

- **[VSCode](https://code.visualstudio.com/)**
- **[Node.js](https://nodejs.org/)** (LTS-Version, aktuell empfohlen: 24+)
- **[GitHub Desktop](https://desktop.github.com/)** (zum Committen/Pushen ohne Terminal-Git-Befehle)

### VSCode-Extensions

- **ESLint** (Autor: Microsoft)
- **Prettier - Code formatter** (Autor: Prettier)
- **GitHub Actions** (Autor: GitHub) – optional, für Syntax-Highlighting/Live-Status der Workflows direkt in VSCode

### VSCode-Einstellungen (global, nicht projektspezifisch)

`Strg + ,` → Settings:
- **"Format On Save"** aktivieren
- **"Default Formatter"** → "Prettier - Code formatter" auswählen

---

## 2. GitHub-Zugang einrichten

1. Persönlichen GitHub-Account anlegen/nutzen
2. Mitglied der Organisation **pixelgiantagency** werden (Einladung nötig)
3. In GitHub Desktop einmalig anmelden (File → Options → Accounts → Sign in)

### Organisations-weite Actions-Berechtigung (einmalig für die ganze Organisation, nicht pro Repo)

Ohne diesen Schritt lässt sich "Read and write permissions" bei einzelnen Repos nicht auswählen:

1. `https://github.com/organizations/pixelgiantagency/settings/actions`
2. **"Workflow permissions"** → **"Read and write permissions"** → Save

Erst danach lässt sich dieselbe Einstellung bei einzelnen Repos setzen (das muss dann trotzdem noch **pro Repo** einmalig gemacht werden, siehe Haupt-README Schritt 10).

---

Nach diesen zwei Schritten: Bereit, ein neues Projekt aus dem Template zu starten (siehe Haupt-README, "Neues Projekt aus diesem Template starten"). Kein Zertifikat, keine mkcert-Installation, kein browserspezifisches Setup nötig – der lokale Dev-Server läuft über reines HTTP (`http://localhost:3000`), das funktioniert identisch auf Windows und Mac ohne weitere Vorbereitung.
