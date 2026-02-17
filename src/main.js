let gameBootPromise = null;

async function ensureGameLoaded() {
  if (window.gameInstance) return window.gameInstance;
  if (gameBootPromise) return gameBootPromise;

  gameBootPromise = (async () => {
    const { Game } = await import("./core/Game.js");
    const game = new Game();
    window.gameInstance = game;
    return game;
  })();

  try {
    return await gameBootPromise;
  } catch (e) {
    gameBootPromise = null;
    console.error(e);
    throw e;
  }
}

window.ensureGameLoaded = ensureGameLoaded;

// Warm boot during idle time so first interaction stays responsive.
const warmBoot = () => {
  ensureGameLoaded().catch((e) => {
    console.error(e);
  });
};

if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
  window.requestIdleCallback(warmBoot, { timeout: 1500 });
} else {
  setTimeout(warmBoot, 180);
}
