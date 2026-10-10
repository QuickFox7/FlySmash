// 説明カード以外のタイトルUIは、幅400pxを基準にそれ以下で比例縮小する
const titleHeader = document.getElementById("titleHeader");
function resizeTitleHeader() {
    const scale = Math.min(1, window.innerWidth / 400);
    titleHeader.style.transform = `scale(${scale})`;
    titleHeader.style.marginBottom = `${-(1 - scale) * titleHeader.offsetHeight}px`;
}
window.addEventListener("resize", resizeTitleHeader);
resizeTitleHeader();

let gameState = "title"; // title, playing, result
let gameMode = "endless"; // endless, timeAttack, survival
let survivalState = "normal"; // normal, raidBanner, flyRaid, raidClearBanner

const RAID_INTERVAL = 60;      // 次の襲来までの時間（秒）
let timeSinceLastRaid = 0;             // 通常状態になってからの経過時間
const RAID_BANNER_DURATION = 5; // バナー表示時間（秒）
let raidBannerTimer = 0;        // バナー表示開始からの経過時間
const RAID_CLEAR_BANNER_DURATION = 2; // 襲来イベントクリアバナー表示時間（秒）
let raidClearBannerTimer = 0;       // 襲来イベントクリアバナー表示開始からの経過時間

const titleScreen = document.getElementById("titleScreen");
const titleBest = document.getElementById("titleBest");
const gameContainer = document.getElementById("gameContainer");
const raidBanner = document.getElementById("raidBanner");
const raidClearBanner = document.getElementById("raidClearBanner");
const INITIAL_FLY_COUNT = 1;
const RAID_FLY_MAX = 5;             // 同時に存在できる最大数
const RAID_FLY_DEFEAT_TARGET = 15;  // 倒すとクリアになる数

let raidFlyDefeated = 0;            // 襲来イベント中に倒した累計数

