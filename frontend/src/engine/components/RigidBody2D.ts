// engine/components/RigidBody2D.ts
import { Component } from '../core/Component';
import { Vec2 } from '../core/Math2D';

export class RigidBody2D extends Component {
  public velocity: Vec2;
  public acceleration: Vec2;
  public mass: number;
  public gravityScale: number;
  public isKinematic: boolean;
  public drag: number;
  public bounciness: number;

  constructor(mass: number = 1, gravityScale: number = 1) {
    super('RigidBody2D');
    this.velocity = Vec2.zero();
    this.acceleration = Vec2.zero();
    this.mass = mass;
    this.gravityScale = gravityScale;
    this.isKinematic = false;
    this.drag = 0.01;
    this.bounciness = 0.5;
  }

  applyForce(force: Vec2): void {
    if (this.isKinematic) return;
    this.acceleration = this.acceleration.add(force.scale(1 / this.mass));
  }

  serialize(): Record<string, unknown> {
    return {
      type: this.type,
      velocity: this.velocity.toPlain(),
      acceleration: this.acceleration.toPlain(),
      mass: this.mass,
      gravityScale: this.gravityScale,
      isKinematic: this.isKinematic,
      drag: this.drag,
      bounciness: this.bounciness,
    };
  }

  deserialize(data: Record<string, unknown>): void {
    const vel = data.velocity as { x: number; y: number };
    const acc = data.acceleration as { x: number; y: number };
    if (vel) this.velocity = Vec2.fromPlain(vel);
    if (acc) this.acceleration = Vec2.fromPlain(acc);
    this.mass = (data.mass as number) ?? 1;
    this.gravityScale = (data.gravityScale as number) ?? 1;
    this.isKinematic = (data.isKinematic as boolean) ?? false;
    this.drag = (data.drag as number) ?? 0.01;
    this.bounciness = (data.bounciness as number) ?? 0.5;
  }
}
