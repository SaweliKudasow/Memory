// Referenzen auf DOM-Elemente
const cards = document.querySelectorAll(".card"); // Kartenliste
const timerElement = document.getElementById("timeLeft"); // Timeranzeige
const flipCountElement = document.getElementById("flipCount"); // Umdrehungszähler
const flipsContainer = document.querySelector('.flips'); // Container für Beschriftung und Zähler
const resetButton = document.querySelector(".retry"); // Neustart-Button
const switchButton = document.querySelector(".switch"); // Modus-Umschalter (Open/Closed)

// Spielzustand
let matchedCard = 0; // Anzahl gefundener Paare
let cardOne, cardTwo; // aktuell ausgewählte Karten im geschlossenen Modus
let disableDeck = false; // Eingabe sperren, solange Animation/Prüfung läuft

let flipCount = 0; // Anzahl der Kartenumdrehungen (nur geschlossener Modus)
let attemptCount = 0; // Anzahl der Versuche (nur offener Modus)
let timeLeft = 60; // Restzeit in Sekunden
let timerId; // Intervall-ID des Timers
let gameEnded = false; // Kennzeichen: Spiel zu Ende
let isFirstFlip = false; // Startet den Timer beim ersten Nutzeraktion
let openMode = false; // Offener Modus: alle Karten sind aufgedeckt

// Dauer der Flip-Animation (muss zu CSS passen)
const FLIP_MS = 0;

// System der Bildpaare - jedes Bild hat sein eigenes Paar
const imagePairs = {
    'img-1.svg': 'img-1-paar.svg',
    'img-1-paar.svg': 'img-1.svg',
    'img-2.svg': 'img-2-paar.svg',
    'img-2-paar.svg': 'img-2.svg',
    'img-3.svg': 'img-3-paar.svg',
    'img-3-paar.svg': 'img-3.svg',
    'img-4.svg': 'img-4-paar.svg',
    'img-4-paar.svg': 'img-4.svg',
    'img-5.svg': 'img-5-paar.svg',
    'img-5-paar.svg': 'img-5.svg',
    'img-6.svg': 'img-6-paar.svg',
    'img-6-paar.svg': 'img-6.svg',
    'img-7.svg': 'img-7-paar.svg',
    'img-7-paar.svg': 'img-7.svg',
    'img-8.svg': 'img-8-paar.svg',
    'img-8-paar.svg': 'img-8.svg'
};

// (switchDeck entfernt, nutzen toggleOpenMode)

// Zählerbeschriftung ("Flips"/"Attempts") ändern, ohne #flipCount neu zu erstellen
function setCounterLabel(labelText) {
    if (!flipCountElement) return;
    const maybeTextNode = flipCountElement.previousSibling;
    if (maybeTextNode && maybeTextNode.nodeType === Node.TEXT_NODE) {
        maybeTextNode.nodeValue = labelText + ": ";
        return;
    }
    if (flipsContainer) {
        // Fallback: Struktur behutsam wiederherstellen
        flipsContainer.textContent = labelText + ": ";
        flipsContainer.appendChild(flipCountElement);
    }
}

// Funktion für den Timer
function startTimer() {
    timerId = setInterval(() => {
        timeLeft--; // Reduziert die Zeit
        timerElement.textContent = timeLeft; // Zeit auf dem Seite aktualisieren
        if (timeLeft <= 0) { // wenn Zeit abgelaufen ist
            clearInterval(timerId); // timer stoppen
            endGame("Time's up!"); // alert anzeigen und Spiel stoppen
            shuffleCard(); // Karten mischen
        }
    }, 1000); // Timer läuft jede Sekunde
}

// Spiel beenden und zurücksetzen
function endGame(message) {
    gameEnded = true; // Spiel ist beendet
    alert(message); // alert anzeigen
    resetGame(); // Spiel zurücksetzen
}