const flies = [];
for (let i = 0; i < INITIAL_FLY_COUNT; i++) {
    createFly();
}
function clampFliesToScreen() {
    const w = gameContainer.clientWidth;
    const h = gameContainer.clientHeight;

    for (const fly of flies) {
        const fw = fly.el.offsetWidth;
        const fh = fly.el.offsetHeight;

        fly.x = Math.max(0, Math.min(w - fw, fly.x));
        fly.y = Math.max(0, Math.min(h - fh, fly.y));

        fly.el.style.left = `${fly.x}px`; // leftのpx値を更新
        fly.el.style.top = `${fly.y}px`; // topのpx値を更新
    }
}
const EAT_TIME = 1.5; // ハエがスイカを食べるのにかかる時間（秒）
const splashCanvas = document.getElementById("splashCanvas");
const splashCtx = splashCanvas.getContext("2d");
const DPR = Math.min(window.devicePixelRatio || 1, 2);
function resizeSplashCanvas() {
    splashCanvas.width = gameContainer.clientWidth * DPR;
    splashCanvas.height = gameContainer.clientHeight * DPR;

    splashCanvas.style.width = gameContainer.clientWidth + "px";
    splashCanvas.style.height = gameContainer.clientHeight + "px";

    splashCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
const COLOR = [255,70,70];
const GRAV = 0.18;
const particles = [];
// 細かいしぶきの粒
class Speck {
	constructor(x, y, vx, vy, r) {
		this.x = x; this.y = y;
		this.vx = vx; this.vy = vy;
		this.r = r;
		this.life = 1;
		this.decay = 0.012 + Math.random() * 0.02;
	}
	update() {
		this.vy += GRAV * 0.8;
		this.x += this.vx;
		this.y += this.vy;
		this.vx *= 0.99;
		this.life -= this.decay;
	}
	draw() {
		const radius = this.r * this.life;
		if (radius <= 0) return;

        splashCtx.beginPath();
        splashCtx.fillStyle = `rgba(${COLOR[0]},${COLOR[1]},${COLOR[2]},0.9)`;
        splashCtx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        splashCtx.fill();

        // 小さなハイライト
        splashCtx.beginPath();
        splashCtx.fillStyle = `rgba(255,255,255,0.8)`;
        splashCtx.arc(
            this.x - radius * 0.28,
            this.y - radius * 0.30,
            radius * 0.22,
            0,
            Math.PI * 2
        );
        splashCtx.fill();
    }
}
function spawnJuiceSpecks(x, y) {
    for (let i = 0; i < 3; i++) {
        particles.push(
            new Speck(
                x,
                y,
                (Math.random()-0.5)*4,
                -Math.random()*4,
                3+Math.random()*1.5
            )
        );
    }
}
const eatDisplayCanvas = document.getElementById("eatDisplayCanvas");
const eatDisplayCtx = eatDisplayCanvas.getContext("2d");
function resizeEatDisplay() {
    eatDisplayCanvas.width = gameContainer.clientWidth;
    eatDisplayCanvas.height = gameContainer.clientHeight;
}
resizeEatDisplay();
const comboBorder = document.getElementById("comboBorder");
const comboBorderRect = document.getElementById("comboBorderRect");
function resizeComboBorder() {
    const w = gameContainer.clientWidth;
    const h = gameContainer.clientHeight;
    comboBorder.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const padding = 4;
    const stroke = 8;
    comboBorderRect.setAttribute("x", padding);
    comboBorderRect.setAttribute("y", padding);
    comboBorderRect.setAttribute(
        "width",
        w - padding * 2
    );
    comboBorderRect.setAttribute(
        "height",
        h - padding * 2
    );
    const perimeter =
        (w - padding * 2) * 2 +
        (h - padding * 2) * 2;
    comboBorderRect.style.strokeDasharray =
        perimeter;
    comboBorderRect.dataset.perimeter =
        perimeter;
}
resizeComboBorder();
const flappyContainer = document.getElementById("flappyContainer");
const flappyBgSky = document.getElementById("flappyBgSky");
const flappyChar = document.getElementById("flappyChar");
const flappyGround = document.getElementById("flappyGround");
const flappyScore = document.getElementById("flappyScore");
const high = document.getElementById("flappyHigh");
high.classList.add("high-normal");
const highLine = document.getElementById("flappyHighLine");
const highLabel = document.getElementById("flappyHighLabel");
const highIndicator = document.getElementById("flappyHighIndicator");
const best = document.getElementById("flappyBest");
best.classList.add("best-normal");
const bestLine = document.getElementById("flappyBestLine");
const bestLabel = document.getElementById("flappyBestLabel");
const bestIndicator = document.getElementById("flappyBestIndicator");

const resultScreen = document.getElementById("resultScreen");

const windCanvas = document.getElementById("flappyWind");
const wctx = windCanvas.getContext("2d");
function resizeWind() {
    windCanvas.width = flappyContainer.clientWidth;
    windCanvas.height = flappyContainer.clientHeight;
}
resizeWind();

const starCanvas = document.getElementById("flappyStars");
const sctx = starCanvas.getContext("2d");
function resizeStars() {
    starCanvas.width = flappyContainer.clientWidth;
    starCanvas.height = flappyContainer.clientHeight;
}
resizeStars();

const STAR_COUNT = 1000;

const stars = Array.from({ length: STAR_COUNT }, () => {
    const b = Math.random() * 0.6 + 0.4;
    return {
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 2.5 + 0.1,
        brightness: b,
        phase: Math.random() * Math.PI * 2,
        speed: 15 * b
    };
});

function resizeAll() {
    resizeComboBorder();
    resizeWind();
    resizeStars();
    resizeEatDisplay();
    clampFliesToScreen();
    resizeSplashCanvas();
}

let prevWidth = gameContainer.clientWidth;
let prevHeight = gameContainer.clientHeight;

function checkResize() {
    const w = gameContainer.clientWidth;
    const h = gameContainer.clientHeight;

    if (w === prevWidth && h === prevHeight) return;

    prevWidth = w;
    prevHeight = h;

    resizeAll();
}

const modes = [
    { id: "endless", name: "∞ エンドレス" },
    { id: "timeAttack", name: "⏱ 60秒チャレンジ" },
    { id: "survival", name: "🎯 サバイバル(3ミス)" }
];

let modeIndex = 0;
const modeDisplay = document.getElementById("modeDisplay");

function updateModeDisplay() {
    modeDisplay.textContent = modes[modeIndex].name;

    titleBest.textContent =
        `BEST : ${
            Math.floor(
                bestScores[modes[modeIndex].id]
            )
        }`;
}

const modePrev = document.getElementById("modePrev");
modePrev.addEventListener("click", () => {
    modeIndex--;
    if (modeIndex < 0) {
        modeIndex = modes.length - 1;
    }
    updateModeDisplay();
});

const modeNext = document.getElementById("modeNext");
modeNext.addEventListener("click", () => {
    modeIndex++;
    if (modeIndex >= modes.length) {
        modeIndex = 0;
    }
    updateModeDisplay();
});

let remainTime = 60;

const timer = document.getElementById("timer");

const timerGauge =
    document.getElementById("timerGauge");

const timerText =
    document.getElementById("timerText");

const circumference =
    2 * Math.PI * 45; // r=45の円周

timerGauge.style.strokeDasharray =
    circumference;

let hitPoint = 3;
const hitPointContainer = document.getElementById("hitPointContainer");
const hitPointText = document.getElementById("hitPointText");
const hitPointIcon = document.getElementById("hitPointIcon");

const startButton = document.getElementById("startButton");
startButton.addEventListener("click", () => {
    gameState = "playing";
    titleScreen.style.display = "none";
    gameMode = modes[modeIndex].id;
    previousBestScore = bestScores[gameMode];
    runBestScore = 0;
    if (gameMode === "timeAttack") {
        remainTime = 60;
        timerGauge.style.strokeDashoffset = 0;
        timer.style.display = "block";
        hitPointContainer.style.display = "none";
    } else if (gameMode === "survival") {
        survivalState = "normal";
        timeSinceLastRaid = 0;
        raidBannerTimer = 0;
        raidClearBannerTimer = 0;
        raidFlyDefeated = 0;
        raidBanner.style.display = "none";
        raidClearBanner.style.display = "none";

        hitPointContainer.style.display = "block";
        hitPoint = 3;
        hitPointText.textContent = "LIFE";
        hitPointIcon.textContent = "❤️❤️❤️";
        timer.style.display = "none";
    } else {
        timer.style.display = "none";
        hitPointContainer.style.display = "none";
    }
    updateModeDisplay();
    requestAnimationFrame(() => {
        gameContainer.style.height = "60vh";
        flappyContainer.style.height = "40vh";
    });
});
document.querySelectorAll(".homeButton")
    .forEach(button => {
        button.addEventListener("click", goHome);
    });

function removeAllFlies() {
    for (const fly of flies) {
        fly.el.remove();
        if (fly.hitPointBar) {
            fly.hitPointBar.remove();
        }
    }
    flies.length = 0;
}

function goHome() {
    gameState = "title";
    survivalState = "normal";
    titleScreen.style.display = "flex";
    resultScreen.style.display = "none";
    timer.style.display = "none";
    hitPointContainer.style.display = "none";
    runBestScore = 0;
    updateModeDisplay();

    removeAllFlies();
    for (let i = 0; i < INITIAL_FLY_COUNT; i++) {
        createFly();
    }

    requestAnimationFrame(() => {
        gameContainer.style.height = "100vh";
        flappyContainer.style.height = "0";
    });
}

let gravity = 9.8;
const frameRate = 60 // 毎秒
let lastTime = Date.now(); // フレーム間の正確な時間測定用

let score = 0; // 現在のスコア
let previousBestScore = 0; // 過去のベストスコア
let runBestScore = 0; // この回のベストスコア
const bestScores = {
    endless: 0,
    timeAttack: 0,
    survival: 0
}; // モードごとのベストスコア
let isUpdatingBest = false;
let scoreVel = 0; // score increase per second
let flappyVelX = 0;
const FLAPPY_PX_PER_UNIT = 80; // フラッピーゾーン独自の長さをpxに変換
let lastClickTime = 0; // ミリ秒
let combo = 0;
let comboLimit = 3000; // ミリ秒
let flappyAngle = 0;
const altitudeAndColor = [
    [0, [200, 80, 85, 1]], // h,s,l,a
    [150, [205, 70, 75, 0.9]],
    [300, [215, 60, 65, 0.7]],
    [500, [230, 55, 50, 0.5]],
    [650, [245, 65, 40, 0.3]],
    [800, [255, 80, 30, 0.1]],
    [1000, [240, 100, 20, 0]]
]
let flappyCameraZoom = 1; // 2 → 2倍ズームイン

// ズームアニメーション
let zoomFrom = 1; // 倍率
let zoomTo = 1; // 倍率
let zoomTimer = 0; // 経過時間
let zoomDuration = 0; // 所要時間sec
let zoomHoldingTimer = 0; // 
let zoomHoldingDuration = 0; // ズーム完了から戻り始めるまでの時間sec

const windList = [];

function spawnWind(scoreVel,deltaTime) {
    if (scoreVel === 0) return;

    const power = Math.abs(scoreVel);

    const spawnRate = Math.min(12*power, 600); // 1秒あたりの本数
    const count = Math.floor(spawnRate*deltaTime); // 1フレームあたりの本数
    const W = windCanvas.width;
    const H = windCanvas.height;
    const maxRange = Math.sqrt(W*W + H*H); // エリアの対角線の長さ
    const extraX = (maxRange - W) / 2;
    const extraY = (maxRange - H) / 2;

    for (let i = 0; i < count; i++) {
        const x = Math.random() * maxRange - extraX;
        const y = Math.random() * maxRange - extraY;
        const duration = 0.5;

        windList.push({
            x: x,
            y: y,
            ox: 0,
            t: 0,
            d: duration
        }); // x, y, offsetX(移動量), timer(sec), duration(sec)
    }
}

function drawWind(scoreVel, deltaTime) {
    wctx.clearRect(0, 0, windCanvas.width, windCanvas.height);

    wctx.save();

    // 中心回転
    wctx.translate(windCanvas.width/2, windCanvas.height/2);
    wctx.rotate(-flappyAngle);
    wctx.translate(-windCanvas.width/2, -windCanvas.height/2);
    for (let i = windList.length - 1; i >= 0; i--) {
        const w = windList[i];

        w.ox -= Math.abs(scoreVel * deltaTime * FLAPPY_PX_PER_UNIT);
        w.t += deltaTime;

        const length = Math.abs(scoreVel) * 10;
        const opacity = Math.max(0, 
            1 - Math.abs(w.t - w.d/2) / (w.d/2)
        ); // 透明度が、0 → 1 → 0

        wctx.strokeStyle = `rgba(255,255,255,${opacity})`;
        wctx.lineWidth = 2;

        wctx.beginPath();
        wctx.moveTo(w.x + w.ox, w.y);
        wctx.lineTo(w.x + w.ox + length, w.y);
        wctx.stroke();

        if (w.t >= w.d) {
            windList.splice(i, 1);
        }
    }
    wctx.restore();
}

// ボタンをランダム位置へ動かす関数
function setRandomPosition(flyObj, avoidWatermelon = false) {

    const maxX = gameContainer.clientWidth - flyObj.el.offsetWidth - 10;
    const maxY = gameContainer.clientHeight - flyObj.el.offsetHeight - 10;

    let x;
    let y;

    if (avoidWatermelon) {
        const melonRect = watermelon.getBoundingClientRect();
        const gameRect = gameContainer.getBoundingClientRect();

        const melonX =
            melonRect.left - gameRect.left + melonRect.width / 2;
        const melonY =
            melonRect.top - gameRect.top + melonRect.height / 2;

        // スイカから画面端までの最短距離
        const distanceToEdge = Math.min(
            melonX,
            gameContainer.clientWidth - melonX,
            melonY,
            gameContainer.clientHeight - melonY
        );

        // スイカから、この距離の半分より外側に配置
        const minDistance = distanceToEdge / 2;

        const maxAttempts = 50;

        for (let i = 0; i < maxAttempts; i++) {
            x = Math.random() * maxX;
            y = Math.random() * maxY;

            const flyX = x + flyObj.el.offsetWidth / 2;
            const flyY = y + flyObj.el.offsetHeight / 2;

            const distance = Math.hypot(
                flyX - melonX,
                flyY - melonY
            );

            if (distance >= minDistance) {
                break;
            }
        }

    } else {
        x = Math.random() * maxX;
        y = Math.random() * maxY;
    }

    flyObj.x = x;
    flyObj.y = y;

    flyObj.el.style.left = x + "px"; /* インラインCSSでスタイル「left: 〇〇px;」を指定 */
    flyObj.el.style.top = y + "px";

    if (flyObj.hitPointBar) {
        flyObj.hitPointBar.style.left =
            (x + (flyObj.el.offsetWidth - flyObj.hitPointBar.offsetWidth) / 2) + "px";
        flyObj.hitPointBar.style.top =
            (y - flyObj.hitPointBar.offsetHeight - 5) + "px";
    }
}

function showComboText(x, y, combo) {
    const comboText = document.createElement("div")
    comboText.textContent = `${combo}コンボ！`
    comboText.className = "comboText"

    comboText.style.left = x + "px";
    comboText.style.top = y + "px";
    comboText.style.transform = `translate(-50%, -50%)`;
    gameContainer.appendChild(comboText);

    const margin = 5;
    requestAnimationFrame(() => {
        const rect = comboText.getBoundingClientRect();

        let adjustedX = x;
        // 左にはみ出す
        if (rect.left < margin) {
            adjustedX += margin - rect.left;
        }
        // 右にはみ出す
        if (rect.right > window.innerWidth - margin) {
            adjustedX -= rect.right - (window.innerWidth - margin);
        }
        comboText.style.left = adjustedX + "px";

        comboText.style.opacity = 1;
        comboText.style.transform =
            `translate(-50%, -50%) scale(0.8)`;
    });

    setTimeout(() => {
        comboText.style.opacity = 0;
        comboText.style.transform = `translate(-50%, -50%) scale(1.5)`;
    }, 600);

    setTimeout(() => comboText.remove(), 1000);
}

function showCatPaw(x, y, flyObj, isToughFly) {
    const flyClone = document.createElement("img")
    flyClone.src = isToughFly ? "toughFly.png" : "realisticFly.png";
    flyClone.className = "flyClone";
    const paw = document.createElement("img");
    paw.src = "catHand.png";
    paw.className = "cat-paw";

    const distance = 200;

    // 0 ~ 2π rad
    const angle = Math.random() * Math.PI * 2; /* 右が 0 rad */

    // 距離1を2軸に分解し、距離をかける
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;

    paw.style.left = x + "px";
    paw.style.top = y + "px";
    paw.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${angle - Math.PI/2}rad)`;
    flyClone.style.left = x + "px";
    flyClone.style.top = y + "px";
    flyClone.style.transform = `translate(-50%, -50%) rotate(${flyObj.angle + Math.PI / 2}rad)`;

    gameContainer.appendChild(flyClone);
    gameContainer.appendChild(paw);

    requestAnimationFrame(() => {
        paw.style.opacity = 1;
        paw.style.transform = `translate(-50%, -50%) scale(0.75, 0.75) rotate(${angle - Math.PI/2}rad)`;
    });
    setTimeout(() => {
        paw.style.opacity = 1;
        paw.style.transform = `translate(calc(-50% + ${dx/distance*10}px), calc(-50% + ${dy/distance*10}px)) scale(0.75, 0.75) rotate(${angle - Math.PI/2}rad)`;
    }, 100);

    // 少し待ってフェードアウト
    setTimeout(() => {
        paw.style.opacity = 0;
        paw.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${angle - Math.PI/2}rad)`;
    }, 400);

    // 完全に消す
    setTimeout(() => flyClone.remove(), 100)
    setTimeout(() => paw.remove(), 800);
}

