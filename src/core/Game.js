import * as THREE from "three";
import { World, Body, GSSolver, SplitSolver } from "cannon-es";
import { Player } from "../entities/Player.js";
import { Enemy } from "../entities/Enemy.js";
import { Projectile } from "../entities/Projectile.js";
import { Level } from "./Level.js";
import { Input } from "./Input.js";
import { SoundManager } from "./SoundManager.js";
import { TextureGenerator } from "../utils/TextureGenerator.js";
import { ParticleSystem } from "./ParticleSystem.js";
import { PowerUp } from "../entities/PowerUp.js";
import { HealthBar } from "../utils/HealthBar.js";
import { FloatingCredits } from "../entities/FloatingCredits.js";

// Post Processing
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

// Light Pool Config
const MAX_LIGHTS = 6;
const START_WAVE = 1;
const TOTAL_WAVES = 6;
const PLAYER_SPAWN = Object.freeze({ x: 0, y: 2, z: 30 });
const DEFAULT_BOSS_LASER = {
  charge: 0.85,
  duration: 1.05,
  cooldown: 4.2,
  range: 34,
  damagePerSecond: 20,
  width: 1.5,
  color: 0xff2a00,
};

const WAVE_BOSS_PROFILES = [
  {
    name: "Obsidian Titan",
    type: "titan",
    tintColor: 0x4fc9ff,
    modelScale: 0.78,
    healthMultiplier: 1.0,
    speedMultiplier: 0.92,
    damageMultiplier: 1.0,
    laser: { charge: 0.9, duration: 0.95, cooldown: 4.8, range: 31, damagePerSecond: 16, width: 1.35, color: 0x66e8ff },
  },
  {
    name: "Void Reaper",
    type: "void_reaper",
    tintColor: 0x9ef4ff,
    modelScale: 0.84,
    healthMultiplier: 1.12,
    speedMultiplier: 1.03,
    damageMultiplier: 1.12,
    laser: { charge: 0.78, duration: 1.05, cooldown: 4.2, range: 35, damagePerSecond: 19, width: 1.42, color: 0x79e9ff },
  },
  {
    name: "Nightfang Executioner",
    type: "nightfang",
    tintColor: 0x86dcff,
    modelScale: 0.84,
    healthMultiplier: 1.2,
    speedMultiplier: 1.08,
    damageMultiplier: 1.18,
    laser: { charge: 0.74, duration: 1.1, cooldown: 4.0, range: 34, damagePerSecond: 21, width: 1.45, color: 0x74d8ff },
  },
  {
    name: "Rift Judicator",
    type: "rift_judicator",
    tintColor: 0x7ce0ff,
    modelScale: 0.84,
    healthMultiplier: 1.28,
    speedMultiplier: 1.14,
    damageMultiplier: 1.22,
    laser: { charge: 0.68, duration: 1.2, cooldown: 3.8, range: 36, damagePerSecond: 23, width: 1.34, color: 0x6edbff },
  },
  {
    name: "Eclipse Warden",
    type: "eclipse_warden",
    tintColor: 0x89e7ff,
    modelScale: 0.85,
    healthMultiplier: 1.36,
    speedMultiplier: 1.17,
    damageMultiplier: 1.28,
    laser: { charge: 0.64, duration: 1.16, cooldown: 3.6, range: 37, damagePerSecond: 26, width: 1.4, color: 0x7ee2ff },
  },
  {
    name: "Abyss Sovereign",
    type: "boss_warlord",
    tintColor: 0x32d8ff,
    specialFinal: true,
    modelScale: 0.92,
    healthMultiplier: 1.9,
    speedMultiplier: 1.08,
    damageMultiplier: 1.68,
    laser: { charge: 0.58, duration: 1.35, cooldown: 2.9, range: 39, damagePerSecond: 34, width: 1.9, color: 0x27cfff },
  },
];

