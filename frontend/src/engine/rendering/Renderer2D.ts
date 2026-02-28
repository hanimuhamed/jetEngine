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

  /** The camera entity reference — set by game loop */
  public cameraEntity: Entity | null = null;

  attach(canvas: HTMLCanvasElement): void {
    this._canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  get canvas(): HTMLCanvasElement | null {
    return this._canvas;
  }

  /** Convert world position to screen position */
  worldToScreen(worldPos: Vec2): Vec2 {
    if (!this._canvas) return worldPos;
    const cx = this._canvas.width / 2;
    const cy = this._canvas.height / 2;
    return new Vec2(
      (worldPos.x - this.camera.position.x) * this.camera.zoom + cx,
      (worldPos.y - this.camera.position.y) * this.camera.zoom + cy
    );
  }

  /** Convert screen position to world position */
  screenToWorld(screenPos: Vec2): Vec2 {
    if (!this._canvas) return screenPos;
    const cx = this._canvas.width / 2;
    const cy = this._canvas.height / 2;
    return new Vec2(
      (screenPos.x - cx) / this.camera.zoom + this.camera.position.x,
      (screenPos.y - cy) / this.camera.zoom + this.camera.position.y
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
    const offsetY = (-this.camera.position.y * this.camera.zoom + h / 2) % gridSize;

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

    // Draw axis lines
    const origin = this.worldToScreen(Vec2.zero());
    ctx.strokeStyle = '#ff444488';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(origin.x, 0);
    ctx.lineTo(origin.x, h);
    ctx.stroke();

    ctx.strokeStyle = '#44ff4488';
    ctx.beginPath();
    ctx.moveTo(0, origin.y);
    ctx.lineTo(w, origin.y);
    ctx.stroke();
  }

  renderEntity(entity: Entity): void {
    if (!this.ctx || !entity.active) return;

    const transform = entity.getComponent<Transform2D>('Transform2D');
    const sprite = entity.getComponent<SpriteRenderer>('SpriteRenderer');

    if (!transform || !sprite || !sprite.visible) return;

    const ctx = this.ctx;
    const screenPos = this.worldToScreen(transform.position);
    const w = sprite.width * transform.scale.x * this.camera.zoom;
    const h = sprite.height * transform.scale.y * this.camera.zoom;

    ctx.save();
    ctx.translate(screenPos.x, screenPos.y);
    ctx.rotate((transform.rotation * Math.PI) / 180);

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

    const transform = entity.getComponent<Transform2D>('Transform2D');
    const sprite = entity.getComponent<SpriteRenderer>('SpriteRenderer');

    if (!transform) return;

    const screenPos = this.worldToScreen(transform.position);
    const w = (sprite ? sprite.width : 50) * transform.scale.x * this.camera.zoom;
    const h = (sprite ? sprite.height : 50) * transform.scale.y * this.camera.zoom;

    const ctx = this.ctx;
    ctx.save();
    ctx.translate(screenPos.x, screenPos.y);
    ctx.rotate((transform.rotation * Math.PI) / 180);

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

  /** Check if a screen-space point hits an entity */
  hitTest(entities: Entity[], screenX: number, screenY: number): Entity | null {
    // Reverse order so topmost (highest layer) is checked first
    const sorted = [...entities].sort((a, b) => {
      const sa = a.getComponent<SpriteRenderer>('SpriteRenderer');
      const sb = b.getComponent<SpriteRenderer>('SpriteRenderer');
      return (sb?.layer ?? 0) - (sa?.layer ?? 0);
    });

    for (const entity of sorted) {
      const transform = entity.getComponent<Transform2D>('Transform2D');
      const sprite = entity.getComponent<SpriteRenderer>('SpriteRenderer');
      if (!transform) continue;

      const screenPos = this.worldToScreen(transform.position);
      const w = (sprite ? sprite.width : 50) * transform.scale.x * this.camera.zoom;
      const h = (sprite ? sprite.height : 50) * transform.scale.y * this.camera.zoom;

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
