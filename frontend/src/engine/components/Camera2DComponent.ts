// engine/components/Camera2DComponent.ts
import { Component } from '../core/Component';

export class Camera2DComponent extends Component {
  public backgroundColor: string;
  public backgroundImageUrl: string;
  public zoom: number;
  private _loadedBgImage: HTMLImageElement | null = null;
  private _bgImageLoaded: boolean = false;

  constructor(backgroundColor: string = '#1a1a2e', zoom: number = 1) {
    super('Camera2DComponent');
    this.backgroundColor = backgroundColor;
    this.backgroundImageUrl = '';
    this.zoom = zoom;
  }

  loadBackgroundImage(url: string): void {
    this.backgroundImageUrl = url;
    this._bgImageLoaded = false;
    if (url) {
      const img = new Image();
      img.onload = () => {
        this._bgImageLoaded = true;
      };
      img.src = url;
      this._loadedBgImage = img;
    } else {
      this._loadedBgImage = null;
    }
  }

  getBackgroundImage(): HTMLImageElement | null {
    return this._bgImageLoaded ? this._loadedBgImage : null;
  }

  serialize(): Record<string, unknown> {
    return {
      type: this.type,
      backgroundColor: this.backgroundColor,
      backgroundImageUrl: this.backgroundImageUrl,
      zoom: this.zoom,
    };
  }

  deserialize(data: Record<string, unknown>): void {
    this.backgroundColor = (data.backgroundColor as string) ?? '#1a1a2e';
    this.zoom = (data.zoom as number) ?? 1;
    const bgUrl = data.backgroundImageUrl as string;
    if (bgUrl) {
      this.loadBackgroundImage(bgUrl);
    }
  }
}