function startZoom(from, to, duration) {
    zoomFrom = from;
    zoomTo = to;
    zoomTimer = 0;
    zoomDuration = duration;
}
function updateZoom(deltaTime) {
    if (zoomTimer < zoomDuration) {
        zoomTimer += deltaTime;
        const t = Math.min(zoomTimer / zoomDuration, 1);

        // easeOut（最初速い→最後遅い）
        const eased = 1 - Math.pow(1 - t, 3);

        flappyCameraZoom =
            zoomFrom * (1 - eased) +
            zoomTo * eased;
    } else if (zoomHoldingTimer < zoomHoldingDuration) {
        zoomHoldingTimer += deltaTime;
        if (zoomHoldingTimer >= zoomHoldingDuration) {
            zoomHoldingTimer = zoomHoldingDuration;
            startZoom(flappyCameraZoom, 1.0, 1.0);
        }
    }
}

// クリックされたらスコアアップ＋移動
function clicked(flyObj) {
    const now = Date.now();

    // toughFly は1クリックでは倒れず、HPだけ減らす
    if (flyObj.isToughFly) {
        flyObj.hp--;

        if (flyObj.hitPointBar) {
            const ratio = Math.max(0, flyObj.hp / flyObj.maxHp);
            flyObj.hitPointBarFill.style.width = `${ratio * 100}%`;
        }

        // まだHPが残っている場合は、クリック演出だけで終了
        if (flyObj.hp > 0) {
            showCatPaw(
                flyObj.el.offsetLeft + flyObj.el.offsetWidth / 2,
                flyObj.el.offsetTop + flyObj.el.offsetHeight / 2,
                flyObj,
                flyObj.isToughFly
            );
            return;
        }
    }

    if (combo >= 1) {
        showComboText(
            flyObj.el.offsetLeft + flyObj.el.offsetWidth / 2,
            flyObj.el.offsetTop + flyObj.el.offsetHeight / 2,
            combo + 1 // comboが増える前の処理なので +1
        );
    }

    showCatPaw(
        flyObj.el.offsetLeft + flyObj.el.offsetWidth / 2,
        flyObj.el.offsetTop + flyObj.el.offsetHeight / 2,
        flyObj,
        flyObj.isToughFly
    );

    // 配列から削除
    const index = flies.indexOf(flyObj);
    if (index !== -1) {
        flies.splice(index, 1);
    }

    // DOMから削除
    flyObj.el.remove();
    if (flyObj.hitPointBar) {
        flyObj.hitPointBar.remove();
    }

    if (gameMode === "survival" && survivalState === "flyRaid") {
        raidFlyDefeated++;

        // すべて倒した
        if (raidFlyDefeated >= RAID_FLY_DEFEAT_TARGET) {
            removeAllFlies();
            survivalState = "raidClearBanner";
            raidClearBannerTimer = 0;

            raidFlyDefeated = 0;

            raidClearBanner.style.display = "flex";
        } else if (flies.length < RAID_FLY_MAX) {
            const fliesToCreate = RAID_FLY_MAX - flies.length;
            for (let i = 0; i < fliesToCreate; i++) {
                createFly(true);
            }
        }
    } else {
        // 通常時は常に新しいハエを生成
        createFly();
    }

    // スコア処理
    if (now - lastClickTime <= comboLimit || combo == 0) {
        combo++;
    }
    // scoreVel に combo を足す (9.8以上98以下)
    scoreVel = Math.max(
        gravity,
        Math.min(
            scoreVel + Math.floor(Math.pow(combo, 1/10)*9.8),
            gravity*10
        )
    );

    lastClickTime = now;

    // 0.15秒でズームアウト
    startZoom(flappyCameraZoom, 0.75, 0.15);

    zoomHoldingTimer = 0;
    zoomHoldingDuration = 0.15 + 0.3*(gravity + Math.floor(combo/5))/gravity;
    // ズームを元に戻す処理は updateZoom()
}

