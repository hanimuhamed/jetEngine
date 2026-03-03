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

  constructor(width: number = 50, height: number = 50) {
    super('Collider2D');
    this.width = width;
    this.height = height;
    this.offset = Vec2.zero();
    this.isTrigger = false;
    this.showHitbox = false;
    this.shape = 'box';
    this.radius = 25;
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
      enabled: this.enabled,
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
    this.enabled = (data.enabled as boolean) ?? true;
  }
}
