# globalescort.de – Datenmodell & Umkreis-Logik (Planung)

Stand: Oktober 2026. Aktuell liegen die Daten statisch in `damen/index.html` (`#damen-data`).
Später kommen sie aus einem Backend (Agentur-Login zum Hochladen, Mitgliederbereich für Gäste).

## Umkreis-Logik (bereits umgesetzt)

- Jede Dame hat einen oder mehrere **Standorte** (`locations`: Stadtname + Koordinaten) und einen **Umkreis** (`radiusKm`, aktuell überall 50 km).
- Gast wählt eine Stadt (Kachel oder Suche). Die Dame wird angezeigt, wenn
  - die Stadt direkt bei ihr hinterlegt ist **oder**
  - die Entfernung (Luftlinie) von einem ihrer Standorte zur gewählten Stadt ≤ `radiusKm` ist.
- Beispiel: Dame sitzt in Stuttgart mit 80 km Umkreis → erscheint auch in Heilbronn, Pforzheim, Ulm, Karlsruhe (ca. 62 km).
- Ergebnisse werden nach Entfernung sortiert, auf der Karte steht „X km entfernt · kommt zu dir“.
- Für Städte ohne Damen zeigt die Seite die nächstgelegenen Damen an.
- Städte-Liste mit Koordinaten: `cities` in den Seitendaten (später: vollständige Orts-/PLZ-Datenbank im Backend).

## Geplante Tabellen (Backend)

| Tabelle | Wichtige Felder |
|---|---|
| `agencies` | id, name, telefon, whatsapp, website, paket, status |
| `ladies` | id, agency_id, slug, name, alter, steckbrief (Größe, Konfektion, Haarfarbe …), badge (neu/privat), pausiert, radius_km |
| `lady_locations` | lady_id, stadt, lat, lng (mehrere Standorte pro Dame) |
| `lady_extra_cities` | lady_id, stadt (bezahlte Regionen-Platzierung außerhalb des Umkreises) |
| `lady_services` | lady_id, gruppe, service |
| `lady_images` | lady_id, datei, reihenfolge, privat (Private Galerie ja/nein) |
| `cities` | name, bundesland, lat, lng, plz-Bereiche |
| `members` | id, e-mail, passwort-hash, altersverifiziert, credits |
| `favorites` | member_id, lady_id, gemerkt_am |
| `unlocks` | member_id, lady_id, credits, datum (Private Galerie) |

Abfrage „Damen in Stadt X“: Haversine-Distanz zwischen Stadt X und `lady_locations` ≤ `radius_km` **oder** Eintrag in `lady_extra_cities`.