function createFly(avoidWatermelon = false) {
    const isToughFly = Math.random() < 0.05;

    const flyEl = document.createElement("img");
    flyEl.src = isToughFly ? "toughFly.png" : "realisticFly.png";
    flyEl.className = isToughFly ? "fly toughFly" : "fly";

    const flyObj = {
        x: 0, // leftのpx値
        y: 0, // topのpx値
        angle: Math.random() * Math.PI * 2, // 0 ~ 2π rad
        angleVel: 0,
        t: 0,
        d: Math.random() * 3 + 2, // 2 ~ 5秒で向きを変える
        state: "moving", // moving or stopped or turning or blocked or eating
        isOnWatermelon: false,
        timeOnWatermelon: 0,
		speckTimer: 0, // 果汁エフェクトの間隔
        isToughFly: isToughFly,
        hp: isToughFly ? 2 : 1,
        maxHp: isToughFly ? 2 : 1,
        el: flyEl,
        hitPointBar: null,
        hitPointBarFill: null
    };

    if (isToughFly) {
        const hitPointBar = document.createElement("div");
        hitPointBar.className = "flyHPBar";

        const hitPointBarFill = document.createElement("div");
        hitPointBarFill.className = "flyHPBarFill";

        hitPointBar.appendChild(hitPointBarFill);
        gameContainer.appendChild(hitPointBar);

        flyObj.hitPointBar = hitPointBar;
        flyObj.hitPointBarFill = hitPointBarFill;
    }

    // イベント登録
    flyEl.addEventListener("click", () => {
        clicked(flyObj);
    });

    gameContainer.appendChild(flyEl);
    flies.push(flyObj);

    // ランダム配置
    setRandomPosition(flyObj, avoidWatermelon);
}