export class Game {
  constructor() {
    this.container = document.body;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.performanceProfile = this.getPerformanceProfile();
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: this.performanceProfile.powerPreference,
    });

    this.world = new World();
    this.world.gravity.set(0, -30, 0); // Sharper gravity
    this.world.defaultContactMaterial.contactEquationStiffness = 1e9;
    this.world.defaultContactMaterial.contactEquationRelaxation = 4;
    this.world.defaultContactMaterial.friction = 0.02; // Keep floor movement responsive so speed buffs work while grounded.
    this.world.__enemyStaticRevision = 0;
    this.world.__enemyStaticCacheRevision = -1;
    this.world.__enemyStaticObstacleBodies = null;

    const originalAddBody = this.world.addBody.bind(this.world);
    this.world.addBody = (body) => {
      const result = originalAddBody(body);
      if (body?.type === Body.STATIC) {
        this.world.__enemyStaticRevision += 1;
        this.world.__enemyStaticObstacleBodies = null;
      }
      return result;
    };

    const originalRemoveBody = this.world.removeBody.bind(this.world);
    this.world.removeBody = (body) => {
      const result = originalRemoveBody(body);
      if (body?.type === Body.STATIC) {
        this.world.__enemyStaticRevision += 1;
        this.world.__enemyStaticObstacleBodies = null;
      }
      return result;
    };

    const solver = new GSSolver();
    solver.iterations = 7;
    solver.tolerance = 0.1;
    this.world.solver = new SplitSolver(solver);

    // REMOVED groundBody call here because Level.js handles ground physics now.
    // this.world.addBody(this.groundBody); // Deleted to prevent undefined error.
    this.audio = new SoundManager();
    this.input = new Input(); // Initialize Input system
    this.clock = new THREE.Clock();
    this.gameTime = 0;

    this.enemies = [];
    this.projectiles = [];
    this.powerUps = []; // Power-ups in the arena
    this.lightPool = []; // Pooled lights for explosions
    this.particles = new ParticleSystem(this.scene);
    this.healthBars = new HealthBar(this.scene, this.camera); // Health bars for enemies
    this.credits = new FloatingCredits(this.scene); // ITZone Credits
    this.score = 0;
    this.activeIntervals = [];

    this.gameState = "MENU"; // Start in MENU
    this._errorLogged = false;
    this.restartInProgress = false;
    this.lastRestartAt = 0;

    // Camera Control State
    this.menuCameraAngle = 0;
    this.cameraTransition = {
      active: false,
      startTime: 0,
      duration: 2.0,
      startPos: new THREE.Vector3(),
      startQuat: new THREE.Quaternion(),
      endPos: new THREE.Vector3(0, 2, 0), // Approx player head
      endLookAt: new THREE.Vector3(0, 2, -10),
    };

    // Player buffs
    this.playerSpeedMultiplier = 1.0;
    this.playerDamageMultiplier = 1.0;
    this.buffTimers = { speed: 0, damage: 0 };
    this.selectedDifficulty = "medium";
    this.difficultyTuning = {
      playerSpeedScale: 1.0,
      playerDamageTakenScale: 1.0,
      enemySpeedScale: 1.0,
      enemyHealthScale: 1.0,
      spawnRateScale: 1.0,
      powerUpIntervalScale: 1.0,
      maxActiveEnemies: 45,
    };

    // Shake
    this.shakeIntensity = 0;
    this.baseCameraY = 1.6;
    this.playerDamageCooldown = 0;
    this.waveTransitionDuration = 1.2;

    // Config - Wave System
    this.waveNumber = 0;
    this.waveState = "STARTING"; // 'STARTING', 'ACTIVE', 'COMPLETE', 'VICTORY'
    this.enemiesPerWave = 10;
    this.enemiesSpawnedThisWave = 0;
    this.enemiesKilledThisWave = 0;
    this.waveTransitionTime = 0;
    this.currentBoss = null;
    this.waveSpawnCycle = [];
    this.totalWaves = TOTAL_WAVES;
    this.waveBossProfiles = WAVE_BOSS_PROFILES;
    this.victoryAchieved = false;
    this.waveOverlayTimeoutId = null;
    this.bossLaserGeometry = new THREE.CylinderGeometry(0.08, 0.12, 1, 10, 1, true);
    this.bossLaserGeometry.rotateX(Math.PI / 2);

    // UI Cache - PREVENT LAG by only updating DOM when changed
    this.uiCache = {
      weaponString: "",
      health: -1,
      score: -1,
      remainingEnemies: null,
    };
    this.showPerformanceOverlay = true;
    this.perfMonitor = {
      fps: 60,
      frameMs: 16.7,
      sampleTime: 0,
      sampleFrames: 0,
      lowPerfTime: 0,
      stableTime: 0,
    };
    this.qualityTierLabels = ["ULTRA", "BALANCED", "PERFORMANCE"];
    this.currentQualityTier = this.performanceProfile.lowPower ? 1 : 0;
    this.currentPixelRatioCap = this.performanceProfile.pixelRatioCap;
    this.healthBarUpdateInterval = 3;

    // Environmental effects
    this.environmentTime = 0;
    this.spawnRate = 0.5; // Seconds between spawns
    this.lastSpawnTime = 0; // Needed for wave spawning rate limiting

    // Initialize renderer first so we can pass its DOM element to Player
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(this.getClampedPixelRatio());
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.performanceProfile.lowPower ? 0.96 : 1.0;
    this.scene.add(this.camera); // Camera children (weapon model) must be in scene graph.
    this.container.appendChild(this.renderer.domElement);

    // Make canvas focusable for PointerLock
    this.renderer.domElement.tabIndex = 0;
    this.renderer.domElement.style.outline = "none"; // No focus ring

    // Light (Bright Desert Sun)
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffeeb1, 0.8);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffddaa, 2.5); // BRIGHT Sun
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = true;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 200;
    dirLight.shadow.camera.left = -100;
    dirLight.shadow.camera.right = 100;
    dirLight.shadow.camera.top = 100;
    dirLight.shadow.camera.bottom = -100;
    dirLight.shadow.mapSize.width = this.performanceProfile.shadowMapSize;
    dirLight.shadow.mapSize.height = this.performanceProfile.shadowMapSize;
    this.scene.add(dirLight);
    this.sun = dirLight;

    this.dirLight = this.sun;

    // Sky & Fog - Bright Blue/Orange Gradient Skydome
    this.skyColor = new THREE.Color(0x87ceeb); // Sky Blue
    this.scene.background = this.skyColor;
    // Lighter fog so monsters remain visible at spawn distance (25–45m)
    this.scene.fog = new THREE.FogExp2(0xfff0d0, 0.0004);

    // Environment (Clouds & Abyss)
    this.clouds = [];
    this.initClouds();

    // No physics ground here - Level.js handles the Floating Floor logic.

    // Initialize Light Pool (Prevent dynamic light crashes)
    this.initLightPool();

    // Initialize Player (after renderer is ready)
    this.player = new Player(
      this.scene,
      this.world,
      this.camera,
      this.input,
      this.enemies,
      this.audio,
      (points) => this.addScore(points),
      (pos, dir) => this.spawnProjectile(pos, dir),
      (amount) => this.shake(amount), // Inject shake callback
      (isHeadshot) => this.showHitMarker(isHeadshot), // Inject hit marker callback
      (health, type) => this.onPlayerHealthChange(health, type), // Health change callback
      this.particles, // Pass particle system for blood effects
      () => this.playerDamageMultiplier, // Damage multiplier getter
      this.renderer.domElement, // Pass renderer DOM element for PointerLockControls
    );
    this.player.setSpeedMultiplier(this.playerSpeedMultiplier);

    // Level
    this.level = new Level(this.scene, this.world);

    // Wave 1 will be started when startGame() is called

    // Weapon HUD
    this.updateWeaponHUD();

    // Initialize Post Processing
    this.initPostProcessing();

    // Resize Handler
    window.addEventListener("resize", this.onWindowResize.bind(this));

    // Start Loop
    this.renderer.setAnimationLoop(this.animate.bind(this));

    // Start Ambient Sound (Wind)
    document.addEventListener(
      "click",
      () => {
        if (this.audio) this.audio.startAmbient();
      },
      { once: true },
    );

    // Re-lock pointer on user interaction if gameplay is active.
    document.addEventListener("click", () => {
      if (!this.player?.controls) return;
      if (this.gameState !== "PLAYING" && this.gameState !== "TRANSITION") return;
      if (this.player.controls.isLocked) return;
      this.renderer.domElement.focus();
      try {
        this.player.controls.lock();
      } catch (err) {
        console.warn("PointerLock click relock failed:", err);
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.code !== "F3") return;
      this.showPerformanceOverlay = !this.showPerformanceOverlay;
      this.syncPerformanceOverlay();
    });

    this.perfPanelEl = document.getElementById("perf-meter");
    this.perfStatsEl = document.getElementById("perf-stats");
    this.applyQualityTier(this.currentQualityTier, true);
    this.syncPerformanceOverlay();
  }

  getPerformanceProfile() {
    const nav = typeof navigator !== "undefined" ? navigator : null;
    const ua = nav?.userAgent || "";
    const isMobile = /Android|webOS|iPhone|iPad|iPod|Mobile/i.test(ua);
    const cpuCores = Number.isFinite(nav?.hardwareConcurrency)
      ? nav.hardwareConcurrency
      : 6;
    const deviceMemory = Number.isFinite(nav?.deviceMemory)
      ? nav.deviceMemory
      : 8;
    const lowPower = isMobile || cpuCores <= 4 || deviceMemory <= 4;

    return {
      lowPower,
      pixelRatioCap: isMobile ? 1.2 : lowPower ? 1.35 : 1.7,
      shadowMapSize: isMobile ? 1024 : lowPower ? 1536 : 2048,
      bloomEnabled: !isMobile || deviceMemory > 3,
      bloomStrength: lowPower ? 1.05 : 1.35,
      bloomRadius: lowPower ? 0.32 : 0.4,
      bloomThreshold: lowPower ? 0.9 : 0.85,
      powerPreference: isMobile ? "default" : "high-performance",
    };
  }

  getClampedPixelRatio() {
    const dpr = typeof window !== "undefined" && window.devicePixelRatio
      ? window.devicePixelRatio
      : 1;
    const cap = this.currentPixelRatioCap || this.performanceProfile?.pixelRatioCap || 1.5;
    return Math.min(dpr, cap);
  }

  getQualityTierSettings(tier = 0) {
    const clamped = THREE.MathUtils.clamp(Math.round(tier), 0, 2);
    const tiers = [
      { label: "ULTRA", pixelRatioScale: 1.0, shadowScale: 1.0, bloom: true, bloomScale: 1.0, healthBarFrameInterval: 3 },
      { label: "BALANCED", pixelRatioScale: 0.86, shadowScale: 0.75, bloom: true, bloomScale: 0.72, healthBarFrameInterval: 4 },
      { label: "PERFORMANCE", pixelRatioScale: 0.72, shadowScale: 0.5, bloom: false, bloomScale: 0.0, healthBarFrameInterval: 6 },
    ];
    return tiers[clamped];
  }

  getShadowMapSizeForTier(tier = 0) {
    const base = this.performanceProfile?.shadowMapSize || 1024;
    const settings = this.getQualityTierSettings(tier);
    const target = base * settings.shadowScale;
    if (target >= 1792) return 2048;
    if (target >= 1280) return 1536;
    return 1024;
  }

  applyQualityTier(tier = 0, force = false) {
    const nextTier = THREE.MathUtils.clamp(Math.round(tier), 0, 2);
    if (!force && this.currentQualityTier === nextTier) return;

    this.currentQualityTier = nextTier;
    const settings = this.getQualityTierSettings(nextTier);

    this.currentPixelRatioCap = Math.max(
      0.85,
      (this.performanceProfile?.pixelRatioCap || 1.4) * settings.pixelRatioScale,
    );
    this.healthBarUpdateInterval = settings.healthBarFrameInterval;

    if (this.renderer) {
      this.renderer.setPixelRatio(this.getClampedPixelRatio());
    }
    if (this.composer) {
      this.composer.setPixelRatio(this.getClampedPixelRatio());
    }

    if (this.dirLight?.shadow?.mapSize) {
      const desiredShadowSize = this.getShadowMapSizeForTier(nextTier);
      if (
        this.dirLight.shadow.mapSize.x !== desiredShadowSize ||
        this.dirLight.shadow.mapSize.y !== desiredShadowSize
      ) {
        this.dirLight.shadow.mapSize.set(desiredShadowSize, desiredShadowSize);
        if (this.dirLight.shadow.map?.dispose) {
          this.dirLight.shadow.map.dispose();
          this.dirLight.shadow.map = null;
        }
        this.dirLight.shadow.needsUpdate = true;
      }
    }

    if (this.bloomPass) {
      this.bloomPass.enabled = !!(this.performanceProfile.bloomEnabled && settings.bloom);
      if (this.bloomPass.enabled) {
        this.bloomPass.strength = this.performanceProfile.bloomStrength * settings.bloomScale;
        this.bloomPass.radius = this.performanceProfile.bloomRadius;
        this.bloomPass.threshold = this.performanceProfile.bloomThreshold;
      }
    }

    this.syncPerformanceOverlay();
  }

  updatePerformanceMetrics(rawDt) {
    if (!Number.isFinite(rawDt) || rawDt <= 0 || rawDt > 0.25) return;

    this.perfMonitor.sampleTime += rawDt;
    this.perfMonitor.sampleFrames += 1;
    if (this.perfMonitor.sampleTime < 0.45) return;

    const elapsed = this.perfMonitor.sampleTime;
    const frames = this.perfMonitor.sampleFrames;
    const fps = frames / elapsed;
    const frameMs = (elapsed * 1000) / Math.max(1, frames);

    this.perfMonitor.fps = fps;
    this.perfMonitor.frameMs = frameMs;
    this.perfMonitor.sampleTime = 0;
    this.perfMonitor.sampleFrames = 0;

    const gameplayActive = this.gameState === "PLAYING" || this.gameState === "TRANSITION";
    if (!gameplayActive) {
      this.syncPerformanceOverlay();
      return;
    }

    if (fps < 48) {
      this.perfMonitor.lowPerfTime += elapsed;
      this.perfMonitor.stableTime = Math.max(0, this.perfMonitor.stableTime - elapsed * 0.75);
    } else if (fps > 57) {
      this.perfMonitor.stableTime += elapsed;
      this.perfMonitor.lowPerfTime = Math.max(0, this.perfMonitor.lowPerfTime - elapsed * 0.75);
    } else {
      this.perfMonitor.lowPerfTime = Math.max(0, this.perfMonitor.lowPerfTime - elapsed * 0.45);
      this.perfMonitor.stableTime = Math.max(0, this.perfMonitor.stableTime - elapsed * 0.45);
    }

    if (this.perfMonitor.lowPerfTime > 2.2 && this.currentQualityTier < 2) {
      this.applyQualityTier(this.currentQualityTier + 1);
      this.perfMonitor.lowPerfTime = 0;
      this.perfMonitor.stableTime = 0;
      return;
    }

    if (this.perfMonitor.stableTime > 8.0 && fps > 58 && this.currentQualityTier > 0) {
      this.applyQualityTier(this.currentQualityTier - 1);
      this.perfMonitor.lowPerfTime = 0;
      this.perfMonitor.stableTime = 0;
      return;
    }

    this.syncPerformanceOverlay();
  }

  syncPerformanceOverlay() {
    const panel = this.perfPanelEl || document.getElementById("perf-meter");
    const stats = this.perfStatsEl || document.getElementById("perf-stats");
    if (!panel || !stats) return;

    this.perfPanelEl = panel;
    this.perfStatsEl = stats;

    panel.style.display = this.showPerformanceOverlay ? "flex" : "none";
    const tierName = this.qualityTierLabels[this.currentQualityTier] || "ULTRA";
    stats.textContent = `${Math.round(this.perfMonitor.fps)} FPS | ${this.perfMonitor.frameMs.toFixed(1)} ms | ${tierName}`;
  }

  initPostProcessing() {
    // Restored Post Processing
    this.composer = new EffectComposer(this.renderer);

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    this.bloomPass = null;
    if (this.performanceProfile.bloomEnabled) {
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(
          Math.floor(window.innerWidth),
          Math.floor(window.innerHeight),
        ),
        this.performanceProfile.bloomStrength,
        this.performanceProfile.bloomRadius,
        this.performanceProfile.bloomThreshold,
      );
      this.composer.addPass(this.bloomPass);
    }

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(this.getClampedPixelRatio());
    if (this.composer) {
      this.composer.setSize(window.innerWidth, window.innerHeight);
      this.composer.setPixelRatio(this.getClampedPixelRatio());
      if (this.bloomPass && this.bloomPass.resolution) {
        this.bloomPass.resolution.set(
          Math.floor(window.innerWidth),
          Math.floor(window.innerHeight),
        );
      }
    }
  }

  shake(intensity) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  updateCameraShake(dt) {
    // Shake disabled to prevent camera conflict with PointerLockControls
    this.shakeIntensity = 0;
  }

  initClouds() {
    const cloudGeo = new THREE.PlaneGeometry(30, 30);
    const cloudTex = new THREE.CanvasTexture(
      TextureGenerator.createCloudTexture(),
    );
    const cloudMat = new THREE.MeshBasicMaterial({
      map: cloudTex,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    for (let i = 0; i < 15; i++) {
      const mesh = new THREE.Mesh(cloudGeo, cloudMat);
      mesh.position.set(
        (Math.random() - 0.5) * 200,
        -15 - Math.random() * 20,
        (Math.random() - 0.5) * 200,
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.userData = { speed: 0.5 + Math.random() * 2, noBulletBlock: true };
      this.scene.add(mesh);
      this.clouds.push(mesh);
    }
  }

  initLightPool() {
    for (let i = 0; i < MAX_LIGHTS; i++) {
      const light = new THREE.PointLight(0xffaa00, 0, 20); // Start off
      light.visible = false;
      this.scene.add(light);
      this.lightPool.push({
        light: light,
        timer: 0,
        active: false,
      });
    }
  }

  updateEnvironment(dt) {
    this.environmentTime += dt * 0.1; // Slow time progression

    // Animate clouds
    this.clouds.forEach((cloud) => {
      cloud.position.x += cloud.userData.speed * dt;
      if (cloud.position.x > 100) cloud.position.x = -100;
    });

    // Pulse fog density for atmosphere (subtle; keep low so monsters stay visible)
    const fogPulse = Math.sin(this.environmentTime * 2) * 0.0001;
    this.scene.fog.density = 0.0004 + fogPulse;

    // Vary sun intensity
    const lightPulse = Math.sin(this.environmentTime * 0.5) * 0.1;
    this.dirLight.intensity = 2.5 + lightPulse;

    // Update Light Pool
    this.lightPool.forEach((item) => {
      if (item.active) {
        item.timer -= dt;
        if (item.timer <= 0) {
          item.active = false;
          item.light.visible = false;
          item.light.intensity = 0;
        } else {
          // Fade out
          // item.timer starts at 0.1, so (item.timer / 0.1) goes from 1 to 0
          item.light.intensity = (item.timer / 0.1) * 5;
        }
      }
    });
  }

  animate() {
    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.1);
    this.updatePerformanceMetrics(rawDt);

    // Global Animations
    this.updateEnvironment(dt);
    if (this.level && this.level.update) {
      this.level.update(dt);
    }

    // STATE MACHINE
    if (this.gameState === "MENU" || this.gameState === "GAMEOVER") {
      // Orbit Camera
      this.menuCameraAngle += dt * 0.2;
      const radius = 60;
      this.camera.position.x = Math.cos(this.menuCameraAngle) * radius;
      this.camera.position.z = Math.sin(this.menuCameraAngle) * radius;
      this.camera.position.y = 40;
      this.camera.lookAt(0, 0, 0);
    } else if (this.gameState === "TRANSITION") {
      // Interpolate Camera
      const now = this.clock.getElapsedTime();
      const progress = Math.min(
        (now - this.cameraTransition.startTime) /
          this.cameraTransition.duration,
        1.0,
      );

      // Cubic Ease InOut
      const ease =
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      // Target position is player body position + eye height (1.6)
      const targetPos = this.player.body.position.clone();
      targetPos.y += 1.6;

      this.camera.position.lerpVectors(
        this.cameraTransition.startPos,
        targetPos,
        ease,
      );

      this.camera.quaternion.slerpQuaternions(
        this.cameraTransition.startQuat,
        this.cameraTransition.targetQuat, // Use the FIXED target, not the changing player camera
        ease,
      );

      if (progress >= 1.0) {
        this.gameState = "PLAYING";
        this.showHUD();
      }
    } else if (this.gameState === "PLAYING") {
      this.gameTime += dt;
      this.playerDamageCooldown = Math.max(0, this.playerDamageCooldown - dt);

      // Wave Logic
      if (this.waveState === "STARTING") {
        this.waveTransitionTime += dt;
        // Reduced wait time for better pacing
        if (this.waveTransitionTime > this.waveTransitionDuration) {
          this.waveState = "ACTIVE";
          this.waveTransitionTime = 0;
          this.hideWaveOverlay();
          if (this.audio) this.audio.playWaveStart();
        }
      } else if (this.waveState === "ACTIVE") {
        // Spawn Logic
        let currentSpawnRate = this.spawnRate;
        if (this.enemies.length < 3) currentSpawnRate *= 0.65;

        if (
          this.gameTime - this.lastSpawnTime > currentSpawnRate &&
          this.enemiesSpawnedThisWave < this.enemiesPerWave &&
          this.enemies.length < this.difficultyTuning.maxActiveEnemies
        ) {
          this.spawnEnemyForWave();
          this.lastSpawnTime = this.gameTime;
        }

        // Powerups - BALANCED: Less frequent, not guaranteed
        if (!this.lastPowerUpTime) this.lastPowerUpTime = 0;
        const powerUpInterval =
          (14 + Math.random() * 8) * this.difficultyTuning.powerUpIntervalScale;
        if (this.gameTime - this.lastPowerUpTime > powerUpInterval) {
          // Only 50% chance to spawn (making them rarer)
          if (Math.random() < 0.5) {
            this.spawnPowerUp();
          }
          this.lastPowerUpTime = this.gameTime;
        }

        // Wave Event
        if (
          this.enemiesSpawnedThisWave >= this.enemiesPerWave &&
          this.enemies.length === 0
        ) {
          // Verify hole mechanic: if enemy count is 0, we are good.
          this.completeWave();
        }
      } else if (this.waveState === "COMPLETE") {
        this.waveTransitionTime += dt;
        if (this.waveTransitionTime > this.waveTransitionDuration) {
          if (this.waveNumber < this.totalWaves) {
            this.startWave(this.waveNumber + 1);
          } else {
            this.triggerVictory();
          }
        }
      } else if (this.waveState === "VICTORY") {
        // Intentionally idle. Victory is handled by the end screen.
      }

      // Physics & Player
      if (this.player.health > 0) {
        this.world.step(1 / 60, dt, 3);
        this.player.update(dt);

        // FALLL DEATH CHECK
        if (this.player.body.position.y < -10) {
          this.damagePlayer(9999); // Instant Kill
        }
      } else {
        // Player Died
        this.gameOver();
      }

      // Camera Shake
      this.updateCameraShake(dt);

      // HUD & Systems
      this.updateRemainingEnemiesHUD();
      this.updateWeaponHUD();
      this.particles.update(dt);
      this.credits.update(dt);

      // Power-ups
      for (let i = this.powerUps.length - 1; i >= 0; i--) {
        const powerUp = this.powerUps[i];
        powerUp.update(dt);
        if (powerUp.checkCollision(this.player.body.position)) {
          const type = powerUp.collect();
          this.applyPowerUp(type);
          this.powerUps.splice(i, 1);
        }
      }

      // Buffs
      if (this.buffTimers.speed > 0) {
        this.buffTimers.speed -= dt;
        if (this.buffTimers.speed <= 0) {
          this.playerSpeedMultiplier = this.difficultyTuning.playerSpeedScale;
          this.player.setSpeedMultiplier(this.playerSpeedMultiplier);
        }
      }
      if (this.buffTimers.damage > 0) {
        this.buffTimers.damage -= dt;
        if (this.buffTimers.damage <= 0) this.playerDamageMultiplier = 1.0;
      }

      // Health Bars
      if (this.renderer.info.render.frame % this.healthBarUpdateInterval === 0) {
        this.healthBars.updateAll(this.enemies);
      }

      // Projectiles
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const proj = this.projectiles[i];
        proj.update(dt);
        if (proj.isDead) {
          if (proj.mesh) {
            this.createExplosion(proj.mesh.position, 8);
            this.scene.remove(proj.mesh);
          }
          if (proj.body) this.world.removeBody(proj.body);
          this.shake(0.5);
          this.projectiles.splice(i, 1);
        }
      }

      // Enemies
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        if (!enemy.mesh || !enemy.body) {
          // Corrupted enemy - remove from scene/world and array
          if (enemy.mesh) this.scene.remove(enemy.mesh);
          if (enemy.isBoss) {
            this.cleanupBossLaser(enemy);
            this.hideBossHealthBar();
            if (this.currentBoss === enemy) this.currentBoss = null;
          }
          if (!enemy.isDead && this.enemiesKilledThisWave < this.enemiesPerWave) {
            this.enemiesKilledThisWave++;
          }
          this.healthBars.remove(enemy);
          if (enemy.dispose) enemy.dispose();
          if (enemy.body) this.world.removeBody(enemy.body);
          this.enemies.splice(i, 1);
          continue;
        }
        try {
          enemy.update(dt, this.player.body.position, this.enemies);

          // Generic Attack Logic
          const dist = enemy.mesh.position.distanceTo(
            this.player.body.position,
          );
          const contactRange = Math.max(1.5, (enemy.config?.size || 0.5) * 1.1);
          if (dist < contactRange && !enemy.isDead) {
            const contactDamage = (enemy.config?.damage || 18) * 0.08;
            this.damagePlayer(contactDamage);

            if (this.shakeIntensity < 0.1) this.shake(0.1);
          }

          if (enemy.isBoss && !enemy.isDead) {
            this.updateBossHealthBar(enemy.health, enemy.maxHealth);
            this.updateBossLaserAttack(enemy, dt);
          }
        } catch (err) {
          console.error("Error updating enemy:", err);
          enemy.isDead = true;
        }

        // FALL OFF WORLD / HOLE LOGIC
        if (enemy.body.position.y < -20) {
          enemy.takeDamage(9999);
        }

        if (enemy.isDead) {
          this.enemiesKilledThisWave++;
          if (enemy.isBoss) {
            this.hideBossHealthBar();
            this.cleanupBossLaser(enemy);
            if (this.currentBoss === enemy) this.currentBoss = null;
          }
          this.healthBars.remove(enemy);

          // KAMIKAZE EXPLOSION
          if (enemy.type === "kamikaze") {
            this.createExplosion(enemy.mesh.position, 20); // Big visual explosion
            this.shake(2.0); // Big shake

            // Area Damage to Player
            const distToPlayer = enemy.mesh.position.distanceTo(
              this.player.body.position,
            );
            if (distToPlayer < 8.0) {
              this.damagePlayer(40); // Massive damage if close
              // Knockback?
              // this.player.velocity.add(...) // Hard to access player velocity directly if wrapped, but maybe push body
            }
          } else {
            // Standard death particles
            if (enemy.mesh) {
              this.particles.emitBlood(enemy.mesh.position, 10);
            }
          }

          if (enemy.mesh) {
            const dropRoll = Math.random();
            if (dropRoll < 0.06) {
              const pos = enemy.mesh.position.clone();
              pos.y = 0.5;
              this.powerUps.push(
                new PowerUp(this.scene, this.world, pos, "health"),
              );
            } else if (dropRoll < 0.26) {
              const pos = enemy.mesh.position.clone();
              pos.y = 0.5;
              this.powerUps.push(
                new PowerUp(this.scene, this.world, pos, "ammo"),
              );
            } else if (dropRoll < 0.34) {
              const pos = enemy.mesh.position.clone();
              pos.y = 0.5;
              this.powerUps.push(
                new PowerUp(this.scene, this.world, pos, "speed"),
              );
            } else if (dropRoll < 0.4) {
              const pos = enemy.mesh.position.clone();
              pos.y = 0.5;
              this.powerUps.push(
                new PowerUp(this.scene, this.world, pos, "damage"),
              );
            }
            this.scene.remove(enemy.mesh);
            // Dispose to prevent memory leak
            if (enemy.dispose) enemy.dispose();
          }
          if (enemy.body) this.world.removeBody(enemy.body);
          this.enemies.splice(i, 1);
        }
      }
    }

    // Render after all simulation updates to reduce frame-latency.
    if (this.scene && this.camera && this.renderer) {
      if (this.composer) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    }
  }

  configureDifficulty(difficulty = "medium") {
    const presets = {
      easy: {
        playerSpeedScale: 0.95,
        playerDamageTakenScale: 0.78,
        enemySpeedScale: 0.82,
        enemyHealthScale: 0.85,
        spawnRateScale: 1.25,
        powerUpIntervalScale: 0.8,
        maxActiveEnemies: 26,
      },
      medium: {
        playerSpeedScale: 1.0,
        playerDamageTakenScale: 1.0,
        enemySpeedScale: 0.95,
        enemyHealthScale: 1.0,
        spawnRateScale: 1.0,
        powerUpIntervalScale: 1.0,
        maxActiveEnemies: 34,
      },
      hard: {
        playerSpeedScale: 1.05,
        playerDamageTakenScale: 1.2,
        enemySpeedScale: 1.08,
        enemyHealthScale: 1.15,
        spawnRateScale: 0.85,
        powerUpIntervalScale: 1.15,
        maxActiveEnemies: 42,
      },
    };

    this.selectedDifficulty = presets[difficulty] ? difficulty : "medium";
    this.difficultyTuning = presets[this.selectedDifficulty];
  }

  startGame(difficulty = "medium") {
    this.configureDifficulty(difficulty);
    this.victoryAchieved = false;
    this.waveState = "STARTING";
    if (this.waveOverlayTimeoutId) {
      clearTimeout(this.waveOverlayTimeoutId);
      this.waveOverlayTimeoutId = null;
    }
    this.hideBossHealthBar();
    this.hideWaveOverlay();
    this.resetCombatHudFeedback();
    this.uiCache.score = -1;
    this.uiCache.remainingEnemies = null;
    this.uiCache.weaponString = "";

    const goScreen = document.getElementById("game-over-screen");
    if (goScreen) goScreen.style.display = "none";
    const scoreEl = document.getElementById("score");
    if (scoreEl) scoreEl.innerText = "0";

    // Trigger Transition
    this.gameState = "TRANSITION";

    const menu = document.getElementById("main-menu");
    if (menu) {
      menu.style.animation = "fadeOut 1s forwards"; // trigger CSS anim
      setTimeout(() => (menu.style.display = "none"), 1000);
    }

    // Setup Transition Data
    this.cameraTransition.active = true;
    this.cameraTransition.startTime = this.clock.getElapsedTime();
    this.cameraTransition.duration = 2.0; // 2 seconds
    this.cameraTransition.startPos.copy(this.camera.position);
    this.cameraTransition.startQuat.copy(this.camera.quaternion);

    // CRITICAL: Force Player Spawn & Physics Reset at safe location away from overhead geometry.
    if (this.player.resetForRestart) {
      this.player.resetForRestart(PLAYER_SPAWN);
    } else {
      this.player.body.position.set(
        PLAYER_SPAWN.x,
        PLAYER_SPAWN.y,
        PLAYER_SPAWN.z,
      );
      this.player.body.velocity.set(0, 0, 0);
      this.player.body.angularVelocity.set(0, 0, 0);
    }
    this.playerSpeedMultiplier = this.difficultyTuning.playerSpeedScale;
    this.playerDamageMultiplier = 1.0;
    this.playerDamageCooldown = 0;
    this.buffTimers.speed = 0;
    this.buffTimers.damage = 0;
    this.player.refillAllAmmo();
    this.player.setSpeedMultiplier(this.playerSpeedMultiplier);
    this.player.allowUnlockedInput = true;
    this.lastPowerUpTime = 0;

    // Explicitly define the target rotation (Looking forward, -Z)
    // Identity quaternion is looking at -Z in Three.js default if camera geometry is standard
    this.cameraTransition.targetQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, 0, 0),
    );

    // Also reset the underlying controls object so it doesn't fight us later
    this.player.camera.rotation.set(0, 0, 0);
    this.player.controls.getObject().rotation.set(0, 0, 0);

    // Lock Cursor immediately to get player ready
    // Focus canvas first to ensure document is active context
    this.renderer.domElement.focus();

    // Wrap in try-catch to prevent crash if document focus is lost or context invalid
    try {
      this.player.controls.lock();
    } catch (e) {
      console.warn("PointerLock failed initial attempt:", e);
      // Retry shortly
      setTimeout(() => {
        this.renderer.domElement.focus();
        try {
          this.player.controls.lock();
        } catch (e2) {
          console.error("PointerLock retry failed:", e2);
        }
      }, 100);
    }
    this.clock.start();

    // Sound
    if (this.audio) this.audio.playClick();

    // Start Wave 1 (logic runs but user has 2s to get ready)
    this.startWave(START_WAVE);
  }

  showHUD() {
    const ui = document.getElementById("ui");
    if (ui) {
      ui.style.display = "block";
      // We can animate children if we want
      Array.from(ui.children).forEach((child, i) => {
        child.style.animation = `slideIn 0.5s ${i * 0.1}s forwards`;
        child.style.opacity = "0"; // Start hidden for anim
      });
    }
    this.syncPerformanceOverlay();
  }

  togglePause() {
    if (this.gameState === "PLAYING") {
      this.gameState = "PAUSED";
      this.player.allowUnlockedInput = false;
      const pm = document.getElementById("pause-menu");
      if (pm) pm.style.display = "flex";
      this.player.controls.unlock();
    } else if (this.gameState === "PAUSED") {
      this.gameState = "PLAYING";
      this.player.allowUnlockedInput = true;
      const pm = document.getElementById("pause-menu");
      if (pm) pm.style.display = "none";
      this.renderer.domElement.focus();
      try {
        this.player.controls.lock();
      } catch (e) {
        console.warn("Pause lock failed", e);
      }
      this.clock.getDelta(); // Reset delta to avoid large jump
    }
  }

  gameOver() {
    if (this.gameState === "GAMEOVER") return;
    this.gameState = "GAMEOVER";

    this.player.controls.unlock();
    this.player.allowUnlockedInput = false;
    this.hideBossHealthBar();
    if (this.waveOverlayTimeoutId) {
      clearTimeout(this.waveOverlayTimeoutId);
      this.waveOverlayTimeoutId = null;
    }
    for (const enemy of this.enemies) {
      if (enemy?.isBoss) this.cleanupBossLaser(enemy);
    }
    if (this.particles?.reset) this.particles.reset();
    this.showEndScreen({
      title: "GAME OVER",
      titleColor: "#ff2222",
      titleGlow: "red",
      buttonText: "TRY AGAIN",
    });
  }

  restartGame() {
    if (this.restartInProgress) return;
    const now = performance.now();
    if (now - this.lastRestartAt < 350) return;
    this.lastRestartAt = now;
    this.restartInProgress = true;

    try {
    // Reset State
    this.score = 0;
    this.victoryAchieved = false;
    this.gameState = "MENU";
    this.waveState = "STARTING";
    this.gameTime = 0;
    this.lastSpawnTime = 0;
    this.lastPowerUpTime = 0;
    if (this.input?.keys) this.input.keys = {};
    this.resetCombatHudFeedback();
    this.uiCache.score = -1;
    this.uiCache.remainingEnemies = null;
    this.uiCache.weaponString = "";
    const scoreEl = document.getElementById("score");
    if (scoreEl) scoreEl.innerText = "0";

    // Clear Intervals
    this.activeIntervals.forEach(clearInterval);
    this.activeIntervals = [];
    if (this.waveOverlayTimeoutId) {
      clearTimeout(this.waveOverlayTimeoutId);
      this.waveOverlayTimeoutId = null;
    }
    if (this.particles?.reset) this.particles.reset();
    if (this.healthBars?.clear) this.healthBars.clear();

    // Reset pooled one-shot lights.
    for (const pooled of this.lightPool) {
      if (!pooled || !pooled.light) continue;
      pooled.active = false;
      pooled.timer = 0;
      pooled.light.visible = false;
      pooled.light.intensity = 0;
    }

    // Dispose Player Intervals
    if (this.player && this.player.dispose) {
      this.player.dispose();
    }

    this.player.health = this.player.maxHealth; // Reset encapsulated health

    // Update UI immediately
    this.onPlayerHealthChange(this.player.health, "heal");

    this.waveNumber = 0;
    this.enemiesSpawnedThisWave = 0;
    this.enemiesKilledThisWave = 0;
    // Clear Projectiles and Power-ups from scene and world before clearing arrays
    for (const proj of this.projectiles) {
      if (proj.mesh) this.scene.remove(proj.mesh);
      if (proj.body) this.world.removeBody(proj.body);
    }
    this.projectiles = [];
    for (const pu of this.powerUps) {
      if (pu.mesh) this.scene.remove(pu.mesh);
      if (pu.body) this.world.removeBody(pu.body);
      if (pu.dispose) pu.dispose();
    }
    this.powerUps = [];

    // Remove any leftover transient FX meshes that were mid-fade when intervals were cleared.
    const staleFx = [];
    this.scene.traverse((obj) => {
      if (obj?.isMesh && obj?.userData?.ephemeralFx) {
        staleFx.push(obj);
      }
    });
    staleFx.forEach((mesh) => {
      if (mesh.parent) mesh.parent.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => mat?.dispose?.());
        } else {
          mesh.material.dispose?.();
        }
      }
    });

    // Clear Enemies
    for (const enemy of this.enemies) {
      if (enemy.isBoss) this.cleanupBossLaser(enemy);
      if (enemy.mesh) this.scene.remove(enemy.mesh);
      if (enemy.dispose) enemy.dispose();
      if (enemy.body) this.world.removeBody(enemy.body);
    }
    this.enemies = [];
    this.currentBoss = null;

    // Safety sweep: remove any orphan dynamic bodies that escaped arrays.
    const orphanBodies = [];
    for (const body of this.world.bodies) {
      if (!body || body === this.player.body) continue;
      if (body.type === Body.STATIC) continue;
      orphanBodies.push(body);
    }
    orphanBodies.forEach((body) => this.world.removeBody(body));

    this.waveNumber = START_WAVE;

    // Reset Wave Scaling
    this.enemiesPerWave = 10;
    this.spawnRate = 0.5;

    if (this.player.resetForRestart) {
      this.player.resetForRestart(PLAYER_SPAWN);
    } else {
      this.player.body.position.set(
        PLAYER_SPAWN.x,
        PLAYER_SPAWN.y,
        PLAYER_SPAWN.z,
      );
      this.player.body.velocity.set(0, 0, 0);
      this.player.body.angularVelocity.set(0, 0, 0);
    }
    this.playerSpeedMultiplier = this.difficultyTuning.playerSpeedScale;
    this.playerDamageMultiplier = 1.0;
    this.playerDamageCooldown = 0;
    this.buffTimers.speed = 0;
    this.buffTimers.damage = 0;
    this.player.setSpeedMultiplier(this.playerSpeedMultiplier);

    // Hide Game Over
    const goScreen = document.getElementById("game-over-screen");
    if (goScreen) goScreen.style.display = "none";

    // Update HUD
    this.updateWeaponHUD();

    // Start Game Again
    this.startGame(this.selectedDifficulty);
    } catch (err) {
      console.error("Restart failed, reloading page:", err);
      window.location.reload();
    } finally {
      this.restartInProgress = false;
    }
  }

  showEndScreen({
    title = "GAME OVER",
    titleColor = "#ff2222",
    titleGlow = "red",
    buttonText = "TRY AGAIN",
  } = {}) {
    const goScreen = document.getElementById("game-over-screen");
    if (!goScreen) return;

    goScreen.style.display = "flex";
    goScreen.style.animation = "fadeIn 1s forwards";

    const titleEl = goScreen.querySelector("h1");
    if (titleEl) {
      titleEl.innerText = title;
      titleEl.style.color = titleColor;
      titleEl.style.textShadow = `0 0 20px ${titleGlow}`;
    }

    const buttonEl = goScreen.querySelector("button");
    if (buttonEl) buttonEl.innerText = buttonText;

    const finalScoreEl = document.getElementById("final-score");
    if (finalScoreEl) finalScoreEl.innerText = this.score;
  }

  triggerVictory() {
    if (this.victoryAchieved) return;
    this.victoryAchieved = true;
    this.waveState = "VICTORY";
    this.gameState = "GAMEOVER";
    if (this.waveOverlayTimeoutId) {
      clearTimeout(this.waveOverlayTimeoutId);
      this.waveOverlayTimeoutId = null;
    }

    if (this.player && this.player.controls) {
      this.player.controls.unlock();
      this.player.allowUnlockedInput = false;
    }

    for (const enemy of this.enemies) {
      if (enemy && enemy.isBoss) this.cleanupBossLaser(enemy);
    }
    if (this.particles?.reset) this.particles.reset();

    this.hideBossHealthBar();
    this.showEndScreen({
      title: "VICTORY",
      titleColor: "#19ff8d",
      titleGlow: "#19ff8d",
      buttonText: "PLAY AGAIN",
    });
  }

  getBossProfileForWave(waveNum) {
    const safeWave = THREE.MathUtils.clamp(
      waveNum,
      1,
      this.waveBossProfiles.length,
    );
    return this.waveBossProfiles[safeWave - 1] || this.waveBossProfiles[0];
  }

  getBossCountForWave(waveNum) {
    if (waveNum >= this.totalWaves) return 1;
    if (waveNum >= 4) return 2;
    return 1;
  }

  applyBossProfileVisuals(enemy, profile) {
    if (!enemy?.mesh || !profile) return;
    const tint = new THREE.Color(profile.tintColor || 0xff3300);
    const isFinalBoss = !!profile.specialFinal;
    const isPrimeBoss = !!profile.specialPrime;
    const bossBlack = new THREE.Color(isFinalBoss ? 0x030508 : 0x06080b);
    const bossSteel = new THREE.Color(isFinalBoss ? 0x0a111b : 0x121824);
    const glowHighlight = new THREE.Color(0xffffff);

    enemy.mesh.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const mats = Array.isArray(child.material)
        ? child.material
        : [child.material];

      mats.forEach((mat) => {
        if (!mat) return;
        const glowCutoff = isFinalBoss ? 0.7 : 0.9;
        const isGlowSurface =
          (mat.emissiveIntensity || 0) > glowCutoff || mat.toneMapped === false;

        if (isGlowSurface) {
          if (mat.color) {
            mat.color.copy(tint);
            mat.color.lerp(glowHighlight, isFinalBoss ? 0.08 : 0.04);
          }
          if (mat.emissive) {
            mat.emissive.copy(tint);
          }
          mat.emissiveIntensity = Math.max(
            mat.emissiveIntensity || 0,
            isFinalBoss ? 1.45 : 1.2,
          );
        } else {
          if (mat.color) {
            const armorBlend = enemy.type === "boss_warlord" ? 0.86 : 0.78;
            mat.color.lerp(
              enemy.type === "boss_warlord" ? bossBlack : bossSteel,
              armorBlend,
            );
          }
          if (mat.emissive) {
            mat.emissive.lerp(bossBlack, 0.62);
          }
          mat.emissiveIntensity = Math.max(
            mat.emissiveIntensity || 0,
            isFinalBoss ? 0.2 : 0.14,
          );
        }
      });
    });

    const eyeGlowMats = enemy.mesh.userData.eyeGlowMats;
    if (Array.isArray(eyeGlowMats)) {
      eyeGlowMats.forEach((mat) => {
        if (!mat) return;
        if (mat.color) mat.color.copy(tint);
        if (mat.emissive) {
          mat.emissive.copy(tint);
          mat.emissiveIntensity = Math.max(
            mat.emissiveIntensity || 0,
            isFinalBoss ? 2.85 : 2.2,
          );
        }
      });
    }

    this.syncPrimeBossDecor(enemy, tint, isPrimeBoss);
    this.syncFinalBossDecor(enemy, tint, isFinalBoss);
  }

  disposeObjectTree(root) {
    if (!root) return;
    root.traverse((child) => {
      if (!child?.isMesh) return;
      if (child.geometry) child.geometry.dispose();
      if (!child.material) return;
      if (Array.isArray(child.material)) {
        child.material.forEach((mat) => mat?.dispose?.());
      } else {
        child.material.dispose?.();
      }
    });
  }

  syncFinalBossDecor(enemy, tint, enabled) {
    if (!enemy?.mesh) return;

    const currentDecor = enemy.mesh.userData.finalBossDecor;
    if (!enabled) {
      if (currentDecor) {
        if (currentDecor.parent) currentDecor.parent.remove(currentDecor);
        this.disposeObjectTree(currentDecor);
        enemy.mesh.userData.finalBossDecor = null;
      }
      return;
    }

    let decor = currentDecor;
    if (!decor) {
      decor = new THREE.Group();
      decor.name = "final-boss-decor";

      const darkMat = new THREE.MeshStandardMaterial({
        color: 0x05080f,
        emissive: 0x02060a,
        emissiveIntensity: 0.15,
        roughness: 0.4,
        metalness: 0.88,
      });
      const glowMat = new THREE.MeshStandardMaterial({
        color: tint.clone(),
        emissive: tint.clone(),
        emissiveIntensity: 1.9,
        roughness: 0.16,
        metalness: 0.75,
        toneMapped: false,
      });

      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(0.88, 0.05, 10, 40),
        glowMat,
      );
      halo.position.set(0, 5.62, 0.02);
      halo.rotation.x = Math.PI / 2;
      decor.add(halo);

      for (let i = 0; i < 8; i++) {
        const spike = new THREE.Mesh(
          new THREE.ConeGeometry(0.07, 0.36, 6),
          darkMat,
        );
        const angle = (i / 8) * Math.PI * 2;
        spike.position.set(Math.cos(angle) * 0.88, 5.62, Math.sin(angle) * 0.88);
        spike.rotation.z = Math.PI / 2;
        spike.lookAt(spike.position.x * 1.4, 5.62, spike.position.z * 1.4);
        decor.add(spike);
      }

      const chestSigil = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.24, 0),
        glowMat,
      );
      chestSigil.position.set(0, 3.66, 1.16);
      decor.add(chestSigil);

      const leftBlade = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.8, 0.5),
        darkMat,
      );
      leftBlade.position.set(-1.46, 4.16, -0.34);
      leftBlade.rotation.set(0.2, 0, -0.42);
      decor.add(leftBlade);

      const rightBlade = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.8, 0.5),
        darkMat,
      );
      rightBlade.position.set(1.46, 4.16, -0.34);
      rightBlade.rotation.set(0.2, 0, 0.42);
      decor.add(rightBlade);

      const backArc = new THREE.Mesh(
        new THREE.TorusGeometry(1.35, 0.04, 8, 36, Math.PI),
        glowMat,
      );
      backArc.position.set(0, 3.7, -0.84);
      backArc.rotation.set(0.44, 0, 0);
      decor.add(backArc);

      decor.userData.darkMat = darkMat;
      decor.userData.glowMat = glowMat;

      enemy.mesh.add(decor);
      enemy.mesh.userData.finalBossDecor = decor;
    }

    const glowMat = decor.userData?.glowMat;
    if (glowMat) {
      if (glowMat.color) glowMat.color.copy(tint);
      if (glowMat.emissive) glowMat.emissive.copy(tint);
    }
  }

  syncPrimeBossDecor(enemy, tint, enabled) {
    if (!enemy?.mesh) return;

    const currentDecor = enemy.mesh.userData.primeBossDecor;
    if (!enabled) {
      if (currentDecor) {
        if (currentDecor.parent) currentDecor.parent.remove(currentDecor);
        this.disposeObjectTree(currentDecor);
        enemy.mesh.userData.primeBossDecor = null;
      }
      return;
    }

    let decor = currentDecor;
    if (!decor) {
      decor = new THREE.Group();
      decor.name = "prime-boss-decor";

      const obsidianMat = new THREE.MeshStandardMaterial({
        color: 0x05090e,
        emissive: 0x010407,
        emissiveIntensity: 0.1,
        roughness: 0.46,
        metalness: 0.78,
      });
      const crystalMat = new THREE.MeshStandardMaterial({
        color: tint.clone(),
        emissive: tint.clone(),
        emissiveIntensity: 1.5,
        roughness: 0.18,
        metalness: 0.58,
        transparent: true,
        opacity: 0.94,
        toneMapped: false,
      });

      for (let i = 0; i < 6; i++) {
        const spike = new THREE.Mesh(
          new THREE.ConeGeometry(0.08, 0.34, 6),
          obsidianMat,
        );
        const angle = (i / 6) * Math.PI * 2;
        spike.position.set(Math.cos(angle) * 0.24, 2.84, Math.sin(angle) * 0.2);
        spike.lookAt(spike.position.x * 1.2, 3.25, spike.position.z * 1.2);
        decor.add(spike);
      }

      const crownHalo = new THREE.Mesh(
        new THREE.TorusGeometry(0.26, 0.03, 8, 18),
        crystalMat,
      );
      crownHalo.position.set(0, 2.72, 0.06);
      crownHalo.rotation.x = Math.PI / 2;
      decor.add(crownHalo);

      const chestSigil = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.2, 0),
        crystalMat,
      );
      chestSigil.position.set(0, 1.48, 0.92);
      decor.add(chestSigil);

      const chestFrame = new THREE.Mesh(
        new THREE.TorusGeometry(0.32, 0.035, 8, 18),
        obsidianMat,
      );
      chestFrame.position.set(0, 1.5, 0.88);
      chestFrame.rotation.x = Math.PI / 2;
      decor.add(chestFrame);

      const leftShoulderCrystal = new THREE.Mesh(
        new THREE.ConeGeometry(0.1, 0.48, 6),
        crystalMat,
      );
      leftShoulderCrystal.position.set(-1.26, 2.02, 0.12);
      leftShoulderCrystal.rotation.z = -0.64;
      leftShoulderCrystal.rotation.x = -0.14;
      decor.add(leftShoulderCrystal);

      const rightShoulderCrystal = new THREE.Mesh(
        new THREE.ConeGeometry(0.1, 0.48, 6),
        crystalMat,
      );
      rightShoulderCrystal.position.set(1.26, 2.02, 0.12);
      rightShoulderCrystal.rotation.z = 0.64;
      rightShoulderCrystal.rotation.x = -0.14;
      decor.add(rightShoulderCrystal);

      for (let i = 0; i < 3; i++) {
        const backShard = new THREE.Mesh(
          new THREE.ConeGeometry(0.07 - i * 0.012, 0.34 + i * 0.06, 5),
          obsidianMat,
        );
        backShard.position.set(0, 1.84 + i * 0.34, -0.62);
        backShard.rotation.x = -0.42;
        decor.add(backShard);
      }

      decor.userData.obsidianMat = obsidianMat;
      decor.userData.crystalMat = crystalMat;

      enemy.mesh.add(decor);
      enemy.mesh.userData.primeBossDecor = decor;
    }

    const crystalMat = decor.userData?.crystalMat;
    if (crystalMat) {
      if (crystalMat.color) crystalMat.color.copy(tint);
      if (crystalMat.emissive) crystalMat.emissive.copy(tint);
    }
  }

  initBossLaserState(enemy, profile) {
    const cfg = {
      ...DEFAULT_BOSS_LASER,
      ...(profile?.laser || {}),
    };
    enemy.bossLaserState = {
      phase: "cooldown",
      timer: 1.0 + Math.random() * 0.8,
      config: cfg,
      color: new THREE.Color(cfg.color || DEFAULT_BOSS_LASER.color),
      aimPoint: new THREE.Vector3(),
      eyeBuffer: [new THREE.Vector3(), new THREE.Vector3()],
    };
  }

  startWave(waveNum) {
    if (waveNum > this.totalWaves) {
      this.triggerVictory();
      return;
    }

    const clampedWave = THREE.MathUtils.clamp(
      waveNum,
      START_WAVE,
      this.totalWaves,
    );
    this.waveNumber = clampedWave;
    this.waveState = "STARTING";
    this.enemiesSpawnedThisWave = 0;
    this.enemiesKilledThisWave = 0;
    this.waveTransitionTime = 0;
    this.currentBoss = null;
    this.waveSpawnCycle = this.buildWaveSpawnCycle(
      this.getWaveComposition(clampedWave),
    );

    const baseEnemyCount = 14 + (clampedWave - START_WAVE) * 4;
    this.enemiesPerWave = clampedWave === this.totalWaves
      ? baseEnemyCount + 8
      : baseEnemyCount + (clampedWave >= 4 ? 2 : 0);
    this.spawnRate = Math.max(0.46, 1.04 - clampedWave * 0.055);
    this.spawnRate *= this.difficultyTuning.spawnRateScale;

    if (this.level && this.level.setArenaPhase) {
      this.level.setArenaPhase(clampedWave);
    }

    this.showWaveOverlay();

    // Update wave HUD
    const waveEl = document.getElementById("wave-number");
    if (waveEl) waveEl.innerText = `${clampedWave}/${this.totalWaves}`;
    this.updateRemainingEnemiesHUD();
  }

  completeWave() {
    if (this.waveState === "VICTORY") return;

    if (this.audio) this.audio.playWaveComplete();

    if (this.waveNumber >= this.totalWaves) {
      this.waveState = "VICTORY";
      this.waveTransitionTime = 0;

      const overlay = document.getElementById("wave-message-overlay");
      if (overlay) {
        overlay.style.display = "flex";
        const title = document.getElementById("wave-title");
        if (title) title.innerText = `ALL ${this.totalWaves} WAVES CLEARED`;
        const sub = document.getElementById("wave-subtitle");
        if (sub) sub.innerText = "FINAL BOSS DEFEATED";
      }

      if (this.waveOverlayTimeoutId) clearTimeout(this.waveOverlayTimeoutId);
      this.waveOverlayTimeoutId = setTimeout(() => {
        this.hideWaveOverlay();
        this.triggerVictory();
      }, 2200);
      return;
    }

    this.waveState = "COMPLETE";
    this.waveTransitionTime = 0;

    const nextBoss = this.getBossProfileForWave(this.waveNumber + 1);
    const overlay = document.getElementById("wave-message-overlay");
    if (overlay) {
      overlay.style.display = "flex";
      const title = document.getElementById("wave-title");
      if (title) title.innerText = `WAVE ${this.waveNumber} COMPLETE`;
      const sub = document.getElementById("wave-subtitle");
      if (sub) sub.innerText = `NEXT BOSS: ${nextBoss.name}`;

      if (this.waveOverlayTimeoutId) clearTimeout(this.waveOverlayTimeoutId);
      this.waveOverlayTimeoutId = setTimeout(() => {
        overlay.style.display = "none";
        if (sub) sub.innerText = "GET READY";
      }, 2400);
    }
  }

  getWaveComposition(waveNum) {
    switch (waveNum) {
      case 1:
        return ["arachnid", "specter", "stalker"];
      case 2:
        return ["stalker", "harpy", "kamikaze", "specter"];
      case 3:
        return ["brute", "sentinel", "stalker", "kamikaze"];
      case 4:
        return ["brute", "titan", "sentinel", "harpy", "stalker"];
      case 5:
        return ["sentinel", "brute", "specter", "stalker", "kamikaze", "harpy"];
      case 6:
        return ["titan", "sentinel", "brute", "kamikaze", "stalker", "harpy", "specter"];
      default:
        return ["brute", "stalker", "sentinel", "kamikaze", "harpy", "specter"];
    }
  }

  buildWaveSpawnCycle(composition = []) {
    const base = Array.isArray(composition) && composition.length > 0
      ? [...composition]
      : ["arachnid"];

    for (let i = base.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [base[i], base[j]] = [base[j], base[i]];
    }

    return base;
  }

  getEnemyCollisionRadius(type, isBoss = false) {
    switch (type) {
      case "boss_warlord":
        return isBoss ? 1.42 : 1.32;
      case "titan":
        return isBoss ? 1.2 : 1.08;
      case "void_reaper":
        return isBoss ? 1.22 : 0.56;
      case "nightfang":
        return isBoss ? 1.18 : 0.58;
      case "rift_judicator":
        return isBoss ? 1.2 : 0.56;
      case "eclipse_warden":
        return isBoss ? 1.22 : 0.58;
      case "brute":
        return 0.95;
      case "arachnid":
        return 0.62;
      case "stalker":
        return 0.5;
      case "specter":
        return 0.48;
      case "harpy":
        return 0.52;
      case "sentinel":
        return 0.62;
      case "kamikaze":
        return 0.34;
      default:
        return 0.6;
    }
  }

  isSpawnPositionBlocked(position, radius = 0.6) {
    for (const body of this.world.bodies) {
      if (!body || body.type !== Body.STATIC) continue;
      if (!body.shapes || body.shapes.length === 0) continue;
      if (body.collisionFilterGroup === 8) continue; // Enemy-only hole cover

      const shape = body.shapes[0];
      if (!shape || !shape.halfExtents) continue;

      const half = shape.halfExtents;
      const dx = Math.abs(position.x - body.position.x);
      const dy = Math.abs(position.y - body.position.y);
      const dz = Math.abs(position.z - body.position.z);

      if (
        dx < half.x + radius + 0.2 &&
        dy < half.y + radius + 0.2 &&
        dz < half.z + radius + 0.2
      ) {
        return true;
      }
    }

    return false;
  }

  isPowerUpSpawnBlocked(position, radius = 0.7) {
    for (const body of this.world.bodies) {
      if (!body || body.type !== Body.STATIC) continue;
      if (!body.shapes || body.shapes.length === 0) continue;
      if (body.collisionFilterGroup === 8) continue;

      const shape = body.shapes[0];
      if (!shape || !shape.halfExtents) continue;
      const half = shape.halfExtents;
      const topY = body.position.y + half.y;

      // Treat near-ground surfaces as valid floor instead of obstacles.
      if (topY <= 0.35) continue;

      const dx = Math.abs(position.x - body.position.x);
      const dz = Math.abs(position.z - body.position.z);
      if (dx < half.x + radius + 0.15 && dz < half.z + radius + 0.15) {
        return true;
      }
    }

    return false;
  }

  findSpawnPosition(type, isBoss) {
    const playerPos = this.player.body.position;
    const radiusMin = isBoss ? 30 : 25;
    const radiusMax = isBoss ? 42 : 45;
    const y = 5;
    const enemyRadius = this.getEnemyCollisionRadius(type, isBoss);
    const minPlayerDistance = isBoss ? 20 : 10;
    const minEnemyGap = isBoss ? 11 : 3.5;
    const minCenterDistance = isBoss ? 26 : 9;

    const isTooCloseToEnemy = (candidate) => {
      for (const enemy of this.enemies) {
        if (!enemy || enemy.isDead || !enemy.body) continue;
        const distToEnemy = Math.hypot(
          candidate.x - enemy.body.position.x,
          candidate.z - enemy.body.position.z,
        );
        if (distToEnemy < minEnemyGap) {
          return true;
        }
      }
      return false;
    };

    const isValidSpawn = (candidate) => {
      const distToPlayer = Math.hypot(
        candidate.x - playerPos.x,
        candidate.z - playerPos.z,
      );
      if (distToPlayer < minPlayerDistance) return false;
      if (Math.hypot(candidate.x, candidate.z) < minCenterDistance) return false;
      if (isTooCloseToEnemy(candidate)) return false;
      if (this.isSpawnPositionBlocked(candidate, enemyRadius)) return false;
      return true;
    };

    if (isBoss) {
      const bossAnchors = [
        new THREE.Vector2(0, 34),
        new THREE.Vector2(34, 0),
        new THREE.Vector2(0, -34),
        new THREE.Vector2(-34, 0),
        new THREE.Vector2(24, 32),
        new THREE.Vector2(-24, 32),
        new THREE.Vector2(24, -32),
        new THREE.Vector2(-24, -32),
        new THREE.Vector2(32, 24),
        new THREE.Vector2(-32, 24),
        new THREE.Vector2(32, -24),
        new THREE.Vector2(-32, -24),
      ];
      const startIndex = Math.floor(Math.random() * bossAnchors.length);

      for (let i = 0; i < bossAnchors.length; i++) {
        const anchor = bossAnchors[(startIndex + i) % bossAnchors.length];
        const candidate = new THREE.Vector3(
          THREE.MathUtils.clamp(anchor.x + (Math.random() - 0.5) * 3, -36, 36),
          y,
          THREE.MathUtils.clamp(anchor.y + (Math.random() - 0.5) * 3, -36, 36),
        );
        if (isValidSpawn(candidate)) {
          return candidate;
        }
      }
    }

    for (let attempt = 0; attempt < 42; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = radiusMin + Math.random() * (radiusMax - radiusMin);
      const clampEdge = isBoss ? 36 : 38;
      const candidate = new THREE.Vector3(
        THREE.MathUtils.clamp(
          playerPos.x + Math.cos(angle) * distance,
          -clampEdge,
          clampEdge,
        ),
        y,
        THREE.MathUtils.clamp(
          playerPos.z + Math.sin(angle) * distance,
          -clampEdge,
          clampEdge,
        ),
      );
      if (isValidSpawn(candidate)) {
        return candidate;
      }
    }

    if (isBoss) {
      for (let attempt = 0; attempt < 20; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const fallbackBoss = new THREE.Vector3(
          Math.cos(angle) * 30,
          y,
          Math.sin(angle) * 30,
        );
        if (isValidSpawn(fallbackBoss)) {
          return fallbackBoss;
        }
      }

      return new THREE.Vector3(0, y, playerPos.z > 0 ? -30 : 30);
    }

    return new THREE.Vector3(
      THREE.MathUtils.clamp(playerPos.x, -34, 34),
      y,
      THREE.MathUtils.clamp(playerPos.z - 28, -34, 34),
    );
  }

  spawnEnemyForWave() {
    // 1. Determine Type & Boss Status
    let type = "arachnid";
    let isBoss = false;
    let bossProfile = null;

    // Ensure getWaveComposition returns valid array
    const baseComposition = this.getWaveComposition(this.waveNumber) || [
      "arachnid",
    ];

    const bossCount = this.getBossCountForWave(this.waveNumber);

    // Bosses spawn first in each wave.
    if (this.enemiesSpawnedThisWave < bossCount) {
      isBoss = true;
      bossProfile = this.getBossProfileForWave(this.waveNumber);
      type = bossProfile.type;
      if (this.audio) this.audio.playBossRoar();
      this.showBossHealthBar(bossProfile.name);
    } else {
      // Normal mixed composition with cycle so all monster types appear regularly.
      if (this.waveSpawnCycle.length === 0) {
        this.waveSpawnCycle = this.buildWaveSpawnCycle(baseComposition);
      }
      type = this.waveSpawnCycle.pop() || "arachnid";
      if (this.audio && type !== "arachnid" && Math.random() < 0.2) {
        this.audio.playMonsterGrowl();
      }
    }

    const position = this.findSpawnPosition(type, isBoss);

    // 3. Create Enemy
    try {
      if (!this.player) throw new Error("Player missing!");

      let enemy;

      // ALL enemies now use the base Enemy class + MonsterFactory
      // We don't need custom classes like Arachnid anymore since factories handle the mesh
      enemy = new Enemy(this.scene, this.world, position, type, isBoss);

      // 4. Validate Mesh
      if (!enemy.mesh) {
        console.error("Enemy mesh not created! Enemy Object:", enemy);
        // Fallback: Create one right here if missing?
        return;
      }

      // Add Boss Metadata specific to Game tracking
      if (isBoss) {
        enemy.isBoss = true;
        enemy.bossProfile = bossProfile;
        enemy.bossName = bossProfile.name;
        enemy.config.damage *= bossProfile.damageMultiplier || 1.0;

        // Scale Boss Health with wave and profile.
        const healthMult =
          (1 + this.waveNumber * 0.18) * (bossProfile.healthMultiplier || 1.0);
        enemy.health *= healthMult;
        enemy.maxHealth = enemy.health;

        if (Number.isFinite(bossProfile.modelScale) && enemy.mesh) {
          const clampedScale = THREE.MathUtils.clamp(
            bossProfile.modelScale,
            0.72,
            1.22,
          );
          enemy.mesh.scale.multiplyScalar(clampedScale);
          if (enemy.collisionRadius) {
            enemy.collisionRadius *= clampedScale;
          }
          const shape = enemy.body?.shapes?.[0];
          if (shape && typeof shape.radius === "number") {
            shape.radius = enemy.collisionRadius || shape.radius;
            enemy.body.updateBoundingRadius?.();
            enemy.body.updateMassProperties?.();
            enemy.body.aabbNeedsUpdate = true;
          }
          // Recompute visual offset after runtime scale changes.
          enemy.calibrateVisualOffset?.();
        }

        this.applyBossProfileVisuals(enemy, bossProfile);
        this.initBossLaserState(enemy, bossProfile);
        this.currentBoss = enemy;
      }
      enemy.health *= this.difficultyTuning.enemyHealthScale;
      enemy.maxHealth = enemy.health;

      const waveSpeedMultiplier = Math.min(2.0, 0.95 + this.waveNumber * 0.05);
      const bossAdjustedMultiplier = isBoss
        ? Math.max(
            1.2,
            waveSpeedMultiplier * (bossProfile?.speedMultiplier || 1.0),
          )
        : waveSpeedMultiplier;
      enemy.setSpeedMultiplier(
        bossAdjustedMultiplier * this.difficultyTuning.enemySpeedScale,
      );

      this.enemies.push(enemy);
      this.enemiesSpawnedThisWave++;
    } catch (e) {
      console.error("Failed to spawn enemy:", e);
    }
  }

  getBossEyeWorldPositions(enemy, outPositions) {
    const out =
      outPositions && outPositions.length >= 2
        ? outPositions
        : [new THREE.Vector3(), new THREE.Vector3()];

    const eyeAnchors = enemy?.mesh?.userData?.eyeAnchors;
    if (Array.isArray(eyeAnchors) && eyeAnchors.length >= 2) {
      eyeAnchors[0].getWorldPosition(out[0]);
      eyeAnchors[1].getWorldPosition(out[1]);
      return out;
    }

    const bounds = new THREE.Box3().setFromObject(enemy.mesh);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const forward = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(enemy.mesh.quaternion)
      .normalize();
    const right = new THREE.Vector3(1, 0, 0)
      .applyQuaternion(enemy.mesh.quaternion)
      .normalize();
    const up = new THREE.Vector3(0, 1, 0)
      .applyQuaternion(enemy.mesh.quaternion)
      .normalize();

    const eyeHeight = Math.max(0.35, size.y * 0.2);
    const eyeForward = Math.max(0.22, size.z * 0.22);
    const eyeSpread = Math.max(0.1, size.x * 0.15);

    out[0]
      .copy(center)
      .addScaledVector(up, eyeHeight)
      .addScaledVector(forward, eyeForward)
      .addScaledVector(right, -eyeSpread);
    out[1]
      .copy(center)
      .addScaledVector(up, eyeHeight)
      .addScaledVector(forward, eyeForward)
      .addScaledVector(right, eyeSpread);
    return out;
  }

  ensureBossLaserVisuals(enemy, color) {
    if (
      Array.isArray(enemy.bossLaserBeams) &&
      enemy.bossLaserBeams.length === 2
    ) {
      enemy.bossLaserBeams.forEach((beam) => {
        if (beam?.material?.color && color) beam.material.color.copy(color);
      });
      return enemy.bossLaserBeams;
    }

    const beamColor = color || new THREE.Color(DEFAULT_BOSS_LASER.color);
    const beams = [];
    for (let i = 0; i < 2; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: beamColor,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const beam = new THREE.Mesh(this.bossLaserGeometry, mat);
      beam.visible = false;
      beam.renderOrder = 8;
      beam.userData.noBulletBlock = true;
      this.scene.add(beam);
      beams.push(beam);
    }
    enemy.bossLaserBeams = beams;
    return beams;
  }

  updateBossLaserVisuals(enemy, eyePositions, aimPoint, cfg, isFiring, power) {
    const stateColor = enemy.bossLaserState?.color;
    const beams = this.ensureBossLaserVisuals(enemy, stateColor);
    const playerPoint = this.player.camera
      ? this.player.camera.position
      : this.player.body.position;
    let hitPlayer = false;

    for (let i = 0; i < beams.length; i++) {
      const beam = beams[i];
      const eyePos = eyePositions[Math.min(i, eyePositions.length - 1)];
      const dir = new THREE.Vector3().subVectors(aimPoint, eyePos);
      if (dir.lengthSq() < 0.0001) dir.set(0, 0, 1);
      dir.normalize();

      const previewLength = cfg.range * (0.2 + power * 0.65);
      const beamLength = isFiring ? cfg.range : previewLength;
      const end = new THREE.Vector3().copy(eyePos).addScaledVector(dir, beamLength);
      const mid = new THREE.Vector3().copy(eyePos).add(end).multiplyScalar(0.5);

      beam.visible = true;
      beam.position.copy(mid);
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      beam.scale.set(1, 1, beamLength);

      if (beam.material) {
        beam.material.opacity = isFiring ? 0.84 : 0.2 + power * 0.46;
      }

      if (isFiring) {
        const dist = this.distancePointToSegment(playerPoint, eyePos, end);
        if (dist <= cfg.width) {
          hitPlayer = true;
        }
      }
    }

    return hitPlayer;
  }

  updateBossEyeGlow(enemy, state, power) {
    const eyeGlowMats = enemy?.mesh?.userData?.eyeGlowMats;
    if (!Array.isArray(eyeGlowMats)) return;

    eyeGlowMats.forEach((mat) => {
      if (!mat) return;
      if (mat.color) {
        mat.color.copy(state.color).multiplyScalar(0.55 + power * 0.45);
      }
      if (mat.emissive) {
        mat.emissive.copy(state.color);
        mat.emissiveIntensity = 0.8 + power * 4.2;
      }
    });
  }

  updateBossLaserAttack(enemy, dt) {
    if (!enemy?.isBoss || !enemy.mesh || !enemy.bossLaserState) return;
    const state = enemy.bossLaserState;
    const cfg = state.config || DEFAULT_BOSS_LASER;
    const playerPoint = this.player.camera
      ? this.player.camera.position
      : this.player.body.position;

    state.timer -= dt;
    const distToPlayer = enemy.mesh.position.distanceTo(playerPoint);

    if (state.phase === "cooldown") {
      this.hideBossLaser(enemy);
      this.updateBossEyeGlow(enemy, state, 0.08);
      if (state.timer <= 0 && distToPlayer <= cfg.range + 4) {
        state.phase = "charge";
        state.timer = cfg.charge;
        state.aimPoint.copy(playerPoint);
      }
      return;
    }

    const trackingRate = state.phase === "fire" ? 1.2 : 0.8;
    state.aimPoint.lerp(playerPoint, Math.min(1, dt * trackingRate));
    const eyePositions = this.getBossEyeWorldPositions(enemy, state.eyeBuffer);

    if (state.phase === "charge") {
      const chargeProgress = THREE.MathUtils.clamp(
        1 - Math.max(0, state.timer) / Math.max(cfg.charge, 0.001),
        0,
        1,
      );
      this.updateBossEyeGlow(enemy, state, chargeProgress);
      this.updateBossLaserVisuals(
        enemy,
        eyePositions,
        state.aimPoint,
        cfg,
        false,
        chargeProgress,
      );
      if (state.timer <= 0) {
        state.phase = "fire";
        state.timer = cfg.duration;
      }
      return;
    }

    if (state.phase === "fire") {
      this.updateBossEyeGlow(enemy, state, 1.0);
      const hitPlayer = this.updateBossLaserVisuals(
        enemy,
        eyePositions,
        state.aimPoint,
        cfg,
        true,
        1.0,
      );

      if (hitPlayer) {
        this.damagePlayer(cfg.damagePerSecond * dt);
        if (Math.random() < 0.18) this.shake(0.06);
      }

      if (state.timer <= 0) {
        state.phase = "cooldown";
        state.timer =
          cfg.cooldown * THREE.MathUtils.lerp(0.92, 1.08, Math.random());
        this.hideBossLaser(enemy);
        this.updateBossEyeGlow(enemy, state, 0.1);
      }
    }
  }

  hideBossLaser(enemy) {
    if (!Array.isArray(enemy?.bossLaserBeams)) return;
    enemy.bossLaserBeams.forEach((beam) => {
      if (beam) beam.visible = false;
    });
  }

  cleanupBossLaser(enemy) {
    if (!enemy) return;
    this.hideBossLaser(enemy);

    if (Array.isArray(enemy.bossLaserBeams)) {
      enemy.bossLaserBeams.forEach((beam) => {
        if (!beam) return;
        this.scene.remove(beam);
        if (beam.material && beam.material.dispose) {
          beam.material.dispose();
        }
      });
    }
    enemy.bossLaserBeams = null;

    if (enemy.bossLaserState) {
      enemy.bossLaserState.phase = "cooldown";
      enemy.bossLaserState.timer = 1.2;
    }
  }

  distancePointToSegment(point, start, end) {
    const segment = new THREE.Vector3().subVectors(end, start);
    const toPoint = new THREE.Vector3().subVectors(point, start);
    const segmentLenSq = segment.lengthSq();
    if (segmentLenSq < 0.000001) {
      return point.distanceTo(start);
    }

    const t = THREE.MathUtils.clamp(
      toPoint.dot(segment) / segmentLenSq,
      0,
      1,
    );
    const closest = new THREE.Vector3().copy(start).addScaledVector(segment, t);
    return closest.distanceTo(point);
  }

  showWaveOverlay() {
    if (this.waveOverlayTimeoutId) {
      clearTimeout(this.waveOverlayTimeoutId);
      this.waveOverlayTimeoutId = null;
    }
    const overlay = document.getElementById("wave-message-overlay");
    if (overlay) {
      overlay.style.display = "flex";
      const title = document.getElementById("wave-title");
      if (title) title.innerText = `WAVE ${this.waveNumber} / ${this.totalWaves}`;
      const sub = document.getElementById("wave-subtitle");
      const boss = this.getBossProfileForWave(this.waveNumber);
      if (sub) sub.innerText = `BOSS: ${boss.name}`;
    }
  }

  hideWaveOverlay() {
    const overlay = document.getElementById("wave-message-overlay");
    if (overlay) overlay.style.display = "none";
    const sub = document.getElementById("wave-subtitle");
    if (sub) sub.innerText = "GET READY";
  }

  spawnProjectile(pos, dir) {
    this.projectiles.push(
      new Projectile(this.scene, this.world, pos, dir, this.player),
    );
    this.shake(0.2);
  }

  createExplosion(pos, radius = 5, damagePlayer = false) {
    if (this.audio) this.audio.playExplosion();

    // Flash light - Use Pool
    const freeLight = this.lightPool.find((l) => !l.active);
    if (freeLight) {
      freeLight.active = true;
      freeLight.timer = 0.1; // 100ms
      freeLight.light.position.copy(pos);
      freeLight.light.intensity = 5;
      freeLight.light.visible = true;
    }

    // Visual Explosion Sphere (Glowy)
    const geo = new THREE.SphereGeometry(radius * 0.5, 32, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff5500,
      transparent: true,
      opacity: 0.9,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.userData.ephemeralFx = "explosion";
    this.scene.add(mesh);

    let scale = 1.0;
    const fadeInterval = setInterval(() => {
      if (!mesh || !mesh.material) {
        clearInterval(fadeInterval);
        return;
      }
      mesh.material.opacity -= 0.05;
      scale += 0.2;
      mesh.scale.set(scale, scale, scale);
      if (mesh.material.opacity <= 0) {
        clearInterval(fadeInterval);
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
        // Remove from active list
        const idx = this.activeIntervals.indexOf(fadeInterval);
        if (idx > -1) this.activeIntervals.splice(idx, 1);
      }
    }, 16);
    this.activeIntervals.push(fadeInterval);

    // Particle Burst
    this.particles.emitExplosion(pos, 20);

    // Damage Enemies
    for (const enemy of this.enemies) {
      if (!enemy.mesh) continue;
      const dist = enemy.mesh.position.distanceTo(pos);
      if (dist < radius) {
        enemy.takeDamage(100 * (1 - dist / radius));
        if (enemy.isDead && !enemy.scored) {
          enemy.scored = true;
          this.addScore(100);
        }
      }
    }

    if (damagePlayer) {
      const distToPlayer = this.player.body.position.distanceTo(pos);
      if (distToPlayer < radius) {
        this.damagePlayer(40 * (1 - distToPlayer / radius));
        this.shake(1.0); // Big shake
      }
    }
  }

  getRandomPowerUpType() {
    const healthRatio = this.player
      ? this.player.health / Math.max(1, this.player.maxHealth || 100)
      : 1;
    const finiteWeapons = this.player?.weapons?.filter((w) =>
      Number.isFinite(w.maxAmmo)
    ) || [];
    const ammoRatio = finiteWeapons.length === 0
      ? 1
      : finiteWeapons.reduce((sum, weapon) => {
        const maxAmmo = Math.max(1, weapon.maxAmmo || 1);
        return sum + weapon.ammo / maxAmmo;
      }, 0) / finiteWeapons.length;

    const roll = Math.random();
    if (healthRatio < 0.35 && roll < 0.46) return "health";
    if (ammoRatio < 0.3 && roll < 0.58) return "ammo";
    if (roll < 0.35) return "health";
    if (roll < 0.65) return "ammo";
    if (roll < 0.85) return "speed";
    return "damage";
  }

  spawnPowerUp() {
    const clamp = 36;
    let spawnPos = null;

    for (let attempt = 0; attempt < 20; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 12 + Math.random() * 18;
      const x = THREE.MathUtils.clamp(
        this.player.body.position.x + Math.cos(angle) * radius,
        -clamp,
        clamp,
      );
      const z = THREE.MathUtils.clamp(
        this.player.body.position.z + Math.sin(angle) * radius,
        -clamp,
        clamp,
      );
      const candidate = new THREE.Vector3(x, 0.5, z);
      const insideCenterHole = Math.abs(x) < 9 && Math.abs(z) < 9;
      if (insideCenterHole) continue;
      if (this.isPowerUpSpawnBlocked(candidate, 0.7)) continue;
      const nearOtherPowerup = this.powerUps.some((pu) =>
        pu?.position && pu.position.distanceTo(candidate) < 3.2
      );
      if (nearOtherPowerup) continue;
      spawnPos = candidate;
      break;
    }

    if (!spawnPos) {
      const fallbackX = THREE.MathUtils.clamp(this.player.body.position.x, -clamp, clamp);
      let fallbackZ = THREE.MathUtils.clamp(this.player.body.position.z - 12, -clamp, clamp);
      if (Math.abs(fallbackX) < 9 && Math.abs(fallbackZ) < 9) {
        fallbackZ = fallbackZ >= 0 ? 10.5 : -10.5;
      }
      spawnPos = new THREE.Vector3(
        fallbackX,
        0.5,
        fallbackZ,
      );
    }

    if (this.isPowerUpSpawnBlocked(spawnPos, 0.7)) {
      spawnPos = new THREE.Vector3(
        THREE.MathUtils.clamp(this.player.body.position.x, -clamp, clamp),
        0.5,
        this.player.body.position.z >= 0 ? -10.5 : 10.5,
      );
    }

    const type = this.getRandomPowerUpType();

    this.powerUps.push(
      new PowerUp(this.scene, this.world, spawnPos, type),
    );
  }

  showHitMarker(isHeadshot) {
    const el = document.getElementById("hit-marker");
    if (el) {
      // Reset animation
      el.classList.remove("active");
      el.classList.remove("headshot");
      void el.offsetWidth; // Force reflow
      if (isHeadshot) {
        el.classList.add("headshot");
      }
      el.classList.add("active");
    }

    const crosshair = document.getElementById("crosshair");
    if (crosshair) {
      crosshair.classList.remove("hit-pulse");
      crosshair.classList.remove("headshot-pulse");
      void crosshair.offsetWidth;
      crosshair.classList.add(isHeadshot ? "headshot-pulse" : "hit-pulse");
    }

    if (this.audio) this.audio.playHitSound(isHeadshot);
  }

  resetCombatHudFeedback() {
    const hitMarker = document.getElementById("hit-marker");
    if (hitMarker) {
      hitMarker.classList.remove("active");
      hitMarker.classList.remove("headshot");
    }

    const crosshair = document.getElementById("crosshair");
    if (crosshair) {
      crosshair.classList.remove("hit-pulse");
      crosshair.classList.remove("headshot-pulse");
    }
  }

  addScore(points) {
    this.score += points;
    const scoreEl = document.getElementById("score");
    if (scoreEl && this.uiCache.score !== this.score) {
      scoreEl.innerText = this.score;
      this.uiCache.score = this.score;
    }
  }

  getRemainingEnemiesCount() {
    if (this.gameState === "MENU") return 0;
    if (this.waveState === "VICTORY") return 0;
    const aliveEnemies = this.enemies.reduce((count, enemy) => {
      if (!enemy || enemy.isDead) return count;
      return count + 1;
    }, 0);
    const unspawned = Math.max(0, this.enemiesPerWave - this.enemiesSpawnedThisWave);
    return aliveEnemies + unspawned;
  }

  updateRemainingEnemiesHUD() {
    const el = document.getElementById("enemies-remaining");
    if (!el) return;

    const remaining = this.getRemainingEnemiesCount();
    if (this.uiCache.remainingEnemies !== remaining) {
      el.innerText = remaining;
      this.uiCache.remainingEnemies = remaining;
    }
  }

  updateWeaponHUD() {
    const weapon = this.player.currentWeapon;
    const el = document.getElementById("weapon");

    if (el) {
      let ammoText = weapon.ammo === Infinity ? "INF" : weapon.ammo;
      if (weapon.maxAmmo && weapon.maxAmmo !== Infinity) {
        ammoText += ` / ${weapon.maxAmmo}`;
      }

      const newString = `${weapon.name.toUpperCase()} [${ammoText}]`;

      // CACHED UPDATE: Only update DOM if string changed
      if (this.uiCache.weaponString !== newString) {
        el.innerText = newString;
        this.uiCache.weaponString = newString;
      }

      const finiteAmmo = Number.isFinite(weapon.ammo) &&
        Number.isFinite(weapon.maxAmmo) &&
        weapon.maxAmmo > 0;
      const lowAmmo = finiteAmmo && weapon.ammo / weapon.maxAmmo <= 0.2;
      el.classList.toggle("hud-low-ammo", !!lowAmmo);
    }
  }

  damagePlayer(amount) {
    if (this.player) {
      if (amount < 9000 && this.playerDamageCooldown > 0) return;
      if (amount < 9000) this.playerDamageCooldown = 0.12;

      this.player.takeDamage(
        amount * this.difficultyTuning.playerDamageTakenScale,
      );
    }
  }

  showBossHealthBar(name = "BOSS") {
    const el = document.getElementById("boss-health-bar");
    if (el) el.style.display = "block";
    const fill = document.getElementById("boss-health-fill");
    if (fill) fill.style.width = "100%";
    const label = el ? el.querySelector(".boss-health-text") : null;
    if (label) label.innerText = String(name || "BOSS").toUpperCase();
  }

  updateBossHealthBar(current, max) {
    const el = document.getElementById("boss-health-fill");
    if (el) el.style.width = Math.max(0, (current / max) * 100) + "%";
  }

  hideBossHealthBar() {
    const el = document.getElementById("boss-health-bar");
    if (el) el.style.display = "none";
    const label = el ? el.querySelector(".boss-health-text") : null;
    if (label) label.innerText = "BOSS";
  }

  applyPowerUp(type) {
    if (type === "health") {
      this.player.heal(50);
      if (this.audio) this.audio.playPickup();
    } else if (type === "ammo") {
      // Fill all weapons so the player cannot get hard-locked by empty inventory.
      this.player.weapons.forEach((weapon) => {
        if (Number.isFinite(weapon.maxAmmo)) {
          weapon.ammo = weapon.maxAmmo;
        }
      });
      this.updateWeaponHUD();
      if (this.audio) this.audio.playPickup();

      // Blue flash
      this.triggerFlash("ammo-flash");
    } else if (type === "speed") {
      this.playerSpeedMultiplier = 1.3 * this.difficultyTuning.playerSpeedScale;
      this.buffTimers.speed = 10;
      this.player.setSpeedMultiplier(this.playerSpeedMultiplier);
      if (this.audio) this.audio.playPickup();
      this.triggerFlash("heal-flash");
    } else if (type === "damage") {
      this.playerDamageMultiplier = 1.45;
      this.buffTimers.damage = 10;
      if (this.audio) this.audio.playPickup();
      this.triggerFlash("ammo-flash");
    }
  }

  triggerFlash(id) {
    const flash = document.getElementById(id);
    if (flash) {
      flash.classList.remove("active");
      void flash.offsetWidth; // Force Reflow
      flash.classList.add("active");

      // Auto-remove after short delay to let CSS transition take over
      setTimeout(() => {
        flash.classList.remove("active");
      }, 100);
    }
  }

  onPlayerHealthChange(health, type) {
    if (type === "damage") {
      // Red flash
      this.triggerFlash("damage-flash");
      this.shake(0.2);
    } else if (type === "heal") {
      // Green flash
      this.triggerFlash("heal-flash");
    }

    // Update HUD
    const healthEl = document.getElementById("health");
    const currentHealthInt = Math.ceil(health);
    if (healthEl && this.uiCache.health !== currentHealthInt) {
      healthEl.innerText = currentHealthInt;
      this.uiCache.health = currentHealthInt;
    }

    // Low Health Vignette
    const lowHealthOverlay = document.getElementById("low-health-overlay");
    if (lowHealthOverlay) {
      if (health < 30) {
        lowHealthOverlay.style.display = "block";
        lowHealthOverlay.style.opacity = Math.max(0.3, 1 - health / 30);
      } else {
        lowHealthOverlay.style.display = "none";
      }
    }
  }
}
