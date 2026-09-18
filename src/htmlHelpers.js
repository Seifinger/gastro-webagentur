// Generische String-/HTML-Helfer, die von den Sektionen und vom Orchestrator
// (landingPageGenerator.js) gemeinsam genutzt werden. Bewusst ohne
// Abhängigkeit auf Lead-/Theme-Wissen – reine Textbausteine.

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Verhindert, dass ein "</script>" in den Daten das Skript-Tag vorzeitig schließt.
export function jsonForScript(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function formatPrice(value) {
  return `${Number(value).toFixed(2).replace(".", ",")} €`;
}

export function formatCount(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function optionList(values) {
  return values.map((value) => `<option>${escapeHtml(value)}</option>`).join("");
}

// Fügt Klassennamen zusammen und lässt leere/falsy Werte weg – erspart das
// manuelle Trimmen von Leerzeichen bei bedingten Modifier-Klassen.
export function joinClasses(...classes) {
  return classes.filter(Boolean).join(" ");
}

function timeSlots(startMinutes, endMinutes, stepMinutes) {
  const slots = [];
  for (let m = startMinutes; m <= endMinutes; m += stepMinutes) {
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    slots.push(`${hh}:${mm}`);
  }
  return slots;
}

export { timeSlots };
