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
  upgradeTitle: document.querySelector("#levelPanel h2"),
  pausePanel: document.querySelector("#pausePanel"),
  gameOverPanel: document.querySelector("#gameOverPanel"),
  upgradeCards: document.querySelector("#upgradeCards"),
  resultText: document.querySelector("#resultText"),
  startButton: document.querySelector("#startButton"),
  resumeButton: document.querySelector("#resumeButton"),
  pauseRestartButton: document.querySelector("#pauseRestartButton"),
  restartButton: document.querySelector("#restartButton"),
  pauseButton: document.querySelector("#pauseButton"),
  movePad: document.querySelector("#movePad"),
  moveKnob: document.querySelector("#moveKnob"),
  ultimateButton: document.querySelector("#ultimateButton"),
};

const keys = new Set();
const touchMove = { id: null, dx: 0, dy: 0 };
const world = { w: 3600, h: 2200 };
const TAU = Math.PI * 2;
const RUN_TIME = 15 * 60;
const BOSS_SPAWN_TIMES = [300, 600, 900];
const BOSS_WARNING_TIME = 5;
const ULTIMATE_COOLDOWN = 60;
const ULTIMATE_DELAY = 0.65;
const ULTIMATE_DURATION = 1.25;
const FLOWER_START_TIME = 20;
const FLOWER_DURATION = 10;
const BOSS_WARNING_COLOR = "#ff3b45";

const spriteSheet = new Image();
spriteSheet.src = "assets/sprites.png";

const extraEnemySheet = new Image();
extraEnemySheet.src = "assets/extra-enemies.png";

const extraEnemyCells = {
  spitter: { col: 0 },
  bomber: { col: 1 },
};

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

// 새 게임 상태를 만들고 시작 화면/결과 화면을 숨깁니다.
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
    bossWarnings: {},
    defeatedBossTiers: {},
    enemyUnlocks: {
      spitter: false,
      bomber: false,
    },
    shake: 0,
    kills: 0,
    upgradeSelection: 0,
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
    pickups: [],
    flowerPatches: [],
    bossTelegraphs: [],
    bossShots: [],
    bossHazards: [],
    enemyShots: [],
    nextFlowerTimer: 0,
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
  ui.pausePanel.classList.add("hidden");
  ui.gameOverPanel.classList.add("hidden");
  updateSkillUi();
  lastTime = performance.now();
}

// 적을 플레이어 주변 바깥쪽에 생성합니다. tier는 보스 단계 구분에 사용합니다.
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
    spitter: { hp: 58 + minute * 10, speed: 54 + minute * 2, r: 16, xp: 14, color: "#b66bf0" },
    bomber: { hp: 72 + minute * 12, speed: 88 + minute * 3, r: 18, xp: 16, color: "#f05d5d" },
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
    enemy.attackCooldown = randomRange(2.2, 3.2);
    enemy.patternStep = 0;
  } else if (kind === "spitter") {
    enemy.fireTimer = randomRange(0.8, 1.7);
  } else if (kind === "bomber") {
    enemy.fuse = 0;
    enemy.armed = false;
  }
  state.enemies.push(enemy);
}

// 매 프레임 게임 상태를 갱신합니다. 이동, 공격, 적, 보석, UI가 여기서 흐릅니다.
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
  updateBossAttacks(dt);
  updateBossTelegraphs(dt);
  updateBossShots(dt);
  updateBossHazards(dt);
  updateEnemyShots(dt);
  updateGems(dt);
  updatePickups(dt);
  updateFlowerPatches(dt);
  updateBursts(dt);
  updateFloaters(dt);
  updateUi();
}

// 필살기 쿨타임과 연출 타이밍을 갱신하고, 정해진 순간에 피해를 적용합니다.
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

// Space 입력으로 필살기를 시작합니다. 쿨타임 중이거나 일시정지 상태면 실행하지 않습니다.
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

// 필살기 연출 후 실제 전체 피해와 폭발 이펙트를 적용합니다.
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

// 키 입력을 읽어 플레이어를 이동시키고 바라보는 방향/이동 상태를 기록합니다.
function movePlayer(dt) {
  const p = state.player;
  let dx = 0;
  let dy = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp")) dy -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) dy += 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) dx -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) dx += 1;
  dx += touchMove.dx;
  dy += touchMove.dy;
  const len = Math.hypot(dx, dy) || 1;
  p.moving = dx !== 0 || dy !== 0;
  if (dx !== 0) p.facing = dx > 0 ? 1 : -1;
  p.x = clamp(p.x + (dx / len) * p.speed * dt, p.r, world.w - p.r);
  p.y = clamp(p.y + (dy / len) * p.speed * dt, p.r, world.h - p.r);
}

