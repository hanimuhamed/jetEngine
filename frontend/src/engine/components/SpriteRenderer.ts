// engine/components/SpriteRenderer.ts
import { Component } from '../core/Component';
import { Vec2 } from '../core/Math2D';

export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'polygon' | 'sprite';

/** Generate a regular pentagon (unit scale, fits inside ~25px radius).
 *  Points are in local Y-up space. Top vertex points up (+Y). */
export function defaultPentagonPoints(): Vec2[] {
  const pts: Vec2[] = [];
  const r = 25;
  for (let i = 0; i < 5; i++) {
    // Start from top (+90° in Y-up), go counter-clockwise
    const angle = (i * 72 + 90) * Math.PI / 180;
    pts.push(new Vec2(
      Math.round(r * Math.cos(angle) * 100) / 100,
      Math.round(r * Math.sin(angle) * 100) / 100
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
  public flipX: boolean;
  public flipY: boolean;
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
    this.flipX = false;
    this.flipY = false;
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
      flipX: this.flipX,
      flipY: this.flipY,
      polygonPoints: this.polygonPoints.map(p => p.toPlain()),
      enabled: this.enabled,
    };
  }

  deserialize(data: Record<string, unknown>): void {
    this.color = (data.color as string) ?? '#ffffff';
    this.shapeType = (data.shapeType as ShapeType) ?? 'rectangle';
    this.width = (data.width as number) ?? 50;
    this.height = (data.height as number) ?? 50;
    this.visible = (data.visible as boolean) ?? true;
    this.layer = (data.layer as number) ?? 0;
    this.flipX = (data.flipX as boolean) ?? false;
    this.flipY = (data.flipY as boolean) ?? false;
    const url = data.spriteUrl as string;
    if (url) {
      this.loadImage(url);
    }
    const pts = data.polygonPoints as { x: number; y: number }[];
    if (Array.isArray(pts)) {
      this.polygonPoints = pts.map(p => Vec2.fromPlain(p));
    }
    this.enabled = (data.enabled as boolean) ?? true;
  }
}
