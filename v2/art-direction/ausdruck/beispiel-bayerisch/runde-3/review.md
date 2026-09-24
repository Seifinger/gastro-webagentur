# Runde 3 – erster Bildschirm mit echten Standbildern (P3), `beispiel-bayerisch` / `gesellig`

**Medien:** zwei vom Inhaber im Chat gelieferte, KI-generierte Standbilder derselben Szene.
- Quer 1680×944 (135 KB) als Desktop-Poster.
- Hoch 1024×1536, auf 900 px Breite verkleinert (107 KB), als Mobil-Poster über `<picture>`.

Registriert in `v2/medien/eigene.json` (`herkunft: "ki"`), abgelegt in `v2/medien/eigene/beispiel-bayerisch/`.
Auf der Bühne sind sie als „KI-generiert“ gekennzeichnet.

**Bildausschnitt** (`fokus` im Register):
- quer `50% 82%`: Teller, Brot und Bier bleiben im Bild, die Decke wird angeschnitten.
- hoch `50% 55%`.

**Video:** Das gelieferte Video (1280×720, 8 s) ist **noch nicht eingesetzt**:
- Es zeigt einen anderen Raum als die Standbilder.
- Es hat einen Handlungsbogen (leerer Tisch → serviert) und ist daher keine nahtlose Schleife.
- Eine Hochformat-Fassung fehlt.

Die Bühne ist dafür fertig: `heroVideo` / `heroVideoMobil` im Register eintragen genügt, ohne Layout-Umbau
(Test „Video nur mit Poster und erst per Skript“).

## Gemessen

Wie Runde 1/2, keine Abweichung:
- Kopfzeile über der Bühne transparent, danach Fläche.
- Slogan 1 → 0,17 → 0 (Desktop) bzw. 1 → 0,16 → 0 (Mobil).
- Menü: Fokus drin, Esc schließt.
- Reduzierte Bewegung: steht still. Ohne JavaScript: Kopfzeile fest.
- Keine Skriptfehler, keine horizontale Scrollleiste.

## Kritik

**Trägt:**
- Das Bild bringt Wärme und Ort (Holz, Fensterlicht, Stammgäste im Hintergrund, Teller im Vordergrund).
- Der Slogan liegt auf der ruhigen, hellen Wandfläche.
- Der Schleier ist nach dem schlimmsten Fall bemessen. Hier ist das berechtigt, denn die Wand hinter dem
  Slogan ist fast weiß. Das Bild bleibt trotzdem warm.
- Mobil: Der eigene Hochformat-Ausschnitt zeigt Teller und Bier statt eines beschnittenen Querbilds.

**In der Runde korrigiert:** Die Scroll-Linie lief mittig über den Teller. Sie steht jetzt links auf der Achse der Wortmarke.

**Beobachten:**
- Der Schleier dunkelt oben rechts die Personen stark ab. Mit einem Video, das hinter dem Slogan eine
  dunklere Zone hat, könnte er leichter werden. Das bleibt eine Entscheidung am konkreten Medium.
- Mobil bricht die Wortmarke zweizeilig. Ein Kurzname im Dashboard wäre die Lösung, siehe Runde 2.