// 일반 적, 엘리트, 보스의 등장 타이밍을 관리합니다.
function spawnLoop(dt) {
  warnUpcomingBoss();
  state.spawnTimer -= dt;
  const pressure = Math.min(1.8, 0.55 + state.time / 95);
  if (state.spawnTimer <= 0) {
    const count = Math.floor(2 + pressure * 2 + Math.random() * 2);
    for (let i = 0; i < count; i += 1) {
      const roll = Math.random();
      if (state.enemyUnlocks.bomber && roll > 0.88) spawnEnemy("bomber");
      else if (state.enemyUnlocks.spitter && roll > 0.78) spawnEnemy("spitter");
      else if (state.time > 75 && roll > 0.78) spawnEnemy("brute");
      else if (state.time > 35 && roll > 0.62) spawnEnemy("runner");
      else spawnEnemy("husk");
    }
    state.spawnTimer = Math.max(0.16, 1.05 - state.time / 180);
  }

  if (
    state.nextBossIndex < BOSS_SPAWN_TIMES.length &&
    state.time >= BOSS_SPAWN_TIMES[state.nextBossIndex]
  ) {
    const bossTier = state.nextBossIndex + 1;
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

function warnUpcomingBoss() {
  if (state.nextBossIndex >= BOSS_SPAWN_TIMES.length) return;
  const spawnTime = BOSS_SPAWN_TIMES[state.nextBossIndex];
  const remaining = spawnTime - state.time;
  if (remaining > BOSS_WARNING_TIME || remaining <= 0 || state.bossWarnings[state.nextBossIndex]) return;

  state.bossWarnings[state.nextBossIndex] = true;
  state.shake = Math.max(state.shake, 8);
  const tier = state.nextBossIndex + 1;
  addFloater(tier >= 3 ? "FINAL BOSS INCOMING" : "BOSS INCOMING", state.player.x, state.player.y - 110, "#ff3b45");
}

// 공격 쿨타임마다 가까운 적을 향해 자동 투사체를 발사합니다.
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

// 투사체 이동, 수명 감소, 적과의 충돌 처리를 담당합니다.
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

// 적을 플레이어 쪽으로 움직이고 접촉 피해, 회전 가시 충돌을 처리합니다.
function updateEnemies(dt) {
  const p = state.player;
  const orbitAngle = state.time * 2.6;

  for (const enemy of state.enemies) {
    const angle = Math.atan2(p.y - enemy.y, p.x - enemy.x);
    const casting = enemy.kind === "boss" && state.bossTelegraphs.some((telegraph) => telegraph.boss === enemy);
    if (enemy.kind === "spitter") {
      updateSpitter(enemy, angle, dt);
    } else if (enemy.kind === "bomber") {
      updateBomber(enemy, angle, dt);
    } else if (!casting) {
      enemy.x += Math.cos(angle) * enemy.speed * dt;
      enemy.y += Math.sin(angle) * enemy.speed * dt;
    }
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
      damagePlayer(hitDamage);
    }
  }

  state.enemies = state.enemies.filter((enemy) => enemy.hp > 0);
}

// 적에게 피해를 주고, 죽었을 때 경험치 보석과 처치 효과를 생성합니다.
function updateSpitter(enemy, angle, dt) {
  const p = state.player;
  const d = distance(enemy, p);
  if (d < 300) {
    enemy.x -= Math.cos(angle) * enemy.speed * 0.75 * dt;
    enemy.y -= Math.sin(angle) * enemy.speed * 0.75 * dt;
  } else if (d > 430) {
    enemy.x += Math.cos(angle) * enemy.speed * dt;
    enemy.y += Math.sin(angle) * enemy.speed * dt;
  }

  enemy.fireTimer -= dt;
  if (enemy.fireTimer <= 0 && d < 620) {
    state.enemyShots.push({
      x: enemy.x,
      y: enemy.y,
      vx: Math.cos(angle) * 245,
      vy: Math.sin(angle) * 245,
      r: 9,
      life: 3,
      damage: 14,
      color: "#b66bf0",
    });
    enemy.fireTimer = randomRange(1.7, 2.4);
  }
}

function updateBomber(enemy, angle, dt) {
  const p = state.player;
  const d = distance(enemy, p);
  enemy.x += Math.cos(angle) * enemy.speed * (enemy.armed ? 1.25 : 1) * dt;
  enemy.y += Math.sin(angle) * enemy.speed * (enemy.armed ? 1.25 : 1) * dt;

  if (d < 120) enemy.armed = true;
  if (!enemy.armed) return;

  enemy.fuse += dt;
  enemy.hit = Math.max(enemy.hit, 0.6 + Math.sin(state.time * 22) * 0.35);
  if (enemy.fuse >= 0.85 || d < 42) explodeBomber(enemy);
}

function explodeBomber(enemy) {
  if (enemy.exploded) return;
  enemy.exploded = true;
  enemy.hp = 0;
  state.shake = Math.max(state.shake, 10);
  addBurst(enemy.x, enemy.y, "#f05d5d", 74);
  if (distance(enemy, state.player) < 112) damagePlayer(30);
}

function updateBossAttacks(dt) {
  const bosses = state.enemies.filter((enemy) => enemy.kind === "boss" && enemy.hp > 0);
  for (const boss of bosses) {
    boss.attackCooldown -= dt;
    if (boss.attackCooldown > 0) continue;

    if (boss.tier >= 3) {
      if (boss.patternStep % 2 === 0) warnBossDash(boss);
      else warnBossVolley(boss, 9, 0.22, 1.05);
      boss.attackCooldown = 2.4;
    } else if (boss.tier === 2) {
      warnBossFields(boss);
      boss.attackCooldown = 3.1;
    } else {
      warnBossVolley(boss, 5, 0.26, 0.65);
      boss.attackCooldown = 2.45;
    }
    boss.patternStep += 1;
  }
}

function warnBossVolley(boss, count, spread, windup) {
  const baseAngle = Math.atan2(state.player.y - boss.y, state.player.x - boss.x);
  const start = -(count - 1) / 2;
  const lines = [];
  for (let i = 0; i < count; i += 1) {
    const angle = baseAngle + (start + i) * spread;
    lines.push({
      x1: boss.x,
      y1: boss.y,
      x2: boss.x + Math.cos(angle) * 720,
      y2: boss.y + Math.sin(angle) * 720,
      angle,
    });
  }
  state.bossTelegraphs.push({ type: "volley", boss, lines, age: 0, windup });
}

function warnBossFields(boss) {
  const p = state.player;
  const circles = [{ x: p.x, y: p.y, r: 96 }];
  for (let i = 0; i < 4; i += 1) {
    const angle = (i / 4) * TAU + randomRange(-0.25, 0.25);
    circles.push({
      x: clamp(p.x + Math.cos(angle) * 155, 80, world.w - 80),
      y: clamp(p.y + Math.sin(angle) * 155, 80, world.h - 80),
      r: 78,
    });
  }
  state.bossTelegraphs.push({ type: "fields", boss, circles, age: 0, windup: 1.25 });
}

function warnBossDash(boss) {
  const angle = Math.atan2(state.player.y - boss.y, state.player.x - boss.x);
  const length = 620;
  const width = 104;
  const endX = clamp(boss.x + Math.cos(angle) * length, boss.r, world.w - boss.r);
  const endY = clamp(boss.y + Math.sin(angle) * length, boss.r, world.h - boss.r);
  state.bossTelegraphs.push({
    type: "dash",
    boss,
    x1: boss.x,
    y1: boss.y,
    x2: endX,
    y2: endY,
    width,
    age: 0,
    windup: 1,
  });
}

function updateBossTelegraphs(dt) {
  for (const telegraph of state.bossTelegraphs) {
    telegraph.age += dt;
    if (telegraph.age < telegraph.windup) continue;
    if (!telegraph.boss || telegraph.boss.hp <= 0) {
      telegraph.done = true;
      continue;
    }

    if (telegraph.type === "volley") fireBossVolley(telegraph);
    if (telegraph.type === "fields") activateBossFields(telegraph);
    if (telegraph.type === "dash") fireBossDash(telegraph);
    telegraph.done = true;
  }
  state.bossTelegraphs = state.bossTelegraphs.filter((telegraph) => !telegraph.done);
}

function fireBossVolley(telegraph) {
  const tier = telegraph.boss.tier || 1;
  for (const ray of telegraph.lines) {
    state.bossShots.push({
      x: telegraph.boss.x,
      y: telegraph.boss.y,
      vx: Math.cos(ray.angle) * (250 + tier * 45),
      vy: Math.sin(ray.angle) * (250 + tier * 45),
      r: 12 + tier,
      life: 3.2,
      damage: 14 + tier * 5,
    });
  }
}

function activateBossFields(telegraph) {
  for (const circle of telegraph.circles) {
    state.bossHazards.push({
      ...circle,
      life: 1.35,
      maxLife: 1.35,
      tick: 0,
      damagePerTick: 16,
    });
    addBurst(circle.x, circle.y, BOSS_WARNING_COLOR, circle.r);
  }
}

function fireBossDash(telegraph) {
  const p = state.player;
  if (distanceToSegment(p, telegraph.x1, telegraph.y1, telegraph.x2, telegraph.y2) < telegraph.width / 2 + p.r) {
    damagePlayer(34);
  }
  telegraph.boss.x = telegraph.x2;
  telegraph.boss.y = telegraph.y2;
  state.shake = Math.max(state.shake, 14);
  addBurst(telegraph.x2, telegraph.y2, BOSS_WARNING_COLOR, 72);
}

function updateBossShots(dt) {
  const p = state.player;
  for (const shot of state.bossShots) {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;
    if (distance(shot, p) < shot.r + p.r) {
      damagePlayer(shot.damage);
      shot.life = 0;
    }
  }
  state.bossShots = state.bossShots.filter(
    (shot) => shot.life > 0 && shot.x > -80 && shot.x < world.w + 80 && shot.y > -80 && shot.y < world.h + 80
  );
}

function updateBossHazards(dt) {
  const p = state.player;
  for (const hazard of state.bossHazards) {
    hazard.life -= dt;
    hazard.tick -= dt;
    if (hazard.tick <= 0 && distance(hazard, p) < hazard.r + p.r) {
      damagePlayer(hazard.damagePerTick);
      hazard.tick = 0.42;
    }
  }
  state.bossHazards = state.bossHazards.filter((hazard) => hazard.life > 0);
}

function updateEnemyShots(dt) {
  const p = state.player;
  for (const shot of state.enemyShots) {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;
    if (distance(shot, p) < shot.r + p.r) {
      damagePlayer(shot.damage);
      shot.life = 0;
    }
  }
  state.enemyShots = state.enemyShots.filter(
    (shot) => shot.life > 0 && shot.x > -80 && shot.x < world.w + 80 && shot.y > -80 && shot.y < world.h + 80
  );
}

function damagePlayer(amount) {
  const p = state.player;
  if (p.invuln > 0 || state.gameOver) return;
  p.hp -= amount;
  p.invuln = 0.42;
  state.shake = Math.max(state.shake, 8);
  addFloater("-" + amount, p.x, p.y - 38, "#f07b63");
  if (p.hp <= 0) endGame();
}

function damageEnemy(enemy, amount) {
  if (enemy.hp <= 0) return;
  enemy.hp -= amount;
  enemy.hit = 1;
  if (enemy.hp <= 0) {
    state.kills += 1;
    state.gems.push({ x: enemy.x, y: enemy.y, r: 7, xp: enemy.xp, pull: 0 });
    maybeDropHeal(enemy);
    addBurst(enemy.x, enemy.y, enemy.color, enemy.kind === "boss" ? 80 : enemy.kind === "elite" ? 30 : 16);
    if (enemy.kind === "boss") {
      state.shake = 16;
      addFloater("BOSS DOWN", enemy.x, enemy.y - 80, "#f0d86a");
      if (enemy.tier >= 3) {
        endGame(true);
      } else {
        handleBossDefeated(enemy);
      }
    }
    if (Math.random() < state.player.bloomChance) bloom(enemy.x, enemy.y);
  }
}

// 몬스터 처치 시 일정 확률로 회복 픽업을 떨어뜨립니다.
function maybeDropHeal(enemy) {
  const chance = enemy.kind === "boss" ? 1 : enemy.kind === "elite" ? 0.20 : enemy.kind === "brute" ? 0.1 : 0.05;
  if (Math.random() > chance) return;

  const amount = enemy.kind === "boss" ? 55 : enemy.kind === "elite" ? 32 : 20;
  state.pickups.push({
    type: "heal",
    x: enemy.x,
    y: enemy.y,
    r: 12,
    amount,
    pull: 0,
  });
}

// 꽃가루 폭발 효과입니다. 주변 적에게 거리 비례 피해를 줍니다.
function handleBossDefeated(boss) {
  state.defeatedBossTiers[boss.tier] = true;
  if (boss.tier === 1 && !state.enemyUnlocks.spitter) {
    state.enemyUnlocks.spitter = true;
    addFloater("신규 적: 활 고블린", state.player.x, state.player.y - 96, "#b66bf0");
  }
  if (boss.tier === 2 && !state.enemyUnlocks.bomber) {
    state.enemyUnlocks.bomber = true;
    addFloater("신규 적: 자폭 고블린", state.player.x, state.player.y - 96, "#f05d5d");
  }
  showBossRewards(boss.tier);
}

function showBossRewards(tier) {
  state.choosing = true;
  ui.upgradeCards.innerHTML = "";
  if (ui.upgradeTitle) ui.upgradeTitle.textContent = "보스 보상";
  state.upgradeSelection = 0;

  const rewards = sample(getBossRewardOptions(tier), 3);
  rewards.forEach((reward, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "upgrade-card boss-reward";
    button.dataset.upgradeIndex = String(index);
    button.innerHTML = `<b>${reward.title}</b><span>${reward.text}</span>`;
    button.addEventListener("click", () => {
      reward.apply();
      addFloater(reward.title, state.player.x, state.player.y - 80, "#f0d86a");
      closeUpgradePanel();
    });
    ui.upgradeCards.append(button);
  });

  ui.levelPanel.classList.remove("hidden");
  focusUpgradeCard(0);
}

function getBossRewardOptions(tier) {
  return [
    {
      title: "급속 개화",
      text: "공격 간격 18% 감소",
      apply: () => (state.player.fireRate *= 0.82),
    },
    {
      title: "쌍둥이 씨앗",
      text: "투사체 +1",
      apply: () => (state.player.projectiles += 1),
    },
    {
      title: "강철 수피",
      text: "최대 체력 +30, 체력 45 회복",
      apply: () => {
        state.player.maxHp += 30;
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + 45);
      },
    },
    {
      title: "달빛 자석",
      text: "흡수 범위 +80",
      apply: () => (state.player.pickup += 80),
    },
    {
      title: tier >= 2 ? "짧은 월식" : "새로운 월식",
      text: "현재 궁극기 쿨타임 12초 감소",
      apply: () => {
        state.ultimate.cooldown = Math.max(0, state.ultimate.cooldown - 12);
      },
    },
  ];
}

