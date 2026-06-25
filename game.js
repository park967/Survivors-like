const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const ui = {
  time: document.querySelector("#time"),
  level: document.querySelector("#level"),
  kills: document.querySelector("#kills"),
  ultimateSlot: document.querySelector("#ultimateSlot"),
  ultimate: document.querySelector("#ultimate"),
  ultimateFill: document.querySelector("#ultimateFill"),
  skillList: document.querySelector("#skillList"),
  bossHud: document.querySelector("#bossHud"),
  bossName: document.querySelector("#bossName"),
  bossHpText: document.querySelector("#bossHpText"),
  bossHpBar: document.querySelector("#bossHpBar"),
  hpBar: document.querySelector("#hpBar"),
  xpBar: document.querySelector("#xpBar"),
  startPanel: document.querySelector("#startPanel"),
  levelPanel: document.querySelector("#levelPanel"),
  gameOverPanel: document.querySelector("#gameOverPanel"),
  upgradeCards: document.querySelector("#upgradeCards"),
  resultText: document.querySelector("#resultText"),
  startButton: document.querySelector("#startButton"),
  restartButton: document.querySelector("#restartButton"),
  pauseButton: document.querySelector("#pauseButton"),
};

const keys = new Set();
const world = { w: 3600, h: 2200 };
const TAU = Math.PI * 2;
const RUN_TIME = 15 * 60;
const BOSS_SPAWN_TIMES = [5 * 60, 10 * 60, 15 * 60];
const ULTIMATE_COOLDOWN = 60;
const ULTIMATE_DELAY = 0.65;
const ULTIMATE_DURATION = 1.25;

const spriteSheet = new Image();
spriteSheet.src = "assets/sprites.png";

const spriteCells = {
  player: { col: 0, row: 0 },
  enemy: { col: 1, row: 0 },
  brute: { col: 0, row: 1 },
  gem: { col: 1, row: 1 },
};

let state;
let lastTime = 0;

const upgrades = [
  {
    title: "불꽃 씨앗",
    text: "투사체 피해량 +7",
    apply: () => (state.player.damage += 7),
  },
  {
    title: "빠른 심장",
    text: "공격 간격 12% 감소",
    apply: () => (state.player.fireRate *= 0.88),
  },
  {
    title: "갈래 줄기",
    text: "투사체 +1",
    apply: () => (state.player.projectiles += 1),
  },
  {
    title: "달빛 발걸음",
    text: "이동 속도 +12%",
    apply: () => (state.player.speed *= 1.12),
  },
  {
    title: "자석 향기",
    text: "경험치 흡수 범위 +45",
    apply: () => (state.player.pickup += 45),
  },
  {
    title: "두꺼운 줄기",
    text: "최대 체력 +18, 체력 회복",
    apply: () => {
      state.player.maxHp += 18;
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 28);
    },
  },
  {
    title: "회전 가시",
    text: "주변 보호 가시 +1",
    apply: () => (state.player.orbitals += 1),
  },
  {
    title: "꽃가루 폭발",
    text: "적 처치 시 폭발 확률 증가",
    apply: () => (state.player.bloomChance += 0.08),
  },
];

