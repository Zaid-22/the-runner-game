import * as THREE from "three";

export class TextureGenerator {
  static createNoise(ctx, width, height, scale = 1, alpha = 1) {
    // Check if we have a context or need to create a dummy one for logic reuse
    // (Though usually this helper is called with a ctx)
    if (!ctx) return;

    const idata = ctx.createImageData(width, height);
    const buffer = new Uint32Array(idata.data.buffer);
    const len = buffer.length;

    for (let i = 0; i < len; i++) {
      // Simple noise using random
      const val = Math.floor(Math.random() * 255 * scale);
      // RGBA (Little Endian)
      // Alpha needs to be handled if we want transparency, but here we likely want solid noise or overlay
      // If alpha is passed, we might want to set the alpha channel
      const a = Math.floor(255 * alpha);
      buffer[i] = (a << 24) | (val << 16) | (val << 8) | val;
    }
    ctx.putImageData(idata, 0, 0);
  }

  static createSandTexture() {
    const size = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // Base Sand Color
    ctx.fillStyle = "#e6c288";
    ctx.fillRect(0, 0, size, size);

    // Noise Layer
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = 0.3;

    // Simple noise simulation
    for (let i = 0; i < 50000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? "#fff" : "#000";
      ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
    }

    // Dune Ripples
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = "#8b4513";
    ctx.lineWidth = 20;
    for (let i = 0; i < size; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.bezierCurveTo(size / 3, i + 20, (size * 2) / 3, i - 20, size, i);
      ctx.stroke();
    }

    return canvas;
  }

  static createSandstoneTexture() {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // Base Sandstone
    ctx.fillStyle = "#c2b280";
    ctx.fillRect(0, 0, size, size);

    // Noise (using a simpler inline approach since createNoise helper in original file was a bit raw)
    // Actually let's just do simple noise here
    for (let i = 0; i < 10000; i++) {
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
    }

    // Cracks/Bricks
    ctx.strokeStyle = "#8b7355";
    ctx.lineWidth = 2;

    // Large Blocks
    const blockSize = 64;
    for (let y = 0; y <= size; y += blockSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
    for (let x = 0; x <= size; x += blockSize) {
      ctx.beginPath();
      const offset = (Math.floor(x / blockSize) % 2) * (blockSize / 2);
      // Vertical lines staggered
      for (let y = 0; y < size; y += blockSize) {
        if (Math.random() > 0.1) {
          ctx.moveTo(x + (y % (blockSize * 2) == 0 ? 0 : blockSize / 2), y);
          ctx.lineTo(
            x + (y % (blockSize * 2) == 0 ? 0 : blockSize / 2),
            y + blockSize,
          );
        }
      }
      ctx.stroke();
    }

    return canvas;
  }

  static createHieroglyphTexture() {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // Background from Sandstone
    ctx.fillStyle = "#c2b280";
    ctx.fillRect(0, 0, size, size);

    // Noise
    for (let i = 0; i < 5000; i++) {
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
    }

    // Hieroglyphs (Fake)
    ctx.fillStyle = "#5d4037"; // Dark brown
    ctx.font = "bold 40px serif"; // Standard font for simplicity
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const symbols = [
      "𓀀",
      "𓀁",
      "𓀂",
      "𓀃",
      "𓀄",
      "𓀅",
      "𓀆",
      "𓀇",
      "𓀈",
      "𓀉",
      "𓀊",
      "𓀋",
      "𓀌",
      "𓀍",
      "𓀎",
      "𓀏",
    ];

    for (let x = 30; x < size; x += 60) {
      for (let y = 30; y < size; y += 60) {
        if (Math.random() > 0.3) {
          // Use standard ASCII if unicode fails in some envs, but unicode egyptian is cool
          // Let's use simple shapes if we want to be safe, but unicode is fine for modern browsers
          const sym =
            symbols[Math.floor(Math.random() * symbols.length)] || "?";
          ctx.fillText(sym, x, y);
        }
      }
    }

    // Border
    ctx.strokeStyle = "#8b4513";
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, size, size);

    return canvas;
  }

