import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs
} from
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyANbZrck1HKxwDqCzi9ff9d9K2ifUg0xVQ",
  authDomain: "bukangi-game.firebaseapp.com",
  projectId: "bukangi-game",
  storageBucket: "bukangi-game.firebasestorage.app",
  messagingSenderId: "826836429674",
  appId: "1:826836429674:web:67ddc8671162488f6d9313"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const setupEl = document.getElementById("setup");
const leaderboardEl = document.getElementById("leaderboard");
const quizEl = document.getElementById("quiz");
const rankBtn = document.getElementById("rankBtn");
const openRankBtn = document.getElementById("openRankBtn");
const closeRankBtn = document.getElementById("closeRankBtn");
const startBtn = document.getElementById("startBtn");
const rankListEl = document.getElementById("rankList");
const playerNameEl = document.getElementById("playerName");
const quizQuestionEl = document.getElementById("quizQuestion");
const quizOptionsEl = document.getElementById("quizOptions");
const quizMsgEl = document.getElementById("quizMsg");
const quizHintEl = document.getElementById("quizHint");
const bubbles = [];

const W = canvas.width;
const H = canvas.height;
let backgroundX = 0;
const backgroundSpeed = 1.8;

const LEVEL_NAME = {
  easy: "초급",
  medium: "중급",
  hard: "고급",
};

let selectedLevel = "easy";
let last = performance.now();

const imgs = {
  shark: new Image(),
  sharkVomit: new Image(),
  sharkHappy: new Image(),
  background: new Image(),
  
  chicken: new Image(),
  trashCan: new Image(),
  trashBag: new Image(),
  net: new Image(),
  
  gugumiPinkPhone: new Image(),
  gugumiBlueWave: new Image(),
  gugumiYellowCheer: new Image(),
  gugumiBanner: new Image(),
};

imgs.shark.src = "./assets/shark.png";
imgs.sharkVomit.src = "./assets/shark_vomit.png";
imgs.sharkHappy.src = "./assets/shark_happy.png";
imgs.background.src = "./assets/canal_bg_gugumi.png";
imgs.chicken.src = "./assets/chicken_raw.png";
imgs.trashCan.src = "./assets/trash_can.png";
imgs.trashBag.src = "./assets/trash_bag.png";
imgs.net.src = "./assets/net.png";
imgs.gugumiPinkPhone.src = "./assets/gugumi_pink_phone.png";
imgs.gugumiBlueWave.src = "./assets/gugumi_blue_wave.png";
imgs.gugumiYellowCheer.src = "./assets/gugumi_yellow_cheer.png";
imgs.gugumiBanner.src = "./assets/gugumi_banner.png";

const state = {
  started: false,
  gameOver: false,
  pausedForQuiz: false,
  level: "easy",
  playerName: "부캉이친구",
  energy: 70,
  score: 0,
  sharkMood: "normal",
  sharkMoodUntil: 0,
  knowledge: 0,
  speed: 5.2,
  t: 0,
  lastSpawnAt: 0,
  spawnEvery: 950,
  message: "",
  messageUntil: 0,
  currentQuiz: null,
  wrongCount: 0,
  scoreSavedForRun: false,
  
};

const shark = {
  x: 150,
  y: H / 2,
  w: 180,
  h: 180,
  targetY: H / 2,
  flash: 0,
};

const objects = [];
function getTodayKey() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getPlayerId() {
  let playerId = localStorage.getItem("bukangiPlayerId");

  if (!playerId) {
    playerId = crypto.randomUUID();
    localStorage.setItem("bukangiPlayerId", playerId);
  }

  return playerId;
}
function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function resetGame() {
  state.started = true;
  state.gameOver = false;
  state.sharkMood = "normal";
  state.sharkMoodUntil = 0;
  state.pausedForQuiz = false;
  state.level = selectedLevel;
  state.playerName = (playerNameEl.value || "부캉이친구").trim().slice(0, 10);
  state.energy = 70;
  state.score = 0;
  state.knowledge = 0;
  state.speed = 5.2;
  state.t = 0;
  backgroundX = 0;
  state.lastSpawnAt = 0;
  state.spawnEvery = 950;
  state.message = "";
  state.currentQuiz = null;
  state.wrongCount = 0;
  state.scoreSavedForRun = false;

  shark.y = H / 2;
  shark.targetY = H / 2;
  shark.flash = 0;
  objects.length = 0;
  bubbles.length = 0;
  initBubbles();

  setupEl.classList.add("hidden");
  leaderboardEl.classList.add("hidden");
  quizEl.classList.add("hidden");
}


