// engine/rendering/Renderer2D.ts — 2D Canvas renderer
import { Entity } from '../core/Entity';
import { Vec2 } from '../core/Math2D';
import { Transform2D } from '../components/Transform2D';
import { SpriteRenderer } from '../components/SpriteRenderer';
import { Camera2DComponent } from '../components/Camera2DComponent';
import { Collider2D } from '../components/Collider2D';
import { getWorldTransform } from '../core/WorldTransform';

export interface Camera2D {
  position: Vec2;
  zoom: number;
}

export class Renderer2D {
  private ctx: CanvasRenderingContext2D | null = null;
  private _canvas: HTMLCanvasElement | null = null;
  public camera: Camera2D = { position: Vec2.zero(), zoom: 1 };

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

  /** Convert world position to screen position (Y-up: +Y moves objects up on screen) */
  worldToScreen(worldPos: Vec2): Vec2 {
    if (!this._canvas) return worldPos;
    const cx = this._canvas.width / 2;
    const cy = this._canvas.height / 2;
    return new Vec2(
      (worldPos.x - this.camera.position.x) * this.camera.zoom + cx,
      -(worldPos.y - this.camera.position.y) * this.camera.zoom + cy
    );
  }

  /** Convert screen position to world position (Y-up) */
  screenToWorld(screenPos: Vec2): Vec2 {
    if (!this._canvas) return screenPos;
    const cx = this._canvas.width / 2;
    const cy = this._canvas.height / 2;
    return new Vec2(
      (screenPos.x - cx) / this.camera.zoom + this.camera.position.x,
      -(screenPos.y - cy) / this.camera.zoom + this.camera.position.y
    );
  }

  clear(useBackgroundColor: boolean = false): void {
    if (!this.ctx || !this._canvas) return;

    let bgColor = '#1a1a2e';
    let bgImage: HTMLImageElement | null = null;

    if (useBackgroundColor && this.cameraEntity) {
      const cam = this.cameraEntity.getComponent<Camera2DComponent>('Camera2DComponent');
      if (cam) {
        bgColor = cam.backgroundColor;
        bgImage = cam.getBackgroundImage();
      }
    }

    this.ctx.fillStyle = bgColor;
    this.ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);