const skillCatalog = [
  {
    id: "seed",
    title: "불꽃 씨앗",
    maxLevel: 5,
    text: (level) => `투사체 피해량 +7 (Lv.${level}/5)`,
    apply: () => (state.player.damage += 7),
  },
  {
    id: "heart",
    title: "빠른 심장",
    maxLevel: 5,
    text: (level) => `공격 간격 12% 감소 (Lv.${level}/5)`,
    apply: () => (state.player.fireRate *= 0.88),
  },
  {
    id: "branch",
    title: "갈래 줄기",
    maxLevel: 4,
    text: (level) => `투사체 +1 (Lv.${level}/4)`,
    apply: () => (state.player.projectiles += 1),
  },
  {
    id: "steps",
    title: "달빛 발걸음",
    maxLevel: 4,
    text: (level) => `이동 속도 +12% (Lv.${level}/4)`,
    apply: () => (state.player.speed *= 1.12),
  },
  {
    id: "magnet",
    title: "자석 향기",
    maxLevel: 4,
    text: (level) => `경험치 흡수 범위 +45 (Lv.${level}/4)`,
    apply: () => (state.player.pickup += 45),
  },
  {
    id: "bark",
    title: "두꺼운 줄기",
    maxLevel: 5,
    text: (level) => `최대 체력 +18, 체력 회복 (Lv.${level}/5)`,
    apply: () => {
      state.player.maxHp += 18;
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 28);
    },
  },
  {
    id: "thorn",
    title: "회전 가시",
    maxLevel: 4,
    text: (level) => `주변 보호 가시 +1 (Lv.${level}/4)`,
    apply: () => (state.player.orbitals += 1),
  },
  {
    id: "bloom",
    title: "꽃가루 폭발",
    maxLevel: 5,
    text: (level) => `처치 시 폭발 확률 +8% (Lv.${level}/5)`,
    apply: () => (state.player.bloomChance += 0.08),
  },
];

function newGame() {
  state = {
    running: true,
    paused: false,
    choosing: false,
    gameOver: false,
    won: false,
    time: 0,
    spawnTimer: 0,
    eliteTimer: 25,
    nextBossIndex: 0,
    shake: 0,
    kills: 0,
    player: {
      x: world.w / 2,
      y: world.h / 2,
      r: 18,
      hp: 100,
      maxHp: 100,
      speed: 255,
      level: 1,
      xp: 0,
      nextXp: 28,
      fireTimer: 0,
      fireRate: 0.54,
      damage: 20,
      projectiles: 1,
      pickup: 90,
      orbitals: 1,
      bloomChance: 0.12,
      invuln: 0,
      facing: 1,
      moving: false,
    },
    camera: null,
    enemies: [],
    shots: [],
    gems: [],
    bursts: [],
    floaters: [],
    skills: {},
    ultimate: {
      cooldown: 0,
      active: false,
      timer: 0,
      damaged: false,
    },
  };
  ui.startPanel.classList.add("hidden");
  ui.levelPanel.classList.add("hidden");
  ui.gameOverPanel.classList.add("hidden");
  updateSkillUi();
  lastTime = performance.now();
}

function spawnEnemy(kind = "husk", tier = 0) {
  const p = state.player;
  const angle = Math.random() * TAU;
  const dist = 560 + Math.random() * 260;
  const x = clamp(p.x + Math.cos(angle) * dist, 40, world.w - 40);
  const y = clamp(p.y + Math.sin(angle) * dist, 40, world.h - 40);
  const minute = state.time / 60;
  const types = {
    husk: { hp: 34 + minute * 8, speed: 68 + minute * 3, r: 15, xp: 7, color: "#9bbf73" },
    runner: { hp: 22 + minute * 5, speed: 116 + minute * 4, r: 12, xp: 6, color: "#69b9c8" },
    brute: { hp: 92 + minute * 18, speed: 48 + minute * 2, r: 24, xp: 18, color: "#c46b5b" },
    elite: { hp: 360 + minute * 62, speed: 56 + minute * 2, r: 34, xp: 70, color: "#e0b44f" },
    boss: {
      hp: 1450 + minute * 250 + tier * 650,
      speed: 36 + minute * 1.4,
      r: 58 + tier * 8,
      xp: 180 + tier * 90,
      color: tier >= 3 ? "#f04d6d" : "#9c4df0",
    },
  };
  const base = types[kind];
  const enemy = { ...base, x, y, maxHp: base.hp, hit: 0, kind };
  if (kind === "boss") {
    enemy.tier = tier;
    enemy.name = tier >= 3 ? "Final Nightbloom" : tier === 2 ? "Elder Nightbloom" : "Thorn Monarch";
  }
  state.enemies.push(enemy);
}

