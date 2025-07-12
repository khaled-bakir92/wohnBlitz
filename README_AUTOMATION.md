# Automatisierte Code-Qualität & Tests

Dieses Projekt verfügt über automatisierte Code-Qualitätsprüfungen und Tests für sowohl Backend als auch Frontend.

## 🚀 Alles auf einmal prüfen

```bash
./ci-checks.sh
```

Dieser Befehl führt alle Checks für Backend und Frontend durch:
- Installiert automatisch fehlende Dependencies
- Führt alle Code-Qualitätsprüfungen durch
- Startet alle Tests

## 🐍 Backend (Python)

### Alle Backend-Checks durchführen

```bash
cd backend
./run_checks.sh
```

### Einzelne Tools verwenden

```bash
# Code-Linting
flake8 .

# Code-Formatierung prüfen
black --check .

# Code automatisch formatieren
black .
# oder verwende das Skript:
./format.sh

# Type-Checking
mypy .

# Tests ausführen
pytest

# Tests mit Coverage
pytest --cov=. --cov-report=term-missing
```

### Dependencies installieren

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

## ⚛️ Frontend (React Native)

### Alle Frontend-Checks durchführen

```bash
cd frontend
npm run lint
npm run format
npm run test
```

### Einzelne Tools verwenden

```bash
# Linting
npm run lint

# Formatierung prüfen
npm run format

# Formatierung automatisch korrigieren
npm run format:fix

# Tests ausführen
npm run test

# Tests im Watch-Modus
npm run test:watch

# Tests mit Coverage
npm run test:coverage
```

### Dependencies installieren

```bash
cd frontend
npm install
```

## 📋 Konfigurationsdateien

### Backend
- `.flake8` - Linter-Konfiguration
- `pyproject.toml` - Black, MyPy und Pytest-Konfiguration
- `requirements.txt` - Python-Dependencies

### Frontend
- `.prettierrc` - Prettier-Konfiguration
- `.prettierignore` - Prettier-Ignore-Regeln
- `jest.config.js` - Jest-Test-Konfiguration
- `package.json` - NPM-Scripts und Dependencies

## 🛠️ Erste Einrichtung

1. **Backend einrichten:**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Frontend einrichten:**
   ```bash
   cd frontend
   npm install
   ```

3. **Alle Checks testen:**
   ```bash
   ./ci-checks.sh
   ```

## 📝 Code-Qualitätsstandards

### Backend (Python)
- **Linting:** flake8 mit max. 88 Zeichen pro Zeile
- **Formatierung:** black mit 88 Zeichen pro Zeile
- **Type-Checking:** mypy mit strikten Einstellungen
- **Tests:** pytest mit mindestens 70% Coverage

### Frontend (TypeScript/React Native)
- **Linting:** ESLint mit Expo-Konfiguration
- **Formatierung:** Prettier mit single quotes
- **Tests:** Jest mit React Native Testing Library
- **Coverage:** Mindestens 70% für alle Metriken

## 🚨 Fehlerbehebung

### Backend-Probleme
- **Import-Fehler:** Stelle sicher, dass das venv aktiviert ist
- **MyPy-Fehler:** Prüfe Type-Annotations in deinem Code
- **Black-Konflikte:** Führe `./format.sh` aus, um automatisch zu formatieren

### Frontend-Probleme
- **ESLint-Fehler:** Befolge die Linting-Regeln oder passe `.eslintrc` an
- **Jest-Fehler:** Überprüfe die Mocks in den Test-Dateien
- **Prettier-Konflikte:** Führe `npm run format:fix` aus

## 📚 Weiterführende Informationen

- [flake8 Dokumentation](https://flake8.pycqa.org/)
- [black Dokumentation](https://black.readthedocs.io/)
- [mypy Dokumentation](https://mypy.readthedocs.io/)
- [pytest Dokumentation](https://pytest.org/)
- [ESLint Dokumentation](https://eslint.org/)
- [Prettier Dokumentation](https://prettier.io/)
- [Jest Dokumentation](https://jestjs.io/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/) 