function bloom(x, y) {
  addBurst(x, y, "#f0d86a", 34);
  state.shake = Math.max(state.shake, 4);
  for (const enemy of state.enemies) {
    const d = distance(enemy, { x, y });
    if (d < 118) damageEnemy(enemy, 36 * (1 - d / 140));
  }
}

// 경험치 보석을 플레이어에게 끌어당기고, 먹었을 때 경험치와 레벨업을 처리합니다.
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

// 회복 픽업을 끌어당기고, 먹으면 체력을 회복합니다.
function updatePickups(dt) {
  const p = state.player;
  for (const pickup of state.pickups) {
    const d = distance(pickup, p);
    if (d < p.pickup) pickup.pull = Math.min(1, pickup.pull + dt * 4);
    if (pickup.pull > 0) {
      const angle = Math.atan2(p.y - pickup.y, p.x - pickup.x);
      const speed = 140 + pickup.pull * 560;
      pickup.x += Math.cos(angle) * speed * dt;
      pickup.y += Math.sin(angle) * speed * dt;
    }

    if (d < p.r + pickup.r) {
      if (pickup.type === "heal") {
        const before = p.hp;
        p.hp = Math.min(p.maxHp, p.hp + pickup.amount);
        addFloater("+" + Math.round(p.hp - before), p.x, p.y - 66, "#6be68a");
      }
      pickup.collected = true;
    }
  }
  state.pickups = state.pickups.filter((pickup) => !pickup.collected);
}

