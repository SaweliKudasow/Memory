const board = document.getElementById("gameBoard");
const restartBtn = document.getElementById("restart");
const toggleModeBtn = document.getElementById("toggleMode");
const toggleOpenModeBtn = document.getElementById("toggleOpenMode");

let flipped = [];
let selected = []; // для открытого режима
let lock = false;
let easyMode = false; // по умолчанию обычный режим
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
  // В открытом режиме всегда чёрный цвет
  const displayColor = openMode ? 'black' : (easyMode ? color : 'black');
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

  shuffle(cards).forEach(cardData => {
    const card = document.createElement("div");
    card.classList.add("card");
    card.dataset.pair = cardData.pair;

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
  // Перевернуть все карты лицом вверх, чтобы было видно завершение
  const allCards = Array.from(board.querySelectorAll('.card'));
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

  if (openMode) {
    // Открытый режим: работаем с выбранными картами
    if (card.classList.contains("matched")) return;

    if (card.classList.contains("selected")) {
      // Деактивация: убираем карту из выбранных
      card.classList.remove("selected");
      selected = selected.filter(c => c !== card);
      return;
    }

    card.classList.add("selected");
    selected.push(card);

    if (selected.length === 2) {
      const [c1, c2] = selected;
      lock = true;
      
      // Небольшая задержка, чтобы синий бордер второй карты был виден
      setTimeout(() => {
        if (c1.dataset.pair === c2.dataset.pair) {
          // Совпадение: зелёный бордер
          c1.classList.remove("selected");
          c2.classList.remove("selected");
          c1.classList.add("matched");
          c2.classList.add("matched");
          selected = [];
          lock = false;
          if (allPairsFound()) {
            handleWin();
          }
        } else {
          // Несовпадение: красный бордер и тряска
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
            lock = false;
          }, SHAKE_MS);
        }
      }, 250); // 250мс задержка для видимости синего бордера
    }
  } else {
    // Обычный режим
    if (card.classList.contains("flipped")) return;

    card.classList.add("flipped");
    flipped.push(card);

    if (flipped.length === 2) {
      const [c1, c2] = flipped;
      if (c1.dataset.pair === c2.dataset.pair) {
        // Совпадение: бордер появляется после окончания переворота
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
        // Ждём завершения переворота второй карты
        setTimeout(() => {
          // Красный бордер во время ошибки
          c1.classList.add("mismatch");
          c2.classList.add("mismatch");
          // Тряска
          c1.classList.add("shake");
          c2.classList.add("shake");
          setTimeout(() => {
            c1.classList.remove("shake");
            c2.classList.remove("shake");
            // Возвращаем серый бордер
            c1.classList.remove("mismatch");
            c2.classList.remove("mismatch");
            // Переворачиваем назад
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
  closeOpenCardsThen(() => {
    createBoard();
  });
});

toggleModeBtn.addEventListener("click", () => {
  closeOpenCardsThen(() => {
    easyMode = !easyMode;
    toggleModeBtn.textContent = easyMode ? "Выключить лёгкий режим" : "Включить лёгкий режим";
    createBoard();
  });
});

toggleOpenModeBtn.addEventListener("click", () => {
  closeOpenCardsThen(() => {
    openMode = !openMode;
    toggleOpenModeBtn.textContent = openMode ? "Выключить открытый режим" : "Включить открытый режим";
    createBoard();
  });
});

createBoard();
