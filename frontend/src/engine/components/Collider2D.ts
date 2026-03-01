// engine/components/Collider2D.ts
import { Component } from '../core/Component';
import { Vec2 } from '../core/Math2D';

export type ColliderShape = 'box' | 'circle' | 'polygon';

export class Collider2D extends Component {
  public width: number;
  public height: number;
  public offset: Vec2;
  public isTrigger: boolean;
  public showHitbox: boolean;
  public shape: ColliderShape;
  /** Radius for circle colliders (defaults to half of width) */
  public radius: number;
  /** Polygon points (local space, relative to entity origin) */
  public points: Vec2[];

  constructor(width: number = 50, height: number = 50) {
    super('Collider2D');
    this.width = width;
    this.height = height;
    this.offset = Vec2.zero();
    this.isTrigger = false;
    this.showHitbox = false;
    this.shape = 'box';
    this.radius = 25;
    this.points = [];
  }

  /**
   * For polygon collider: compute the smallest axis-aligned bounding box
   * containing all polygon points. If no points, fall back to width/height.
   */
  getPolygonAABB(): { minX: number; minY: number; maxX: number; maxY: number } {
    if (this.points.length === 0) {
      return { minX: -this.width / 2, minY: -this.height / 2, maxX: this.width / 2, maxY: this.height / 2 };
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of this.points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return { minX, minY, maxX, maxY };
  }

  serialize(): Record<string, unknown> {
    return {
      type: this.type,
      shape: this.shape,
      width: this.width,
      height: this.height,
      radius: this.radius,
      offset: this.offset.toPlain(),
      isTrigger: this.isTrigger,
      showHitbox: this.showHitbox,
      points: this.points.map(p => p.toPlain()),
    };
  }

  deserialize(data: Record<string, unknown>): void {
    this.shape = (data.shape as ColliderShape) ?? 'box';
    this.width = (data.width as number) ?? 50;
    this.height = (data.height as number) ?? 50;
    this.radius = (data.radius as number) ?? 25;
    const off = data.offset as { x: number; y: number };
    if (off) this.offset = Vec2.fromPlain(off);
    this.isTrigger = (data.isTrigger as boolean) ?? false;
    this.showHitbox = (data.showHitbox as boolean) ?? false;
    const pts = data.points as { x: number; y: number }[];
    if (Array.isArray(pts)) {
      this.points = pts.map(p => Vec2.fromPlain(p));
    }
  }
}