// 5분 이후 꽃장판 생성/소멸과 필살기 추가 충전을 관리합니다.
function updateFlowerPatches(dt) {
  if (state.time < FLOWER_START_TIME) return;

  const p = state.player;
  if (state.flowerPatches.length === 0) {
    state.nextFlowerTimer -= dt;
    if (state.nextFlowerTimer <= 0) spawnFlowerPatch();
  }

  for (const patch of state.flowerPatches) {
    patch.life -= dt;
    patch.pulse += dt;
    const inside = distance(patch, p) < patch.r + p.r;
    patch.active = inside;

    if (inside && state.ultimate.cooldown > 0) {
      state.ultimate.cooldown = Math.max(0, state.ultimate.cooldown - patch.rechargeRate * dt);
      patch.tick += dt;
      if (patch.tick >= 1) {
        patch.tick = 0;
        addFloater("ULT +" + patch.rechargeRate.toFixed(1), p.x, p.y - 90, "#f0d86a");
      }
    }
  }

  const before = state.flowerPatches.length;
  state.flowerPatches = state.flowerPatches.filter((patch) => patch.life > 0);
  if (before > 0 && state.flowerPatches.length === 0) {
    state.nextFlowerTimer = randomRange(40, 60);
  }
}

// 플레이어 주변 일정 거리 밖에 10초짜리 꽃장판을 생성합니다.
function spawnFlowerPatch() {
  const p = state.player;
  const angle = Math.random() * TAU;
  const dist = randomRange(260, 560);
  const x = clamp(p.x + Math.cos(angle) * dist, 120, world.w - 120);
  const y = clamp(p.y + Math.sin(angle) * dist, 120, world.h - 120);

  state.flowerPatches.push({
    x,
    y,
    r: 92,
    life: FLOWER_DURATION,
    maxLife: FLOWER_DURATION,
    rechargeRate: randomRange(1, 2),
    pulse: 0,
    tick: 0,
    active: false,
  });
  addFloater("FLOWER FIELD", x, y - 90, "#f0d86a");
}