// Klick-Handler für eine Karte
function flipCard(e) {
    if (gameEnded) return; // nichts machen wenn das Spiel zu ende ist
    const clickedCard = e.currentTarget; // immer das <li class="card">-Element selbst

    // Offener Modus: Auswahl-Logik ohne tatsächliches Umdrehen
    if (openMode) {
        // Timer-Start im OpenMode beim ersten Klick (120 Sekunden)
        if (isFirstFlip) {
            isFirstFlip = false;
            if (!timerId) {
                timeLeft = 120;
                if (timerElement) timerElement.textContent = timeLeft;
                startTimer();
            }
        }
        // korrekte Beschriftung im offenen Modus sicherstellen
        setCounterLabel('Attempts');
        if (disableDeck) return;
        if (clickedCard.classList.contains('matched')) return; // bereits gefunden

        if (clickedCard.classList.contains('selected')) {
            clickedCard.classList.remove('selected');
            return;
        }

        clickedCard.classList.add('selected');
        const selectedCards = Array.from(document.querySelectorAll('.card.selected'));
        if (selectedCards.length < 2) return; // warten auf zweite Auswahl

        disableDeck = true;
        const [c1, c2] = selectedCards;
        const img1 = c1.querySelector('img')?.src || '';
        const img2 = c2.querySelector('img')?.src || '';

        // Jede Paarprüfung im offenen Modus zählt als Versuch
        attemptCount++;
        if (flipCountElement) flipCountElement.textContent = attemptCount;

        if (isPair(img1, img2)) { // Treffer: beide Karten markieren
            c1.classList.remove('selected');
            c2.classList.remove('selected');
            c1.classList.add('matched');
            c2.classList.add('matched');
            matchedCard++;
            // matchedCard zählt Paare; im geschlossenen Modus wird bei Treffer inkrementiert.
            // Hier ebenfalls zählen. Insgesamt 8 Paare.
            if (matchedCard >= 8) { // Sieg im OpenMode
                // Timer sofort stoppen, Anzeige später zurücksetzen
                if (timerId) { clearInterval(timerId); timerId = null; }
                isFirstFlip = true; // nächste Runde startet bei der ersten Auswahl
                // Verzögertes Zurücksetzen der Timeranzeige auf 120 s nach 3 Sekunden
                setTimeout(() => {
                    timeLeft = 120;
                    if (timerElement) timerElement.textContent = timeLeft;
                }, 3000);

                startConfetti();
                setTimeout(() => {
                    stopConfetti();
                    // Nächste Runde im OpenMode vorbereiten (mit Flip-Animation)
                    prepareNextRoundOpenMode();
                    disableDeck = false;
                }, 2000);
            } else {
                disableDeck = false;
            }
        } else {
            // Kein Treffer: Fehlermarkierung + kurzes Schütteln, dann Auswahl zurücksetzen
            c1.classList.add('mismatch', 'shake');
            c2.classList.add('mismatch', 'shake');
            setTimeout(() => {
                c1.classList.remove('shake');
                c2.classList.remove('shake');
                c1.classList.remove('mismatch', 'selected');
                c2.classList.remove('mismatch', 'selected');
                disableDeck = false;
            }, 500);
        }
        return;
    }

    let clickedCardEl = clickedCard; // für die Kompatibilität unten

    if (clickedCard !== cardOne && !disableDeck) { // wenn das nicht dieselbe Karte ist
        clickedCard.classList.add("flip"); // Karte umdrehen
        flipCount++; // +1 Umdrehung
        flipCountElement.textContent = flipCount; // Umdrehungen auf die Seite aktualisieren

        if (isFirstFlip) { // wenn das die erste Umdrehung ist
            isFirstFlip = false; // erstes flip ist vorbei
            startTimer(); // Timer startet
        }

        if (!cardOne) {
            return cardOne = clickedCard; // wenn keine erste Karte ausgewählt ist, speichere die angeklickte Karte als erste
        }

        cardTwo = clickedCard; // angeklickte Karte als zweite speichern
        disableDeck = true; // man darf nicht anderen Karten anklicken bis dieses Paar überprüft wird
        let cardOneImg = cardOne.querySelector("img").src,
        cardTwoImg = cardTwo.querySelector("img").src;
        matchCards(cardOneImg, cardTwoImg); // beiden Karten vergleichen
    }
}