// updateFlies() 内で、状態に応じて動き方を変えるための遷移ルール
const transitions = {
    moving: ["stopped", "turning"],
    stopped: ["moving", "turning"],
    turning: ["moving", "stopped"],
    blocked: ["turning"] // 壁にあたったとき(stoppedと同じ挙動)
};
function getNextState(current) {
    const candidates = transitions[current];
    return candidates[Math.floor(Math.random() * candidates.length)];
}
function isFlyOut(fly, speed, dt) {
    //次フレームの位置を計算
    const vx = Math.cos(fly.angle) * speed * dt;
    const vy = Math.sin(fly.angle) * speed * dt;
    const nextX = fly.x + vx;
    const nextY = fly.y + vy;
    // 画面内の範囲
    const maxX = gameContainer.clientWidth - fly.el.offsetWidth;
    const maxY = gameContainer.clientHeight - fly.el.offsetHeight;
    // 次フレームで画面外に出るか
    const isOutX = (nextX < 0 || nextX > maxX);
    const isOutY = (nextY < 0 || nextY > maxY);
    const isOut = isOutX || isOutY;
    return { isOut, nextX, nextY };
}

function isFlyOnWatermelon(fly) {
    const gameRect = gameContainer.getBoundingClientRect();

    // スイカ
    const rect = watermelon.getBoundingClientRect();
    const melonX = rect.left - gameRect.left + rect.width / 2;
    const melonY = rect.top - gameRect.top + rect.height / 2;
    const rx = rect.width * 0.40;
    const ry = rect.height * 0.42;

    // ハエの頭の位置を計算
    const centerX = fly.x + fly.el.offsetWidth / 2;
    const centerY = fly.y + fly.el.offsetHeight / 2;
    const flyHeadX = centerX + Math.cos(fly.angle) * fly.el.offsetHeight * 0.5;
    const flyHeadY = centerY + Math.sin(fly.angle) * fly.el.offsetHeight * 0.5;

    // 楕円判定
    const dx = flyHeadX - melonX;
    const dy = flyHeadY - melonY;
    const isOn = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
    return isOn;
}

function updateNormalFlyMovement(dt) {
    const speed = 100; // px/秒

    for (const fly of flies) {
        fly.t += dt;
        if (fly.t >= fly.d) {
            fly.t = 0;
            fly.d = Math.random() * 3 + 2;
            fly.state = getNextState(fly.state);
            if (fly.state === "turning") {
                fly.angleVel = (Math.random() * Math.PI * 2 - Math.PI) / fly.d; // -180 ~ 180度を向くまでの角速度
            } else { fly.angleVel = 0; }
        }
        fly.angle += fly.angleVel * dt;
        if (fly.state === "moving") {
            const { isOut, nextX, nextY } = isFlyOut(fly, speed, dt);
            // 次フレームで画面内にいるならそのまま進む、画面外なら止まる
            if (!isOut) {
                fly.x = nextX;
                fly.y = nextY;
            } else {
                fly.t = 0;
                fly.d = Math.random() * 3 + 2;
                fly.state = "blocked";
                fly.angleVel = 0;
            }
        }
    }
}

