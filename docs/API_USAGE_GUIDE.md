# Wohnblitzer API Usage Guide

## Schnellstart

Diese Anleitung zeigt dir, wie du die Wohnblitzer API mit curl testen kannst.

### Voraussetzungen

- Die FastAPI-Anwendung muss laufen: `python main.py`
- curl installiert
- Basis-URL: `http://localhost:8000`

## Funktionierende Endpunkte

### 1. Basis-Informationen abrufen

```bash
# API-Informationen
curl http://localhost:8000/

# Antwort:
{
  "message": "Wohnblitzer API is running",
  "version": "1.0.0",
  "endpoints": {
    "auth": "/api/login, /api/register",
    "admin": "/api/users",
    "bot": "/api/bot/start, /api/bot/stop",
    "bewerbungen": "/api/bewerbungen",
    "filter": "/api/filter",
    "statistik": "/api/statistik",
    "support": "/api/support"
  }
}
```

### 2. Health Check

```bash
# Gesundheitsstatus
curl http://localhost:8000/health

# Antwort:
{
  "status": "healthy",
  "database": "connected"
}
```

### 3. Monitoring

```bash
# Bot-System Status
curl http://localhost:8000/api/monitoring/health

# Antwort:
{
  "status": "healthy",
  "timestamp": "2025-07-11T02:36:19.465931",
  "active_bots": 0,
  "total_tracked_bots": 0
}
```

### 4. Dokumentation

```bash
# Swagger UI (HTML)
curl http://localhost:8000/docs

# ReDoc (HTML)
curl http://localhost:8000/redoc

# OpenAPI Schema (JSON)
curl http://localhost:8000/openapi.json
```

## Authentifizierung (Problembehebung erforderlich)

### Aktueller Status

❌ **Registrierung und Login funktionieren derzeit nicht (500 Serverfehler)**

### Theoretische Nutzung nach Behebung

```bash
# Benutzer registrieren
curl -X POST "http://localhost:8000/api/register" \
  -H "Content-Type: application/json" \
  -d '{
    "vorname": "Max",
    "nachname": "Mustermann", 
    "email": "max@example.com",
    "password": "sicherespasswort123",
    "filter_einstellungen": "{}",
    "bewerbungsprofil": "{}"
  }'

# Anmelden
curl -X POST "http://localhost:8000/api/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "max@example.com",
    "password": "sicherespasswort123"
  }'

# OAuth2 Token abrufen
curl -X POST "http://localhost:8000/api/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=max@example.com&password=sicherespasswort123"
```

### Token verwenden

```bash
# Nach erfolgreicher Anmeldung Token nutzen
TOKEN="your-jwt-token-here"

# Geschützte Endpunkte aufrufen
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/bot/status
```

## Geschützte Endpunkte testen

### Bot-Management

```bash
# Bot-Status abrufen
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/bot/status

# Bot starten
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/bot/start

# Bot stoppen
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/bot/stop

# Bot-Konfiguration aktualisieren
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filter_einstellungen": "{\"max_price\": 1000}",
    "bewerbungsprofil": "{\"name\": \"Max Mustermann\"}"
  }' \
  http://localhost:8000/api/bot/config
```

### Bewerbungen

```bash
# Bewerbungen abrufen
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/bewerbungen/

# Neue Bewerbung erstellen
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "wohnungsname": "Schöne 3-Zimmer-Wohnung",
    "adresse": "Musterstraße 123, 12345 Musterstadt",
    "preis": 800.0,
    "anzahl_zimmer": 3
  }' \
  http://localhost:8000/api/bewerbungen/
```

### Statistiken

```bash
# Benutzerstatistiken
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/statistik/

# Dashboard-Statistiken
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/statistik/dashboard
```

### Filter-Einstellungen

```bash
# Aktuelle Filter abrufen
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/filter/

# Filter aktualisieren
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filter_einstellungen": "{\"max_price\": 1200, \"min_rooms\": 2, \"max_rooms\": 4}"
  }' \
  http://localhost:8000/api/filter/
```

### Support

```bash
# Support-Nachrichten abrufen
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/support/

# Support-Nachricht senden
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Ich brauche Hilfe mit dem Bot",
    "betreff": "Bot-Problem"
  }' \
  http://localhost:8000/api/support/
```

## Erwartete Fehler bei geschützten Endpunkten

Ohne gültigen Token erhältst du:

```bash
curl http://localhost:8000/api/bot/status

# Antwort:
{
  "detail": "Not authenticated"
}
```

## Admin-Endpunkte (Erfordern Admin-Rechte)

```bash
# Alle Benutzer anzeigen (Admin)
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8000/api/users/

# Alle Bot-Status anzeigen (Admin)
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8000/api/bot/admin/status

# System-Metriken (Admin)
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8000/api/monitoring/metrics

# System-Alerts (Admin)
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8000/api/monitoring/alerts
```

## Debugging-Tipps

### 1. Verbose-Modus für Details

```bash
# Vollständige HTTP-Header anzeigen
curl -v http://localhost:8000/

# Nur HTTP-Status anzeigen
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/
```

### 2. JSON-Antworten formatieren

```bash
# Mit jq formatieren (falls installiert)
curl http://localhost:8000/ | jq .

# Mit Python formatieren
curl http://localhost:8000/ | python -m json.tool
```

### 3. Logs überprüfen

```bash
# Anwendungs-Logs
tail -f logs/application.log

# Bot-Manager-Logs
tail -f logs/bot_manager.log
```

## Interaktive Dokumentation

Die einfachste Art, die API zu testen:

1. **Swagger UI**: http://localhost:8000/docs
   - Interaktive API-Dokumentation
   - Direkte Testmöglichkeit im Browser
   - Automatische Beispiele

2. **ReDoc**: http://localhost:8000/redoc
   - Übersichtliche API-Dokumentation
   - Detaillierte Beschreibungen
   - Bessere Lesbarkeit

## Problemlösungen

### 1. Server läuft nicht

```bash
# Prüfen ob Server läuft
curl -s http://localhost:8000/ || echo "Server ist nicht erreichbar"

# Server starten
python main.py
```

### 2. Authentifizierungsprobleme

```bash
# Datenbankverbindung prüfen
sqlite3 app.db ".tables"

# Logs überprüfen
tail -n 50 logs/application.log
```

### 3. 422 Validierungsfehler

```bash
# Prüfe Request-Format
curl -X POST -H "Content-Type: application/json" \
  -d '{"invalid": "data"}' \
  http://localhost:8000/api/register

# Antwort zeigt was erwartet wird:
{
  "detail": [
    {
      "type": "missing",
      "loc": ["body", "vorname"],
      "msg": "Field required"
    }
  ]
}
```

## Nächste Schritte

1. **Authentifizierung reparieren** - Hauptproblem beheben
2. **Token-basierte Tests** - Nach Auth-Fix vollständig testen
3. **Admin-Funktionen** - Admin-User erstellen und testen
4. **Bot-Integration** - Bot-Funktionalität vollständig testen

Die API ist gut strukturiert und sicher implementiert. Nach der Behebung der Authentifizierungsprobleme ist sie vollständig einsatzbereit! 