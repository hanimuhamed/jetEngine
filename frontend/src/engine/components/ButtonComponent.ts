// engine/components/ButtonComponent.ts
import { Component } from '../core/Component';
import { Vec2 } from '../core/Math2D';

export type ButtonShape = 'box' | 'circle';

export class ButtonComponent extends Component {
  public shape: ButtonShape;
  public width: number;
  public height: number;
  public radius: number;
  public offset: Vec2;

  constructor() {
    super('ButtonComponent');
    this.shape = 'box';
    this.width = 50;
    this.height = 50;
    this.radius = 25;
    this.offset = Vec2.zero();
  }

  serialize(): Record<string, unknown> {
    return {
      type: this.type,
      shape: this.shape,
      width: this.width,
      height: this.height,
      radius: this.radius,
      offset: this.offset.toPlain(),
      enabled: this.enabled,
    };
  }

  deserialize(data: Record<string, unknown>): void {
    this.shape = (data.shape as ButtonShape) ?? 'box';
    this.width = (data.width as number) ?? 50;
    this.height = (data.height as number) ?? 50;
    this.radius = (data.radius as number) ?? 25;
    const off = data.offset as { x: number; y: number };
    if (off) this.offset = Vec2.fromPlain(off);
    this.enabled = (data.enabled as boolean) ?? true;
  }
}
