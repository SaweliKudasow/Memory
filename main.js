const board = document.getElementById("gameBoard");
const restartBtn = document.getElementById("restart");
// Кнопка лёгкого режима удалена
const toggleOpenModeBtn = document.getElementById("toggleOpenMode");
const hintEl = document.getElementById("hint");

let flipped = [];
let selected = []; // для открытого режима
let lock = false;
// Лёгкий режим включается автоматически, когда открытный режим выключен
// easyMode больше не переключается пользователем
let easyMode = true;
let openMode = false; // новый открытый режим

// Длительности анимаций
const FLIP_MS = 600; // должно совпадать с transition у .inner
const SHAKE_MS = 400;

// 🔹 Определяем пары дробей
const pairs = [
  ["1/2", "2/4"],
  ["1/3", "2/6"],
  ["3/4", "6/8"],
  ["2/5", "4/10"],
  ["5/6", "10/12"],
  ["1/5", "2/10"],
  ["2/3", "4/6"],
  ["3/5", "6/10"]
];

// Палитра цветов для лёгкого режима
const colors = [
  "red", "blue", "green", "purple",
  "orange", "teal", "brown", "magenta"
];

let cards = [];
pairs.forEach(([a, b], index) => {
  cards.push({ pair: a, frac: a, color: colors[index] });
  cards.push({ pair: a, frac: b, color: colors[index] });
});

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

function createFractionHTML(frac, color) {
  const [num, den] = frac.split("/");
  // В открытом режиме всегда чёрный; при выключенном открытом режиме — цветной (лёгкий)
  const displayColor = openMode ? 'black' : color;
  return `
    <div class="fraction" style="color: ${displayColor}">
      <div class="numerator">${num}</div>
      <div class="denominator">${den}</div>
    </div>
  `;
}

function createBoard() {
  board.innerHTML = "";
  flipped = [];
  selected = [];
  lock = false;
  if (hintEl) {
    if (openMode) {
      // В открытом режиме по умолчанию показываем общую формулу
      renderGenericHint();
    } else {
      renderGenericHint();
    }
  }

  shuffle(cards).forEach(cardData => {
    const card = document.createElement("div");
    card.classList.add("card");
    card.dataset.pair = cardData.pair;
    card.dataset.frac = cardData.frac;

    const inner = document.createElement("div");
    inner.classList.add("inner");

    const front = document.createElement("div");
    front.classList.add("front");
    front.innerHTML = createFractionHTML(cardData.frac, cardData.color);

    const back = document.createElement("div");
    back.classList.add("back");
    back.textContent = "?";

    inner.appendChild(front);
    inner.appendChild(back);
    card.appendChild(inner);

    // В открытом режиме все карты сразу перевёрнуты
    if (openMode) {
      card.classList.add("flipped");
    }

    card.addEventListener("click", () => flipCard(card));
    board.appendChild(card);
  });
}

function allPairsFound() {
  // Количество уникальных пар равно pairs.length, matched-карты помечены классом matched
  const matchedCards = board.querySelectorAll('.card.matched').length;
  return matchedCards === cards.length; // т.к. matched ставится на обе карточки пары
}

async function handleWin() {
  lock = true;
  const allCards = Array.from(board.querySelectorAll('.card'));
  
  if (openMode) {
    // Конфетти запускается сразу, создавая длинную паузу как в закрытом режиме
    await window.runConfetti(3000);

    // После паузы начинаем последовательность закрытия → пересоздания → открытия
    // 1) Закрыть все карты анимацией
    allCards.forEach(card => card.classList.remove('flipped'));
    await new Promise(r => setTimeout(r, FLIP_MS));

    // 2) Пересортировать и отрисовать заново
    createBoard();

    // 3) Убедиться, что стартуем из закрытого состояния
    const freshlyBuilt = Array.from(board.querySelectorAll('.card'));
    freshlyBuilt.forEach(card => card.classList.remove('flipped'));

    // 4) На следующий кадр открыть все карты анимацией
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    freshlyBuilt.forEach(card => card.classList.add('flipped'));
    await new Promise(r => setTimeout(r, FLIP_MS));

    lock = false;
    return;
  }

  // Обычный режим (как было)
  // Перевернуть все карты лицом вверх, чтобы было видно завершение
  allCards.forEach(card => card.classList.add('flipped'));

  await window.runConfetti(3000);

  // Перевернуть все назад и перезапустить игру
  allCards.forEach(card => card.classList.remove('flipped'));
  setTimeout(() => {
    createBoard();
  }, FLIP_MS);
}

