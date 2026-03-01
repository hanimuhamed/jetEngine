// engine/core/WorldTransform.ts — Shared world transform calculator
import { Entity } from './Entity';
import { Vec2 } from './Math2D';
import { Transform2D } from '../components/Transform2D';

export interface WorldTransformResult {
  position: Vec2;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

/**
 * Compute the world-space transform for an entity, walking up the parent hierarchy.
 * Returns world position, rotation, and scale (TRS multiplication).
 */
export function getWorldTransform(entity: Entity): WorldTransformResult {
  const t = entity.getComponent<Transform2D>('Transform2D');
  if (!t) return { position: Vec2.zero(), rotation: 0, scaleX: 1, scaleY: 1 };

  const localX = t.position.x;
  const localY = t.position.y;
  const localRot = t.rotation;
  const localScaleX = t.scale.x;
  const localScaleY = t.scale.y;

  if (!entity.parent) {
    return { position: new Vec2(localX, localY), rotation: localRot, scaleX: localScaleX, scaleY: localScaleY };
  }

  // Recursively get parent world transform
  const pw = getWorldTransform(entity.parent);

  // Apply parent scale, then parent rotation, then parent translation
  const rad = (pw.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Scale the local position by parent scale, then rotate by parent rotation
  const scaledX = localX * pw.scaleX;
  const scaledY = localY * pw.scaleY;
  const worldX = pw.position.x + scaledX * cos - scaledY * sin;
  const worldY = pw.position.y + scaledX * sin + scaledY * cos;

  return {
    position: new Vec2(worldX, worldY),
    rotation: pw.rotation + localRot,
    scaleX: pw.scaleX * localScaleX,
    scaleY: pw.scaleY * localScaleY,
  };
}
