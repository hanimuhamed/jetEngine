// engine/rendering/Renderer2D.ts — 2D Canvas renderer
import { Entity } from '../core/Entity';
import { Vec2 } from '../core/Math2D';
import { Transform2D } from '../components/Transform2D';
import { SpriteRenderer } from '../components/SpriteRenderer';
import { Camera2DComponent } from '../components/Camera2DComponent';
import { TextComponent } from '../components/TextComponent';
import { getWorldTransform } from '../core/WorldTransform';
import { drawSprite, drawText, drawSelectionBox as drawSelectionBoxHelper, drawHitbox } from './renderHelpers';

export interface Camera2D {
  position: Vec2;
  zoom: number;
}

export class Renderer2D {
  private ctx: CanvasRenderingContext2D | null = null;
  private _canvas: HTMLCanvasElement | null = null;

  /** Game camera — driven by Camera2DComponent entity during play */
  public camera: Camera2D = { position: Vec2.zero(), zoom: 1 };

  /** Editor camera — independent camera for scene editing view */
  public editorCamera: Camera2D = { position: Vec2.zero(), zoom: 0.8 };

  /** Which camera is currently active for transforms (switched by render mode) */
  private activeCamera: Camera2D = this.editorCamera;

  /** The camera entity reference — set by game loop or editor */
  public cameraEntity: Entity | null = null;

  attach(canvas: HTMLCanvasElement): void {
    this._canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  get canvas(): HTMLCanvasElement | null {
    return this._canvas;
  }

  /** Sync renderer camera position/zoom from the Camera entity's Transform2D and Camera2DComponent */
  syncCameraFromEntity(): void {
    if (!this.cameraEntity) return;
    const t = this.cameraEntity.getComponent<Transform2D>('Transform2D');
    if (t) {
      this.camera.position = t.position.clone();
    }
    const cam = this.cameraEntity.getComponent<Camera2DComponent>('Camera2DComponent');
    if (cam) {
      this.camera.zoom = cam.zoom;
    }
  }

  /** Switch active camera to editor or game camera */
  useEditorCamera(): void { this.activeCamera = this.editorCamera; }
  useGameCamera(): void { this.activeCamera = this.camera; }

  /** Convert world position to screen position (Y-up: +Y moves objects up on screen) */
  worldToScreen(worldPos: Vec2): Vec2 {
    if (!this._canvas) return worldPos;
    const cam = this.activeCamera;
    const cx = this._canvas.width / 2;
    const cy = this._canvas.height / 2;
    return new Vec2(
      (worldPos.x - cam.position.x) * cam.zoom + cx,
      -(worldPos.y - cam.position.y) * cam.zoom + cy
    );
  }

  /** Convert screen position to world position (Y-up) */
  screenToWorld(screenPos: Vec2): Vec2 {
    if (!this._canvas) return screenPos;
    const cam = this.activeCamera;
    const cx = this._canvas.width / 2;
    const cy = this._canvas.height / 2;
    return new Vec2(
      (screenPos.x - cx) / cam.zoom + cam.position.x,
      -(screenPos.y - cy) / cam.zoom + cam.position.y
    );
  }

  clear(useBackgroundColor: boolean = false): void {
    if (!this.ctx || !this._canvas) return;

    let bgColor = "#191c20";
    if (useBackgroundColor && this.cameraEntity) {
      const cam = this.cameraEntity.getComponent<Camera2DComponent>('Camera2DComponent');
      if (cam) {
        bgColor = cam.backgroundColor;
      }
    }

    this.ctx.fillStyle = bgColor;
    this.ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);
  }

  drawGrid(): void {
    if (!this.ctx || !this._canvas) return;
    const ctx = this.ctx;
    const w = this._canvas.width;
    const h = this._canvas.height;
    const gridSize = 50 * this.activeCamera.zoom;

    const offsetX = (-this.activeCamera.position.x * this.activeCamera.zoom + w / 2) % gridSize;
    const offsetY = (this.activeCamera.position.y * this.activeCamera.zoom + h / 2) % gridSize;

    ctx.strokeStyle = '#ffffff10';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = offsetX; x < w; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = offsetY; y < h; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
  }

  /** Expose getWorldTransform for external use (hit test, etc.) */
  getWorldTransform(entity: Entity) {
    return getWorldTransform(entity);
  }

  private isEntityActiveInHierarchy(entity: Entity): boolean {
    let current: Entity | null = entity;
    while (current) {
      if (!current.active) return false;
      current = current.parent;
    }
    return true;
  }

  /**
   * Build the full canvas transform for an entity:
   * camera transform → parent hierarchy → local TRS
   * This properly cascades rotation and scale so children deform correctly.
   */
  private applyEntityTransform(ctx: CanvasRenderingContext2D, entity: Entity): void {
    if (!this._canvas) return;

    const cx = this._canvas.width / 2;
    const cy = this._canvas.height / 2;

    // Start with identity, then apply camera transform
    ctx.translate(cx, cy);
    ctx.scale(this.activeCamera.zoom, this.activeCamera.zoom);
    ctx.translate(-this.activeCamera.position.x, this.activeCamera.position.y);

    // Walk the hierarchy from root to this entity and multiply local TRS
    const chain: Entity[] = [];
    let cur: Entity | null = entity;
    while (cur) {
      chain.unshift(cur);
      cur = cur.parent;
    }

    for (const e of chain) {
      const t = e.getComponent<Transform2D>('Transform2D');
      if (!t) continue;
      ctx.translate(t.position.x, -t.position.y);
      ctx.rotate((-t.rotation * Math.PI) / 180);
      ctx.scale(t.scale.x, t.scale.y);
    }
  }

