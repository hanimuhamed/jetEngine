// engine/components/Camera2DComponent.ts
import { Component } from '../core/Component';

export class Camera2DComponent extends Component {
  public backgroundColor: string;
  public zoom: number;

  constructor(backgroundColor: string = '#1a1a2e', zoom: number = 1) {
    super('Camera2DComponent');
    this.backgroundColor = backgroundColor;
    this.zoom = zoom;
  }

  serialize(): Record<string, unknown> {
    return {
      type: this.type,
      backgroundColor: this.backgroundColor,
      zoom: this.zoom,
      enabled: this.enabled,
    };
  }

  deserialize(data: Record<string, unknown>): void {
    this.backgroundColor = (data.backgroundColor as string) ?? '#1a1a2e';
    this.zoom = (data.zoom as number) ?? 1;
    this.enabled = (data.enabled as boolean) ?? true;
  }
}
