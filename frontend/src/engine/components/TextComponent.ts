// engine/components/TextComponent.ts
import { Component } from '../core/Component';

export const FONT_OPTIONS = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
  'Courier New',
  'Verdana',
  'Trebuchet MS',
  'Impact',
  'Comic Sans MS',
  'Palatino',
  'Garamond',
  'monospace',
  'sans-serif',
  'serif',
] as const;

export class TextComponent extends Component {
  public text: string;
  public fontFamily: string;
  public fontSize: number;
  public color: string;
  public bold: boolean;
  public italic: boolean;
  public textAlign: 'left' | 'center' | 'right';
  public layer: number;

  constructor() {
    super('TextComponent');
    this.text = 'Hello World';
    this.fontFamily = 'Arial';
    this.fontSize = 16;
    this.color = '#ffffff';
    this.bold = false;
    this.italic = false;
    this.textAlign = 'center';
    this.layer = 0;
  }

  serialize(): Record<string, unknown> {
    return {
      type: this.type,
      text: this.text,
      fontFamily: this.fontFamily,
      fontSize: this.fontSize,
      color: this.color,
      bold: this.bold,
      italic: this.italic,
      textAlign: this.textAlign,
      layer: this.layer,
      enabled: this.enabled,
    };
  }

  deserialize(data: Record<string, unknown>): void {
    this.text = (data.text as string) ?? 'Hello World';
    this.fontFamily = (data.fontFamily as string) ?? 'Arial';
    this.fontSize = (data.fontSize as number) ?? 16;
    this.color = (data.color as string) ?? '#ffffff';
    this.bold = (data.bold as boolean) ?? false;
    this.italic = (data.italic as boolean) ?? false;
    this.textAlign = (data.textAlign as 'left' | 'center' | 'right') ?? 'center';
    this.layer = (data.layer as number) ?? 0;
    this.enabled = (data.enabled as boolean) ?? true;
  }
}