function update(dt) {
  if (!state?.running || state.paused || state.choosing || state.gameOver) return;

  const p = state.player;
  state.time += dt;
  p.invuln = Math.max(0, p.invuln - dt);
  state.shake = Math.max(0, state.shake - dt * 18);
  updateUltimate(dt);

  movePlayer(dt);
  spawnLoop(dt);
  shootLoop(dt);
  updateShots(dt);
  updateEnemies(dt);
  updateGems(dt);
  updateBursts(dt);
  updateFloaters(dt);
  updateUi();
}

function updateUltimate(dt) {
  const ult = state.ultimate;
  ult.cooldown = Math.max(0, ult.cooldown - dt);
  if (!ult.active) return;

  ult.timer += dt;
  state.shake = Math.max(state.shake, 5 + Math.sin(ult.timer * 28) * 3);

  if (!ult.damaged && ult.timer >= ULTIMATE_DELAY) {
    releaseUltimate();
    ult.damaged = true;
  }

  if (ult.timer >= ULTIMATE_DURATION) {
    ult.active = false;
  }
}

function castUltimate() {
  if (!state || state.paused || state.choosing || state.gameOver) return;
  const ult = state.ultimate;
  if (ult.cooldown > 0 || ult.active) return;

  ult.active = true;
  ult.timer = 0;
  ult.damaged = false;
  ult.cooldown = ULTIMATE_COOLDOWN;
  addFloater("NIGHT BLOOM", state.player.x, state.player.y - 90, "#f0d86a");
}

function releaseUltimate() {
  const damage = 220 + state.player.level * 12;
  addBurst(state.player.x, state.player.y, "#f6f2e8", 260);
  addBurst(state.player.x, state.player.y, "#f0d86a", 360);

  for (const enemy of [...state.enemies]) {
    if (enemy.hp <= 0) continue;
    damageEnemy(enemy, damage);
    addBurst(enemy.x, enemy.y, "#f0d86a", enemy.r + 18);
  }
}

function movePlayer(dt) {
  const p = state.player;
  let dx = 0;
  let dy = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp")) dy -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) dy += 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) dx -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) dx += 1;
  const len = Math.hypot(dx, dy) || 1;
  p.moving = dx !== 0 || dy !== 0;
  if (dx !== 0) p.facing = dx > 0 ? 1 : -1;
  p.x = clamp(p.x + (dx / len) * p.speed * dt, p.r, world.w - p.r);
  p.y = clamp(p.y + (dy / len) * p.speed * dt, p.r, world.h - p.r);
}

function spawnLoop(dt) {
  state.spawnTimer -= dt;
  const pressure = Math.min(1.8, 0.55 + state.time / 95);
  if (state.spawnTimer <= 0) {
    const count = Math.floor(2 + pressure * 2 + Math.random() * 2);
    for (let i = 0; i < count; i += 1) {
      const roll = Math.random();
      if (state.time > 75 && roll > 0.78) spawnEnemy("brute");
      else if (state.time > 35 && roll > 0.62) spawnEnemy("runner");
      else spawnEnemy("husk");
    }
    state.spawnTimer = Math.max(0.16, 1.05 - state.time / 180);
  }

  if (
    state.nextBossIndex < BOSS_SPAWN_TIMES.length &&
    state.time >= BOSS_SPAWN_TIMES[state.nextBossIndex]
  ) {
    const bossTime = BOSS_SPAWN_TIMES[state.nextBossIndex];
    const bossTier = bossTime >= 15 * 60 ? 3 : bossTime >= 10 * 60 ? 2 : 1;
    spawnEnemy("boss", bossTier);
    state.nextBossIndex += 1;
    state.shake = 12;
    addFloater(bossTier >= 3 ? "FINAL BOSS" : "BOSS", state.player.x, state.player.y - 100, "#f0d86a");
  }

  state.eliteTimer -= dt;
  if (state.eliteTimer <= 0) {
    spawnEnemy("elite");
    state.eliteTimer = 40;
    addFloater("ELITE", state.player.x, state.player.y - 80, "#e0b44f");
  }
}

