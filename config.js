/* =====================================================================
    CONFIGURAZIONE DEL GIOCO  —  MODIFICA SOLO QUESTO FILE  
   =====================================================================
   Qui dentro c'è TUTTO quello che devi personalizzare per tua sorella.
   Non serve toccare gli altri file. Cambia i valori dopo i due punti ":".
   I testi vanno tra virgolette "così".  Salva e ricarica la pagina.
   ===================================================================== */

const CONFIG = {

  /* -------------------------------------------------------------------
     1) LA PROTAGONISTA
     ------------------------------------------------------------------- */
  sister: {
    name: "Alessandra",        // <-- il nome di tua sorella
    title: "l'Esploratrice",   // sottotitolo accanto al nome

    // Aspetto dell'avatar (sprite disegnato dal gioco, nessuna immagine richiesta).
    // Usa colori in formato esadecimale (#rrggbb). Ce ne sono di pronti qui sotto.
    skinColor: "#f4c9a3",      // incarnato
    hairColor: "#5b3a1e",      // colore capelli   (biondo: #e0b65c · nero: #2b2118 · rosso: #b5532a)
    dressColor: "#e0457b",     // colore vestito principale
    dressAccent: "#ffd34e",    // colore dettagli/accessori

    // (Opzionale) Foto del viso da incollare sull'avatar disegnato. Lascia null
    // per usare il visetto disegnato. Esempio: "assets/images/viso.png"
    facePhoto: null,

    // (Opzionale) SPRITE PIXEL-ART singolo: un PNG del personaggio in piedi,
    // rivolto a DESTRA. Se lo imposti, sostituisce l'avatar disegnato.
    sprite: null,

    // SET DI POSE ANIMATE (ritagliate dal tuo foglio pose). Se presente, ha la
    // precedenza: il gioco usa "idle" da fermo, alterna walkA/walkB camminando,
    // "jump" in salto e "celebrate" al traguardo. Tutte rivolte a destra
    // (il gioco le specchia da solo quando va a sinistra).
    sprites: {
      idle: "assets/images/avatar/idle.png",
      walkA: "assets/images/avatar/walk1.png",
      walkB: "assets/images/avatar/walk2.png",
      jump: "assets/images/avatar/jump.png",
      celebrate: "assets/images/avatar/celebrate.png",
      pickup: "assets/images/avatar/pickup.png",
      interact: "assets/images/avatar/interact.png",
      map: "assets/images/avatar/map.png",
    },
  },

  // Schermata iniziale e finale a tutto schermo (immagini tue). null = generata.
  startImage: "assets/images/inizio.png",
  finaleImage: "assets/images/auguri.png",

  // Immagine della mappa del percorso (si apre toccando la mini-mappa).
  // null = mappa generata automaticamente (elenco delle zone).
  mapImage: "assets/images/mappa.png",

  /* -------------------------------------------------------------------
     GRAFICA PERSONALIZZATA (sfondi pixel-art)  —  tutto opzionale
     ------------------------------------------------------------------- */
  // Mettere true mantiene i pixel netti (consigliato se usi pixel-art).
  pixelArt: true,

  // Uno sfondo LARGO per ogni zona (es. 1600x520 px). Sostituisce lo sfondo
  // e il terreno generati: l'eroina cammina sopra l'immagine.
  // Lascia null su una zona per tenere la grafica generata di quella zona.
  backgrounds: {
    1: "assets/images/radura.png",
    2: "assets/images/ponte.png",
    3: "assets/images/grotta.png",
    4: "assets/images/castello.png",
    5: "assets/images/cassaforte.png",
  },

  // Altezza del "pavimento" per zona, come FRAZIONE dell'altezza (0 = in basso,
  // 1 = in alto): regola per allineare i PIEDI dell'avatar al terreno dipinto.
  // Aumenta il numero se l'avatar sprofonda, diminuiscilo se "galleggia".
  groundLevel: {
    1: 0.10, 2: 0.55, 3: 0.06, 4: 0.04, 5: 0.05,
  },

  /* -------------------------------------------------------------------
     2) DATA DI COMPLEANNO  (serve per il codice della cassaforte)
     ------------------------------------------------------------------- */
  birthday: {
    day: 11,    // giorno
    month: 7,   // mese
    year: 2008, // anno
  },

  /* -------------------------------------------------------------------
     ZONA 1 — LA RADURA DEI RICORDI (puzzle a incastro)
     ------------------------------------------------------------------- */
  zone1: {
    // Immagine da ricomporre: una foto vostra, del suo animale, ecc.
    // Metti il file in assets/images/ e scrivi qui il percorso.
    // Se la lasci null, il gioco genera un'immagine-ricordo carina da solo.
    puzzleImage: "assets/images/puzzle.jpg", // foto da ricomporre
    pieces: 9,                    // da 4 a 24 — quante tessere (griglia automatica)
    reward: "Mappa del Reame",    // oggetto ottenuto
  },

  /* -------------------------------------------------------------------
     ZONA 2 — IL PONTE DEI QUIZ
     Servono almeno 3 domande. Ne basta indovinare 3 di fila.
     "answer" è l'INDICE della risposta giusta: 0 = prima, 1 = seconda, ecc.
     ------------------------------------------------------------------- */
  zone2: {
    guardianName: "Trollo il Saggio",
    reward: "Lanterna della Verità",
    questions: [
      {
        q: "Devi uscire e, come al solito, non hai niente da metterti. Come risolvi il problema?",
        options: [
          "Rubi qualcosa dall'armadio di tua sorella.",
          "Piangi in un angolo sperando in un miracolo.",
          "Metti gli stessi vestiti di sempre.",
          "Rinunci a uscire e resti in pigiama.",
        ],
        answer: 0,
      },
      {
        q: "Diamo un valore alle cose importanti della vita. Per cosa saresti disposta a fare follie a qualsiasi ora?",
        options: [
          "Per una sessione intensa di studio matto e disperatissimo.",
          "Per un bel vassoio di nuggets e patatine del Mc.",
          "Per andare a pulire spontaneamente tutta la casa.",
          "Per svegliarti presto la domenica mattina.",
        ],
        answer: 1,
      },
      {
        q: "Se i tuoi amici dovessero descrivere la tua giornata tipo ideale, dove ti troverebbero di sicuro?",
        options: [
          "In biblioteca a leggere libri.",
          "In palestra ad allenarti.",
          "Al supermercato a fare la spesa.",
          "Sotto le coperte a dormire.",
        ],
        answer: 3,
      },
    ],
  },

  /* -------------------------------------------------------------------
     ZONA 3 — LE GROTTE MISTERIOSE (gioco di memoria a sequenza)
     ------------------------------------------------------------------- */
  zone3: {
    reward: "Chiave Dorata",
    rounds: 4,        // quante sequenze superare per vincere
    startLength: 3,   // lunghezza della prima sequenza (cresce a ogni round)
  },

  /* -------------------------------------------------------------------
     ZONA 4 — IL CASTELLO DEI 18 ANNI (usa la chiave sul cancello)
     ------------------------------------------------------------------- */
  zone4: {
    castleName: "Castello dei 18 Anni",
  },

  /* -------------------------------------------------------------------
     ZONA 5 — IL GRAN FINALE (la cassaforte)
     ------------------------------------------------------------------- */
  zone5: {
    // Codice della cassaforte: la data di nascita 11/07/08 -> 110708 (GGMMAA).
    // Puoi metterne uno qualsiasi a 4 o 6 cifre, come stringa di numeri.
    safeCode: "110708",

    // Suggerimento mostrato vicino al tastierino.
    hint: "Cerca il giorno in cui tutto è iniziato.",

    // Messaggio personale che appare dopo aver aperto la cassaforte.
    finalMessage: "BUON COMPLEANNO! Hai superato tutte le prove da vera eroina. Ma il vero regalo ti aspetta...",

    // L'indizio per trovare il REGALO FISICO vero.
    giftClue: "Il regalo è...",
  },

  /* -------------------------------------------------------------------
     AUDIO (opzionale)
     Il gioco genera già gli effetti sonori da solo (non servono file).
     Se vuoi una musica di sottofondo, metti un file in assets/sounds/
     e scrivi qui il percorso. Lascia null per nessuna musica.
     ------------------------------------------------------------------- */
  music: null, // es: "assets/sounds/musica.mp3"
};