async function saveScore() {
  try {
    const today = getTodayKey();
    const playerId = getPlayerId();

    const scoreRef = doc(
      db,
      "leaderboards",
      today,
      "scores",
      playerId
    );

    const oldSnapshot = await getDoc(scoreRef);
    const newScore = Math.floor(state.score);

    // 오늘 이미 더 높은 점수가 있으면 저장 안 함
    if (
      oldSnapshot.exists() &&
      oldSnapshot.data().score >= newScore
    ) {
      return;
    }

    await setDoc(scoreRef, {
      name: state.playerName || "부캉이친구",
      score: newScore,
      knowledge: state.knowledge,
      level: state.level,
      updatedAt: Date.now()
    });

    console.log("온라인 순위 저장 성공");

  } catch (error) {
    console.error("온라인 순위 저장 실패:", error);
  }
}
function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
async function showLeaderboard() {
  leaderboardEl.classList.remove("hidden");

  rankListEl.innerHTML = `
    <li>
      <span>순위를 불러오는 중...</span>
    </li>
  `;

  try {
    const today = getTodayKey();

    const scoresRef = collection(
      db,
      "leaderboards",
      today,
      "scores"
    );

    const q = query(
      scoresRef,
      orderBy("score", "desc"),
      limit(10)
    );

    const snapshot = await getDocs(q);

    rankListEl.innerHTML = "";

    if (snapshot.empty) {
      rankListEl.innerHTML = `
        <li>
          <span>오늘 첫 기록의 주인공이 되어봐! 🦈</span>
        </li>
      `;
      return;
    }

    let rank = 1;

    snapshot.forEach((docSnapshot) => {
      const row = docSnapshot.data();
      const li = document.createElement("li");

      let medal = "";
      if (rank === 1) medal = "🥇";
      else if (rank === 2) medal = "🥈";
      else if (rank === 3) medal = "🥉";
      else medal = `${rank}위`;

      li.innerHTML = `
        <span>${medal} ${escapeHtml(row.name)}</span>
        <span>${row.score}점 · ${LEVEL_NAME[row.level] || ""}</span>
      `;

      rankListEl.appendChild(li);
      rank++;
    });

  } catch (error) {
    console.error(error);

    rankListEl.innerHTML = `
      <li>
        <span>순위를 불러오지 못했어요 😢</span>
      </li>
    `;
  }
}

function showMessage(text, ms = 900) {
  state.message = text;
  state.messageUntil = performance.now() + ms;
}

function spawnObject(now) {
  const r = Math.random();
  let type = "fish";

 if (r < 0.48) {
  type = "fish";
} else if (r < 0.58) {
  type = "chicken";
} else if (r < 0.68) {
  type = "trashCan";
} else if (r < 0.80) {
  type = "trashBag";
} else {
  type = "net";
}

  const waterTop = 250;
  const waterBottom = H - 90;

  if (type === "net") {
    objects.push({
      type,
      x: W + 50,
      y: rand(waterTop, waterBottom - 190),
      w: 85,
      h: 190,
      rotation: (Math.random() * 10 - 5) * Math.PI / 180
    });

  } else {
    const sizes = {
      fish: { w: 76, h: 56 },
      chicken: { w: 92, h: 92 },
      trashCan: { w: 58, h: 72 },
      trashBag: { w: 76, h: 76 },
    };

    const s = sizes[type];

    // 👇 여기 넣기
    let rotation = 0;

    if (type === "chicken") {
      rotation =
        (Math.random() < 0.5 ? -15 : 10)
        * Math.PI / 180;
    }

    if (type === "trashCan") {
      rotation =
        (Math.random() * 50 - 25)
        * Math.PI / 180;
    }

    if (type === "trashBag") {
      rotation =
        (Math.random() * 20 - 10)
        * Math.PI / 180;
    }

    objects.push({
      type,
      x: W + 50,
      y: rand(waterTop, waterBottom - s.h),
      w: s.w,
      h: s.h,
      rotation
    });
  }

  state.lastSpawnAt = now;
}

