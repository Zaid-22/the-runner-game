export class Input {
  constructor() {
    this.keys = {};

    document.addEventListener("keydown", (e) => this.onKeyDown(e));
    document.addEventListener("keyup", (e) => this.onKeyUp(e));
    document.addEventListener("mousedown", (e) => this.onMouseDown(e));
    document.addEventListener("mouseup", (e) => this.onMouseUp(e));

    document.addEventListener("pointerlockchange", () => {
      if (!document.pointerLockElement) {
        this.keys = {}; // Clear keys when unlocked to prevent sticking
        // Optionally pause game if invalid state? Handled in Game.togglePause usually
      }
    });
  }

  onKeyDown(e) {
    if (e.repeat) return;
    this.keys[e.code] = true;
    if ((e.code === "Escape" || e.code === "KeyP") && window.gameInstance) {
      window.gameInstance.togglePause();
    }
  }

  onKeyUp(e) {
    this.keys[e.code] = false;
  }

  onMouseDown(e) {
    this.keys["Mouse" + e.button] = true;
  }

  onMouseUp(e) {
    this.keys["Mouse" + e.button] = false;
  }

  isDown(code) {
    return !!this.keys[code];
  }
}