    if (bgImage) {
      this.ctx.drawImage(bgImage, 0, 0, this._canvas.width, this._canvas.height);
    }
  }

  drawGrid(): void {
    if (!this.ctx || !this._canvas) return;
    const ctx = this.ctx;
    const w = this._canvas.width;
    const h = this._canvas.height;
    const gridSize = 50 * this.camera.zoom;

    const offsetX = (-this.camera.position.x * this.camera.zoom + w / 2) % gridSize;
    const offsetY = (this.camera.position.y * this.camera.zoom + h / 2) % gridSize;

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
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.position.x, this.camera.position.y);

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
    if (!this.ctx || !entity.active) return;

    // Skip rendering the camera entity itself
    if (entity.hasComponent('Camera2DComponent')) return;

    const sprite = entity.getComponent<SpriteRenderer>('SpriteRenderer');
    if (!sprite || !sprite.visible) return;

    const ctx = this.ctx;

    ctx.save();
    this.applyEntityTransform(ctx, entity);

    // Draw shape at origin — the transform already placed us correctly
    const hw = sprite.width / 2;
    const hh = sprite.height / 2;

    const image = sprite.getImage();

    if (sprite.shapeType === 'sprite' && image) {
      ctx.drawImage(image, -hw, -hh, sprite.width, sprite.height);
    } else if (sprite.shapeType === 'circle') {
      ctx.fillStyle = sprite.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, hw, hh, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (sprite.shapeType === 'triangle') {
      ctx.fillStyle = sprite.color;
      ctx.beginPath();
      ctx.moveTo(0, -hh);
      ctx.lineTo(-hw, hh);
      ctx.lineTo(hw, hh);
      ctx.closePath();
      ctx.fill();
    } else if (sprite.shapeType === 'polygon' && sprite.polygonPoints.length >= 3) {
      ctx.fillStyle = sprite.color;
      ctx.beginPath();
      ctx.moveTo(sprite.polygonPoints[0].x, -sprite.polygonPoints[0].y); // Y-flip for screen
      for (let i = 1; i < sprite.polygonPoints.length; i++) {
        ctx.lineTo(sprite.polygonPoints[i].x, -sprite.polygonPoints[i].y);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      // rectangle (default)
      ctx.fillStyle = sprite.color;
      ctx.fillRect(-hw, -hh, sprite.width, sprite.height);
    }

    ctx.restore();
  }

  /** Draw collider hitbox outlines — matches the collision shape */
  renderHitbox(entity: Entity): void {
    if (!this.ctx || !entity.active) return;
    const collider = entity.getComponent<Collider2D>('Collider2D');
    if (!collider || !collider.showHitbox) return;

    const ctx = this.ctx;

    if (collider.shape === 'circle') {
      // Draw circle hitbox in screen space
      const center = this.localToScreen(entity, collider.offset.x, collider.offset.y);
      const world = getWorldTransform(entity);
      const avgScale = (Math.abs(world.scaleX) + Math.abs(world.scaleY)) / 2;
      const screenRadius = collider.radius * avgScale * this.camera.zoom;

      ctx.save();
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(center.x, center.y, screenRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (collider.shape === 'polygon' && collider.points.length >= 3) {
      // Draw polygon hitbox in screen space
      ctx.save();
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      const first = this.localToScreen(entity, collider.points[0].x + collider.offset.x, collider.points[0].y + collider.offset.y);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < collider.points.length; i++) {
        const p = this.localToScreen(entity, collider.points[i].x + collider.offset.x, collider.points[i].y + collider.offset.y);
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    } else {
      // Box hitbox: draw as AABB in screen space (matches physics AABB)
      const aabb = this.getScreenAABB(entity, collider.width / 2, collider.height / 2, collider.offset.x, collider.offset.y);
      ctx.save();
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.strokeRect(aabb.minX, aabb.minY, aabb.maxX - aabb.minX, aabb.maxY - aabb.minY);
      ctx.restore();
    }
  }

  /**
   * Draw selection box as an axis-aligned bounding box in screen space.
   * This ensures the selection box never appears rotated/stretched — it's always
   * an upright rectangle on screen, wrapping the transformed entity.
   */
  drawSelectionBox(entity: Entity): void {
    if (!this.ctx) return;

    // Skip camera entity
    if (entity.hasComponent('Camera2DComponent')) return;

    const sprite = entity.getComponent<SpriteRenderer>('SpriteRenderer');
    const w = sprite ? sprite.width : 50;
    const h = sprite ? sprite.height : 50;
    const hw = w / 2;
    const hh = h / 2;

    // Get screen-space AABB of the entity's bounding box
    const aabb = this.getScreenAABB(entity, hw, hh);

    const padding = 4;
    const x = aabb.minX - padding;
    const y = aabb.minY - padding;
    const bw = (aabb.maxX - aabb.minX) + padding * 2;
    const bh = (aabb.maxY - aabb.minY) + padding * 2;

    const ctx = this.ctx;
    ctx.save();

    // Draw dashed selection rectangle
    ctx.strokeStyle = '#4a9eff';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(x, y, bw, bh);
    ctx.setLineDash([]);

    // Draw corner handles
    const handleSize = 6;
    ctx.fillStyle = '#4a9eff';
    const corners = [
      [x, y],
      [x + bw, y],
      [x, y + bh],
      [x + bw, y + bh],
    ];
    for (const [cx, cy] of corners) {
      ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
    }

    ctx.restore();
  }

  renderEntities(entities: Entity[], selectedId: string | null): void {
    // Sort by layer
    const sorted = [...entities].sort((a, b) => {
      const sa = a.getComponent<SpriteRenderer>('SpriteRenderer');
      const sb = b.getComponent<SpriteRenderer>('SpriteRenderer');
      return (sa?.layer ?? 0) - (sb?.layer ?? 0);
    });

    for (const entity of sorted) {
      this.renderEntity(entity);
    }

    // Render hitboxes on top
    for (const entity of sorted) {
      this.renderHitbox(entity);
    }

    // Draw selection on top
    if (selectedId) {
      const selected = entities.find(e => e.id === selectedId);
      if (selected) {
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
