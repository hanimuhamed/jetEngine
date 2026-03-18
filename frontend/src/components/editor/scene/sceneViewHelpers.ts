// components/editor/sceneViewHelpers.ts — Extracted helpers for SceneView
import { Vec2 } from '../../../engine/core/Math2D';
import { getWorldTransform } from '../../../engine/core/WorldTransform';
import { Transform2D } from '../../../engine/components/Transform2D';
import { Camera2DComponent } from '../../../engine/components/Camera2DComponent';
import { SpriteRenderer } from '../../../engine/components/SpriteRenderer';
import type { Entity } from '../../../engine/core/Entity';
import type { Renderer2D } from '../../../engine/rendering/Renderer2D';

/** Recursively flatten entities (including children) */
export function flattenEntities(entities: Entity[]): Entity[] {
  const result: Entity[] = [];
  for (const entity of entities) {
    result.push(entity);
    if (entity.children.length > 0) {
      result.push(...flattenEntities(entity.children));
    }
  }
  return result;
}

/** Convert entity-local coordinates to world */
export function worldFromLocal(entity: Entity, lx: number, ly: number): Vec2 {
  const world = getWorldTransform(entity);
  const rad = (world.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const sx = lx * world.scaleX;
  const sy = ly * world.scaleY;
  return new Vec2(
    world.position.x + sx * cos - sy * sin,
    world.position.y + sx * sin + sy * cos
  );
}

/** Get selection box corners in screen space for an entity */
export function getSelectionCorners(
  entity: Entity,
  renderer: Renderer2D,
): { tl: Vec2; tr: Vec2; bl: Vec2; br: Vec2 } {
  const sprite = entity.getComponent<SpriteRenderer>('SpriteRenderer');
  const w = sprite ? sprite.width : 50;
  const h = sprite ? sprite.height : 50;
  const hw = w / 2;
  const hh = h / 2;

  return {
    tl: renderer.worldToScreen(worldFromLocal(entity, -hw, hh)),
    tr: renderer.worldToScreen(worldFromLocal(entity, hw, hh)),
    bl: renderer.worldToScreen(worldFromLocal(entity, -hw, -hh)),
    br: renderer.worldToScreen(worldFromLocal(entity, hw, -hh)),
  };
}

/** Check if screen point is near a corner handle (returns corner key or null) */
export function hitTestCorner(
  sx: number,
  sy: number,
  corners: { tl: Vec2; tr: Vec2; bl: Vec2; br: Vec2 },
): 'tl' | 'tr' | 'bl' | 'br' | null {
  const threshold = 8;
  for (const key of ['tl', 'tr', 'bl', 'br'] as const) {
    const c = corners[key];
    if (Math.abs(sx - c.x) <= threshold && Math.abs(sy - c.y) <= threshold) {
      return key;
    }
  }
  return null;
}

/** Render a white rectangle outline showing the camera's viewport in world space */
export function renderCameraOutline(r: Renderer2D, camEntity: Entity, aspectRatio: number | null): void {
  const canvas = r.canvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const cam = camEntity.getComponent<Camera2DComponent>('Camera2DComponent');
  const t = camEntity.getComponent<Transform2D>('Transform2D');
  if (!cam || !t) return;

  // Use the current canvas dimensions as the reference viewport,
  // then apply the aspect ratio to determine the camera outline shape.
  const canvasW = canvas.width;
  const canvasH = canvas.height;

  let refW: number;
  let refH: number;
  if (aspectRatio) {
    // Use canvas height as reference and compute width from aspect ratio
    // This shows the exact viewport that will be visible during gameplay
    if (canvasW / canvasH > aspectRatio) {
      refH = canvasH;
      refW = canvasH * aspectRatio;
    } else {
      refW = canvasW;
      refH = canvasW / aspectRatio;
    }
  } else {
    refW = canvasW;
    refH = canvasH;
  }

  const vw = refW / cam.zoom / r.editorCamera.zoom;
  const vh = refH / cam.zoom / r.editorCamera.zoom;

  const cx = t.position.x;
  const cy = t.position.y;
  const corners = [
    new Vec2(cx - vw / 2, cy + vh / 2),
    new Vec2(cx + vw / 2, cy + vh / 2),
    new Vec2(cx + vw / 2, cy - vh / 2),
    new Vec2(cx - vw / 2, cy - vh / 2),
  ];

  const screenCorners = corners.map(c => r.worldToScreen(c));

  ctx.save();
  ctx.strokeStyle = '#ffffff40';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(screenCorners[0].x, screenCorners[0].y);
  for (let i = 1; i < 4; i++) ctx.lineTo(screenCorners[i].x, screenCorners[i].y);
  ctx.closePath();
  ctx.stroke();

  ctx.fillStyle = '#ffffff88';
  ctx.font = '11px monospace';
  ctx.setLineDash([]);
  ctx.fillText('Camera', screenCorners[0].x + 4, screenCorners[0].y - 6);
  ctx.restore();
}

/** Aspect ratio presets */
export const ASPECT_RATIOS: { label: string; value: number | null | 'custom' }[] = [
  { label: 'Free', value: null },
  { label: '16:9', value: 16 / 9 },
  { label: '4:3', value: 4 / 3 },
  { label: '1:1', value: 1 },
  { label: '21:9', value: 21 / 9 },
  { label: '9:16', value: 9 / 16 },
  { label: 'Custom', value: 'custom' },
];
