// engine/components/Collider2D.ts
import { Component } from '../core/Component';
import { Vec2 } from '../core/Math2D';

export class Collider2D extends Component {
  public width: number;
  public height: number;
  public offset: Vec2;
  public isTrigger: boolean;

  constructor(width: number = 50, height: number = 50) {
    super('Collider2D');
    this.width = width;
    this.height = height;
    this.offset = Vec2.zero();
    this.isTrigger = false;
  }

  serialize(): Record<string, unknown> {
    return {
      type: this.type,
      width: this.width,
      height: this.height,
      offset: this.offset.toPlain(),
      isTrigger: this.isTrigger,
    };
  }

  deserialize(data: Record<string, unknown>): void {
    this.width = (data.width as number) ?? 50;
    this.height = (data.height as number) ?? 50;
    const off = data.offset as { x: number; y: number };
    if (off) this.offset = Vec2.fromPlain(off);
    this.isTrigger = (data.isTrigger as boolean) ?? false;
  }
}