function flipCard(card) {
  if (lock) return;

  // В закрытом режиме всегда показываем общую формулу (без чисел)
  if (hintEl && card.dataset.frac && !openMode) {
    renderGenericHint();
  }

  if (openMode) {
    // Открытый режим: работаем с выбранными картами и обновляем подсказку
    if (card.classList.contains("matched")) return;

    if (card.classList.contains("selected")) {
      // Деактивация: убираем карту из выбранных
      card.classList.remove("selected");
      selected = selected.filter(c => c !== card);
      // Если больше нет выбранных — показываем общую формулу
      if (selected.length === 0) {
        renderGenericHint();
      } else {
        // Иначе показываем формулу по последней выбранной карте
        const last = selected[selected.length - 1];
        if (last && last.dataset.frac) updateHint(last.dataset.frac);
      }
      return;
    }

    card.classList.add("selected");
    selected.push(card);
    // Показать цифры для выбранной карты
    if (card.dataset.frac) updateHint(card.dataset.frac);

    if (selected.length === 2) {
      const [c1, c2] = selected;
      lock = true;
      setTimeout(() => {
        if (c1.dataset.pair === c2.dataset.pair) {
          c1.classList.remove("selected");
          c2.classList.remove("selected");
          c1.classList.add("matched");
          c2.classList.add("matched");
          selected = [];
          // После совпадения вернём общую формулу
          renderGenericHint();
          lock = false;
          if (allPairsFound()) {
            handleWin();
          }
        } else {
          c1.classList.remove("selected");
          c2.classList.remove("selected");
          c1.classList.add("mismatch");
          c2.classList.add("mismatch");
          c1.classList.add("shake");
          c2.classList.add("shake");
          setTimeout(() => {
            c1.classList.remove("shake");
            c2.classList.remove("shake");
            c1.classList.remove("mismatch");
            c2.classList.remove("mismatch");
            selected = [];
            // После рассинхрона тоже вернём общую формулу
            renderGenericHint();
            lock = false;
          }, SHAKE_MS);
        }
      }, 250);
    }
  } else {
    // Обычный режим
    if (card.classList.contains("flipped")) return;

    card.classList.add("flipped");
    flipped.push(card);

    if (flipped.length === 2) {
      const [c1, c2] = flipped;
      if (c1.dataset.pair === c2.dataset.pair) {
        setTimeout(() => {
          c1.classList.add("matched");
          c2.classList.add("matched");
          if (allPairsFound()) {
            handleWin();
          }
        }, FLIP_MS);
        flipped = [];
      } else {
        lock = true;
        setTimeout(() => {
          c1.classList.add("mismatch");
          c2.classList.add("mismatch");
          c1.classList.add("shake");
          c2.classList.add("shake");
          setTimeout(() => {
            c1.classList.remove("shake");
            c2.classList.remove("shake");
            c1.classList.remove("mismatch");
            c2.classList.remove("mismatch");
            c1.classList.remove("flipped");
            c2.classList.remove("flipped");
            flipped = [];
            lock = false;
          }, SHAKE_MS);
        }, FLIP_MS);
      }
    }
  }
}

function renderGenericHint() {
  if (!hintEl) return;
  hintEl.innerHTML = `
    <span style="display:inline-flex;align-items:center;gap:8px;">
      <span class="fraction">
        <span class="numerator">a</span>
        <span class="denominator">b</span>
      </span>
      = a ÷ b * 100 = ... %
    </span>
  `;
}

function updateHint(frac) {
  const [aStr, bStr] = frac.split("/");
  const a = Number(aStr);
  const b = Number(bStr);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) {
    hintEl.innerHTML = "";
    return;
  }
  const percent = (a / b) * 100;
  const percentStr = Number.isInteger(percent)
    ? String(percent)
    : percent.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');

  hintEl.innerHTML = `
    <span style="display:inline-flex;align-items:center;gap:8px;">
      <span class="fraction">
        <span class="numerator">${a}</span>
        <span class="denominator">${b}</span>
      </span>
      = ${a} ÷ ${b} * 100 = ${percentStr} %
    </span>
  `;
}