function shootLoop(dt) {
  const p = state.player;
  p.fireTimer -= dt;
  if (p.fireTimer > 0 || state.enemies.length === 0) return;
  const targets = [...state.enemies]
    .sort((a, b) => distance(a, p) - distance(b, p))
    .slice(0, p.projectiles);
  targets.forEach((target, i) => {
    const angle = Math.atan2(target.y - p.y, target.x - p.x) + (i - (targets.length - 1) / 2) * 0.12;
    state.shots.push({
      x: p.x,
      y: p.y,
      vx: Math.cos(angle) * 640,
      vy: Math.sin(angle) * 640,
      r: 7,
      life: 1.1,
      damage: p.damage,
    });
  });
  p.fireTimer = p.fireRate;
}

function updateShots(dt) {
  for (const shot of state.shots) {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;
  }

  for (const shot of state.shots) {
    for (const enemy of state.enemies) {
      if (shot.life <= 0 || distance(shot, enemy) > shot.r + enemy.r) continue;
      damageEnemy(enemy, shot.damage);
      shot.life = 0;
    }
  }

  state.shots = state.shots.filter((shot) => shot.life > 0);
}

function updateEnemies(dt) {
  const p = state.player;
  const orbitAngle = state.time * 2.6;

  for (const enemy of state.enemies) {
    const angle = Math.atan2(p.y - enemy.y, p.x - enemy.x);
    enemy.x += Math.cos(angle) * enemy.speed * dt;
    enemy.y += Math.sin(angle) * enemy.speed * dt;
    enemy.hit = Math.max(0, enemy.hit - dt * 8);

    for (let i = 0; i < p.orbitals; i += 1) {
      const a = orbitAngle + (i / p.orbitals) * TAU;
      const ox = p.x + Math.cos(a) * 62;
      const oy = p.y + Math.sin(a) * 62;
      if (distance(enemy, { x: ox, y: oy }) < enemy.r + 12) {
        damageEnemy(enemy, 34 * dt);
      }
    }

    if (distance(enemy, p) < enemy.r + p.r && p.invuln <= 0) {
      const hitDamage = enemy.kind === "boss" ? 36 : enemy.kind === "elite" ? 24 : 12;
      p.hp -= hitDamage;
      p.invuln = 0.42;
      state.shake = 8;
      addFloater("-" + hitDamage, p.x, p.y - 38, "#f07b63");
      if (p.hp <= 0) endGame();
    }
  }

  state.enemies = state.enemies.filter((enemy) => enemy.hp > 0);
}

function damageEnemy(enemy, amount) {
  if (enemy.hp <= 0) return;
  enemy.hp -= amount;
  enemy.hit = 1;
  if (enemy.hp <= 0) {
    state.kills += 1;
    state.gems.push({ x: enemy.x, y: enemy.y, r: 7, xp: enemy.xp, pull: 0 });
    addBurst(enemy.x, enemy.y, enemy.color, enemy.kind === "boss" ? 80 : enemy.kind === "elite" ? 30 : 16);
    if (enemy.kind === "boss") {
      state.shake = 16;
      addFloater("BOSS DOWN", enemy.x, enemy.y - 80, "#f0d86a");
      if (enemy.tier >= 3) {
        endGame(true);
      }
    }
    if (Math.random() < state.player.bloomChance) bloom(enemy.x, enemy.y);
  }
}

function bloom(x, y) {
  addBurst(x, y, "#f0d86a", 34);
  state.shake = Math.max(state.shake, 4);
  for (const enemy of state.enemies) {
    const d = distance(enemy, { x, y });
    if (d < 118) damageEnemy(enemy, 36 * (1 - d / 140));
  }
}

