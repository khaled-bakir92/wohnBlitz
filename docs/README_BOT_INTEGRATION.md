# Bot-Integration ins FastAPI-Backend

## Übersicht

Der ursprüngliche Standalone-Bot wurde erfolgreich als Service-Modul ins FastAPI-Backend integriert. Das System unterstützt jetzt Multi-User-Bot-Instanzen mit vollständiger API-Steuerung.

## Architektur

### 1. Bot-Service-Architektur

```
BotManager (Singleton)
├── UserBot (pro User)
│   ├── ImmobilienCrawler (Selenium-basiert)
│   ├── User-Konfiguration aus DB
│   └── Bewerbungsverarbeitung
├── Bot-Metriken & Status
└── Lifecycle-Management
```

### 2. Datenbank-Erweiterungen

**Neue Tabellen:**
- `bot_status`: Aktueller Bot-Status pro User
- `bot_logs`: Strukturierte Logs aller Bot-Aktivitäten

**Erweiterte Tabellen:**
- `users`: `filter_einstellungen` (JSON), `bewerbungsprofil` (JSON)
- `bewerbungen`: Automatisch erstellt durch Bots

## API-Endpunkte

### Bot-Steuerung
- `POST /api/bot/start` - Bot für aktuellen User starten
- `POST /api/bot/stop` - Bot stoppen
- `GET /api/bot/status` - Bot-Status abrufen
- `PUT /api/bot/config` - Bot-Konfiguration aktualisieren
- `GET /api/bot/logs` - Bot-Logs abrufen

### Admin-Funktionen
- `GET /api/bot/admin/status` - Alle Bot-Status
- `POST /api/bot/admin/stop-all` - Alle Bots stoppen
- `GET /api/bot/admin/logs/{user_id}` - User-spezifische Logs

### Monitoring
- `GET /api/monitoring/health` - System-Gesundheitscheck
- `GET /api/monitoring/metrics` - System-Metriken
- `GET /api/monitoring/statistics` - Detaillierte Statistiken
- `GET /api/monitoring/alerts` - System-Alerts

## Verwendung

### 1. Bot starten
```bash
curl -X POST http://localhost:8000/api/bot/start \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. Bot-Status abrufen
```bash
curl http://localhost:8000/api/bot/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Bot-Konfiguration aktualisieren
```bash
curl -X PUT http://localhost:8000/api/bot/config \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filter_einstellungen": "{\"max_warmmiete\": 1200, \"min_zimmer\": 2}",
    "bewerbungsprofil": "{\"name\": \"Max\", \"email\": \"max@example.com\"}"
  }'
```

## User-Konfiguration

### Filter-Einstellungen (JSON)
```json
{
  "max_warmmiete": 1500,
  "min_zimmer": 2,
  "wbs_required": null,
  "excluded_areas": ["SPANDAU", "Marzahn"]
}
```

### Bewerbungsprofil (JSON)
```json
{
  "anrede": "Herr",
  "name": "Mustermann",
  "vorname": "Max",
  "email": "max@example.com",
  "strasse": "Musterstraße 123",
  "plz": "12345",
  "ort": "Berlin",
  "telefon": "030123456"
}
```

## Technische Details

### Selenium-Integration
- Headless Chrome/Firefox
- Automatische ChromeDriver-Erkennung
- Cookie-Handling
- Error-Recovery

### Asyncio-basierte Architektur
- Ein Bot-Prozess pro User
- Non-blocking Ausführung
- Graceful Shutdown
- Resource-Cleanup

### Logging & Monitoring
- Strukturierte JSON-Logs
- User-spezifische Log-Files
- Datenbank-Logging
- Real-time Metriken

### Sicherheit
- JWT-basierte Authentifizierung
- User-spezifische Bot-Isolation
- Admin-Berechtigungen für System-Übersicht
- Secure Data-Handling

## Deployment-Hinweise

### 1. ChromeDriver installieren
```bash
# Ubuntu/Debian
sudo apt-get install chromium-browser chromium-chromedriver

# MacOS
brew install chromedriver
```

### 2. Umgebungsvariablen
```bash
export SECRET_KEY="your-production-secret-key"
export DATABASE_URL="sqlite:///./production.db"
```

### 3. Dependencies installieren
```bash
pip install -r requirements.txt
```

### 4. Anwendung starten
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Wartung & Monitoring

### Automatische Wartung
- Log-Cleanup (alle 30 Tage)
- Bot-Gesundheitschecks
- Metriken-Updates
- Datenbank-Optimization

### Performance-Tuning
- Bot-Intervalle anpassen
- Selenium-Timeouts optimieren
- Datenbank-Indizes
- Log-Level konfigurieren

### Troubleshooting
- Bot-Logs in `/api/bot/logs` prüfen
- System-Metriken in `/api/monitoring/metrics`
- Health-Check: `/api/monitoring/health`
- Manuelle Bot-Neustarts über Admin-API

## Erweiterte Features

### WebSocket-Support (optional)
Für Real-time Bot-Status-Updates:
```python
# Kann später hinzugefügt werden
@app.websocket("/ws/bot/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    # Bot-Status-Updates in Real-time
    pass
```

### Distributed Bots (optional)
Für horizontale Skalierung:
- Redis für Bot-Koordination
- Celery für verteilte Tasks
- Load Balancing zwischen Bot-Nodes

## Migration vom Standalone-Bot

1. **Daten migrieren**: Bestehende `known_listings.json` in Datenbank importieren
2. **Filter übertragen**: `filter_settings.json` in User-Profile
3. **Logs archivieren**: Bestehende Log-Files sichern
4. **Konfiguration anpassen**: User-Daten in Bewerbungsprofile

Das integrierte Bot-System ist jetzt vollständig funktionsfähig und bietet alle Features des ursprünglichen Bots plus umfangreiche API-Steuerung und Multi-User-Support.