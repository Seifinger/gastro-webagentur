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
  chinesisch: [
    { text: "Die Jiaozi sind offensichtlich von Hand gefaltet – ungleichmäßig und genau deshalb gut. Nachbestellt haben wir trotzdem.", autor: "Daniel P.", wann: "vor 1 Woche" },
    { text: "Habe nach der Schärfe beim Szechuan gefragt und eine ehrliche Antwort bekommen statt Verkaufsgerede. Es war scharf.", autor: "Nina S.", wann: "vor 1 Monat" },
    { text: "Die knusprige Ente ist ihren Preis wert. Hole sie alle zwei Wochen ab, sie ist nie durchgeweicht angekommen.", autor: "Kerstin M.", wann: "vor 2 Wochen" },
  ],
  thailaendisch: [
    { text: "Auf mittelscharf bestellt und genau das bekommen. Man merkt, dass die Currypaste nicht aus dem Glas kommt.", autor: "Tobias E.", wann: "vor 2 Wochen" },
    { text: "Tom Yum war so sauer und scharf, wie sie sein soll – nicht auf deutschen Geschmack abgemildert. Danke dafür.", autor: "Anja W.", wann: "vor 1 Monat" },
    { text: "Der Mango-Klebreis ist ein eigener Grund herzukommen. Kinder bekommen ihr Pad Thai ganz ohne Chili.", autor: "Markus L.", wann: "vor 3 Wochen" },
  ],
  vietnamesisch: [
    { text: "Die Brühe schmeckt nach zwölf Stunden und nicht nach Brühwürfel. Das ist selten geworden.", autor: "Christian F.", wann: "vor 1 Woche" },
    { text: "Sommerrollen sind frisch gerollt und nicht vorbereitet im Kühlregal gelegen. Man sieht den Unterschied sofort.", autor: "Meike B.", wann: "vor 2 Wochen" },
    { text: "Bánh Mì zum Mitnehmen in der Mittagspause – in fünf Minuten fertig und unterwegs nicht matschig geworden.", autor: "Sven K.", wann: "vor 1 Monat" },
  ],
  japanisch: [
    { text: "Der Reis ist gut gewürzt und noch warm, das machen die wenigsten richtig. Beim Lachs sieht man den Schnitt.", autor: "Verena M.", wann: "vor 1 Woche" },
    { text: "Ramen mit Ei, das innen noch cremig ist. Die Brühe habe ich ausgetrunken, was selten vorkommt.", autor: "Philipp R.", wann: "vor 3 Wochen" },
    { text: "Als Vegetarierin bekomme ich hier mehr als die übliche Gurkenrolle. Die Miso-Ramen sind vollwertig.", autor: "Katharina D.", wann: "vor 1 Monat" },
  ],
  indisch: [
    { text: "Man riecht beim Reinkommen, dass die Gewürze frisch geröstet werden. Das Butter Chicken ist mild, aber nicht langweilig.", autor: "Florian S.", wann: "vor 2 Wochen" },
    { text: "Naan kommt heiß aus dem Tandoor an den Tisch, nicht lauwarm aus der Wärmelampe. Riesiger Unterschied.", autor: "Simone H.", wann: "vor 1 Woche" },
    { text: "Die vegetarische Auswahl ist keine Beilagenliste, sondern eine eigene Karte. Palak Paneer war hervorragend.", autor: "Robert A.", wann: "vor 1 Monat" },
  ],
  syrisch: [
    { text: "Wir haben zu fünft Mezze bestellt und uns durchprobiert. Der Hummus ist cremiger als alles, was ich kenne.", autor: "Lena V.", wann: "vor 2 Wochen" },
    { text: "Das Fladenbrot wird hier wirklich selbst gebacken, man bekommt es warm nachgereicht ohne zu fragen.", autor: "Yannick T.", wann: "vor 1 Woche" },
    { text: "Schawarma vom Kalb ist saftig und nicht trocken vom Warmhalten. Dazu Tee aufs Haus, jedes Mal.", autor: "Birgit O.", wann: "vor 1 Monat" },
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