// 경험치가 충분할 때 레벨을 올리고 업그레이드 선택 화면을 엽니다.
function levelUp() {
  const p = state.player;
  p.xp -= p.nextXp;
  p.level += 1;
  p.nextXp = Math.floor(p.nextXp * 1.24 + 12);
  p.hp = Math.min(p.maxHp, p.hp + 10);
  state.choosing = true;
  showUpgrades();
}

// 레벨업 선택지 3개를 만들고, 선택 시 해당 스킬 레벨을 올립니다.
function showUpgrades() {
  ui.upgradeCards.innerHTML = "";
  if (ui.upgradeTitle) ui.upgradeTitle.textContent = "UPGRADE";
  state.upgradeSelection = 0;
  const available = skillCatalog.filter((skill) => getSkillLevel(skill.id) < skill.maxLevel);
  const choices = available.length > 0 ? sample(available, Math.min(3, available.length)) : [];

  if (choices.length === 0) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "upgrade-card";
    button.dataset.upgradeIndex = "0";
    button.innerHTML = `<b>만개한 생명력</b><span>모든 스킬이 최대 레벨입니다. 체력을 35 회복합니다.</span>`;
    button.addEventListener("click", () => {
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 35);
      closeUpgradePanel();
    });
    ui.upgradeCards.append(button);
    ui.levelPanel.classList.remove("hidden");
    focusUpgradeCard(0);
    return;
  }

  choices.forEach((upgrade, index) => {
    const nextLevel = getSkillLevel(upgrade.id) + 1;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "upgrade-card";
    button.dataset.upgradeIndex = String(index);
    button.innerHTML = `<b>${upgrade.title}</b><span>${upgrade.text(nextLevel)}</span>`;
    button.addEventListener("click", () => {
      applySkill(upgrade);
      closeUpgradePanel();
    });
    ui.upgradeCards.append(button);
  });
  ui.levelPanel.classList.remove("hidden");
  focusUpgradeCard(0);
}

// 현재 보유한 특정 스킬의 레벨을 가져옵니다.
function closeUpgradePanel() {
  state.choosing = false;
  ui.levelPanel.classList.add("hidden");
  if (ui.upgradeTitle) ui.upgradeTitle.textContent = "UPGRADE";
  updateUi();
}

function getUpgradeCards() {
  return [...ui.upgradeCards.querySelectorAll(".upgrade-card")];
}

function focusUpgradeCard(index) {
  const cards = getUpgradeCards();
  if (cards.length === 0) return;
  state.upgradeSelection = (index + cards.length) % cards.length;
  cards.forEach((card, i) => card.classList.toggle("selected", i === state.upgradeSelection));
  cards[state.upgradeSelection].focus({ preventScroll: true });
}

function handleUpgradeKeys(event) {
  const cards = getUpgradeCards();
  if (!state?.choosing || cards.length === 0) return false;

  if (event.code === "ArrowLeft" || event.code === "ArrowUp" || event.code === "KeyA" || event.code === "KeyW") {
    focusUpgradeCard(state.upgradeSelection - 1);
  } else if (
    event.code === "ArrowRight" ||
    event.code === "ArrowDown" ||
    event.code === "KeyD" ||
    event.code === "KeyS" ||
    (event.code === "Tab" && !event.shiftKey)
  ) {
    focusUpgradeCard(state.upgradeSelection + 1);
  } else if (event.code === "Tab" && event.shiftKey) {
    focusUpgradeCard(state.upgradeSelection - 1);
  } else if (event.code === "Enter" || event.code === "Space") {
    cards[state.upgradeSelection].click();
  } else if (event.code.startsWith("Digit") || event.code.startsWith("Numpad")) {
    const number = Number(event.code.replace("Digit", "").replace("Numpad", ""));
    if (number < 1 || number > cards.length) return false;
    focusUpgradeCard(number - 1);
    cards[number - 1].click();
  } else {
    return false;
  }

  event.preventDefault();
  return true;
}

function getSkillLevel(id) {
  return state.skills[id] || 0;
}

// 선택한 스킬의 레벨을 올리고 실제 능력치 효과를 적용합니다.
function applySkill(skill) {
  const nextLevel = getSkillLevel(skill.id) + 1;
  state.skills[skill.id] = nextLevel;
  skill.apply(nextLevel);
  addFloater(`${skill.title} Lv.${nextLevel}`, state.player.x, state.player.y - 72, "#f0d86a");
  updateSkillUi();
}