function sharkHitbox() {
  return {
    x: shark.x + 28,
    y: shark.y - shark.h / 2 + 26,
    w: shark.w - 56,
    h: shark.h - 54,
  };
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function moveShark(dir) {
  if (!state.started || state.gameOver || state.pausedForQuiz) return;
  shark.targetY += dir * 90;
  shark.targetY = Math.max(280, Math.min(H - 100, shark.targetY));
}

function makeQuiz() {
  let a, b, op, answer, hint;

  function addSub(max) {
    const isAdd = Math.random() < 0.5;
    if (isAdd) {
      answer = Math.floor(rand(3, max));
      a = Math.floor(rand(1, answer));
      b = answer - a;
      op = "+";
      hint = "작은 수부터 차근차근 더해봐!";
    } else {
      a = Math.floor(rand(2, max));
      b = Math.floor(rand(1, a));
      answer = a - b;
      op = "−";
      hint = "큰 수에서 작은 수를 빼 보자!";
    }
  }

  if (state.level === "easy") {
    addSub(20);
  } else if (state.level === "medium") {
    const r = Math.random();
    if (r < 0.55) {
      addSub(50);
    } else if (r < 0.78) {
      a = Math.floor(rand(2, 10));
      b = Math.floor(rand(2, 10));
      op = "×";
      answer = a * b;
      hint = `${a}를 ${b}번 더한 것과 같아!`;
    } else {
      b = Math.floor(rand(2, 10));
      answer = Math.floor(rand(2, 10));
      a = b * answer;
      op = "÷";
      hint = `${b} × ? = ${a} 를 떠올려봐!`;
    }
  } else {
    const r = Math.random();
    if (r < 0.45) {
      addSub(100);
    } else if (r < 0.73) {
      a = Math.floor(rand(10, 100));
      b = Math.floor(rand(2, 10));
      op = "×";
      answer = a * b;
      hint = "두 자리 수를 십의 자리와 일의 자리로 나눠 곱해봐!";
    } else {
      b = Math.floor(rand(10, 100));
      answer = Math.floor(rand(2, 10));
      a = b * answer;
      op = "÷";
      hint = `${b} × ? = ${a} 를 거꾸로 생각해봐!`;
    }
  }

  const set = new Set([answer]);
  const deltas = [-20, -10, -5, -3, -2, -1, 1, 2, 3, 5, 10, 20];
  while (set.size < 4) {
    const delta = deltas[Math.floor(Math.random() * deltas.length)];
    set.add(Math.max(0, answer + delta));
  }

  return {
    a,
    b,
    op,
    answer,
    hint,
    choices: [...set].sort(() => Math.random() - 0.5),
  };
}

function openQuiz() {
  state.pausedForQuiz = true;
  state.currentQuiz = makeQuiz();
  state.wrongCount = 0;

  quizQuestionEl.textContent = `${state.currentQuiz.a} ${state.currentQuiz.op} ${state.currentQuiz.b} = ?`;
  quizOptionsEl.innerHTML = "";
  quizMsgEl.textContent = "";
  quizHintEl.textContent = "";

  state.currentQuiz.choices.forEach((choice) => {
    const btn = document.createElement("button");
    btn.className = "answer-btn";
    btn.textContent = choice;
    btn.addEventListener("click", () => answerQuiz(choice));
    quizOptionsEl.appendChild(btn);
  });

  quizEl.classList.remove("hidden");
}

function closeQuiz() {
  state.pausedForQuiz = false;
  state.currentQuiz = null;
  quizEl.classList.add("hidden");
}

function answerQuiz(choice) {
  if (!state.currentQuiz) return;

  if (choice === state.currentQuiz.answer) {
    quizMsgEl.textContent = "정답! 탈출 성공! 🦈✨";
    state.knowledge += 20;
    state.score += 120;
    setTimeout(() => {
      closeQuiz();
      showMessage("그물 탈출! +20 지식 포인트", 1000);
    }, 650);
  } else {
    state.wrongCount += 1;
    if (state.wrongCount === 1) {
      quizMsgEl.textContent = "아깝다! 힌트를 볼까? 👀";
      quizHintEl.textContent = state.currentQuiz.hint;
    } else {
      quizMsgEl.textContent = `정답은 ${state.currentQuiz.answer}! 에너지 -8`;
      state.energy = Math.max(0, state.energy - 8);
      setTimeout(() => {
        closeQuiz();
        showMessage("힘으로 그물 탈출… 😵", 1000);
      }, 850);
    }
  }
}

function drawRoundedRect(x, y, w, h, r, fillStyle, strokeStyle = null, lineWidth = 0) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function drawBackground() {
  if (!imgs.background.complete) return;

  ctx.drawImage(
    imgs.background,
    backgroundX,
    0,
    W,
    H
  );

  ctx.drawImage(
    imgs.background,
    backgroundX + W,
    0,
    W,
    H
  );

  drawWaterWaves();
  drawBubbles();
}
function drawWaterWaves() {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 4;

  const waterTop = 250;

  for (let row = 0; row < 10; row++) {
    const y = waterTop + row * 42;
    const offset = (state.t * 0.08 + row * 35) % 160;

    for (let x = -160 + offset; x < W; x += 160) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 35, y - 8, x + 75, y);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawHUD() {
  drawRoundedRect(
    20,
    20,
    430,
    94,
    18,
    "rgba(255,255,255,.88)"
  );

  ctx.fillStyle = "#13384a";

  ctx.font = "bold 22px Arial";
  ctx.fillText("부캉이 ENERGY", 34, 56);

  drawRoundedRect(
    34,
    74,
    226,
    20,
    10,
    "#d7eaf0"
  );

  drawRoundedRect(
    34,
    74,
    226 * (state.energy / 100),
    20,
    10,
    state.energy > 35
      ? "#2ac06f"
      : "#e85b4f"
  );

  ctx.font = "bold 18px Arial";

  ctx.fillText(
    `점수 ${Math.floor(state.score)}`,
    286,
    52
  );

  ctx.fillText(
    `지식 ${state.knowledge}`,
    286,
    82
  );

  ctx.font = "bold 16px Arial";

  ctx.fillText(
    `수학 ${LEVEL_NAME[state.level]}`,
    360,
    82
  );
}

function drawTopMessage() {
  if (!(state.message && performance.now() < state.messageUntil)) return;
  const x = 430;
  const y = 132;
  const w = 420;
  const h = 48;

  drawRoundedRect(x, y, w, h, 14, "rgba(255,255,255,.96)", "#193645", 2);
  ctx.fillStyle = "#173f50";
  ctx.font = "bold 24px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(state.message, x + w / 2, y + h / 2);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function drawFish(obj) {
  const x = obj.x, y = obj.y, w = obj.w, h = obj.h;
  ctx.save();
  ctx.translate(x, y);
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#78a6ff");
  grad.addColorStop(1, "#4d82ff");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(w * 0.48, h * 0.52, w * 0.28, h * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w * 0.74, h * 0.5);
  ctx.lineTo(w * 0.96, h * 0.32);
  ctx.lineTo(w * 0.96, h * 0.68);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w * 0.42, h * 0.28);
  ctx.lineTo(w * 0.55, h * 0.1);
  ctx.lineTo(w * 0.58, h * 0.32);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#2b57c9";
  ctx.beginPath();
  ctx.arc(w * 0.35, h * 0.46, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
function initBubbles() {
  for (let i = 0; i < 18; i++) {
    bubbles.push({
      x: Math.random() * W,
      y: 300 + Math.random() * (H - 300),
      r: 3 + Math.random() * 6,
      speed: 0.4 + Math.random() * 1.2,
      drift: -0.3 + Math.random() * 0.6
    });
  }
}
function updateBubbles() {
  for (const b of bubbles) {
    b.y -= b.speed;
    b.x += b.drift;

    if (b.y < 240) {
      b.y = H + Math.random() * 60;
      b.x = Math.random() * W;
    }

    if (b.x < 0) b.x = W;
    if (b.x > W) b.x = 0;
  }
}
function drawBubbles() {
  ctx.save();
  for (const b of bubbles) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

function drawChicken(obj) {
  if (!imgs.chicken.complete) return;

  ctx.save();

  ctx.translate(
    obj.x + obj.w / 2,
    obj.y + obj.h / 2
  );

  ctx.rotate(obj.rotation || 0);

  ctx.drawImage(
    imgs.chicken,
    -obj.w / 2,
    -obj.h / 2,
    obj.w,
    obj.h
  );

  ctx.restore();
}

function drawTrashBag(obj) {
  if (!imgs.trashBag.complete) return;

  ctx.save();

  ctx.translate(
    obj.x + obj.w / 2,
    obj.y + obj.h / 2
  );

  ctx.rotate(obj.rotation || 0);

  ctx.drawImage(
    imgs.trashBag,
    -obj.w / 2,
    -obj.h / 2,
    obj.w,
    obj.h
  );

  ctx.restore();
}

function drawTrashCan(obj) {
  if (!imgs.trashCan.complete) return;

  ctx.save();

  ctx.translate(
    obj.x + obj.w / 2,
    obj.y + obj.h / 2
  );

  ctx.rotate(obj.rotation || 0);

  ctx.drawImage(
    imgs.trashCan,
    -obj.w / 2,
    -obj.h / 2,
    obj.w,
    obj.h
  );

  ctx.restore();
}

function drawNet(obj) {
  if (!imgs.net.complete) return;

  ctx.save();

  ctx.translate(
    obj.x + obj.w / 2,
    obj.y + obj.h / 2
  );

  ctx.rotate(obj.rotation || 0);

  ctx.drawImage(
    imgs.net,
    -obj.w / 2,
    -obj.h / 2,
    obj.w,
    obj.h
  );

  ctx.restore();
}

function drawObjects() {
  objects.forEach((obj) => {
    if (obj.type === "fish") drawFish(obj);
    else if (obj.type === "chicken") drawChicken(obj);
    else if (obj.type === "trashCan") drawTrashCan(obj);
    else if (obj.type === "trashBag") drawTrashBag(obj);
    else if (obj.type === "net") drawNet(obj);
  });
}

function drawShark() {
  let currentImg = imgs.shark;

  if (state.sharkMood === "happy") {
    currentImg = imgs.sharkHappy;
  }

  if (state.sharkMood === "vomit") {
    currentImg = imgs.sharkVomit;
  }

  if (!currentImg.complete) return;

  ctx.save();

  if (
    shark.flash > 0 &&
    Math.floor(shark.flash / 3) % 2 === 0
  ) {
    ctx.globalAlpha = 0.45;
  }

  ctx.drawImage(
    currentImg,
    shark.x,
    shark.y - shark.h / 2,
    shark.w,
    shark.h
  );

  ctx.restore();
}

function drawStartOrGameOver() {
  if (!state.started) return;

  if (state.gameOver) {
    ctx.fillStyle = "rgba(5, 18, 28, .54)";
    ctx.fillRect(0, 0, W, H);

    drawRoundedRect(W / 2 - 240, H / 2 - 120, 480, 210, 24, "rgba(255,255,255,.95)");
    ctx.fillStyle = "#143949";
    ctx.textAlign = "center";
    ctx.font = "bold 58px Arial";
    ctx.fillText("GAME OVER", W / 2, H / 2 - 42);
    ctx.font = "bold 28px Arial";
    ctx.fillText(`점수 ${Math.floor(state.score)} · 지식 ${state.knowledge} · ${LEVEL_NAME[state.level]}`, W / 2, H / 2 + 14);
    ctx.font = "bold 22px Arial";
    ctx.fillText("클릭하면 난이도 선택으로 돌아가요", W / 2, H / 2 + 58);
    ctx.textAlign = "left";
  }
}

function update(now, dt) {
  if (!state.started || state.gameOver || state.pausedForQuiz) return;

  state.t += dt;
  backgroundX -= backgroundSpeed;

  if (backgroundX <= -W) {
  backgroundX = 0;
  }
  if (
    state.sharkMood !== "normal" &&
    performance.now() > state.sharkMoodUntil
  ) {
    state.sharkMood = "normal";
  }
  state.energy -= dt * 0.00145;
  state.score += dt * 0.0125;
  updateBubbles();

  if (now - state.lastSpawnAt > state.spawnEvery) {
    spawnObject(now);
  }

  shark.y += (shark.targetY - shark.y) * 0.14;
  shark.y = Math.max(280, Math.min(H - 100, shark.y));

  const hitbox = sharkHitbox();

  for (let i = objects.length - 1; i >= 0; i--) {
    const obj = objects[i];
    obj.x -= state.speed;

    if (overlap(hitbox, obj)) {
      if (obj.type === "fish") {
        state.energy = Math.min(100, state.energy + 12);
        state.score += 80;
		state.sharkMood = "happy";
        state.sharkMoodUntil = performance.now() + 700;
        showMessage("냠! +12 ENERGY 🐟", 850);
        objects.splice(i, 1);
        continue;
      }
      if (obj.type === "chicken") {
        state.energy = Math.max(0, state.energy - 18);
        shark.flash = 18;
		state.sharkMood = "vomit";
        state.sharkMoodUntil = performance.now() + 900;
        showMessage("우엑!! 🤢  -18 ENERGY", 950);
        objects.splice(i, 1);
        continue;
      }
      if (obj.type === "trashCan" || obj.type === "trashBag") {
		state.energy = Math.max(0, state.energy - 10);	
		shark.flash = 14;
		
		state.sharkMood = "vomit";
        state.sharkMoodUntil = performance.now() + 900;

		showMessage("사람이 버린 쓰레기다! 🗑️ -10 ENERGY", 950);

		objects.splice(i, 1);
		continue;
	}
      if (obj.type === "net") {
        objects.splice(i, 1);
        openQuiz();
        break;
      }
    }

    if (obj.x < -150) {
      objects.splice(i, 1);
    }
  }

  if (shark.flash > 0) shark.flash--;

  if (state.energy <= 0) {
    state.energy = 0;
    state.gameOver = true;
    if (!state.scoreSavedForRun) {
      saveScore();
      state.scoreSavedForRun = true;
    }
  }
}

function draw() {
  drawBackground();
  drawObjects();
  drawShark();
  drawHUD();
  drawTopMessage();
  drawStartOrGameOver();
}

function loop(now) {
  const dt = Math.min(34, now - last);
  last = now;
  update(now, dt);
  draw();
  requestAnimationFrame(loop);
}

document.querySelectorAll(".level-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".level-btn").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedLevel = btn.dataset.level;
  });
});

startBtn.addEventListener("click", resetGame);
rankBtn.addEventListener("click", showLeaderboard);
openRankBtn.addEventListener("click", showLeaderboard);
closeRankBtn.addEventListener("click", () => leaderboardEl.classList.add("hidden"));

window.addEventListener("keydown", (e) => {
  if (e.code === "ArrowUp" || e.code === "KeyW") moveShark(-1);
  if (e.code === "ArrowDown" || e.code === "KeyS") moveShark(1);
  if (e.code === "Space" && state.gameOver) {
    setupEl.classList.remove("hidden");
  }
});

canvas.addEventListener("pointerdown", (e) => {
  if (!state.started) return;

  if (state.gameOver) {
    setupEl.classList.remove("hidden");
    return;
  }

  if (state.pausedForQuiz) return;

  const rect = canvas.getBoundingClientRect();
  const y = ((e.clientY - rect.top) / rect.height) * H;
  moveShark(y < H / 2 ? -1 : 1);
});

// initial rendering loop
requestAnimationFrame(loop);
