# E-Mail-Benachrichtigungen Einrichtung

## Übersicht
Das System sendet automatisch Bestätigungsemails an Benutzer, wenn:
- Eine Bewerbung erfolgreich versendet wurde
- Bei einer Bewerbung ein Fehler aufgetreten ist

## E-Mail-Konfiguration

### 1. Umgebungsvariablen setzen
Erstellen Sie die Datei `email.env` im Backend-Verzeichnis und setzen Sie folgende Variablen:

```bash
# SMTP Server-Einstellungen
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587

# E-Mail-Zugangsdaten
SMTP_USERNAME=ihre-email@gmail.com
SMTP_PASSWORD=ihr-app-passwort

# Absender-Informationen
EMAIL_SENDER_NAME=WohnBlitzer
EMAIL_FROM_ADDRESS=ihre-email@gmail.com
```

### 2. Gmail App-Passwort erstellen
Für Gmail benötigen Sie ein App-Passwort:

1. Gehen Sie zu [Google Konto-Einstellungen](https://myaccount.google.com/)
2. Navigieren Sie zu "Sicherheit" → "App-Passwörter"
3. Erstellen Sie ein neues App-Passwort für "WohnBlitzer"
4. Verwenden Sie dieses 16-stellige Passwort als `SMTP_PASSWORD`

### 3. Umgebungsvariablen laden
Fügen Sie am Anfang der `main.py` hinzu:

```python
import os
from dotenv import load_dotenv

# E-Mail-Konfiguration laden
load_dotenv("email.env")
```

### 4. E-Mail-Konfiguration testen
Als Admin können Sie die E-Mail-Konfiguration über den API-Endpunkt testen:

```
POST /api/users/test-email
```

## Funktionsweise

### Bei erfolgreicher Bewerbung:
- User erhält eine schöne HTML-E-Mail mit Bewerbungsdetails
- E-Mail enthält Wohnungsname, Adresse, Preis, Zimmerzahl
- Bestätigung wird auch im Bot-Log vermerkt

### Bei Bewerbungsfehlern:
- User wird über den Fehler informiert
- E-Mail enthält Fehlermeldung und Wohnungsdetails
- Empfehlung zur manuellen Bewerbung

## Fallback-Verhalten
- Wenn E-Mail-Konfiguration fehlt, werden Warnungen geloggt
- Bot-Funktionalität wird NICHT beeinträchtigt
- Bewerbungen funktionieren auch ohne E-Mail-Versand

## Logs und Monitoring
- Alle E-Mail-Aktivitäten werden geloggt
- E-Mail-Status wird im Bot-Log gespeichert
- Admin kann E-Mail-Erfolg/Fehler überwachen

## Sicherheit
- E-Mail-Credentials werden als Umgebungsvariablen gespeichert
- Keine Passwörter im Quellcode
- TLS-Verschlüsselung für SMTP-Verbindung