  static createGridTexture() {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // Dark Background
    ctx.fillStyle = "#111"; // Dark gray
    ctx.fillRect(0, 0, size, size);

    // Grid Lines
    ctx.strokeStyle = "#0f0"; // Green for sci-fi
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5;

    const gridSize = 64;

    ctx.beginPath();
    for (let i = 0; i <= size; i += gridSize) {
      // Vertical
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      // Horizontal
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
    }
    ctx.stroke();

    // Add some glow or variation?
    // Maybe thicker primary lines
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.strokeRect(0, 0, size, size);

    return canvas;
  }
  static createPolishedSandstone() {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // Bright Base
    ctx.fillStyle = "#fff8e7"; // White-ish sand
    ctx.fillRect(0, 0, size, size);

    // Soft Noise
    for (let i = 0; i < 20000; i++) {
      ctx.fillStyle = `rgba(200, 180, 140, ${Math.random() * 0.2})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
    }

    // Gold Accents / Hieroglyphs
    ctx.fillStyle = "#d4af37";
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.fillRect(x, y, 10 + Math.random() * 20, 2);
      ctx.fillRect(x + 5, y - 5, 2, 10 + Math.random() * 10);
    }

    return canvas;
  }

  static createMosaicFloor() {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // Base White Marble
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, size, size);

    // Azure & Gold Geometric Pattern
    const tileSize = 64;
    for (let x = 0; x < size; x += tileSize) {
      for (let y = 0; y < size; y += tileSize) {
        // Checkers or Pattern
        const isBlue = (x / tileSize + y / tileSize) % 2 === 0;
        if (isBlue) {
          ctx.fillStyle = "#e0efff"; // Very light blue
          ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

          // Inner Gold Diamond
          ctx.fillStyle = "#d4af37";
          ctx.beginPath();
          ctx.moveTo(x + tileSize / 2, y + 10);
          ctx.lineTo(x + tileSize - 10, y + tileSize / 2);
          ctx.lineTo(x + tileSize / 2, y + tileSize - 10);
          ctx.lineTo(x + 10, y + tileSize / 2);
          ctx.fill();
        } else {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

          // Inner Blue Square
          ctx.fillStyle = "#87ceeb";
          ctx.fillRect(x + 20, y + 20, tileSize - 40, tileSize - 40);
        }
      }
    }

    // Border
    ctx.strokeStyle = "#d4af37"; // Gold loop
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, size, size);

    return canvas;
  }

  static createCloudTexture() {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // Radial Gradient for soft cloud puff
    const grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    grad.addColorStop(0, "rgba(255, 255, 255, 0.8)");
    grad.addColorStop(0.4, "rgba(255, 255, 255, 0.4)");
    grad.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    return canvas;
  }
  static createITZoneLogo() {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // Transparent Background
    ctx.clearRect(0, 0, size, size);

    // Circle Background (Semi-transparent dark blue/grey)
    ctx.fillStyle = "rgba(40, 60, 80, 0.8)";
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2);
    ctx.fill();

    // Inner Glow
    const grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      size / 4,
      size / 2,
      size / 2,
      size / 2 - 10,
    );
    grad.addColorStop(0, "rgba(0, 100, 200, 0.2)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0.5)");
    ctx.fillStyle = grad;
    ctx.fill();

    // Text Settings
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // "IT" - Big Blue/Green
    ctx.font = "bold 180px Arial, sans-serif";
    ctx.fillStyle = "#00bfff"; // Deep Sky Blue
    ctx.shadowColor = "rgba(0, 255, 255, 0.5)";
    ctx.shadowBlur = 20;
    ctx.fillText("IT", size / 2, size / 2 - 60);

    // "ZONE" - Below
    ctx.font = "bold 100px Arial, sans-serif";
    ctx.fillStyle = "#1e90ff"; // Dodger Blue
    ctx.fillText("ZONE", size / 2 - 30, size / 2 + 80);

    // "+" - Green
    ctx.font = "bold 140px Arial, sans-serif";
    ctx.fillStyle = "#00fa9a"; // Medium Spring Green
    ctx.fillText("+", size / 2 + 130, size / 2 + 80);

    // Decorative Elements (Tech lines)
    ctx.strokeStyle = "rgba(0, 255, 255, 0.3)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(size / 2 - 150, size / 2 + 130);
    ctx.lineTo(size / 2 + 150, size / 2 + 130);
    ctx.stroke();

    return canvas;
  }
}
