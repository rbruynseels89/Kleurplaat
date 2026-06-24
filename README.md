# Kleurplaat

Een kleine lokale kleurplaat-app met grote knoppen en een beperkte set kleuren.

## Starten

Start in deze map een lokale webserver:

```bash
python3 -m http.server 8000
```

Open daarna:

```text
http://localhost:8000
```

## Eigen kleurplaten toevoegen

1. Zet je bestand in de map `kleurplaten/`.
2. Voeg het toe aan `kleurplaten/manifest.json`.

Voorbeeld:

```json
{
  "title": "Mijn tekening",
  "file": "kleurplaten/mijn-tekening.png"
}
```

PNG, JPG en SVG werken. SVG of PNG met witte achtergrond en dikke zwarte lijnen werkt het best.
