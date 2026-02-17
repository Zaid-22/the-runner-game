import * as THREE from "three";
import { ArachnidModel } from "./ArachnidModel.js";
import { TitanModel } from "./TitanModel.js";
import { ObsidianTitanModel } from "./ObsidianTitanModel.js";
import { VoidReaperBossModel } from "./VoidReaperBossModel.js";
import { NightfangBossModel } from "./NightfangBossModel.js";
import { RiftJudicatorBossModel } from "./RiftJudicatorBossModel.js";
import { EclipseWardenBossModel } from "./EclipseWardenBossModel.js";
import { SpecterModel } from "./SpecterModel.js";
import { HarpyModel } from "./HarpyModel.js";
import { KamikazeModel } from "./KamikazeModel.js";
import { BossModel } from "./BossModel.js";

/**
 * MonsterFactory
 * Central factory for creating enemy meshes using specialized model classes.
 * Delegates to ArachnidModel, TitanModel, etc.
 */
export class MonsterFactory {
  static applyVariant(mesh, {
    scale = 1,
    color = null,
    emissive = null,
    emissiveBoost = 0.0,
  } = {}) {
    if (!mesh) return mesh;
    if (scale !== 1) mesh.scale.multiplyScalar(scale);

    if (!color && !emissive) return mesh;

    const tint = color ? new THREE.Color(color) : null;
    const emissiveTint = emissive ? new THREE.Color(emissive) : null;
    mesh.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const mats = Array.isArray(child.material)
        ? child.material
        : [child.material];
      mats.forEach((mat) => {
        if (tint && mat.color) {
          mat.color.lerp(tint, 0.45);
        }
        if (emissiveTint && mat.emissive) {
          mat.emissive.lerp(emissiveTint, 0.65);
          mat.emissiveIntensity = Math.max(
            mat.emissiveIntensity || 0,
            emissiveBoost,
          );
        }
      });
    });
    return mesh;
  }

  static create(type, isBoss = false) {
    let mesh = null;

    try {
      // BOSS LOGIC:
      // If it's a "Boss Titan" (type=titan, isBoss=true), we want a HUGE TITAN, not the Warlord.
      // If it's the generic "Boss Warlord" (maybe type='boss' or type='warlord'), we use BossModel.

      if (isBoss && type === "boss_warlord") {
        mesh = BossModel.createMesh();
      } else {
        // Specific types (even if boss) use their own model with scaling handled inside
        switch (type) {
          case "arachnid":
            mesh = ArachnidModel.createMesh();
            break;
          case "titan":
            mesh = isBoss
              ? ObsidianTitanModel.createMesh()
              : TitanModel.createMesh(false);
            break;
          case "void_reaper":
            mesh = isBoss
              ? VoidReaperBossModel.createMesh()
              : SpecterModel.createMesh();
            break;
          case "nightfang":
            mesh = isBoss
              ? NightfangBossModel.createMesh()
              : MonsterFactory.applyVariant(ArachnidModel.createMesh(), {
                scale: 1.02,
                color: 0x13181e,
                emissive: 0x5ccfff,
                emissiveBoost: 0.42,
              });
            break;
          case "rift_judicator":
            mesh = isBoss
              ? RiftJudicatorBossModel.createMesh()
              : MonsterFactory.applyVariant(SpecterModel.createMesh(), {
                scale: 0.98,
                color: 0x1a2534,
                emissive: 0x67d7ff,
                emissiveBoost: 0.52,
              });
            break;
          case "eclipse_warden":
            mesh = isBoss
              ? EclipseWardenBossModel.createMesh()
              : MonsterFactory.applyVariant(HarpyModel.createMesh(), {
                scale: 1.0,
                color: 0x15202e,
                emissive: 0x73deff,
                emissiveBoost: 0.5,
              });
            break;
          case "brute":
            mesh = MonsterFactory.applyVariant(TitanModel.createMesh(false), {
              scale: 1.08,
              color: 0x7f6a58,
              emissive: 0xff6d33,
              emissiveBoost: 0.5,
            });
            break;
          case "specter":
            mesh = SpecterModel.createMesh();
            break;
          case "stalker":
            mesh = MonsterFactory.applyVariant(ArachnidModel.createMesh(), {
              scale: 0.95,
              color: 0x3f0f0f,
              emissive: 0xff0044,
              emissiveBoost: 0.55,
            });
            break;
          case "harpy":
            mesh = HarpyModel.createMesh();
            break;
          case "sentinel":
            mesh = MonsterFactory.applyVariant(HarpyModel.createMesh(), {
              scale: 1.18,
              color: 0x355d6d,
              emissive: 0x4ee7ff,
              emissiveBoost: 0.7,
            });
            break;
          case "kamikaze":
            mesh = KamikazeModel.createMesh();
            break;
          default:
            console.warn(
              `MonsterFactory: Unknown enemy type '${type}', defaulting to Arachnid.`,
            );
            mesh = ArachnidModel.createMesh();
            break;
        }
      }

      // Metadata
      if (mesh) {
        mesh.userData.type = type;
        mesh.userData.isBoss = isBoss;
      }
    } catch (e) {
      console.error("MonsterFactory: Error creating mesh for", type, e);
    }

    // Safety Fallback
    if (!mesh) {
      console.error(
        "MonsterFactory: Failed to create mesh, using fallback box.",
      );
      const group = new THREE.Group();
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true }),
      );
      group.add(box);
      return group;
    }

    return mesh;
  }
}
