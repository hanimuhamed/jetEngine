// engine/core/Math2D.ts — 2D math primitives

export class Vec2 {
  constructor(public x: number = 0, public y: number = 0) {}

  add(other: Vec2): Vec2 {
    return new Vec2(this.x + other.x, this.y + other.y);
  }

  sub(other: Vec2): Vec2 {
    return new Vec2(this.x - other.x, this.y - other.y);
  }

  scale(s: number): Vec2 {
    return new Vec2(this.x * s, this.y * s);
  }

  mul(other: Vec2): Vec2 {
    return new Vec2(this.x * other.x, this.y * other.y);
  }

  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize(): Vec2 {
    const len = this.magnitude();
    return len > 0 ? new Vec2(this.x / len, this.y / len) : new Vec2();
  }

  dot(other: Vec2): number {
    return this.x * other.x + this.y * other.y;
  }

  distanceTo(other: Vec2): number {
    return this.sub(other).magnitude();
  }

  clone(): Vec2 {
    return new Vec2(this.x, this.y);
  }

  equals(other: Vec2): boolean {
    return Math.abs(this.x - other.x) < 1e-6 && Math.abs(this.y - other.y) < 1e-6;
  }

  toPlain(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  static fromPlain(obj: { x: number; y: number }): Vec2 {
    return new Vec2(obj.x, obj.y);
  }

  static zero(): Vec2 {
    return new Vec2(0, 0);
  }

  static one(): Vec2 {
    return new Vec2(1, 1);
  }
}
