// engine/rendering/Renderer2D.ts — 2D Canvas renderer
import { Entity } from '../core/Entity';
import { Vec2 } from '../core/Math2D';
import { Transform2D } from '../components/Transform2D';
import { SpriteRenderer } from '../components/SpriteRenderer';
import { Camera2DComponent } from '../components/Camera2DComponent';

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

    // Determine background color
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

  /** Compute world transform for an entity, taking parent hierarchy into account */
  getWorldTransform(entity: Entity): { position: Vec2; rotation: number; scaleX: number; scaleY: number } {
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
    const pw = this.getWorldTransform(entity.parent);

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

  renderEntity(entity: Entity): void {
    if (!this.ctx || !entity.active) return;

    // Skip rendering the camera entity itself
    if (entity.hasComponent('Camera2DComponent')) return;

    const sprite = entity.getComponent<SpriteRenderer>('SpriteRenderer');
    if (!sprite || !sprite.visible) return;

    const world = this.getWorldTransform(entity);

    const ctx = this.ctx;
    const screenPos = this.worldToScreen(world.position);
    const w = sprite.width * world.scaleX * this.camera.zoom;
    const h = sprite.height * world.scaleY * this.camera.zoom;

    ctx.save();
    ctx.translate(screenPos.x, screenPos.y);
    ctx.rotate((world.rotation * Math.PI) / 180);

    const image = sprite.getImage();

    if (sprite.shapeType === 'sprite' && image) {
      ctx.drawImage(image, -w / 2, -h / 2, w, h);
    } else if (sprite.shapeType === 'circle') {
      ctx.fillStyle = sprite.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (sprite.shapeType === 'triangle') {
      ctx.fillStyle = sprite.color;
      ctx.beginPath();
      ctx.moveTo(0, -h / 2);
      ctx.lineTo(-w / 2, h / 2);
      ctx.lineTo(w / 2, h / 2);
      ctx.closePath();
      ctx.fill();
    } else {
      // rectangle (default)
      ctx.fillStyle = sprite.color;
      ctx.fillRect(-w / 2, -h / 2, w, h);
    }

    ctx.restore();
  }

  drawSelectionBox(entity: Entity): void {
    if (!this.ctx) return;

    // Skip camera entity
    if (entity.hasComponent('Camera2DComponent')) return;

    const sprite = entity.getComponent<SpriteRenderer>('SpriteRenderer');
    const world = this.getWorldTransform(entity);

    const screenPos = this.worldToScreen(world.position);
    const w = (sprite ? sprite.width : 50) * world.scaleX * this.camera.zoom;
    const h = (sprite ? sprite.height : 50) * world.scaleY * this.camera.zoom;

    const ctx = this.ctx;
    ctx.save();
    ctx.translate(screenPos.x, screenPos.y);
    ctx.rotate((world.rotation * Math.PI) / 180);

    ctx.strokeStyle = '#4a9eff';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8);
    ctx.setLineDash([]);

    // Draw corner handles
    const handleSize = 6;
    ctx.fillStyle = '#4a9eff';
    const corners = [
      [-w / 2 - 4, -h / 2 - 4],
      [w / 2 + 4, -h / 2 - 4],
      [-w / 2 - 4, h / 2 + 4],
      [w / 2 + 4, h / 2 + 4],
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

      const world = this.getWorldTransform(entity);
      const screenPos = this.worldToScreen(world.position);
      const w = sprite.width * world.scaleX * this.camera.zoom;
      const h = sprite.height * world.scaleY * this.camera.zoom;

      if (
        screenX >= screenPos.x - w / 2 &&
        screenX <= screenPos.x + w / 2 &&
        screenY >= screenPos.y - h / 2 &&
        screenY <= screenPos.y + h / 2
      ) {
        return entity;
      }
    }
    return null;
  }
}
