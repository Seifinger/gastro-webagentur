// Medien-Pipeline (Stage 4): Bilder und Videos für v2-Seiten.
//
// Vorrang – ohne Ausnahme, in dieser Reihenfolge:
//   1. eigene Medien, die im Chat bereitgestellt und über medienEintragen.js
//      registriert wurden (v2/medien/eigene.json) – echte Fotos ("eigen")
//      oder vom Inhaber gelieferte KI-Bilder ("ki")
//   2. eigene Fotos aus dem Dashboard-Upload (v1-Mechanismus: leadEdits.js,
//      bilder.<rolle>, Dateien unter public/uploads/)
//   3. automatisch KI-generierte Medien aus dem Cache (v2/output/medien/)
//   4. Stockfotos aus src/imageLibrary.js
//   5. lokal gezeichneter SVG-Platzhalter (offline, kostenlos)
//
// Jedes Medium trägt `herkunft` ("eigen" | "ki" | "platzhalter") und
// `kennzeichnung` ("eigenes Foto" | "KI-generiert" | "Platzhalter") – das
// zeigt das Dashboard an (Stage 7b) und steht im Build-Bericht.
//
// Provider sind austauschbar: jeder ist ein Objekt mit name, arten,
// verfuegbar() und erzeuge(). Mitgeliefert: "platzhalter" (lokal, SVG) und
// "replicate" (reale Anbindung, Begründung im Entscheidungslog E4.2).

import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadLeadEdits } from "../../src/leadEdits.js";
import { remoteImageUrl, kuechenMarke, escapeHtml } from "../build/v1Funktionen.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, "..", "..");
export const EIGENE_DIR = path.join(REPO, "v2", "medien", "eigene");
export const EIGENE_MANIFEST = path.join(REPO, "v2", "medien", "eigene.json");
export const KI_DIR = path.join(REPO, "v2", "output", "medien");
export const UPLOADS_DIR = path.join(REPO, "public", "uploads");

export const ROLLEN = ["hero", "haus", "team", "bestseller"];
export const KENNZEICHNUNG = { eigen: "eigenes Foto", ki: "KI-generiert", platzhalter: "Platzhalter", konzept: "Konzeptmaterial" };

const FORMATE = { hero: "16:9", heroMobil: "4:5", haus: "4:3", team: "4:3", bestseller: "4:3", gericht: "4:3", heroVideo: "16:9", heroVideoMobil: "9:16" };

/* ------------------------------------------------------------------ */
/* Prompts aus dem Bild-Kanon                                          */
/* ------------------------------------------------------------------ */

const ROLLEN_PROMPT = {
  hero: (ds) => `${ds.bildKanon.motiv}, hero image of a ${ds.kuecheLabel} restaurant, wide composition with calm negative space on one side`,
  haus: (ds) => `street view of a small ${ds.kuecheLabel} restaurant entrance in a Bavarian market town, facade and door, evening windows`,
  team: () => "close-up of cooks' hands at work in a restaurant kitchen, no faces",
  bestseller: (ds, g) => `${g?.name ?? ds.bildKanon.motiv}, single signature dish`,
  gericht: (ds, g) => `${g?.name ?? "dish"} (${g?.beschreibung ?? ""}), single plate`,
  heroVideo: (ds) => `slow cinemagraph of ${ds.bildKanon.motiv}, subtle steam and hand movement, locked-off camera`,
};

