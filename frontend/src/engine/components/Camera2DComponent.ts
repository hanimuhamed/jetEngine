// engine/components/Camera2DComponent.ts
import { Component } from '../core/Component';

export class Camera2DComponent extends Component {
  public backgroundColor: string;
  public backgroundImageUrl: string;
  private _loadedBgImage: HTMLImageElement | null = null;
  private _bgImageLoaded: boolean = false;

  constructor(backgroundColor: string = '#1a1a2e') {
    super('Camera2DComponent');
    this.backgroundColor = backgroundColor;
    this.backgroundImageUrl = '';
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
    };
  }

  deserialize(data: Record<string, unknown>): void {
    this.backgroundColor = (data.backgroundColor as string) ?? '#1a1a2e';
    const bgUrl = data.backgroundImageUrl as string;
    if (bgUrl) {
      this.loadBackgroundImage(bgUrl);
    }
  }
}
