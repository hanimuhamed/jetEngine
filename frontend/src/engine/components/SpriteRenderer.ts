// engine/components/SpriteRenderer.ts
import { Component } from '../core/Component';
import { Vec2 } from '../core/Math2D';

export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'polygon' | 'sprite';

/** Generate default 5-pointed star polygon (unit scale, fits inside ~25px radius).
 *  Points are in local Y-up space. Tip points up (+Y). */
export function defaultStarPoints(): Vec2[] {
  const pts: Vec2[] = [];
  const outerR = 25;
  const innerR = 10;
  for (let i = 0; i < 5; i++) {
    // Outer point — start from top (+90° in Y-up)
    const outerAngle = (i * 72 + 90) * Math.PI / 180;
    pts.push(new Vec2(
      Math.round(outerR * Math.cos(outerAngle) * 100) / 100,
      Math.round(outerR * Math.sin(outerAngle) * 100) / 100
    ));
    // Inner point
    const innerAngle = ((i * 72 + 36) + 90) * Math.PI / 180;
    pts.push(new Vec2(
      Math.round(innerR * Math.cos(innerAngle) * 100) / 100,
      Math.round(innerR * Math.sin(innerAngle) * 100) / 100
    ));
  }
  return pts;
}

export class SpriteRenderer extends Component {
  public color: string;
  public shapeType: ShapeType;
  public width: number;
  public height: number;
  public visible: boolean;
  public layer: number;
  public spriteUrl: string;
  /** Polygon points (local space) for polygon shape rendering */
  public polygonPoints: Vec2[];
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
    this.polygonPoints = [];
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
      polygonPoints: this.polygonPoints.map(p => p.toPlain()),
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
    const pts = data.polygonPoints as { x: number; y: number }[];
    if (Array.isArray(pts)) {
      this.polygonPoints = pts.map(p => Vec2.fromPlain(p));
    }
  }
}