export function promptFuer(ds, rolle, gericht = null) {
  const inhalt = (ROLLEN_PROMPT[rolle] ?? ROLLEN_PROMPT.gericht)(ds, gericht);
  return {
    prompt: `${inhalt}. ${ds.bildKanon.promptBasis}`,
    negativ: ds.bildKanon.negativPrompt,
    format: FORMATE[rolle] ?? "4:3",
  };
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

/** Seed-deterministischer Zahlengeber, damit Platzhalter stabil bleiben. */
function zufall(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function hashText(text) {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Lokaler Platzhalter: eine ruhige, aus der Palette gezeichnete Fläche mit
 * der Küchenmarke und der Aufgabe („Foto folgt: Unser Haus“). Kostet nichts,
 * braucht kein Netz, ist erkennbar kein Foto.
 */
export const platzhalterProvider = {
  name: "platzhalter",
  arten: ["bild"],
  kosten: "kostenlos, lokal",
  verfuegbar: () => true,
  async erzeuge({ ds, rolle, seed = 1, titel = "" }) {
    const r = ds.farben.rollen;
    const [b, h] = (FORMATE[rolle] ?? "4:3").split(":").map(Number);
    const breite = 1200;
    const hoehe = Math.round((breite * h) / b);
    const z = zufall(seed);
    const streifen = Array.from({ length: 5 }, (_, i) => {
      const y = Math.round(hoehe * (0.15 + i * 0.17 + z() * 0.04));
      return `<line x1="0" y1="${y}" x2="${breite}" y2="${y + Math.round((z() - 0.5) * 60)}" stroke="${r.linie.hex}" stroke-width="2"/>`;
    }).join("");
    const marke = kuechenMarke(ds.kueche, "marke").replace("<svg", `<svg x="${breite / 2 - 60}" y="${hoehe / 2 - 90}" width="120" height="120" color="${r.textLeise.hex}"`);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${breite} ${hoehe}" width="${breite}" height="${hoehe}"><rect width="100%" height="100%" fill="${r.flaecheTief.hex}"/>${streifen}${marke}<text x="50%" y="${hoehe / 2 + 80}" text-anchor="middle" font-family="Georgia, serif" font-size="40" fill="${r.textLeise.hex}">${escapeHtml(titel || "Foto folgt")}</text></svg>`;
    return { buffer: Buffer.from(svg), mime: "image/svg+xml", endung: "svg", meta: { provider: "platzhalter" } };
  },
};

/**
 * Replicate (https://replicate.com): eine API für Bild- und Videomodelle,
 * Abrechnung pro Ergebnis, kein Abo. Modelle per Umgebungsvariable
 * austauschbar, weil sich die besten Modelle schneller ändern als dieser Code.
 */
export const replicateProvider = {
  name: "replicate",
  arten: ["bild", "video"],
  kosten: "pro Bild ca. 0,003–0,04 $, pro Video ca. 0,3–1 $ (je nach Modell)",
  verfuegbar: () => Boolean(process.env.REPLICATE_API_TOKEN),
  modell(typ) {
    return typ === "video"
      ? process.env.V2_VIDEO_MODELL || "minimax/video-01"
      : process.env.V2_BILD_MODELL || "black-forest-labs/flux-1.1-pro";
  },
  async erzeuge({ prompt, negativ, format, seed, typ = "bild", abruf = fetch }) {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) throw new Error("REPLICATE_API_TOKEN fehlt (siehe .env.example).");
    const modell = this.modell(typ);
    const input = typ === "video" ? { prompt } : { prompt, aspect_ratio: format, output_format: "jpg", seed, safety_tolerance: 2, ...(negativ ? { negative_prompt: negativ } : {}) };
    let antwort = await abruf(`https://api.replicate.com/v1/models/${modell}/predictions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "wait=60" },
      body: JSON.stringify({ input }),
    });
    if (!antwort.ok) throw new Error(`Replicate: HTTP ${antwort.status}`);
    let vorhersage = await antwort.json();
    for (let i = 0; i < 60 && !["succeeded", "failed", "canceled"].includes(vorhersage.status); i += 1) {
      await new Promise((r) => setTimeout(r, 2000));
      antwort = await abruf(vorhersage.urls.get, { headers: { Authorization: `Bearer ${token}` } });
      vorhersage = await antwort.json();
    }
    if (vorhersage.status !== "succeeded") throw new Error(`Replicate: ${vorhersage.status} ${vorhersage.error ?? ""}`);
    const url = Array.isArray(vorhersage.output) ? vorhersage.output[0] : vorhersage.output;
    const datei = await abruf(url);
    if (!datei.ok) throw new Error(`Replicate-Download: HTTP ${datei.status}`);
    const buffer = Buffer.from(await datei.arrayBuffer());
    return {
      buffer,
      mime: typ === "video" ? "video/mp4" : "image/jpeg",
      endung: typ === "video" ? "mp4" : "jpg",
      meta: { provider: "replicate", modell, vorhersage: vorhersage.id },
    };
  },
};

export const PROVIDER = { platzhalter: platzhalterProvider, replicate: replicateProvider };

/** Provider nach Name; ohne Angabe: Replicate, wenn ein Token da ist, sonst Platzhalter. */
export function waehleProvider(name = process.env.V2_MEDIEN_PROVIDER) {
  if (name) {
    const p = PROVIDER[name];
    if (!p) throw new Error(`Unbekannter Medien-Provider "${name}" (verfügbar: ${Object.keys(PROVIDER).join(", ")})`);
    return p;
  }
  return replicateProvider.verfuegbar() ? replicateProvider : platzhalterProvider;
}

/* ------------------------------------------------------------------ */
/* Manifeste                                                           */
/* ------------------------------------------------------------------ */

function leseJson(pfad, rueckfall) {
  try {
    return JSON.parse(readFileSync(pfad, "utf-8"));
  } catch {
    return rueckfall;
  }
}

export function ladeEigeneMedien(manifest = EIGENE_MANIFEST) {
  return leseJson(manifest, {});
}

/**
 * Registriert ein im Chat bereitgestelltes Foto/Video für eine Seite. Die
 * Datei wird nach v2/medien/eigene/<slug>/ kopiert (damit sie versioniert
 * ist) und im Manifest eingetragen. herkunft: "eigen" (echtes Foto) oder
 * "ki" (vom Inhaber geliefertes KI-Material).
 */
export function registriereEigenesMedium({ slug, rolle, datei, herkunft = "eigen", quelle = "", fokus = "", wiedergabe = "", webm = "", manifest = EIGENE_MANIFEST, zielDir = EIGENE_DIR }) {
  if (![...ROLLEN, "heroVideo", "heroMobil", "heroVideoMobil"].includes(rolle) && !/^gericht:/.test(rolle)) throw new Error(`Unbekannte Rolle "${rolle}"`);
  if (!["eigen", "ki"].includes(herkunft)) throw new Error('herkunft muss "eigen" oder "ki" sein');
  if (!existsSync(datei)) throw new Error(`Datei nicht gefunden: ${datei}`);
  const ordner = path.join(zielDir, slug);
  mkdirSync(ordner, { recursive: true });
  const ziel = path.join(ordner, `${rolle.replace(":", "-")}${path.extname(datei).toLowerCase()}`);
  copyFileSync(datei, ziel);
  // Videos: optional eine WebM-Fassung daneben (Browser ohne H.264) und die
  // Wiedergabe ("einmal" = ohne Schleife, bleibt auf dem letzten Bild stehen).
  let webmZiel = "";
  if (webm) {
    if (!existsSync(webm)) throw new Error(`Datei nicht gefunden: ${webm}`);
    webmZiel = path.join(ordner, `${rolle.replace(":", "-")}.webm`);
    copyFileSync(webm, webmZiel);
  }
  const alle = leseJson(manifest, {});
  // fokus: Bildausschnitt als CSS object-position (z. B. "50% 85%"), damit beim
  // Zuschnitt das Wesentliche (Teller, Tisch) im Bild bleibt.
  alle[slug] = { ...(alle[slug] ?? {}), [rolle]: { datei: path.relative(REPO, ziel), herkunft, quelle, ...(fokus ? { fokus } : {}), ...(wiedergabe ? { wiedergabe } : {}), ...(webmZiel ? { webm: path.relative(REPO, webmZiel) } : {}), eingetragen: new Date().toISOString() } };
  mkdirSync(path.dirname(manifest), { recursive: true });
  writeFileSync(manifest, `${JSON.stringify(alle, null, 2)}\n`, "utf-8");
  return alle[slug][rolle];
}

function kiManifestPfad(slug, dir = KI_DIR) {
  return path.join(dir, slug, "manifest.json");
}

export function ladeKiMedien(slug, dir = KI_DIR) {
  return leseJson(kiManifestPfad(slug, dir), {});
}

/**
 * Erzeugt fehlende Medien mit dem gewählten Provider und legt sie im Cache
 * ab. Rollen, für die es eigene Medien gibt, werden übersprungen – für sie
 * wird nie Geld ausgegeben.
 */
export async function erzeugeMedien({ slug, ds, seed = 1, highlights = [], provider = waehleProvider(), rollen = ROLLEN, dir = KI_DIR, eigene = ladeEigeneMedien(), neu = false, video = false }) {
  const ordner = path.join(dir, slug);
  mkdirSync(ordner, { recursive: true });
  const manifest = ladeKiMedien(slug, dir);
  const erzeugt = [];
  const fehler = [];
  const auftraege = [...rollen.map((rolle) => ({ rolle })), ...highlights.map((g) => ({ rolle: `gericht:${g.id}`, gericht: g }))];
  if (video && provider.arten.includes("video")) auftraege.push({ rolle: "heroVideo", typ: "video" });

  for (const { rolle, gericht, typ = "bild" } of auftraege) {
    if (eigene[slug]?.[rolle]) continue;
    if (!neu && manifest[rolle] && existsSync(path.join(ordner, manifest[rolle].datei))) continue;
    const basisRolle = rolle.startsWith("gericht:") ? "gericht" : rolle;
    const { prompt, negativ, format } = promptFuer(ds, basisRolle, gericht);
    try {
      const titel = { hero: "Foto folgt: Titelbild", haus: "Foto folgt: Unser Haus", team: "Foto folgt: Unser Team", bestseller: "Foto folgt: Bestseller" }[basisRolle] ?? `Foto folgt: ${gericht?.name ?? ""}`;
      const ergebnis = await provider.erzeuge({ ds, rolle: basisRolle, prompt, negativ, format, seed: seed + erzeugt.length, typ, titel });
      const datei = `${rolle.replace(":", "-")}.${ergebnis.endung}`;
      writeFileSync(path.join(ordner, datei), ergebnis.buffer);
      manifest[rolle] = {
        datei,
        herkunft: provider.name === "platzhalter" ? "platzhalter" : "ki",
        provider: provider.name,
        prompt,
        erzeugt: new Date().toISOString(),
        ...ergebnis.meta,
      };
      erzeugt.push(rolle);
    } catch (e) {
      fehler.push(`${rolle}: ${e.message}`);
    }
  }
  writeFileSync(kiManifestPfad(slug, dir), `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
  return { erzeugt, fehler, provider: provider.name };
}

/* ------------------------------------------------------------------ */
/* Auflösung für den Build                                             */
/* ------------------------------------------------------------------ */

function medium({ herkunft, src, datei = null, quelle, typ = "bild", zeigeBadge, fokus = "", wiedergabe = "", webm = null }) {
  const kennzeichnung = KENNZEICHNUNG[herkunft];
  return { src, datei, herkunft, kennzeichnung, badge: zeigeBadge ? kennzeichnung : null, quelle, typ, ...(fokus ? { fokus } : {}), ...(wiedergabe ? { wiedergabe } : {}), ...(webm ? { webm } : {}) };
}

/**
 * Löst jede Bildrolle einer Seite nach der Vorrangregel auf. Liefert das
 * Medien-Objekt, das siteBuilder.js erwartet. Einträge mit `datei` kopiert
 * schreibeSite() in den Ordner der Seite (medien/…), damit jede Seite für
 * sich allein lauffähig bleibt.
 *
 * Badges auf der Seite: KI-Material immer (Transparenz), Platzhalter nur an
 * den drei Haus-Fotos (Foto-Aufgabenliste wie in v1), eigene Fotos nie.
 */
export function loeseMedien({ slug, gestaltung, fiktiv = false, bildUrl = remoteImageUrl, eigene = ladeEigeneMedien(), leadEdits = loadLeadEdits(slug), kiDir = KI_DIR, offline = false, ds = null, konzeptVon = null }) {
  const eigeneSeite = eigene[slug] ?? {};
  const uploads = leadEdits?.bilder ?? {};
  const ki = ladeKiMedien(slug, kiDir);
  // Konzept-Demo (v2/DEMO-UMBAU.md): Hat ein echter Lead kein eigenes
  // Titelbild, trägt die Bühne die Medien der Küchenrichtung (Beispielseite),
  // gekennzeichnet als "Konzeptmaterial" – nie als Foto oder Film des Betriebs. Sobald ein
  // eigenes Titelbild da ist, bleibt der Konzeptsatz ganz weg (kein Mischen).
  const konzept = konzeptVon && !eigeneSeite.hero && !uploads.hero && !ki.hero ? eigene[konzeptVon] ?? {} : {};
  const badgeFuer = (rolle, herkunft) => herkunft === "ki" || (herkunft === "platzhalter" && ["haus", "team", "bestseller"].includes(rolle) && !fiktiv);

  const stockId = { hero: [gestaltung.heroImage, "hero"], haus: [gestaltung.hausBild, "ambiente"], team: [gestaltung.teamBild, "ambiente"] };

  function loese(rolle, { stock = null } = {}) {
    const e = eigeneSeite[rolle];
    if (e) {
      const endung = path.extname(e.datei);
      return medium({ herkunft: e.herkunft, src: `medien/${rolle.replace(":", "-")}${endung}`, datei: path.join(REPO, e.datei), quelle: `eigene:${e.quelle || "Chat"}`, typ: /\.(mp4|webm)$/i.test(endung) ? "video" : "bild", zeigeBadge: badgeFuer(rolle, e.herkunft), fokus: e.fokus, wiedergabe: e.wiedergabe, webm: e.webm ? { src: `medien/${rolle.replace(":", "-")}.webm`, datei: path.join(REPO, e.webm) } : null });
    }
    const upload = uploads[rolle];
    if (upload) {
      const lokal = path.join(UPLOADS_DIR, String(upload).replace(/^\/?uploads\//, ""));
      const vorhanden = existsSync(lokal);
      return medium({ herkunft: "eigen", src: vorhanden ? `medien/${rolle}${path.extname(lokal) || ".jpg"}` : upload, datei: vorhanden ? lokal : null, quelle: "dashboard-upload", typ: /\.(mp4|webm)$/i.test(String(upload)) ? "video" : "bild", zeigeBadge: false });
    }
    const kz = konzept[rolle];
    if (kz) {
      const endung = path.extname(kz.datei);
      return medium({ herkunft: "konzept", src: `medien/${rolle.replace(":", "-")}${endung}`, datei: path.join(REPO, kz.datei), quelle: `konzept:${konzeptVon}`, typ: /\.(mp4|webm)$/i.test(endung) ? "video" : "bild", zeigeBadge: true, fokus: kz.fokus, wiedergabe: kz.wiedergabe, webm: kz.webm ? { src: `medien/${rolle.replace(":", "-")}.webm`, datei: path.join(REPO, kz.webm) } : null });
    }
    const k = ki[rolle];
    if (k && existsSync(path.join(kiDir, slug, k.datei))) {
      return medium({ herkunft: k.herkunft, src: `medien/${k.datei}`, datei: path.join(kiDir, slug, k.datei), quelle: `${k.provider}${k.modell ? `:${k.modell}` : ""}`, typ: /\.mp4$/.test(k.datei) ? "video" : "bild", zeigeBadge: badgeFuer(rolle, k.herkunft) });
    }
    if (stock && !offline) {
      return medium({ herkunft: "platzhalter", src: bildUrl(stock[0], stock[1]), quelle: `stock:${stock[0]}`, zeigeBadge: badgeFuer(rolle, "platzhalter") });
    }
    if (ds) {
      return medium({ herkunft: "platzhalter", src: `data:image/svg+xml,${encodeURIComponent(platzhalterSvgSync(ds, rolle))}`, quelle: "platzhalter:svg", zeigeBadge: badgeFuer(rolle, "platzhalter") });
    }
    return null;
  }

  const medien = {
    hero: loese("hero", { stock: stockId.hero }),
    haus: loese("haus", { stock: stockId.haus }),
    team: loese("team", { stock: stockId.team }),
    bestseller: eigeneSeite.bestseller || uploads.bestseller || ki.bestseller || konzept.bestseller ? loese("bestseller") : null,
    heroVideo: eigeneSeite.heroVideo || uploads.heroVideo || ki.heroVideo || konzept.heroVideo ? loese("heroVideo") : null,
    // Eigene Ausschnitte fürs Handy (Bühne der Seiten mit Ausdruck) – nur, wenn wirklich geliefert.
    heroMobil: eigeneSeite.heroMobil || uploads.heroMobil || ki.heroMobil || konzept.heroMobil ? loese("heroMobil") : null,
    heroVideoMobil: eigeneSeite.heroVideoMobil || uploads.heroVideoMobil || ki.heroVideoMobil || konzept.heroVideoMobil ? loese("heroVideoMobil") : null,
    gericht: (g) => (g ? loese(`gericht:${g.id}`, { stock: g.bild ? [g.bild, "gericht"] : null }) : null),
  };
  return medien;
}

function platzhalterSvgSync(ds, rolle) {
  const r = ds.farben.rollen;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="${r.flaecheTief.hex}"/><text x="200" y="160" text-anchor="middle" font-family="Georgia, serif" font-size="18" fill="${r.textLeise.hex}">Foto folgt</text></svg>`;
}

/** Übersicht je Rolle für das Dashboard (Stage 7b). */
export function medienUebersicht(medien) {
  const zeile = (rolle, m) => (m ? { rolle, herkunft: m.herkunft, kennzeichnung: m.kennzeichnung, quelle: m.quelle, typ: m.typ, ...(m.wiedergabe ? { wiedergabe: m.wiedergabe } : {}) } : { rolle, herkunft: null, kennzeichnung: "–" });
  return ["hero", "heroMobil", "heroVideo", "heroVideoMobil", "haus", "team", "bestseller"].map((rolle) => zeile(rolle, medien[rolle]));
}

const BUEHNE_ROLLEN = [
  ["heroVideo", "Video Desktop (quer)"],
  ["heroVideoMobil", "Video Mobil (hoch)"],
  ["hero", "Poster quer"],
  ["heroMobil", "Poster hoch"],
];

/**
 * Medienstatus der Bühne (Dashboard, Build-Bericht): was vorhanden ist, woher
 * es kommt, wie ein Video abgespielt wird – und was fehlt und wie die Seite
 * dann reagiert. Es wird nie ein anderes Medium still als Ersatz eingesetzt.
 */
export function medienStatus(medien) {
  const zeilen = BUEHNE_ROLLEN.map(([rolle, label]) => {
    const m = medien?.[rolle];
    const echt = m?.src && m.quelle !== "platzhalter:svg";
    return {
      rolle,
      label,
      vorhanden: Boolean(echt),
      herkunft: echt ? m.herkunft : null,
      kennzeichnung: echt ? m.kennzeichnung : "",
      quelle: echt ? m.quelle : "",
      ...(echt && m.wiedergabe ? { wiedergabe: m.wiedergabe } : {}),
      ...(echt && m.webm ? { webm: true } : {}),
    };
  });
  const hat = (r) => zeilen.find((z) => z.rolle === r).vorhanden;
  const fehlend = [];
  if (!hat("heroVideo")) fehlend.push("Video Desktop fehlt – die Bühne zeigt das Poster (kein Ersatzvideo).");
  if (!hat("heroVideoMobil")) fehlend.push(hat("heroMobil") ? "Video Mobil fehlt – auf dem Handy steht das Hochformat-Poster (kein gestrecktes Querformat-Video)." : "Video Mobil fehlt.");
  if (!hat("hero")) fehlend.push("Poster quer fehlt – neutrale Fläche statt Foto.");
  if (!hat("heroMobil")) fehlend.push("Poster hoch fehlt – auf dem Handy wird das Querformat-Poster beschnitten.");
  return { zeilen, fehlend };
}

export { hashText };