async function closeOpenCardsThen(cb) {
  if (lock) return;
  
  if (openMode) {
    // В открытом режиме просто сбрасываем выбранные карты
    const selectedCards = Array.from(board.querySelectorAll('.card.selected'));
    selectedCards.forEach(card => card.classList.remove('selected'));
    selected = [];
  } else {
    // В обычном режиме закрываем открытые карты
    const openCards = Array.from(board.querySelectorAll('.card.flipped'));
    if (openCards.length === 0) {
      cb && cb();
      return;
    }
    lock = true;
    openCards.forEach(card => card.classList.remove('flipped'));
    await new Promise(r => setTimeout(r, FLIP_MS));
    lock = false;
  }
  
  cb && cb();
}

restartBtn.addEventListener("click", () => {
  if (openMode) {
    // В открытом режиме: закрыть -> пересортировать -> открыть
    if (lock) return;
    lock = true;
    const all = Array.from(board.querySelectorAll('.card'));
    all.forEach(card => card.classList.remove('flipped'));
    setTimeout(() => {
      createBoard();
      const rebuilt = Array.from(board.querySelectorAll('.card'));
      rebuilt.forEach(card => card.classList.remove('flipped'));
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          rebuilt.forEach(card => card.classList.add('flipped'));
          setTimeout(() => { lock = false; }, FLIP_MS);
        });
      });
    }, FLIP_MS);
  } else {
    // В закрытом режиме: поведение как раньше
    closeOpenCardsThen(() => {
      createBoard();
    });
  }
});

// Обработчик лёгкого режима удалён — он управляется автоматически

toggleOpenModeBtn.addEventListener("click", () => {
  closeOpenCardsThen(() => {
    openMode = !openMode;
    toggleOpenModeBtn.textContent = openMode ? "Open Modus ausschalten" : "Open Modus";
    // При включении открытого режима лёгкий режим считается выключенным (чёрные дроби)
    // При выключении открытого режима – автоматически лёгкий (цветной)
    easyMode = !openMode;
    animateFlipAll(openMode);
  });
});

createBoard();

function animateFlipAll(toOpenMode) {
  const allCards = Array.from(board.querySelectorAll('.card'));
  if (allCards.length === 0) {
    // если поле пустое, просто пересоздаём
    if (toOpenMode) {
      renderGenericHint();
    } else {
      renderGenericHint();
    }
    createBoard();
    return;
  }
  lock = true;
  
  if (toOpenMode) {
    // При включении открытого режима: сразу обновляем содержимое и открываем
    board.innerHTML = "";
    flipped = [];
    selected = [];
    
    shuffle(cards).forEach(cardData => {
      const card = document.createElement("div");
      card.classList.add("card");
      card.dataset.pair = cardData.pair;
      card.dataset.frac = cardData.frac;

      const inner = document.createElement("div");
      inner.classList.add("inner");

      const front = document.createElement("div");
      front.classList.add("front");
      front.innerHTML = createFractionHTML(cardData.frac, cardData.color);

      const back = document.createElement("div");
      back.classList.add("back");
      back.textContent = "?";

      inner.appendChild(front);
      inner.appendChild(back);
      card.appendChild(inner);

      card.addEventListener("click", () => flipCard(card));
      board.appendChild(card);
    });

    // В открытом режиме по умолчанию показываем общую формулу
    renderGenericHint();

    // Открываем анимированно
    const newCards = Array.from(board.querySelectorAll('.card'));
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        newCards.forEach(card => card.classList.add('flipped'));
        setTimeout(() => {
          lock = false;
        }, FLIP_MS);
      });
    });
  } else {
    // При выключении открытого режима: сначала переворачиваем назад, потом обновляем содержимое
    allCards.forEach(card => card.classList.remove('flipped'));
    
    setTimeout(() => {
      // После анимации переворота обновляем содержимое
      board.innerHTML = "";
      flipped = [];
      selected = [];
      
      shuffle(cards).forEach(cardData => {
        const card = document.createElement("div");
        card.classList.add("card");
        card.dataset.pair = cardData.pair;
        card.dataset.frac = cardData.frac;

        const inner = document.createElement("div");
        inner.classList.add("inner");

        const front = document.createElement("div");
        front.classList.add("front");
        front.innerHTML = createFractionHTML(cardData.frac, cardData.color);

        const back = document.createElement("div");
        back.classList.add("back");
        back.textContent = "?";

        inner.appendChild(front);
        inner.appendChild(back);
        card.appendChild(inner);

        card.addEventListener("click", () => flipCard(card));
        board.appendChild(card);
      });

      renderGenericHint();
      lock = false;
    }, FLIP_MS);
  }
}