function updateRaidFlyMovement(dt) {
    const speed = 60;

    const gameRect = gameContainer.getBoundingClientRect();
    const melonRect = watermelon.getBoundingClientRect();

    const targetX =
        melonRect.left - gameRect.left +
        melonRect.width / 2;

    const targetY =
        melonRect.top - gameRect.top +
        melonRect.height / 2;

    for (const fly of flies) {
        fly.t += dt;
        if (fly.isOnWatermelon) {
            fly.state = "eating";
        } else {
            fly.state = "moving";
        }

        if (fly.state === "moving") {
            const centerX = fly.x + fly.el.offsetWidth / 2;
            const centerY = fly.y + fly.el.offsetHeight / 2;

            // 移動方向を固定
            fly.angle = Math.atan2(targetY - centerY, targetX - centerX);

            fly.x += Math.cos(fly.angle) * speed * dt;
            fly.y += Math.sin(fly.angle) * speed * dt;

            // 画面外に出ないように制限
            fly.x = Math.max(
                0,
                Math.min(
                    gameContainer.clientWidth - fly.el.offsetWidth,
                    fly.x
                )
            );

            fly.y = Math.max(
                0,
                Math.min(
                    gameContainer.clientHeight - fly.el.offsetHeight,
                    fly.y
                )
            );
        }
    }
}

function updateFlies(dt) {
    if (gameState === "result") return; // リザルト画面ではハエの動きを止める

    if (gameMode === "survival" && survivalState === "flyRaid") {
            updateRaidFlyMovement(dt);
    } else {
        updateNormalFlyMovement(dt);
    }

    for (const fly of flies) {
        if (fly.state === "eating") {
			fly.speckTimer += dt;

			if (fly.speckTimer > 0.12) {
				fly.speckTimer = 0;
				const centerX = fly.x + fly.el.offsetWidth / 2;
				const centerY = fly.y + fly.el.offsetHeight / 2;

				const x = centerX + Math.cos(fly.angle) * fly.el.offsetHeight*0.5;
				const y = centerY + Math.sin(fly.angle) * fly.el.offsetHeight*0.5;
				spawnJuiceSpecks(x, y);
			}
		}

        fly.el.style.left = fly.x + "px";
        fly.el.style.top = fly.y + "px";

        if (fly.hitPointBar) {
            fly.hitPointBar.style.left =
                (fly.x + (fly.el.offsetWidth - fly.hitPointBar.offsetWidth) / 2) + "px";
            fly.hitPointBar.style.top =
                (fly.y - fly.hitPointBar.offsetHeight - 5) + "px";
        }

        const wobble =
            fly.state === "moving" ? Math.sin(fly.t * 50) * 0.1 :
            fly.state === "turning" ? Math.sin(fly.t * 50) * 0.05 :
            fly.state === "eating" ? Math.sin(fly.t * 40) * 0.03 :
            0;

        fly.el.style.transform =
            `rotate(${fly.angle + wobble + Math.PI / 2}rad)`; // 画像は頭が上だが、右が0radなので90度回転させる
    }
}

function getDangerColor(ratio) {
    if (ratio > 0.75) {
        return "#ffffff";   // 白
    } else if (ratio > 0.5) {
        return "#ffff00";   // 黄
    } else if (ratio > 0.25) {
        return "#ff9900";   // オレンジ
    } else {
        return "#ff0000";   // 赤
    }
}

