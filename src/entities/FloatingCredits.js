import * as THREE from "three";
import { TextureGenerator } from "../utils/TextureGenerator.js";

export class FloatingCredits {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Position high up and far away
    this.group.position.set(0, 40, -80);
    this.group.rotation.y = 0; // Face the arena center

    this.initLogo();
    this.initCodeSnippets();

    this.time = 0;
  }

  initLogo() {
    const canvas = TextureGenerator.createITZoneLogo();
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter; // Sharp details

    // Logo Mesh
    const geometry = new THREE.PlaneGeometry(30, 30);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false, // Don't block other transparent things
    });

    this.logoMesh = new THREE.Mesh(geometry, material);
    this.group.add(this.logoMesh);

    // Add a subtle point light - REMOVED for performance
    // const light = new THREE.PointLight(0x00bfff, 2, 100);
    // light.position.set(0, 0, 5);
    // this.group.add(light);
  }

  initCodeSnippets() {
    this.snippets = [];
    const codeLines = [
      "class Game extends Application {",
      "  init() { this.start(); }",
      "  update(dt) { this.physics.step(dt); }",
      "  render() { this.renderer.draw(); }",
      "}",
      "const player = new Player();",
      "if (enemy.health <= 0) die();",
      "// Developed by ITZone",
      "while(alive) { fight(); }",
      "import { THREE } from 'three';",
    ];

    const fontCanvas = document.createElement("canvas");
    const ctx = fontCanvas.getContext("2d");
    fontCanvas.width = 1024;
    fontCanvas.height = 1024;
    ctx.font = "bold 40px monospace";
    ctx.fillStyle = "#00ff00";
    ctx.textAlign = "center";

    // Create individual meshes for random lines
    // We can't easily atlas this dynamically without complex UVs,
    // so let's just create individual text textures for simplicity
    // or draw them all on one big transparent cylinder.

    // Let's create floating text sprites
    codeLines.forEach((line, i) => {
      const textCanvas = document.createElement("canvas");
      textCanvas.width = 512;
      textCanvas.height = 64;
      const tCtx = textCanvas.getContext("2d");
      tCtx.font = "bold 32px monospace";
      tCtx.fillStyle = "rgba(0, 255, 0, 0.8)"; // Hacker green
      tCtx.textAlign = "center";
      tCtx.textBaseline = "middle";
      tCtx.fillText(line, 256, 32);

      const tex = new THREE.CanvasTexture(textCanvas);
      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: 0.8,
      });
      const sprite = new THREE.Sprite(mat);

      // Random position around the logo
      const angle = (i / codeLines.length) * Math.PI * 2;
      const radius = 25 + Math.random() * 5;

      sprite.position.set(
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * 30,
        Math.sin(angle) * radius,
      );

      // Sprites are 2D, so scale them to aspect ratio
      sprite.scale.set(24, 3, 1);

      sprite.userData = {
        angle: angle,
        radius: radius,
        speed: 0.2 + Math.random() * 0.3,
        yOffset: sprite.position.y,
      };

      this.group.add(sprite);
      this.snippets.push(sprite);
    });
  }

  update(dt) {
    this.time += dt;

    // Bob the entire group slightly
    this.group.position.y = 40 + Math.sin(this.time * 0.5) * 2;

    // Rotate the group slowly
    // this.group.rotation.y = Math.sin(this.time * 0.2) * 0.1;

    // Pulse the Logo opacity or scale
    const pulse = 1 + Math.sin(this.time * 2) * 0.02;
    this.logoMesh.scale.set(pulse, pulse, 1);

    // Animate Code Snippets (Orbit)
    this.snippets.forEach((sprite) => {
      sprite.userData.angle += sprite.userData.speed * dt * 0.5;

      sprite.position.x =
        Math.cos(sprite.userData.angle) * sprite.userData.radius;
      sprite.position.z =
        Math.sin(sprite.userData.angle) * sprite.userData.radius;
      // Bob up and down individual lines
      sprite.position.y =
        sprite.userData.yOffset +
        Math.sin(this.time * 2 + sprite.userData.angle) * 2;
    });
  }
}