// Prüft, ob zwei Bild-Dateinamen ein gültiges Paar bilden
function isPair(img1, img2) {
    // Dateiname aus dem vollständigen Pfad extrahieren
    const fileName1 = img1.split('/').pop();
    const fileName2 = img2.split('/').pop();
    
    // Prüfen, ob ein Bild das Paar für das andere ist
    return imagePairs[fileName1] === fileName2;
}

// Vergleichslogik im geschlossenen Modus
function matchCards(img1, img2) {
    if (isPair(img1, img2)) { // wenn die Bilder ein Paar bilden
        matchedCard++; // +1 passende Paar
        if (matchedCard == 8) { // wenn alle 8 Paare gefunden sind
            // Geschlossener Modus: Timer sofort stoppen, Anzeige nach 3s auf 60 setzen
            if (timerId) { clearInterval(timerId); timerId = null; }
            isFirstFlip = true;
            setTimeout(() => {
                timeLeft = 60;
                if (timerElement) timerElement.textContent = timeLeft;
            }, 3000);

            startConfetti(); // Gratulation Effekt hinzufügen
            setTimeout(() => {
                stopConfetti(); // Gratulation Effekt beenden
                return shuffleCard(); // Karten werden neu gemischt
            }, 2000);
        }
        cardOne.removeEventListener("click", flipCard);
        cardTwo.removeEventListener("click", flipCard);
        cardOne = cardTwo = ""; // setzt Kartenvariablen zurück
        return disableDeck = false;
    }
    
    // wenn die Karten nicht übereinstimmen
    setTimeout(() => {
        // shake Animation wird hinzugefügt
        cardOne.classList.add("shake");
        cardTwo.classList.add("shake");
    }, 400);

    // nach der shake Animation werden die Karten wieder umgedreht
    setTimeout(() => {
        // entfernt die Animation und Karte dreht sich wieder um
        cardOne.classList.remove("shake", "flip");
        cardTwo.classList.remove("shake", "flip");
        cardOne = cardTwo = ""; // setzt Kartenvariablen zurück
        disableDeck = false; // man darf wieder Karten anklicken
    }, 1200);
}

// Mischen und initiales Aufbauen des Spielfelds (geschlossener Modus)
function shuffleCard() {
    // alles wird zurückgesetzt
    matchedCard = 0;
    disableDeck = false;
    cardOne = cardTwo = "";
    flipCount = 0;
    flipCountElement.textContent = flipCount;
    // geschlossener Modus standardmäßig: Beschriftung "Flips"
    setCounterLabel('Flips');
    timeLeft = 60;
    timerElement.textContent = timeLeft;

    // Array mit allen Bildern erstellen (jedes Bild und sein Paar)
    let imageArray = [
        'img-1.svg', 'img-1-paar.svg',
        'img-2.svg', 'img-2-paar.svg',
        'img-3.svg', 'img-3-paar.svg',
        'img-4.svg', 'img-4-paar.svg',
        'img-5.svg', 'img-5-paar.svg',
        'img-6.svg', 'img-6-paar.svg',
        'img-7.svg', 'img-7-paar.svg',
        'img-8.svg', 'img-8-paar.svg'
    ];
    imageArray.sort(() => Math.random() > 0.5 ? 1 : -1); // Zufällige Neuanordnung

    cards.forEach(card => {
        card.classList.add("hidden"); // die Bilder verschtecken sich
    });

    cards.forEach((card, index) => {
        card.classList.remove("flip"); // alle Karten drehen sich um

        // zufällige Bildquelle für jede Karte
        let imgTag = card.querySelector("img");
        imgTag.src = `Images/${imageArray[index]}`;
        card.addEventListener("click", flipCard); // Klick Event wird wieder hinzugefügt

        setTimeout(() => {
            card.classList.remove("hidden"); // Bilder wieder anzeigen
        }, 500);
    });

    clearInterval(timerId); // Timer zurücksetzen
    gameEnded = false; // Spiel ist nicht zu Ende
    isFirstFlip = true; // erste Umdrehung zurücksetzen
}