// 왼쪽 SKILLS 패널에 현재 보유 스킬과 레벨을 표시합니다.
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

// 원형 폭발 이펙트를 추가합니다.
function addBurst(x, y, color, size) {
  state.bursts.push({ x, y, color, size, life: 0.42, maxLife: 0.42 });
}

// 폭발 이펙트의 남은 시간을 줄이고 끝난 이펙트를 제거합니다.
function updateBursts(dt) {
  for (const burst of state.bursts) burst.life -= dt;
  state.bursts = state.bursts.filter((burst) => burst.life > 0);
}

// 피해량, 경험치, 보스 알림 같은 떠오르는 텍스트를 추가합니다.
function addFloater(text, x, y, color) {
  state.floaters.push({ text, x, y, color, life: 0.95 });
}

// 떠오르는 텍스트를 위로 움직이고 시간이 끝나면 제거합니다.
function updateFloaters(dt) {
  for (const floater of state.floaters) {
    floater.y -= 42 * dt;
    floater.life -= dt;
  }
  state.floaters = state.floaters.filter((floater) => floater.life > 0);
}

// 현재 게임 상태를 캔버스에 그립니다. 카메라 계산도 여기서 처리합니다.
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

  drawFlowerPatches();
  drawBossTelegraphs();
  drawBossHazards();
  drawGems();
  drawPickups();
  drawBursts();
  drawEnemyShots();
  drawBossShots();
  drawShots();
  drawEnemies();
  drawOrbitals();
  drawPlayer();
  drawFloaters();

  ctx.restore();
  drawUltimateOverlay();
  drawBossSpawnWarning();
  if (state.paused && !state.choosing && !state.gameOver) drawCenterText("PAUSED");
}

// 배경 격자와 작은 장식 점들을 그려 이동감을 만듭니다.
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

// 플레이어 스프라이트, 피격 깜빡임, 경험치 흡수 범위를 그립니다.
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

