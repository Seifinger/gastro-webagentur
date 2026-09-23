// Kleine HTML- und CSS-Parser für den Anti-Slop-Lint und den Judge.
//
// Bewusst ohne Abhängigkeit: Sie müssen nur die Seiten lesen, die v2 selbst
// erzeugt (wohlgeformt, ohne Parser-Tücken wie ausgelassene End-Tags), nicht
// das offene Web.

const LEERE_ELEMENTE = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const ROHTEXT = new Set(["script", "style"]);

function attribute(roh) {
  const attrs = {};
  for (const [, name, , a, b, c] of roh.matchAll(/([^\s=/>]+)(\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    attrs[name.toLowerCase()] = a ?? b ?? c ?? "";
  }
  return attrs;
}

/** HTML → Baum aus { tag, attrs, kinder, text } (Textknoten: { text }). */
export function parseHtml(html) {
  const wurzel = { tag: "#dokument", attrs: {}, kinder: [] };
  const stapel = [wurzel];
  const muster = /<!--[\s\S]*?-->|<!doctype[^>]*>|<(\/?)([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>|([^<]+)|</gi;
  let m;
  while ((m = muster.exec(html)) !== null) {
    const [ganz, schliessend, tagRoh, attrRoh, text] = m;
    const oben = stapel[stapel.length - 1];
    if (text !== undefined) {
      oben.kinder.push({ text });
      continue;
    }
    if (!tagRoh) {
      if (ganz === "<") oben.kinder.push({ text: "<" });
      continue;
    }
    const tag = tagRoh.toLowerCase();
    if (schliessend) {
      for (let i = stapel.length - 1; i > 0; i -= 1) {
        if (stapel[i].tag === tag) {
          stapel.length = i;
          break;
        }
      }
      continue;
    }
    const knoten = { tag, attrs: attribute(attrRoh ?? ""), kinder: [], eltern: oben };
    oben.kinder.push(knoten);
    if (ROHTEXT.has(tag)) {
      const ende = html.toLowerCase().indexOf(`</${tag}`, muster.lastIndex);
      const inhalt = html.slice(muster.lastIndex, ende === -1 ? html.length : ende);
      knoten.kinder.push({ text: inhalt });
      muster.lastIndex = ende === -1 ? html.length : html.indexOf(">", ende) + 1;
      continue;
    }
    if (!LEERE_ELEMENTE.has(tag) && !/\/\s*$/.test(attrRoh ?? "")) stapel.push(knoten);
  }
  return wurzel;
}

export function* alleElemente(knoten) {
  for (const kind of knoten.kinder ?? []) {
    if (kind.tag) {
      yield kind;
      yield* alleElemente(kind);
    }
  }
}

export function elementKinder(knoten) {
  return (knoten.kinder ?? []).filter((k) => k.tag);
}

export function klassen(knoten) {
  return String(knoten.attrs?.class ?? "").split(/\s+/).filter(Boolean);
}

export function textInhalt(knoten) {
  if (knoten.text !== undefined) return knoten.text;
  if (ROHTEXT.has(knoten.tag)) return "";
  return (knoten.kinder ?? []).map(textInhalt).join("");
}

export function finde(wurzel, praedikat) {
  for (const el of alleElemente(wurzel)) if (praedikat(el)) return el;
  return null;
}

/* ------------------------------------------------------------------ */
/* CSS                                                                 */
/* ------------------------------------------------------------------ */

/** CSS → flache Liste { selektor, deklarationen: [{eigenschaft, wert}], media }. */
export function parseCss(css, media = null) {
  const regeln = [];
  const ohneKommentare = css.replace(/\/\*[\s\S]*?\*\//g, "");
  let i = 0;
  while (i < ohneKommentare.length) {
    const auf = ohneKommentare.indexOf("{", i);
    if (auf === -1) break;
    const kopf = ohneKommentare.slice(i, auf).trim();
    // passende schließende Klammer finden
    let tiefe = 1;
    let j = auf + 1;
    while (j < ohneKommentare.length && tiefe > 0) {
      if (ohneKommentare[j] === "{") tiefe += 1;
      else if (ohneKommentare[j] === "}") tiefe -= 1;
      j += 1;
    }
    const koerper = ohneKommentare.slice(auf + 1, j - 1);
    if (kopf.startsWith("@media") || kopf.startsWith("@supports")) {
      regeln.push(...parseCss(koerper, kopf));
    } else if (kopf.startsWith("@keyframes") || kopf.startsWith("@font-face")) {
      regeln.push({ selektor: kopf, deklarationen: deklarationen(koerper), media, at: true });
    } else if (kopf) {
      regeln.push({ selektor: kopf, deklarationen: deklarationen(koerper), media });
    }
    i = j;
  }
  return regeln;
}

function deklarationen(koerper) {
  const liste = [];
  let tiefe = 0;
  let start = 0;
  for (let k = 0; k <= koerper.length; k += 1) {
    const c = koerper[k];
    if (c === "(") tiefe += 1;
    else if (c === ")") tiefe -= 1;
    if ((c === ";" && tiefe === 0) || k === koerper.length) {
      const teil = koerper.slice(start, k).trim();
      start = k + 1;
      const doppelpunkt = teil.indexOf(":");
      if (doppelpunkt > 0 && !teil.includes("{")) {
        liste.push({ eigenschaft: teil.slice(0, doppelpunkt).trim().toLowerCase(), wert: teil.slice(doppelpunkt + 1).trim() });
      }
    }
  }
  return liste;
}

/** Die Custom Properties aus :root (ohne Media-Query) – Desktopwerte. */
export function rootVariablen(regeln) {
  const vars = {};
  for (const r of regeln) {
    if (r.media || r.selektor.trim() !== ":root") continue;
    for (const d of r.deklarationen) if (d.eigenschaft.startsWith("--")) vars[d.eigenschaft] = d.wert;
  }
  return vars;
}

/** Löst var(--x) rekursiv auf (Rückfallwerte werden berücksichtigt). */
export function loeseVariablen(wert, vars, tiefe = 0) {
  if (tiefe > 8) return wert;
  return wert.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\))*[^()]*))?\)/g, (_, name, rueckfall) =>
    loeseVariablen(vars[name] ?? rueckfall ?? "", vars, tiefe + 1),
  );
}

/** Kleinste Pixelgröße eines Werts (clamp → Minimum, rem → ×16). */
export function minPx(wert) {
  const zahlen = [...String(wert).matchAll(/(-?[\d.]+)(px|rem)/g)].map(([, n, e]) => Number(n) * (e === "rem" ? 16 : 1));
  if (zahlen.length === 0) return null;
  if (/^clamp\(/.test(wert.trim())) return zahlen[0];
  return Math.min(...zahlen);
}

/** Alle CSS-Texte einer Seite: <style>-Blöcke plus style-Attribute. */
export function cssAusHtml(html) {
  const bloecke = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
  const inline = [...html.matchAll(/\sstyle\s*=\s*"([^"]*)"/gi)].map((m, i) => `[style-attribut-${i}]{${m[1]}}`);
  return { bloecke: bloecke.join("\n"), inline: inline.join("\n") };
}