// Nächste Runde im OpenMode vorbereiten: Rahmen entfernen, mischen, wieder aufdecken
function prepareNextRoundOpenMode() {
    // Rahmenzustände entfernen
    cards.forEach(card => {
        card.classList.remove('selected', 'mismatch', 'matched');
    });
    matchedCard = 0;
    // Versuchszähler für die neue Runde zurücksetzen und anzeigen
    attemptCount = 0;
    if (flipCountElement) flipCountElement.textContent = attemptCount;
    setCounterLabel('Attempts');

    // alle Karten schließen
    cards.forEach(card => card.classList.remove('flip'));

    const FLIP_WAIT = ((typeof FLIP_MS === 'number' && FLIP_MS > 0) ? FLIP_MS : 250) + 50;

    // nach dem Schließen Bilder mischen und wieder öffnen
    setTimeout(() => {
        const imageArray = getImageArray().sort(() => Math.random() > 0.5 ? 1 : -1);
        cards.forEach((card, index) => {
            const imgTag = card.querySelector('img');
            if (imgTag) imgTag.src = `Images/${imageArray[index]}`;
        });

        // im nächsten Frame öffnen für flüssige Animation
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                cards.forEach(card => card.classList.add('flip'));
            });
        });
    }, FLIP_WAIT);
}

// Hilfsfunktion: Bildliste (jedes Bild mit passendem Paar)
function getImageArray() {
    return [
        'img-1.svg', 'img-1-paar.svg',
        'img-2.svg', 'img-2-paar.svg',
        'img-3.svg', 'img-3-paar.svg',
        'img-4.svg', 'img-4-paar.svg',
        'img-5.svg', 'img-5-paar.svg',
        'img-6.svg', 'img-6-paar.svg',
        'img-7.svg', 'img-7-paar.svg',
        'img-8.svg', 'img-8-paar.svg'
    ];
}

// Umschalten zwischen geschlossenem Modus und OpenMode inkl. Mischen
function toggleOpenMode() {
    if (disableDeck) return;
    if (!isFirstFlip) return; // Umschalten gesperrt, bis aktuelle Runde vorbereitet ist
    disableDeck = true;

    if (!openMode) {
        // In den OpenMode wechseln: erst mischen, dann aufdecken
        const imageArray = getImageArray().sort(() => Math.random() > 0.5 ? 1 : -1);
        cards.forEach((card, index) => {
            const imgTag = card.querySelector('img');
            if (imgTag) imgTag.src = `Images/${imageArray[index]}`;
        });
        // dann öffnen
        cards.forEach(card => card.classList.add('flip'));
        openMode = true;
        document.body.classList.add('open-mode');
        // beim Wechsel in den offenen Modus: Versuchszähler anzeigen und zurücksetzen
        attemptCount = 0;
        if (flipCountElement) flipCountElement.textContent = attemptCount;
        setCounterLabel('Attempts');
        // 120 s vorbereiten, aber erst nach der ersten Auswahl starten
        if (timerId) { clearInterval(timerId); timerId = null; }
        isFirstFlip = true;
        timeLeft = 120;
        if (timerElement) timerElement.textContent = timeLeft;
    } else {
        // Aus dem OpenMode: erst schließen, nach der Animation mischen (unsichtbar)
        cards.forEach(card => card.classList.remove('flip'));
        setTimeout(() => {
            const imageArray = getImageArray().sort(() => Math.random() > 0.5 ? 1 : -1);
            cards.forEach((card, index) => {
                const imgTag = card.querySelector('img');
                if (imgTag) imgTag.src = `Images/${imageArray[index]}`;
            });
            document.body.classList.remove('open-mode');
        }, FLIP_MS + 150);
        openMode = false;
        // 60 s für geschlossenen Modus vorbereiten, beim ersten Flip starten
        // beim Verlassen des offenen Modus: Anzeige zurück auf flipCount schalten
        if (flipCountElement) flipCountElement.textContent = flipCount;
        setCounterLabel('Flips');
        if (timerId) { clearInterval(timerId); timerId = null; }
        isFirstFlip = true;
        timeLeft = 60;
        if (timerElement) timerElement.textContent = timeLeft;
    }

    setTimeout(() => { disableDeck = false; }, FLIP_MS + 150);
}

