// engine/components/SpriteRenderer.ts
import { Component } from '../core/Component';

export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'sprite';

export class SpriteRenderer extends Component {
  public color: string;
  public shapeType: ShapeType;
  public width: number;
  public height: number;
  public visible: boolean;
  public layer: number;
  public spriteUrl: string;
  private _loadedImage: HTMLImageElement | null = null;
  private _imageLoaded: boolean = false;

  constructor(
    color: string = '#ffffff',
    shapeType: ShapeType = 'rectangle',
    width: number = 50,
    height: number = 50
  ) {
    super('SpriteRenderer');
    this.color = color;
    this.shapeType = shapeType;
    this.width = width;
    this.height = height;
    this.visible = true;
    this.layer = 0;
    this.spriteUrl = '';
  }

  loadImage(url: string): void {
    this.spriteUrl = url;
    this._imageLoaded = false;
    if (url) {
      const img = new Image();
      img.onload = () => {
        this._imageLoaded = true;
      };
      img.src = url;
      this._loadedImage = img;
    } else {
      this._loadedImage = null;
    }
  }

  getImage(): HTMLImageElement | null {
    return this._imageLoaded ? this._loadedImage : null;
  }

  serialize(): Record<string, unknown> {
    return {
      type: this.type,
      color: this.color,
      shapeType: this.shapeType,
      width: this.width,
      height: this.height,
      visible: this.visible,
      layer: this.layer,
      spriteUrl: this.spriteUrl,
    };
  }

  deserialize(data: Record<string, unknown>): void {
    this.color = (data.color as string) ?? '#ffffff';
    this.shapeType = (data.shapeType as ShapeType) ?? 'rectangle';
    this.width = (data.width as number) ?? 50;
    this.height = (data.height as number) ?? 50;
    this.visible = (data.visible as boolean) ?? true;
    this.layer = (data.layer as number) ?? 0;
    const url = data.spriteUrl as string;
    if (url) {
      this.loadImage(url);
    }
  }
}