  /**
   * Transform a local-space point through the entity's full world transform
   * to screen space (for AABB computations done after transform).
   */
  private localToScreen(entity: Entity, localX: number, localY: number): Vec2 {
    const world = getWorldTransform(entity);
    const rad = (world.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // Apply world scale, rotation, then translation (Y-up)
    const sx = localX * world.scaleX;
    const sy = localY * world.scaleY;
    const worldX = world.position.x + sx * cos - sy * sin;
    const worldY = world.position.y + sx * sin + sy * cos;

    return this.worldToScreen(new Vec2(worldX, worldY));
  }

  /**
   * Get the screen-space AABB of an entity's local rectangle.
   * Computes the four corners in screen space and returns the bounding box.
   */
  private getScreenAABB(entity: Entity, hw: number, hh: number, offsetX = 0, offsetY = 0): { minX: number; minY: number; maxX: number; maxY: number } {
    const corners = [
      this.localToScreen(entity, -hw + offsetX, -hh + offsetY),
      this.localToScreen(entity, hw + offsetX, -hh + offsetY),
      this.localToScreen(entity, hw + offsetX, hh + offsetY),
      this.localToScreen(entity, -hw + offsetX, hh + offsetY),
    ];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const c of corners) {
      if (c.x < minX) minX = c.x;
      if (c.y < minY) minY = c.y;
      if (c.x > maxX) maxX = c.x;
      if (c.y > maxY) maxY = c.y;
    }
    return { minX, minY, maxX, maxY };
  }

  renderEntity(entity: Entity): void {
    if (!this.ctx || !this.isEntityActiveInHierarchy(entity)) return;
    if (entity.hasComponent('Camera2DComponent')) return;

    const sprite = entity.getComponent<SpriteRenderer>('SpriteRenderer');
    const textComp = entity.getComponent<TextComponent>('TextComponent');
    if (!sprite && !textComp) return;
    // Skip if all renderable components are disabled
    const spriteActive = sprite && sprite.enabled;
    const textActive = textComp && textComp.enabled;
    if (!spriteActive && !textActive) return;
    if (sprite && !sprite.visible && !textActive) return;

    const ctx = this.ctx;
    ctx.save();
    this.applyEntityTransform(ctx, entity);

    if (spriteActive && (sprite.flipX || sprite.flipY)) {
      ctx.scale(sprite.flipX ? -1 : 1, sprite.flipY ? -1 : 1);
    }

    if (spriteActive && sprite.visible) drawSprite(ctx, sprite);
    if (textActive) drawText(ctx, textComp);

    ctx.restore();
  }

  /** Draw collider hitbox outlines — delegates to renderHelpers */
  renderHitbox(entity: Entity): void {
    if (!this.ctx) return;
    if (!this.isEntityActiveInHierarchy(entity)) return;
    drawHitbox(this.ctx, entity, this.localToScreen.bind(this), this.activeCamera.zoom);
  }

  /** Draw selection box as a rotated rectangle with corner handles */
  drawSelectionBox(entity: Entity): void {
    if (!this.ctx) return;
    drawSelectionBoxHelper(this.ctx, entity, this.localToScreen.bind(this));
  }

  renderEntities(entities: Entity[], selectedId: string | null, isEditorMode: boolean = true): void {
    // Sort by layer (check both SpriteRenderer and TextComponent layer)
    const sorted = [...entities].sort((a, b) => {
      const sa = a.getComponent<SpriteRenderer>('SpriteRenderer');
      const ta = a.getComponent<TextComponent>('TextComponent');
      const sb = b.getComponent<SpriteRenderer>('SpriteRenderer');
      const tb = b.getComponent<TextComponent>('TextComponent');
      const layerA = sa?.layer ?? ta?.layer ?? 0;
      const layerB = sb?.layer ?? tb?.layer ?? 0;
      return layerA - layerB;
    });

    for (const entity of sorted) {
      this.renderEntity(entity);
    }

    // Render hitboxes only in editor mode
    if (isEditorMode) {
      for (const entity of sorted) {
        this.renderHitbox(entity);
      }
    }

    // Draw selection on top (editor only)
    if (isEditorMode && selectedId) {
      const selected = entities.find(e => e.id === selectedId);
      if (selected && this.isEntityActiveInHierarchy(selected)) {
        this.drawSelectionBox(selected);
      }
    }
  }

  /** Check if a screen-space point hits an entity (excludes camera entity) */
  hitTest(entities: Entity[], screenX: number, screenY: number): Entity | null {
    // Reverse order so topmost (highest layer) is checked first
    const sorted = [...entities].sort((a, b) => {
      const sa = a.getComponent<SpriteRenderer>('SpriteRenderer');
      const sb = b.getComponent<SpriteRenderer>('SpriteRenderer');
      return (sb?.layer ?? 0) - (sa?.layer ?? 0);
    });

    for (const entity of sorted) {
      if (!this.isEntityActiveInHierarchy(entity)) continue;
      // Skip camera entity
      if (entity.hasComponent('Camera2DComponent')) continue;

      const sprite = entity.getComponent<SpriteRenderer>('SpriteRenderer');
      if (!sprite) continue;

      const hw = sprite.width / 2;
      const hh = sprite.height / 2;

      // Use screen-space AABB for hit testing (always works correctly with rotation/scale)
      const aabb = this.getScreenAABB(entity, hw, hh);

      if (
        screenX >= aabb.minX &&
        screenX <= aabb.maxX &&
        screenY >= aabb.minY &&
        screenY <= aabb.maxY
      ) {
        return entity;
      }
    }
    return null;
  }
}