// Function für refresh button
function resetGame() {
    if (disableDeck) return;
    // Wenn offen -> nur Bilder neu mischen, Flip-Zustand und Zähler/Timer behalten
    if (openMode) {
        disableDeck = true;
        // Timer für OpenMode auf 120 s zurücksetzen, bis zur ersten Auswahl nicht starten
        if (timerId) { clearInterval(timerId); timerId = null; }
        isFirstFlip = true;
        timeLeft = 120;
        if (timerElement) timerElement.textContent = timeLeft;
        // Versuchszähler zurücksetzen und anzeigen
        attemptCount = 0;
        if (flipCountElement) flipCountElement.textContent = attemptCount;
        setCounterLabel('Attempts');
        // alle Karten schließen
        cards.forEach(card => {
            card.classList.remove('flip');
            card.classList.remove('selected', 'mismatch', 'matched');
        });
        // Treffer-Paarzähler für die neue Runde zurücksetzen
        matchedCard = 0;

        const FLIP_WAIT = ((typeof FLIP_MS === 'number' && FLIP_MS > 0) ? FLIP_MS : 250) + 50;

        // nach Abschluss der Schließanimation Bilder mischen
        setTimeout(() => {
            const imageArray = getImageArray().sort(() => Math.random() > 0.5 ? 1 : -1);
            cards.forEach((card, index) => {
                const imgTag = card.querySelector('img');
                if (imgTag) imgTag.src = `Images/${imageArray[index]}`;
            });

            // dann im nächsten Frame alle Karten wieder öffnen
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    cards.forEach(card => card.classList.add('flip'));
                    setTimeout(() => { disableDeck = false; }, FLIP_WAIT);
                });
            });
        }, FLIP_WAIT);
        return;
    }
    // Normaler Reset im geschlossenen Modus
    shuffleCard(); // Karten werden gemischt
    isFirstFlip = true; // erste umdrehung zurücksetzen
}

// Event Listener wird zur Refresh Knopf
resetButton.addEventListener("click", resetGame);
if (switchButton) switchButton.addEventListener("click", toggleOpenMode);

// Touch-Press-Effekt für Telefone/Tablets: Klasse 'pressed' hinzufügen/entfernen
try {
    const isTouchCoarse = window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    if (isTouchCoarse) {
        const pressTargets = [resetButton, switchButton].filter(Boolean);
        pressTargets.forEach(btn => {
            const addPressed = () => btn.classList.add('pressed');
            const removePressed = () => btn.classList.remove('pressed');
            btn.addEventListener('touchstart', addPressed, { passive: true });
            btn.addEventListener('touchend', removePressed, { passive: true });
            btn.addEventListener('touchcancel', removePressed, { passive: true });
        });
    }
} catch (e) {
    // defensiv: keine Blockade, falls matchMedia nicht verfügbar
}

shuffleCard(); // Karten werden gemischt wenn die Seite geladen ist

// Klick Event für allen Karten wird hinzugefügt
cards.forEach(card => {
    card.addEventListener("click", flipCard);
});

// Секретная клавиша для запуска конфетти: нажмите C
document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'c') {
        startConfetti();
    }
});
