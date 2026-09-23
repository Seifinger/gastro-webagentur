// Screenshots für Judge (Stage 5) und Vorher/Nachher-Vergleich (Stage 8).
//
// Vor dem Auslösen wird die Seite einmal durchgescrollt, damit Bilder mit
// loading="lazy" wirklich geladen sind, und Bewegung ist abgeschaltet
// (reducedMotion: "reduce") – sonst fotografiert man Startzustände von
// Auftritts-Animationen statt der Seite.

export const ANSICHTEN = {
  desktop: { width: 1440, height: 900 },
  mobil: { width: 390, height: 844 },
};

export async function oeffneSeite(browser, url, { ansicht = "desktop", timeoutMs = 60_000 } = {}) {
  const kontext = await browser.newContext({ viewport: ANSICHTEN[ansicht], reducedMotion: "reduce", deviceScaleFactor: 1 });
  const seite = await kontext.newPage();
  await seite.goto(url, { waitUntil: "load", timeout: timeoutMs });
  await seite.evaluate(async () => {
    // Sonst scrollt scrollTo weich und der Screenshot fängt eine Zwischenposition.
    document.documentElement.style.scrollBehavior = "auto";
    const hoehe = document.documentElement.scrollHeight;
    for (let y = 0; y < hoehe; y += Math.round(window.innerHeight * 0.8)) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo(0, 0);
    await Promise.all(
      [...document.images].map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; setTimeout(r, 8000); }))),
    );
    if (document.fonts?.ready) await document.fonts.ready;
  });
  await seite.waitForTimeout(200);
  return { kontext, seite };
}

/** Ein Screenshot als JPEG. `ganz` = ganze Seite, sonst der erste Bildschirm. */
export async function fotografiere(browser, url, ziel, { ansicht = "desktop", ganz = false, qualitaet = 62 } = {}) {
  const { kontext, seite } = await oeffneSeite(browser, url, { ansicht });
  try {
    await seite.screenshot({ path: ziel, fullPage: ganz, type: "jpeg", quality: qualitaet });
  } finally {
    await kontext.close();
  }
  return ziel;
}
