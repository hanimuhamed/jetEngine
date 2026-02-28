// engine/components/Transform2D.ts
import { Component } from '../core/Component';
import { Vec2 } from '../core/Math2D';

export class Transform2D extends Component {
  public position: Vec2;
  public rotation: number; // degrees
  public scale: Vec2;

  constructor(
    position: Vec2 = Vec2.zero(),
    rotation: number = 0,
    scale: Vec2 = Vec2.one()
  ) {
    super('Transform2D');
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
  }

  translate(dx: number, dy: number): void {
    this.position = this.position.add(new Vec2(dx, dy));
  }

  serialize(): Record<string, unknown> {
    return {
      type: this.type,
      position: this.position.toPlain(),
      rotation: this.rotation,
      scale: this.scale.toPlain(),
    };
  }

  deserialize(data: Record<string, unknown>): void {
    const pos = data.position as { x: number; y: number };
    const scl = data.scale as { x: number; y: number };
    this.position = new Vec2(pos.x, pos.y);
    this.rotation = data.rotation as number;
    this.scale = new Vec2(scl.x, scl.y);
  }
}
