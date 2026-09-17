// Gästestimmen für die Landingpages.
//
// Echte Google-Rezensionen dürfen hier NICHT hinein: Google untersagt das
// Speichern von Rezensionstexten ausdrücklich (erlaubt ist dauerhaft nur die
// place_id), Bewertungen müssen live abgerufen und mit Attribution angezeigt
// werden. Dazu kommt, dass Rezensionen Namen echter Gäste enthalten – die auf
// einer unbeauftragten Entwurfsseite zu veröffentlichen wäre auch
// datenschutzrechtlich nicht sauber.
//
// Deshalb: Die erfundenen Beispiel-Lokale bekommen erfundene Stimmen, die
// Entwürfe echter Häuser bekommen erkennbare Platzhalter. Die einzige echte
// Sozialbestätigung auf einem Entwurf bleibt die Google-Gesamtnote, die schon
// im Hero steht.

export const STIMMEN = {
  bayerisch: [
    { text: "Schweinsbraten wie bei der Oma, nur ist die Portion deutlich größer. Die Kruste war genau richtig.", autor: "Andreas K.", wann: "vor 2 Wochen" },
    { text: "Wollten eigentlich nur schnell eine Brotzeit. Sind dann drei Stunden geblieben, weil der Wirt so gut erzählt.", autor: "Bettina R.", wann: "vor 1 Monat" },
    { text: "Im Sommer ist der Biergarten Gold wert. Trotz vollem Haus war die Bedienung flott und freundlich.", autor: "Thomas H.", wann: "vor 3 Wochen" },
  ],
  italienisch: [
    { text: "Der Teig macht den Unterschied. Rand luftig, Boden dünn – so kenne ich das sonst nur aus Neapel.", autor: "Marco L.", wann: "vor 1 Woche" },
    { text: "Haben mit vier Leuten spontan einen Tisch bekommen. Die Pasta kam frisch, nicht vorgekocht, das schmeckt man.", autor: "Sandra W.", wann: "vor 2 Monaten" },
    { text: "Kinder haben ihre Pizza halb geschafft, der Rest kam eingepackt mit. Kleine Geste, großer Unterschied.", autor: "Julia F.", wann: "vor 3 Wochen" },
  ],
  asiatisch: [
    { text: "Wok-Gerichte kommen in unter zehn Minuten und das Gemüse ist noch knackig. Genau so soll es sein.", autor: "Daniel P.", wann: "vor 1 Woche" },
    { text: "Sushi war erkennbar frisch geschnitten. Habe nach der Schärfe gefragt und bekam ehrliche Auskunft statt Verkaufsgerede.", autor: "Nina S.", wann: "vor 1 Monat" },
    { text: "Hole hier zweimal die Woche ab. Bestellung ist immer pünktlich fertig und richtig eingepackt.", autor: "Kerstin M.", wann: "vor 2 Wochen" },
  ],
  griechisch: [
    { text: "Der Grillteller für zwei reicht ehrlich gesagt für drei. Das Fleisch war zart, der Tzatziki hausgemacht.", autor: "Georgios A.", wann: "vor 3 Wochen" },
    { text: "Sitzen draußen immer gern. Man bekommt am Ende einen Ouzo aufs Haus, ohne dass man fragen muss.", autor: "Petra N.", wann: "vor 2 Monaten" },
    { text: "Bin mit einer Allergie da gewesen, die Küche hat mitgedacht und das Gericht ohne Umstände angepasst.", autor: "Michael B.", wann: "vor 1 Monat" },
  ],
  tuerkisch: [
    { text: "Fladenbrot kommt frisch aus dem Ofen, das schmeckt man sofort. Soße nach Wahl und nicht zu sparsam.", autor: "Emre Y.", wann: "vor 1 Woche" },
    { text: "Adana war schön scharf, so wie versprochen. Preis-Leistung stimmt hier einfach.", autor: "Stefan G.", wann: "vor 2 Wochen" },
    { text: "Auch spätabends noch freundlich und zügig. Habe noch nie länger als eine Viertelstunde gewartet.", autor: "Lisa D.", wann: "vor 1 Monat" },
  ],
  cafe: [
    { text: "Kuchen wechselt täglich und ist nie zu süß. Der Apfelkuchen mit Sahne ist mein Standardbesuch geworden.", autor: "Renate S.", wann: "vor 2 Wochen" },
    { text: "Kann hier stundenlang mit dem Laptop sitzen, ohne dass jemand komisch schaut. Kaffee ist richtig gut.", autor: "Jonas T.", wann: "vor 1 Woche" },
    { text: "Frühstück am Wochenende ohne Reservierung ist schwierig – aus gutem Grund. Lohnt sich das Warten.", autor: "Claudia H.", wann: "vor 1 Monat" },
  ],
};

// Bei Entwürfen echter Häuser bleiben die Karten bewusst leer. Erfundene
// Zitate mit fünf Sternen unter dem echten Namen eines Lokals wären als
// Bewertung lesbar – auch wenn oben "Entwurf" steht. Leere Plätze zeigen den
// Aufbau, ohne etwas zu behaupten.
export const PLATZHALTER_SLOTS = [
  "Ihre erste Bewertung",
  "Ihre zweite Bewertung",
  "Ihre dritte Bewertung",
];

export const PLATZHALTER_ERKLAERUNG =
  "Diese drei Plätze füllen wir mit echten Bewertungen Ihrer Gäste – auf Wunsch " +
  "direkt aus Google, dann halten sie sich von selbst aktuell.";

export function stimmenFuer(cuisine, { fiktiv }) {
  if (!fiktiv) return { stimmen: [], slots: PLATZHALTER_SLOTS, platzhalter: true };
  return { stimmen: STIMMEN[cuisine] ?? STIMMEN.bayerisch, slots: [], platzhalter: false };
}
