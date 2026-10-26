# 🌸 Aesthetic Flip Clock Focus Timer

Un timer Pomodoro e flip clock minimalista, elegante ed altamente reattivo, realizzato con design glassmorphism dark rose/plum, animazioni split-flap 3D realistiche, gestione audio con fallback sintetico e supporto avanzato per dispositivi mobile.

---

## ✨ Funzionalità Principali

- **Animazioni Flip Clock 3D**:
  - Simulazione meccanica dello split-flap con carte superiori e inferiori e piega centrale a cerniera.
  - Nessun effetto "glitch" o scatto al caricamento iniziale della pagina o al reset.
  - Accelerazione hardware GPU (`will-change: transform`, `preserve-3d`, `backface-visibility: hidden`).

- **Ottimizzazione Mobile & Schermi Piccoli**:
  - Design fluido scalabile tramite `clamp()` sia in modalità **verticale (portrait)** che **orizzontale (landscape)**.
  - Risoluzione dei problemi di viewport mobile (`100dvh` e supporto `safe-area-inset`).
  - **Touch-safe UI**: supporto per interazioni tattili per mostrare/nascondere la barra di controllo.
  - Pulsante galleggiante per richiamare i controlli su smartphone e tablet.
  - **Screen Wake Lock API**: impedisce al display dello smartphone di spegnersi durante la sessione di focus.

- **Audio Realistico con Fallback Sintetico**:
  - Riproduzione del suono meccanico dei flap (`flip.mp3`).
  - Fallback automatico sintetizzato tramite **Web Audio API** in caso di latenza o blocco browser.
  - Sequenza armonica e rilassante di campanelli alla fine del timer.
  - Interruttore on/off per i suoni con salvataggio delle preferenze in `localStorage`.

- **Controllo e Produttività**:
  - Conto alla rovescia estetico di 3 secondi (3... 2... 1...) all'avvio.
  - Ripresa immediata dopo la pausa (senza ripetere il countdown).
  - Preset veloci: **5 min**, **15 min**, **20 min**, **25 min (Pomodoro)**, **50 min**.
  - Barra di avanzamento fluida in tempo reale.
  - Titolo della scheda dinamico con tempo residuo e indicatore di stato.
  - Nascondi/Mostra controlli con un semplice clic sullo sfondo.

---

## 📁 Struttura del Progetto

```
timer/
├── index.html              # Struttura semantica HTML5 ottimizzata
├── css/
│   ├── style.css           # Layout master, glassmorphism, temi, controlli e responsive
│   └── flip-clock.css      # Componente 3D flip card, animazioni flap e proporzioni
├── js/
│   ├── audio.js            # Manager audio (HTML5 Audio + Web Audio API synthesizer)
│   ├── clock-flip.js       # Componente di rendering delle cifre split-flap
│   ├── timer.js            # Motore del timer, precisione timestamp, Wake Lock
│   └── app.js              # Controller UI, eventi touch/mouse e preset
├── assets/
│   └── flip.mp3            # Effetto sonoro meccanico
└── README.md               # Documentazione del progetto
```

---

## 🚀 Distribuzione

Il progetto è una Single Page Application statica al 100% (HTML, CSS e JavaScript vanilla senza dipendenze pesanti). Può essere eseguito direttamente aprendo `index.html` in qualsiasi browser moderno o pubblicato automaticamente su **GitHub Pages** (workflow GitHub Actions incluso in `.github/workflows/static.yml`).