function updateGems(dt) {
  const p = state.player;
  for (const gem of state.gems) {
    const d = distance(gem, p);
    if (d < p.pickup) gem.pull = Math.min(1, gem.pull + dt * 4);
    if (gem.pull > 0) {
      const angle = Math.atan2(p.y - gem.y, p.x - gem.x);
      const speed = 160 + gem.pull * 620;
      gem.x += Math.cos(angle) * speed * dt;
      gem.y += Math.sin(angle) * speed * dt;
    }
    if (d < p.r + gem.r) {
      p.xp += gem.xp;
      gem.collected = true;
      addFloater("+" + gem.xp, p.x, p.y - 52, "#6bd9c7");
      while (p.xp >= p.nextXp) levelUp();
    }
  }
  state.gems = state.gems.filter((gem) => !gem.collected);
}

function levelUp() {
  const p = state.player;
  p.xp -= p.nextXp;
  p.level += 1;
  p.nextXp = Math.floor(p.nextXp * 1.24 + 12);
  p.hp = Math.min(p.maxHp, p.hp + 10);
  state.choosing = true;
  showUpgrades();
}

function showUpgrades() {
  ui.upgradeCards.innerHTML = "";
  const available = skillCatalog.filter((skill) => getSkillLevel(skill.id) < skill.maxLevel);
  const choices = available.length > 0 ? sample(available, Math.min(3, available.length)) : [];

  if (choices.length === 0) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "upgrade-card";
    button.innerHTML = `<b>만개한 생명력</b><span>모든 스킬이 최대 레벨입니다. 체력을 35 회복합니다.</span>`;
    button.addEventListener("click", () => {
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 35);
      state.choosing = false;
      ui.levelPanel.classList.add("hidden");
      updateUi();
    });
    ui.upgradeCards.append(button);
    ui.levelPanel.classList.remove("hidden");
    return;
  }

  choices.forEach((upgrade) => {
    const nextLevel = getSkillLevel(upgrade.id) + 1;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "upgrade-card";
    button.innerHTML = `<b>${upgrade.title}</b><span>${upgrade.text(nextLevel)}</span>`;
    button.addEventListener("click", () => {
      applySkill(upgrade);
      state.choosing = false;
      ui.levelPanel.classList.add("hidden");
      updateUi();
    });
    ui.upgradeCards.append(button);
  });
  ui.levelPanel.classList.remove("hidden");
}

function getSkillLevel(id) {
  return state.skills[id] || 0;
}

function applySkill(skill) {
  const nextLevel = getSkillLevel(skill.id) + 1;
  state.skills[skill.id] = nextLevel;
  skill.apply(nextLevel);
  addFloater(`${skill.title} Lv.${nextLevel}`, state.player.x, state.player.y - 72, "#f0d86a");
  updateSkillUi();
}

function updateSkillUi() {
  if (!ui.skillList || !state?.skills) return;
  const owned = skillCatalog.filter((skill) => getSkillLevel(skill.id) > 0);

  if (owned.length === 0) {
    ui.skillList.innerHTML = `<span class="empty-skills">No skills yet</span>`;
    return;
  }

  ui.skillList.innerHTML = owned
    .map((skill) => {
      const level = getSkillLevel(skill.id);
      return `<div class="skill-chip"><span>${skill.title}</span><i>Lv.${level}/${skill.maxLevel}</i></div>`;
    })
    .join("");
}

function addBurst(x, y, color, size) {
  state.bursts.push({ x, y, color, size, life: 0.42, maxLife: 0.42 });
}

function updateBursts(dt) {
  for (const burst of state.bursts) burst.life -= dt;
  state.bursts = state.bursts.filter((burst) => burst.life > 0);
}

function addFloater(text, x, y, color) {
  state.floaters.push({ text, x, y, color, life: 0.95 });
}

function updateFloaters(dt) {
  for (const floater of state.floaters) {
    floater.y -= 42 * dt;
    floater.life -= dt;
  }
  state.floaters = state.floaters.filter((floater) => floater.life > 0);
}