// 모든 적 스프라이트와 엘리트/보스 테두리를 그립니다.
function drawEnemies() {
  for (const enemy of state.enemies) {
    if (enemy.kind === "spitter") {
      drawSpitter(enemy);
      continue;
    }
    if (enemy.kind === "bomber") {
      drawBomber(enemy);
      continue;
    }
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

// 플레이어가 발사한 투사체를 그립니다.
function drawSpitter(enemy) {
  if (drawExtraEnemySprite("spitter", enemy.x, enemy.y, enemy.r * 4.6, enemy.r * 4.6, enemy.x > state.player.x)) {
    return;
  }
  ctx.save();
  const pulse = 1 + Math.sin(state.time * 7 + enemy.x) * 0.08;
  ctx.translate(enemy.x, enemy.y);
  ctx.fillStyle = enemy.hit > 0 ? "#ffffff" : "#7b4df0";
  ctx.beginPath();
  ctx.ellipse(0, 0, enemy.r * 1.05, enemy.r * 0.9 * pulse, 0, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = "#d8b5ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, enemy.r + 5, -0.8, 0.8);
  ctx.stroke();

  ctx.fillStyle = "#f6f2e8";
  circle(-5, -3, 3);
  circle(5, -3, 3);
  ctx.fillStyle = "#b66bf0";
  circle(0, 8, 5);
  ctx.restore();
}

function drawBomber(enemy) {
  if (drawExtraEnemySprite("bomber", enemy.x, enemy.y, enemy.r * 4.8, enemy.r * 4.8, enemy.x > state.player.x)) {
    return;
  }
  ctx.save();
  const armedPulse = enemy.armed ? 0.65 + Math.sin(state.time * 18) * 0.25 : 0;
  ctx.translate(enemy.x, enemy.y);
  ctx.fillStyle = enemy.hit > 0 ? "#ffffff" : "#3a2225";
  ctx.beginPath();
  ctx.arc(0, 0, enemy.r * (1 + armedPulse * 0.12), 0, TAU);
  ctx.fill();

  ctx.strokeStyle = enemy.armed ? "#ff3b45" : "#f0d86a";
  ctx.lineWidth = enemy.armed ? 5 : 3;
  ctx.beginPath();
  ctx.arc(0, 0, enemy.r + 5, 0, TAU);
  ctx.stroke();

  ctx.fillStyle = enemy.armed ? "#ff3b45" : "#f05d5d";
  circle(0, 0, enemy.r * 0.45);
  ctx.strokeStyle = "#f6f2e8";
  ctx.lineWidth = 2;
  line(-enemy.r * 0.8, 0, enemy.r * 0.8, 0);
  line(0, -enemy.r * 0.8, 0, enemy.r * 0.8);
  ctx.restore();
}

function drawEnemyShots() {
  for (const shot of state.enemyShots) {
    ctx.save();
    ctx.fillStyle = shot.color || "#b66bf0";
    ctx.shadowColor = shot.color || "#b66bf0";
    ctx.shadowBlur = 10;
    circle(shot.x, shot.y, shot.r);
    ctx.restore();
  }
}

function drawShots() {
  ctx.fillStyle = "#f0d86a";
  for (const shot of state.shots) circle(shot.x, shot.y, shot.r);
}

// 경험치 보석을 그립니다. 이미지가 없으면 다이아몬드 모양으로 대체합니다.
function drawGems() {
  for (const gem of state.gems) {
    const bob = Math.sin(state.time * 5 + gem.x) * 3;
    if (!drawSprite("gem", gem.x, gem.y + bob, 34, 44)) {
      ctx.fillStyle = "#54d1bd";
      diamond(gem.x, gem.y, gem.r);
    }
  }
}

// 회복 픽업을 초록색 하트 모양으로 그립니다.
function drawPickups() {
  for (const pickup of state.pickups) {
    if (pickup.type !== "heal") continue;
    const bob = Math.sin(state.time * 6 + pickup.x) * 3;
    ctx.save();
    ctx.translate(pickup.x, pickup.y + bob);
    ctx.fillStyle = "#6be68a";
    ctx.beginPath();
    ctx.arc(-5, -3, 6, 0, TAU);
    ctx.arc(5, -3, 6, 0, TAU);
    ctx.moveTo(-11, 0);
    ctx.lineTo(0, 13);
    ctx.lineTo(11, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

// 필살기 충전 꽃장판을 바닥에 그립니다.
function drawFlowerPatches() {
  for (const patch of state.flowerPatches) {
    const t = patch.life / patch.maxLife;
    const pulse = Math.sin(patch.pulse * 5) * 0.06;
    ctx.save();
    ctx.globalAlpha = 0.24 + (patch.active ? 0.2 : 0);
    ctx.fillStyle = patch.active ? "#f0d86a" : "#6be68a";
    ctx.beginPath();
    ctx.arc(patch.x, patch.y, patch.r * (1 + pulse), 0, TAU);
    ctx.fill();

    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = patch.active ? "#f6f2e8" : "#f0d86a";
    ctx.lineWidth = patch.active ? 4 : 3;
    ctx.beginPath();
    ctx.arc(patch.x, patch.y, patch.r, -Math.PI / 2, -Math.PI / 2 + TAU * t);
    ctx.stroke();

    ctx.fillStyle = "#f6f2e8";
    for (let i = 0; i < 10; i += 1) {
      const angle = (i / 10) * TAU + patch.pulse * 0.5;
      const px = patch.x + Math.cos(angle) * patch.r * 0.55;
      const py = patch.y + Math.sin(angle) * patch.r * 0.55;
      ctx.beginPath();
      ctx.ellipse(px, py, 8, 18, angle, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

// 폭발 이펙트를 시간에 따라 커지는 원으로 그립니다.
function drawBossTelegraphs() {
  for (const telegraph of state.bossTelegraphs) {
    const t = clamp(telegraph.age / telegraph.windup, 0, 1);
    const alpha = 0.18 + t * 0.38;
    ctx.save();
    ctx.strokeStyle = `rgba(255, 59, 69, ${alpha + 0.25})`;
    ctx.fillStyle = `rgba(255, 59, 69, ${alpha})`;
    ctx.lineWidth = 3 + t * 3;

    if (telegraph.type === "volley") {
      for (const ray of telegraph.lines) {
        line(ray.x1, ray.y1, ray.x2, ray.y2);
      }
    }

    if (telegraph.type === "fields") {
      for (const circle of telegraph.circles) {
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.r, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
    }

    if (telegraph.type === "dash") {
      drawWarningCapsule(telegraph.x1, telegraph.y1, telegraph.x2, telegraph.y2, telegraph.width);
    }
    ctx.restore();
  }
}

function drawBossHazards() {
  for (const hazard of state.bossHazards) {
    const t = clamp(hazard.life / hazard.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = 0.18 + t * 0.18;
    ctx.fillStyle = BOSS_WARNING_COLOR;
    ctx.beginPath();
    ctx.arc(hazard.x, hazard.y, hazard.r, 0, TAU);
    ctx.fill();

    ctx.globalAlpha = 0.65;
    ctx.strokeStyle = "#ff8a92";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(hazard.x, hazard.y, hazard.r * (0.9 + Math.sin(state.time * 15) * 0.04), 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

function drawBossShots() {
  for (const shot of state.bossShots) {
    ctx.save();
    ctx.fillStyle = BOSS_WARNING_COLOR;
    ctx.shadowColor = BOSS_WARNING_COLOR;
    ctx.shadowBlur = 12;
    circle(shot.x, shot.y, shot.r);
    ctx.restore();
  }
}

function drawWarningCapsule(x1, y1, x2, y2, width) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const length = Math.hypot(x2 - x1, y2 - y1);
  ctx.save();
  ctx.translate(x1, y1);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.roundRect(0, -width / 2, length, width, width / 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
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

// 플레이어 주변을 도는 회전 가시 무기를 그립니다.
function drawOrbitals() {
  const p = state.player;
  ctx.fillStyle = "#d7e36b";
  for (let i = 0; i < p.orbitals; i += 1) {
    const a = state.time * 2.6 + (i / p.orbitals) * TAU;
    circle(p.x + Math.cos(a) * 62, p.y + Math.sin(a) * 62, 11);
  }
}

// 떠오르는 텍스트 이펙트를 화면에 그립니다.
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

// 2x2 스프라이트 시트에서 지정한 칸을 잘라 캔버스에 그립니다.
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

// 필살기 사용 중 화면 전체 컷인/충전 연출을 그립니다.
function drawExtraEnemySprite(name, x, y, width, height, flip = false) {
  if (!extraEnemySheet.complete || extraEnemySheet.naturalWidth === 0) return false;

  const cell = extraEnemyCells[name];
  if (!cell) return false;

  const frameW = extraEnemySheet.naturalWidth / 2;
  const frameH = extraEnemySheet.naturalHeight;
  const sx = cell.col * frameW;

  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(extraEnemySheet, sx, 0, frameW, frameH, -width / 2, -height / 2, width, height);
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

// 일시정지 같은 중앙 안내 문구를 어두운 오버레이 위에 그립니다.
function drawBossSpawnWarning() {
  if (!state || state.nextBossIndex >= BOSS_SPAWN_TIMES.length) return;
  const remaining = BOSS_SPAWN_TIMES[state.nextBossIndex] - state.time;
  if (remaining <= 0 || remaining > BOSS_WARNING_TIME) return;

  const viewW = canvas.clientWidth;
  const viewH = canvas.clientHeight;
  const pulse = 0.55 + Math.sin(state.time * 12) * 0.18;
  ctx.save();
  ctx.fillStyle = `rgba(255, 59, 69, ${0.08 + pulse * 0.05})`;
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ff8a92";
  ctx.font = "900 24px Inter, sans-serif";
  ctx.fillText(state.nextBossIndex >= 2 ? "FINAL BOSS APPROACHING" : "BOSS APPROACHING", viewW / 2, 92);
  ctx.fillStyle = "#f6f2e8";
  ctx.font = "900 48px Inter, sans-serif";
  ctx.fillText(Math.ceil(remaining), viewW / 2, 142);
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

// 시간, 레벨, 처치 수, 체력/경험치 바 같은 HUD를 갱신합니다.
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

// 필살기 아이콘의 충전량, READY 상태, 남은 쿨타임 표시를 갱신합니다.
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

// 살아있는 보스가 있으면 상단 보스 체력바를 표시하고 갱신합니다.
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

// 게임을 종료하고 승리/패배 결과 화면을 표시합니다.
function endGame(won = false) {
  state.gameOver = true;
  state.running = false;
  state.won = won;
  ui.resultText.textContent = `${won ? "15분 생존 성공" : "쓰러졌습니다"} · ${formatTime(state.time)} 생존 · ${state.kills} 처치 · 레벨 ${state.player.level}`;
  ui.gameOverPanel.classList.remove("hidden");
}

// requestAnimationFrame으로 반복 실행되는 메인 루프입니다.
function loop(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000 || 0);
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

// 캔버스에 원을 그리는 보조 함수입니다.
function circle(x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

// 캔버스에 다이아몬드 모양을 그리는 보조 함수입니다.
function diamond(x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
  ctx.fill();
}

// 캔버스에 선을 그리는 보조 함수입니다.
function line(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

// 두 좌표 사이의 거리를 계산합니다.
function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// 값을 최소~최대 범위 안으로 제한합니다.
function distanceToSegment(point, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy || 1;
  const t = clamp(((point.x - x1) * dx + (point.y - y1) * dy) / lenSq, 0, 1);
  return Math.hypot(point.x - (x1 + dx * t), point.y - (y1 + dy * t));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// 배열에서 무작위 항목을 count개 뽑습니다.
function sample(list, count) {
  return [...list].sort(() => Math.random() - 0.5).slice(0, count);
}

// min~max 사이의 무작위 숫자를 반환합니다.
function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

// 초 단위 시간을 MM:SS 문자열로 바꿉니다.
function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function setPaused(paused) {
  if (!state || state.choosing || state.gameOver) return;
  state.paused = paused;
  ui.pausePanel.classList.toggle("hidden", !paused);
}

function updateTouchMove(event) {
  if (!ui.movePad || !ui.moveKnob) return;
  const rect = ui.movePad.getBoundingClientRect();
  const radius = rect.width / 2;
  const centerX = rect.left + radius;
  const centerY = rect.top + radius;
  const rawX = event.clientX - centerX;
  const rawY = event.clientY - centerY;
  const distance = Math.hypot(rawX, rawY);
  const limited = Math.min(distance, radius);
  const scale = distance > 0 ? limited / distance : 0;
  const knobX = rawX * scale;
  const knobY = rawY * scale;

  touchMove.dx = radius > 0 ? knobX / radius : 0;
  touchMove.dy = radius > 0 ? knobY / radius : 0;
  ui.moveKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;
}

function resetTouchMove() {
  touchMove.id = null;
  touchMove.dx = 0;
  touchMove.dy = 0;
  if (ui.moveKnob) ui.moveKnob.style.transform = "translate(0, 0)";
}

if (ui.movePad) {
  ui.movePad.addEventListener("pointerdown", (event) => {
    touchMove.id = event.pointerId;
    ui.movePad.setPointerCapture(event.pointerId);
    updateTouchMove(event);
    event.preventDefault();
  });

  ui.movePad.addEventListener("pointermove", (event) => {
    if (touchMove.id !== event.pointerId) return;
    updateTouchMove(event);
    event.preventDefault();
  });

  ui.movePad.addEventListener("pointerup", (event) => {
    if (touchMove.id === event.pointerId) resetTouchMove();
  });

  ui.movePad.addEventListener("pointercancel", (event) => {
    if (touchMove.id === event.pointerId) resetTouchMove();
  });
}

window.addEventListener("keydown", (event) => {
  if (handleUpgradeKeys(event)) return;

  keys.add(event.code);
  if (event.code === "Escape" && state && !state.choosing && !state.gameOver) {
    setPaused(!state.paused);
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
ui.pauseRestartButton.addEventListener("click", newGame);
ui.resumeButton.addEventListener("click", () => setPaused(false));
ui.pauseButton.addEventListener("click", () => {
  if (state && !state.choosing && !state.gameOver) setPaused(!state.paused);
});
if (ui.ultimateButton) {
  ui.ultimateButton.addEventListener("pointerdown", (event) => {
    castUltimate();
    event.preventDefault();
  });
}

requestAnimationFrame(loop);