function drawEatGauge(ctx, x, y, radius, remainingRatio) {

    // 背景
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#444";
    ctx.stroke();

    // 色
    ctx.strokeStyle = getDangerColor(remainingRatio);

    // 残り時間なので減っていく
    ctx.beginPath();
    ctx.arc(
        x,
        y,
        radius,
        -Math.PI / 2,
        -Math.PI / 2 + remainingRatio * Math.PI * 2
    );
    ctx.stroke();

    // 「！」の描画
    ctx.save();
    ctx.fillStyle = "yellow";
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;

    ctx.font = `bold ${Math.floor(radius*1.9)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeText("!", x, y);
    ctx.fillText("!", x, y);
    ctx.restore();
}

function drawComboGauge() {

    if (combo === 0) {
        comboBorderRect.style.strokeDashoffset =
            Number(comboBorderRect.dataset.perimeter);
        return;
    }

    const now = Date.now();
    const elapsed = now - lastClickTime;

    let ratio = 1 - elapsed / comboLimit;
    ratio = Math.max(0, ratio);

    const perimeter =
        Number(comboBorderRect.dataset.perimeter); // SVGの周囲の長さ

    comboBorderRect.style.strokeDashoffset =
        perimeter * (1 - ratio);

    // 色変化
    if (ratio > 0.5) {
        comboBorderRect.style.stroke =
            "#ff9800";
    }
    else if (ratio > 0.2) {
        comboBorderRect.style.stroke =
            "#ff5722";
    }
    else {
        comboBorderRect.style.stroke =
            "#ff0000";
    }
}

function updateFlappyChar(scoreVel, deltaTime) {
    flappyVelX = 10
    flappyAngle = Math.atan2(scoreVel, flappyVelX)

    flappyChar.style.transform =
        `translate(-50%, -50%) scale(${flappyCameraZoom}, ${flappyCameraZoom}) rotate(${-flappyAngle + Math.PI/2}rad)`;
}

function updateBackground(score) {
    const camHeight = flappyContainer.getBoundingClientRect().height / FLAPPY_PX_PER_UNIT * (1 / flappyCameraZoom);
    const camMin = score - camHeight / 2;

    const stops = altitudeAndColor.map(([alt, [h, s, l, a]]) => {
        const pos = (alt - camMin) / camHeight * 100;
        return `hsla(${h}, ${s}%, ${l}%, ${a}) ${pos}%`;
    });

    flappyBgSky.style.background =
        `linear-gradient(to top, ${stops.join(",")})`;
}

function drawStars(deltaTime) {
    sctx.clearRect(0, 0, starCanvas.width, starCanvas.height);

    const atmosphere = Math.max(1 - score / 1200, 0); // 地上:1, 宇宙:0

    for (const star of stars) {
        // 位相だけ進める（位置は変えない）
        star.phase += deltaTime * star.speed;
        const base = star.brightness;

        const twinkle =
            Math.sin(star.phase) * 0.5 + 0.5;

        const alpha =
            base * (1 - atmosphere)
            + base * atmosphere * twinkle;

        sctx.beginPath();
        sctx.arc(
            star.x * starCanvas.width,
            star.y * starCanvas.height,
            star.r,
            0,
            Math.PI * 2
        );
        sctx.fillStyle = `rgba(255,255,255,${alpha})`;
        sctx.fill();
    }
}

function drawFlappyGround(score) {
    flappyGround.style.transform = 
        `translate(0, calc(${flappyChar.getBoundingClientRect().height / 2 + score * FLAPPY_PX_PER_UNIT * (1 / flappyCameraZoom)}px))`;
}
function drawFlappyScore(score) {
    flappyScore.textContent = Math.floor(score);
}
function drawHighLine() {

    const diff = runBestScore - score;

    const y =
        diff *
        FLAPPY_PX_PER_UNIT *
        (1 / flappyCameraZoom);

    // カメラの高さ
    const camHeight =
        flappyContainer.clientHeight /
        FLAPPY_PX_PER_UNIT *
        (1 / flappyCameraZoom);

    const isVisible =
        diff <= camHeight / 2 &&
        diff >= -camHeight / 2;

    // ===== 表示切り替え =====
    if (isVisible) {
        // 通常表示（線＋ラベル）
        if (runBestScore < bestScores[gameMode]) {
            high.style.display = "block";
        } else {
            high.style.display = "none";
        }
        highIndicator.style.display = "none";

        high.style.transform = `translateY(${-y}px)`;

    } else {
        // 画面外
        high.style.display = "none";

        // 上にあるときだけ表示
        if (diff > 0) {
            highIndicator.style.display = "block";

            highIndicator.textContent =
                `↑ ハイスコアまで ${Math.floor(diff)}`;
        } else {
            highIndicator.style.display = "none";
        }
    }

    // ===== 色変更 =====
    // const isUpdatingBest = score >= bestScore;

    if (isUpdatingBest) {
        high.classList.add("high-updating");
        high.classList.remove("high-normal");

        highLabel.textContent = "ハイスコア更新中！";
    } else {
        high.classList.add("high-normal");
        high.classList.remove("high-updating");

        highLabel.textContent = "今回のハイスコア";
    }
}

function drawBestLine() {

    const diff = bestScores[gameMode] - score;

    const y =
        diff *
        FLAPPY_PX_PER_UNIT *
        (1 / flappyCameraZoom);

    // カメラの高さ
    const camHeight =
        flappyContainer.clientHeight /
        FLAPPY_PX_PER_UNIT *
        (1 / flappyCameraZoom);

    const isVisible =
        diff <= camHeight / 2 &&
        diff >= -camHeight / 2;

    // ===== 表示切り替え =====
    if (isVisible) {
        // 通常表示（線＋ラベル）
        best.style.display = "block";
        bestIndicator.style.display = "none";

        best.style.transform = `translateY(${-y}px)`;

    } else {
        // 画面外
        best.style.display = "none";

        // 上にあるときだけ表示
        if (diff > 0) {
            bestIndicator.style.display = "block";

            bestIndicator.textContent =
                `↑ ベストスコアまで ${Math.floor(diff)}`;
        } else {
            bestIndicator.style.display = "none";
        }
    }

    // ===== 色変更 =====
    // const isUpdatingBest = score >= bestScore;

    if (isUpdatingBest) {
        best.classList.add("best-updating");
        best.classList.remove("best-normal");

        bestLabel.textContent = "ベストスコア更新中！";
    } else {
        best.classList.add("best-normal");
        best.classList.remove("best-updating");

        bestLabel.textContent = "ベストスコア";
    }
}

setInterval(() => {
    const now = Date.now();
    const deltaTime = (now - lastTime) / 1000; // 秒
    lastTime = now;

    if (gameState === "playing") {
        if (survivalState === "raidBanner" || survivalState === "raidClearBanner") {
            lastClickTime += deltaTime * 1000; // 最後にクリックした時間を進める（コンボが切れないようにする）

        } else {
            if (now - lastClickTime > comboLimit) {
                combo = 0;
            }

            // 減衰量の計算
            scoreVel -= gravity * deltaTime;
            score += scoreVel * deltaTime;

            if (score <= 0) {
                score = 0;
                scoreVel = 0;
            }
            if (score > runBestScore ) {
                isUpdatingBest = true;
                runBestScore = score;
                if (runBestScore > bestScores[gameMode]) {
                    bestScores[gameMode] = runBestScore;
                }
            } else {
                isUpdatingBest = false;
            }
        }
    } else {
        score = 0;
        scoreVel = 0;
        combo = 0;
        isUpdatingBest = false;
    }

    if (gameState === "playing" && gameMode === "timeAttack") {
        remainTime = Math.max(0, remainTime - deltaTime);

        const ratio = remainTime / 60;

        timerGauge.style.strokeDashoffset =
            circumference * (1 - ratio);

        timerText.textContent =
            Math.ceil(remainTime);
        if (remainTime <= 0) {
            gameState = "result";
            timer.style.display = "none";
            resultScreen.style.display = "flex";
            document.getElementById("resultScore").textContent =
                `SCORE : ${Math.floor(runBestScore)}`;
            document.getElementById("resultBest").textContent =
                `今までのベストスコア : ${Math.floor(bestScores[gameMode])}`;
            if (runBestScore > previousBestScore) {
                document.getElementById("resultNewRecord").style.display = "block";
            } else {
                document.getElementById("resultNewRecord").style.display = "none";
            }
        }
    }
    if (gameState === "playing" && gameMode === "survival") {
        if (hitPoint > 0) {

            if (survivalState === "normal") {
                timeSinceLastRaid += deltaTime;　// 次の襲来までの時間を進める
                if (timeSinceLastRaid >= RAID_INTERVAL) {
                    removeAllFlies();
                    // バナー表示へ
                    survivalState = "raidBanner";
                    // バナー用タイマーをリセット
                    raidBannerTimer = 0;
                    // バナー表示
                    raidBanner.style.display = "flex";
                }
            } else if (survivalState === "raidBanner") {
                raidBannerTimer += deltaTime;

                if (raidBannerTimer >= RAID_BANNER_DURATION) {
                    raidBanner.style.display = "none";

                    const fliesToCreate = RAID_FLY_MAX - flies.length;
                    for (let i = 0; i < fliesToCreate; i++) {
                        createFly(true); // 襲来時はスイカの近くに出ないようにする
                    }

                    survivalState = "flyRaid";
                }
            } else if (survivalState === "raidClearBanner") {
                raidClearBannerTimer += deltaTime;

                if (raidClearBannerTimer >= RAID_CLEAR_BANNER_DURATION) {
                    raidClearBanner.style.display = "none";

                    const fliesToCreate = INITIAL_FLY_COUNT - flies.length;
                    for (let i = 0; i < fliesToCreate; i++) {
                        createFly(true);
                    }

                    survivalState = "normal";

                    // 次の襲来までの時間をリセット
                    timeSinceLastRaid = 0;
                }
            }

            eatDisplayCtx.clearRect(0, 0, eatDisplayCanvas.width, eatDisplayCanvas.height);
            for (const fly of flies) {
                // ハエがスイカの上にいるか判定
                fly.isOnWatermelon = isFlyOnWatermelon(fly);

                if (fly.isOnWatermelon) {
                    fly.state = "eating";
                    fly.timeOnWatermelon += deltaTime;
                    const remainingRatio =
                        1 - fly.timeOnWatermelon / EAT_TIME;
                    drawEatGauge(
                        eatDisplayCtx,
                        fly.x + 32,
                        fly.y - 10,
                        12,
                        Math.max(0, remainingRatio)
                    );
                } else {
                    if (fly.state === "eating") {
                        fly.state = "moving";
                    }
                    fly.timeOnWatermelon = 0;
                }
                if (fly.timeOnWatermelon >= EAT_TIME) {
                    hitPoint--;
                    combo = 0;
                    // 配列から削除
                    const index = flies.indexOf(fly);
                    if (index !== -1) {
                        flies.splice(index, 1);
                    }
                    // DOMから削除
                    fly.el.remove();
                    if (fly.hitPointBar) {
                        fly.hitPointBar.remove();
                    }
                    if (survivalState === "flyRaid") {
                        const fliesToCreate = RAID_FLY_MAX - flies.length;
                        for (let i = 0; i < fliesToCreate; i++) {
                            createFly(true);
                        }
                    } else {
                        createFly();
                    }
                    eatDisplayCtx.clearRect(0, 0, eatDisplayCanvas.width, eatDisplayCanvas.height);
                }
            }
            hitPointContainer.style.display = "block";
            hitPointText.textContent = "LIFE";
            hitPointIcon.textContent = "❤️".repeat(hitPoint) + "🩶".repeat(3 - hitPoint);
        } else {
            gameState = "result";
            hitPointContainer.style.display = "none";
            resultScreen.style.display = "flex";
            document.getElementById("resultScore").textContent =
                `SCORE : ${Math.floor(runBestScore)}`;
            document.getElementById("resultBest").textContent =
                `今までのベストスコア : ${Math.floor(bestScores[gameMode])}`;
            if (runBestScore > previousBestScore) {
                document.getElementById("resultNewRecord").style.display = "block";
            } else {
                document.getElementById("resultNewRecord").style.display = "none";
            }
        }
    }

	splashCtx.clearRect(0, 0, splashCanvas.width, splashCanvas.height);
	for (let i = particles.length - 1; i >= 0; i--) {
		const p = particles[i];
		p.update();
		if (p.life <= 0) {
			particles.splice(i, 1);
			continue;
		}
		p.draw();
	}
    
    checkResize();

    drawComboGauge();

    updateFlies(deltaTime);
    updateFlappyChar(scoreVel, deltaTime);
    updateBackground(score);
    drawFlappyGround(score);
    drawFlappyScore(score);
    drawHighLine();
    drawBestLine();

    if (!(gameState === "playing" && gameMode === "survival" && (survivalState === "raidBanner" || survivalState === "raidClearBanner"))) {
        updateZoom(deltaTime);
        drawStars(deltaTime);
        spawnWind(scoreVel, deltaTime);
        drawWind(scoreVel, deltaTime);
    }
}, 1000/frameRate);