function render() {
  if (!state) {
    drawBackdrop(0, 0);
    return;
  }

  const p = state.player;
  if (
    canvas.width !== Math.floor(canvas.clientWidth * devicePixelRatio) ||
    canvas.height !== Math.floor(canvas.clientHeight * devicePixelRatio)
  ) {
    canvas.width = Math.floor(canvas.clientWidth * devicePixelRatio);
    canvas.height = Math.floor(canvas.clientHeight * devicePixelRatio);
  }
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

  const viewW = canvas.clientWidth;
  const viewH = canvas.clientHeight;
  const targetCamX = clamp(p.x - viewW / 2, 0, world.w - viewW);
  const targetCamY = clamp(p.y - viewH / 2, 0, world.h - viewH);
  if (!state.camera) state.camera = { x: targetCamX, y: targetCamY };
  state.camera.x += (targetCamX - state.camera.x) * 0.12;
  state.camera.y += (targetCamY - state.camera.y) * 0.12;

  let camX = state.camera.x;
  let camY = state.camera.y;
  if (state.shake > 0) {
    camX += (Math.random() - 0.5) * state.shake;
    camY += (Math.random() - 0.5) * state.shake;
  }

  ctx.clearRect(0, 0, viewW, viewH);
  drawBackdrop(camX, camY);
  ctx.save();
  ctx.translate(-camX, -camY);

  drawGems();
  drawBursts();
  drawShots();
  drawEnemies();
  drawOrbitals();
  drawPlayer();
  drawFloaters();

  ctx.restore();
  drawUltimateOverlay();
  if (state.paused && !state.choosing && !state.gameOver) drawCenterText("PAUSED");
}

function drawBackdrop(camX, camY) {
  const viewW = canvas.clientWidth || 1280;
  const viewH = canvas.clientHeight || 720;
  const grid = 80;
  ctx.fillStyle = "#12161a";
  ctx.fillRect(0, 0, viewW, viewH);

  ctx.strokeStyle = "rgba(255,255,255,0.045)";
  ctx.lineWidth = 1;
  const startX = -((camX || 0) % grid);
  const startY = -((camY || 0) % grid);
  for (let x = startX; x < viewW; x += grid) line(x, 0, x, viewH);
  for (let y = startY; y < viewH; y += grid) line(0, y, viewW, y);

  ctx.fillStyle = "rgba(45,181,163,0.08)";
  for (let i = 0; i < 60; i += 1) {
    const x = (i * 211 - (camX || 0) * 0.45) % (viewW + 120);
    const y = (i * 97 - (camY || 0) * 0.45) % (viewH + 120);
    circle(x - 60, y - 60, 2 + (i % 5));
  }
}

function drawPlayer() {
  const p = state.player;
  ctx.save();
  ctx.globalAlpha = p.invuln > 0 ? 0.58 + Math.sin(state.time * 45) * 0.22 : 1;

  if (!drawSprite("player", p.x, p.y, 72, 72 + Math.sin(state.time * 12) * (p.moving ? 4 : 1), p.facing < 0)) {
    ctx.fillStyle = "#f6f2e8";
    circle(p.x, p.y, p.r);
    ctx.fillStyle = "#2db5a3";
    circle(p.x + 5, p.y - 4, p.r * 0.48);
  }

  ctx.strokeStyle = "#f0d86a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.pickup, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawEnemies() {
  for (const enemy of state.enemies) {
    const sprite = enemy.kind === "brute" || enemy.kind === "elite" || enemy.kind === "boss" ? "brute" : "enemy";
    const size = enemy.r * (enemy.kind === "boss" ? 4.8 : enemy.kind === "elite" ? 4.4 : enemy.kind === "brute" ? 4 : 3.5);
    const squash = 1 + Math.sin(state.time * enemy.speed * 0.04 + enemy.x) * 0.04;
    const flip = enemy.x > state.player.x;

    if (enemy.hit > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.72)";
      circle(enemy.x, enemy.y, enemy.r + 8);
    }

    if (!drawSprite(sprite, enemy.x, enemy.y, size, size * squash, flip)) {
      ctx.fillStyle = enemy.hit > 0 ? "#ffffff" : enemy.color;
      circle(enemy.x, enemy.y, enemy.r);
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      circle(enemy.x - enemy.r * 0.28, enemy.y - enemy.r * 0.18, enemy.r * 0.18);
    }

    if (enemy.kind === "elite" || enemy.kind === "boss") {
      ctx.strokeStyle = enemy.kind === "boss" ? "#9c4df0" : "#f0d86a";
      ctx.lineWidth = enemy.kind === "boss" ? 5 : 3;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.r + (enemy.kind === "boss" ? 16 : 7), 0, TAU);
      ctx.stroke();
    }
  }
}

