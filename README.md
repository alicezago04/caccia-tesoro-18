# 🎉 Caccia al Tesoro · 18 Anni

Un piccolo videogioco-avventura da regalare per il 18° compleanno. La protagonista
è un'eroina personalizzabile che attraversa **5 zone**, supera enigmi e raccoglie
oggetti magici fino ad aprire la cassaforte con il vero indizio per il regalo!

Funziona in qualsiasi browser, **senza installare niente** e senza connessione.

---

## 🎮 Come si gioca

L'eroina **cammina** in un mondo a scorrimento. Avvicinati a un oggetto per far
comparire il suo **fumetto** (es. *"Parla con il guardiano"*): da PC premi **E**,
da telefono **tocca l'oggetto** per affrontare la sfida. Superata la sfida,
raggiungi il **passaggio luminoso** ✨ (premi **E** oppure toccalo) per andare
alla zona successiva.

| Azione | Tastiera (PC) | A schermo (telefono/tablet) |
|--------|----------|------------------------------|
| Muoversi | ← → oppure A / D | pulsanti ◀ ▶ |
| Saltare | ↑ / W / Spazio | pulsante ⤴ |
| Interagire / avanzare | E / Invio | **tocca** l'oggetto o il passaggio ✨ |

---

## ▶️ Come avviarlo (modo facile)

Apri il file **`index.html`** con un doppio clic. Fine! 🎈

> Se il puzzle con una *tua foto* non si vede (alcuni browser bloccano i file
> locali), usa il metodo qui sotto con Live Server: risolve tutto.

## ▶️ Come avviarlo con VS Code + Live Server (consigliato)

1. Apri la cartella in **VS Code**.
2. Installa l'estensione **Live Server**.
3. Clic destro su `index.html` → **"Open with Live Server"**.
4. Si apre nel browser e si aggiorna da solo a ogni modifica. ✨

---

## ✏️ Come personalizzarlo

Apri **`config.js`**: è scritto in italiano e contiene **tutto** ciò che puoi
cambiare. Non serve toccare altri file.

| Cosa | Dove in `config.js` |
|------|---------------------|
| Nome di tua sorella | `sister.name` |
| Colori dell'avatar (capelli, vestito…) | `sister.hairColor`, `sister.dressColor`… |
| **Sprite pixel-art dell'avatar** (PNG) | `sister.sprite` |
| Foto sul viso dell'avatar disegnato (opz.) | `sister.facePhoto` |
| **Sfondi pixel-art per zona** | `backgrounds` (+ `groundLevel`) |
| Pixel netti (pixel-art) | `pixelArt` |
| Data di compleanno | `birthday` |
| Foto del puzzle (Zona 1) | `zone1.puzzleImage` |
| Domande del quiz (Zona 2) | `zone2.questions` |
| Difficoltà gioco di memoria (Zona 3) | `zone3.rounds`, `zone3.startLength` |
| **Codice della cassaforte** | `zone5.safeCode` |
| Indizio del codice | `zone5.hint` |
| Messaggio finale | `zone5.finalMessage` |
| **Indizio del regalo fisico** | `zone5.giftClue` |
| Musica di sottofondo (opz.) | `music` |

### Per le domande del quiz
Ogni domanda ha le risposte in `options` e `answer` = **il numero della risposta
giusta** (si conta da 0: la prima è `0`, la seconda `1`, ecc.).

### Per le foto
Metti i file nella cartella `assets/images/` e scrivi il percorso in `config.js`.
Senza foto, il gioco usa una grafica disegnata già carina.

### 🟪 Usare grafica pixel-art tua (avatar + sfondi)
Puoi sostituire la grafica disegnata con immagini tue in stile pixel-art:

- **Avatar:** salva un PNG del personaggio in piedi, **rivolto a destra**
  (il gioco lo specchia da solo quando va a sinistra) e scrivi in `config.js`:
  `sister.sprite: "assets/images/avatar.png"`.
- **Sfondi:** per ogni zona puoi mettere un'immagine **larga** (consigliato es.
  ~1600×520 px) che fa da scenario; l'eroina ci cammina sopra. In `config.js`:
  `backgrounds: { 1: "assets/images/zona1.png", … }`.
- **Allineare i piedi:** se l'avatar "galleggia" o sprofonda nel tuo sfondo,
  regola il numero in `groundLevel` per quella zona (pixel dal basso).
- `pixelArt: true` mantiene i pixel netti (non sfocati) quando l'immagine è ingrandita.

> Le immagini sono tutte **opzionali**: quelle che non imposti restano con la
> grafica generata dal gioco. ⚠️ Con immagini locali usa **Live Server**
> (alcuni browser bloccano i file aperti col doppio clic).

### 🗺️ La mappa
Durante il gioco, **tocca la mini-mappa** in alto a destra per aprire il
**percorso completo**: vedi le zone già fatte ✅, dove ti trovi 📍 e quelle
ancora bloccate 🔒.

---

## 🗺️ Le 5 Zone

1. **🌳 La Radura dei Ricordi** — puzzle a incastro → *Mappa del Reame*
2. **🌉 Il Ponte dei Quiz** — 3 risposte giuste di fila → *Lanterna della Verità*
3. **🕳️ Le Grotte Misteriose** — gioco di memoria → *Chiave Dorata*
4. **🏰 Il Castello dei 18 Anni** — usa la chiave sul cancello
5. **🎁 La Sala della Cassaforte** — inserisci il codice → torta, auguri e **indizio del regalo!**

---

## 📁 Struttura del progetto

```
caccia-tesoro-18/
├── index.html      · la pagina del gioco
├── style.css       · grafica, temi e animazioni
├── script.js       · motore del gioco (non serve modificarlo)
├── config.js       · ⭐ QUI personalizzi tutto
└── assets/
    └── images/     · immagini del gioco (sprite, sfondi) e le tue foto
```

Buon divertimento e buon compleanno! 💖
