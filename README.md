# Mappe di Battaglia D&D

Programma gratuito per **disegnare mappe di battaglia per Dungeons & Dragons 5e** e **stamparle in scala reale**, per usarle al tavolo con le miniature.

- **1 casella = 1,5 m (5 ft) = 2,54 cm in stampa**, la scala giusta per miniature da 25–28 mm.
- Funziona **completamente offline**: nessun account, nessun abbonamento, nessuna connessione a internet (l'app blocca anche per sicurezza qualsiasi richiesta di rete).
- Interfaccia **in italiano**, per **Windows** e **macOS**.
- Tutte le texture e tutti gli elementi integrati sono **disegnati dal programma stesso**: nessun problema di licenza, puoi stampare e condividere le tue mappe liberamente.

---

## 1. Installazione passo passo (una volta sola)

Non serve saper programmare: bastano copia-e-incolla di pochi comandi.

### Passo 1 – Installa Node.js
Node.js è lo strumento (gratuito) che serve per avviare e "costruire" il programma.

1. Vai su <https://nodejs.org> e scarica la versione **LTS** (quella consigliata).
2. Installa con tutte le opzioni predefinite (Avanti, Avanti, Fine).

### Passo 2 – Apri il terminale nella cartella del progetto
- **Windows:** apri la cartella `dnd-battlemap` in Esplora file, clicca sulla barra dell'indirizzo, scrivi `powershell` e premi Invio.
- **macOS:** apri l'app *Terminale*, scrivi `cd ` (con lo spazio finale), trascina dentro la cartella `dnd-battlemap` e premi Invio.

### Passo 3 – Installa le componenti del programma
Nel terminale scrivi e premi Invio:

```
npm install
```

Ci vogliono alcuni minuti e serve internet **solo questa volta**. Alla fine compare "added … packages": è normale che ci siano degli avvisi (*warn*).

---

## 2. Avviare il programma

```
npm run dev
```

Si apre la finestra di "Mappe di Battaglia D&D". Per chiuderla usa la **X** della finestra; nel terminale premi `Ctrl+C`.

## 3. Creare l'eseguibile (da usare senza terminale)

Dalla stessa cartella:

| Sistema | Comando | Cosa ottieni (nella cartella `dist/`) |
|---|---|---|
| **Windows** | `npm run dist:win` | un installatore `…Setup….exe` e una versione "portatile" `.exe` (nessuna installazione, si può mettere su chiavetta USB) |
| **macOS** | `npm run dist:mac` | un file `…-mac.dmg` ("universale": funziona sui Mac Intel e su quelli con chip Apple M1/M2/M3/M4): aprilo e trascina l'app in *Applicazioni* |

Note importanti:

- **L'eseguibile per Windows va costruito su un computer Windows, quello per macOS su un Mac.** (È una limitazione degli strumenti di costruzione, non del programma.)
- La costruzione richiede internet la prima volta (scarica i componenti di base) e qualche minuto.
- Il programma non è "firmato" (le firme digitali sono a pagamento), quindi al primo avvio il sistema può avvisare:
  - **Windows** ("Windows ha protetto il PC"): clicca **Ulteriori informazioni → Esegui comunque**.
  - **macOS** ("sviluppatore non identificato"): clic destro (o Ctrl+clic) sull'app → **Apri** → **Apri**.
- Una volta creato l'eseguibile, il programma funziona senza internet e senza Node.js.

---

## 4. La tua prima mappa in 5 minuti

1. **Nuova** → scegli un modello (per esempio *Taverna*) oppure *Mappa vuota* e indica la dimensione in caselle (es. 30 × 20).
2. **Pavimenti:** nel pannello *Terreno* scegli una texture (pietra, legno, erba…) e usa Pennello, Secchiello, Rettangolo o Poligono dalla barra a sinistra.
3. **Muri:** strumento *Muro* (W): trascina lungo la griglia. Con *Stanza* (Q) trascini in diagonale e ottieni i quattro muri. Poi usa il **Secchiello** dentro la stanza: il riempimento si ferma ai muri.
4. **Porte e finestre:** strumento *Porte* (D), scegli il tipo (porta, chiusa a chiave, **segreta**, finestra, grata, passaggio) e clicca su un muro.
5. **Arredi:** scheda *Libreria*: clicca un elemento e poi sulla mappa (o trascinalo). Seleziona per spostare, ruotare, ridimensionare, ribaltare, ricolorare, duplicare o bloccare.
6. **Per il Master:** trappole, note del Master (strumento *M*) e porte segrete sono visibili solo nella versione Master.
7. **Esporta / Stampa:** scegli *PDF in scala reale su più fogli*, premi **Anteprima di stampa** per controllare e poi **Esporta…**.

### Stampare e montare la mappa
- Stampa il PDF al **100 %** ("dimensione reale"), *senza* "adatta alla pagina". Nella pagina di montaggio c'è un **quadrato da 2,54 cm** per verificare la scala.
- Ogni foglio ha **segni di taglio** agli angoli e il **numero del foglio** con i vicini (▲ ◀ ▶ ▼). Taglia i margini bianchi e, a sinistra e in alto, la striscia di sovrapposizione (linea rossa tratteggiata), poi accosta i fogli come nello schema e incollali dietro con il nastro adesivo.
- **Due versioni:** "Master" (completa) e "Giocatori" (senza livello Master, le porte segrete diventano muri). Puoi esportarle insieme.
- **Risparmio inchiostro:** *Colori*, *Risparmio (chiaro)* oppure *Bianco e nero*.
- Altri formati: PDF o PNG su una sola pagina (ridotta), PNG ad alta risoluzione a **300 DPI** in scala reale.

---

## 5. Guida alle funzioni

### Mappa e griglia
- Griglia **quadrata** o **esagonale** (Impostazioni mappa: clic sul nome della mappa in alto). Dimensione in caselle.
- Griglia visibile/nascosta (tasto **G**), colore, spessore e trasparenza regolabili.
- **Zoom** con la rotellina, **spostamento** con lo strumento Mano oppure tenendo premuto **Spazio** e trascinando. **Aggancio alla griglia** attivabile/disattivabile in alto.

### Elementi della libreria
Arredi, Dungeon, Natura, Luci, Trappole, Segnalini (token numerati e colorati, in taglie da Minuta a Mastodontica) e simboli per mappe di Viaggio. Tutti si possono: spostare, **ruotare** (libera o a scatti di 90° con i pulsanti o con l'opzione "Rotazione a 90°"), **ridimensionare**, **ribaltare**, **duplicare**, **ricolorare**, **bloccare**.

### Elementi personalizzati (le tue immagini)
- **Importa** PNG, JPG, WebP o SVG: pulsante *Importa immagini…*, oppure **trascinale nella finestra**; con *Importa cartella…* (o trascinando una cartella) le importi tutte insieme. Puoi anche incollare un'immagine dagli appunti (Ctrl+V).
- Per ogni immagine: **nome, categoria, tag**, **dimensione in caselle** (es. 2×2 per una creatura Grande) e, se lo sfondo non è trasparente, **"Rendi trasparente un colore"** (clicca sull'anteprima per scegliere il colore, regola la tolleranza; "solo lo sfondo collegato ai bordi" evita di bucare l'interno della figura).
- Le immagini finiscono nella **tua libreria** (con ricerca per nome/tag/categoria), che resta salvata sul computer.
- **Backup e condivisione:** *Esporta libreria* crea un file `.dndlib`; *Importa libreria* lo carica su un altro computer.
- Le immagini usate in una mappa sono **salvate dentro il file della mappa**.

### Livelli
Terreno, Muri, Oggetti, Token, Note del Master: ognuno si può **nascondere** e **bloccare**. Il livello del Master (trappole, note, porte segrete) **non compare mai** nella versione per i giocatori. Il pulsante *Master / Giocatori* in alto mostra come sarà la versione per i giocatori.

### Progetti
- Formato `.dndmap` (un unico file, con le immagini incluse). **Salva / Apri** dal menu File.
- **Salvataggio automatico** ogni 20 secondi: se la mappa ha già un file viene aggiornato quel file; se non è mai stata salvata, viene tenuta una copia di recupero che il programma ti propone di ripristinare al riavvio.
- **Annulla / Ripeti illimitati**, copia, taglia, incolla, duplica.
- **Modelli:** stanza vuota, caverna, taverna, foresta, strada, mappa di viaggio.

### Fase 2
- **Generatore casuale** (pulsante *Genera*): dungeon (stanze, corridoi, porte anche segrete, arredi, trappole, numeri delle stanze), caverne e mappe di viaggio esagonali. Usa il "seme" per ritrovare la stessa mappa; il risultato è annullabile.
- **Token di carta** (pulsante *Token di carta*): crea un PDF di miniature di carta da ritagliare e piegare, a partire da un token numerato o da una tua immagine. Ogni striscia ha fronte, retro rovesciato e due alette per la base.
- **Mappe esagonali per i viaggi:** modello "Mappa di viaggio" o generatore; simboli di montagne, colline, foreste, città, villaggi, castelli, torri, rovine, caverne.

---

## 6. Scorciatoie da tastiera

| Tasto | Azione |
|---|---|
| Ctrl/⌘ + N · O · S · Maiusc+S | Nuova · Apri · Salva · Salva con nome |
| Ctrl/⌘ + E | Esporta / Stampa |
| Ctrl/⌘ + Z · Maiusc+Z (o Ctrl+Y) | Annulla · Ripeti |
| Ctrl/⌘ + C · X · V · D · A | Copia · Taglia · Incolla · Duplica · Seleziona tutto |
| Canc | Elimina la selezione |
| Frecce (Maiusc = piccolo passo) | Sposta la selezione |
| `[` e `]` | Ruota di 90° a sinistra / destra |
| Maiusc + H / V | Ribalta orizzontale / verticale |
| Spazio + trascina · rotellina | Sposta la vista · Zoom |
| G | Mostra/nascondi griglia |
| V · H | Selezione · Mano |
| B · F · R · P · E | Pennello · Secchiello · Rettangolo · Poligono · Gomma |
| W · Q · D · X | Muro · Stanza · Porte e finestre · Gomma muri |
| T · M · A · N | Testo · Nota Master · Freccia · Numero stanza |
| Esc | Annulla l'operazione / torna alla selezione |

L'elenco completo è anche nel menu *Aiuto → Scorciatoie da tastiera*.

---

## 7. Problemi comuni

- **macOS dice che l'app "non è supportata su questo Mac":** serve **macOS 11 Big Sur o successivo** (menu  → *Informazioni su questo Mac*). Se hai un vecchio `.dmg` con `arm64` o `x64` nel nome, cancella l'app da *Applicazioni* e ricrea il file con `npm run dist:mac`: ora viene prodotto un unico `.dmg` valido per tutti i Mac.
- **`npm` non è riconosciuto:** chiudi e riapri il terminale dopo aver installato Node.js; se persiste, riavvia il computer.
- **Errori durante `npm install`:** controlla di essere connesso a internet e di essere nella cartella giusta (quella che contiene `package.json`).
- **Il PDF stampato è troppo piccolo/grande:** nella finestra di stampa scegli "Dimensione reale / 100 %" invece di "Adatta".
- **Mappe molto grandi (oltre 100×100 caselle):** il disegno a schermo può rallentare; l'esportazione PNG a 300 DPI riduce da sola la risoluzione se la mappa è enorme, per non esaurire la memoria.
- **Dove sono i dati?** La libreria personale e le copie di recupero sono nella cartella dati dell'app (Windows: `%APPDATA%\Mappe di Battaglia D&D`, macOS: `~/Library/Application Support/Mappe di Battaglia D&D`).

---

## 8. Per chi vuole guardare dentro (sviluppo)

```
dnd-battlemap/
├─ package.json · electron.vite.config.ts · electron-builder.yml · tsconfig.json
├─ resources/icon.png                    icona dell'app
├─ src/main/index.ts                     processo Electron: finestra, menu in italiano, file su disco, blocco della rete
├─ src/preload/index.ts                  ponte sicuro tra interfaccia e sistema
├─ src/renderer/src/
│  ├─ core/        griglia quadrata/esagonale, pavimenti, texture procedurali, modelli, generatori
│  ├─ elements/    libreria vettoriale integrata (arredi, dungeon, natura, luci, trappole, segnalini, viaggio)
│  ├─ store/       stato della mappa con annulla/ripeti illimitati (zustand + immer)
│  ├─ canvas/      scena Konva condivisa da editor ed esportazione, strumenti, interazione
│  ├─ ui/          barra strumenti, pannelli, finestre di dialogo
│  ├─ io/          file .dndmap, libreria personale (IndexedDB), importazione immagini
│  └─ export/      suddivisione in fogli, PDF (pdf-lib), PNG 300 DPI, anteprima, token di carta
└─ tests/          test automatici (griglia, layout di stampa, file di progetto, generatori)
```

Comandi utili: `npm test` (test automatici), `npm run typecheck` (controllo dei tipi), `npm run web` (solo interfaccia nel browser, per sviluppo).

**Scelte tecniche:** l'editor e l'esportazione usano la *stessa* scena grafica, perciò ciò che vedi a schermo è ciò che stampi. Le misure sono in caselle (1 casella = 1 pollice = 72 pt), quindi la scala reale è esatta. I muri sono "bordi" della griglia: porte, finestre e porte segrete sono semplici tipi di bordo (per i giocatori una porta segreta si disegna come muro).

### Tecnologie (tutte open source con licenza permissiva)
Electron (MIT) · React (MIT) · TypeScript (Apache-2.0) · Konva e react-konva (MIT) · pdf-lib (MIT) · fflate (MIT) · zustand (MIT) · immer (MIT) · Vite ed electron-vite (MIT) · electron-builder (MIT) · Vitest (MIT).

Licenza del programma: **MIT** (vedi `LICENSE`).