function drawShots() {
  ctx.fillStyle = "#f0d86a";
  for (const shot of state.shots) circle(shot.x, shot.y, shot.r);
}

function drawGems() {
  for (const gem of state.gems) {
    const bob = Math.sin(state.time * 5 + gem.x) * 3;
    if (!drawSprite("gem", gem.x, gem.y + bob, 34, 44)) {
      ctx.fillStyle = "#54d1bd";
      diamond(gem.x, gem.y, gem.r);
    }
  }
}

function drawBursts() {
  for (const burst of state.bursts) {
    const t = 1 - burst.life / burst.maxLife;
    ctx.globalAlpha = 1 - t;
    ctx.strokeStyle = burst.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(burst.x, burst.y, burst.size * (0.4 + t * 1.6), 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawOrbitals() {
  const p = state.player;
  ctx.fillStyle = "#d7e36b";
  for (let i = 0; i < p.orbitals; i += 1) {
    const a = state.time * 2.6 + (i / p.orbitals) * TAU;
    circle(p.x + Math.cos(a) * 62, p.y + Math.sin(a) * 62, 11);
  }
}

function drawFloaters() {
  ctx.textAlign = "center";
  ctx.font = "800 18px Inter, sans-serif";
  for (const floater of state.floaters) {
    ctx.globalAlpha = Math.max(0, floater.life);
    ctx.fillStyle = floater.color;
    ctx.fillText(floater.text, floater.x, floater.y);
  }
  ctx.globalAlpha = 1;
}

function drawSprite(name, x, y, width, height, flip = false) {
  if (!spriteSheet.complete || spriteSheet.naturalWidth === 0) return false;

  const cell = spriteCells[name];
  if (!cell) return false;

  const frameW = spriteSheet.naturalWidth / 2;
  const frameH = spriteSheet.naturalHeight / 2;
  const sx = cell.col * frameW;
  const sy = cell.row * frameH;

  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(spriteSheet, sx, sy, frameW, frameH, -width / 2, -height / 2, width, height);
  ctx.restore();
  return true;
}

function drawUltimateOverlay() {
  if (!state?.ultimate?.active) return;

  const ult = state.ultimate;
  const viewW = canvas.clientWidth;
  const viewH = canvas.clientHeight;
  const t = clamp(ult.timer / ULTIMATE_DURATION, 0, 1);
  const pulse = Math.sin(t * Math.PI);
  const flash = ult.timer < ULTIMATE_DELAY ? ult.timer / ULTIMATE_DELAY : 1 - (ult.timer - ULTIMATE_DELAY) / (ULTIMATE_DURATION - ULTIMATE_DELAY);

  ctx.save();
  ctx.fillStyle = `rgba(246, 242, 232, ${0.12 * clamp(flash, 0, 1)})`;
  ctx.fillRect(0, 0, viewW, viewH);

  ctx.translate(viewW / 2, viewH / 2);
  ctx.strokeStyle = `rgba(240, 216, 106, ${0.85 * pulse})`;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, 0, 90 + t * Math.max(viewW, viewH) * 0.72, 0, TAU);
  ctx.stroke();

  for (let i = 0; i < 18; i += 1) {
    const angle = (i / 18) * TAU + t * 1.8;
    const dist = 70 + t * Math.max(viewW, viewH) * 0.45;
    ctx.fillStyle = i % 2 === 0 ? "rgba(240, 216, 106, 0.85)" : "rgba(45, 181, 163, 0.75)";
    ctx.beginPath();
    ctx.ellipse(Math.cos(angle) * dist, Math.sin(angle) * dist, 10, 32, angle, 0, TAU);
    ctx.fill();
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#f6f2e8";
  ctx.font = "900 44px Inter, sans-serif";
  ctx.fillText("NIGHT BLOOM", 0, -18);
  ctx.font = "800 17px Inter, sans-serif";
  ctx.fillStyle = "#f0d86a";
  ctx.fillText(ult.damaged ? "FULL FIELD HIT" : "CHARGING", 0, 18);
  ctx.restore();
}

function drawCenterText(text) {
  ctx.fillStyle = "rgba(0,0,0,0.36)";
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  ctx.fillStyle = "#f6f2e8";
  ctx.textAlign = "center";
  ctx.font = "900 46px Inter, sans-serif";
  ctx.fillText(text, canvas.clientWidth / 2, canvas.clientHeight / 2);
}

function updateUi() {
  const p = state.player;
  ui.time.textContent = formatTime(state.time);
  ui.level.textContent = p.level;
  ui.kills.textContent = state.kills;
  updateUltimateUi();
  ui.hpBar.style.width = `${clamp((p.hp / p.maxHp) * 100, 0, 100)}%`;
  ui.xpBar.style.width = `${clamp((p.xp / p.nextXp) * 100, 0, 100)}%`;
  updateBossUi();
}

function updateUltimateUi() {
  if (!ui.ultimate || !ui.ultimateFill || !ui.ultimateSlot) return;

  const cooldown = state.ultimate.cooldown;
  const ready = cooldown <= 0;
  const charge = ready ? 1 : 1 - cooldown / ULTIMATE_COOLDOWN;

  ui.ultimate.textContent = ready ? "READY" : Math.ceil(cooldown) + "s";
  ui.ultimateFill.style.transform = `scaleY(${clamp(charge, 0, 1)})`;
  ui.ultimateSlot.classList.toggle("ready", ready);
  ui.ultimateSlot.classList.toggle("cooling", !ready);
}

function updateBossUi() {
  if (!ui.bossHud) return;
  const boss = state.enemies
    .filter((enemy) => enemy.kind === "boss" && enemy.hp > 0)
    .sort((a, b) => b.hp - a.hp)[0];

  if (!boss) {
    ui.bossHud.classList.add("hidden");
    return;
  }

  const hpPercent = clamp((boss.hp / boss.maxHp) * 100, 0, 100);
  ui.bossHud.classList.remove("hidden");
  ui.bossName.textContent = boss.name || "BOSS";
  ui.bossHpText.textContent = `${Math.ceil(hpPercent)}%`;
  ui.bossHpBar.style.width = `${hpPercent}%`;
}

function endGame(won = false) {
  state.gameOver = true;
  state.running = false;
  state.won = won;
  ui.resultText.textContent = `${won ? "15분 생존 성공" : "쓰러졌습니다"} · ${formatTime(state.time)} 생존 · ${state.kills} 처치 · 레벨 ${state.player.level}`;
  ui.gameOverPanel.classList.remove("hidden");
}

function loop(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000 || 0);
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

function circle(x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

function diamond(x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
  ctx.fill();
}

function line(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function sample(list, count) {
  return [...list].sort(() => Math.random() - 0.5).slice(0, count);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

window.addEventListener("keydown", (event) => {
  keys.add(event.code);
  if (event.code === "Escape" && state && !state.choosing && !state.gameOver) {
    state.paused = !state.paused;
    event.preventDefault();
  }
  if (event.code === "Space") {
    castUltimate();
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => keys.delete(event.code));

ui.startButton.addEventListener("click", newGame);
ui.restartButton.addEventListener("click", newGame);
ui.pauseButton.addEventListener("click", () => {
  if (state && !state.choosing && !state.gameOver) state.paused = !state.paused;
});

requestAnimationFrame(loop);
