// engine/core/InputManager.ts — Handles keyboard and mouse input
import { Vec2 } from './Math2D';

export class InputManager {
  private keysDown: Set<string> = new Set();
  private keysPressed: Set<string> = new Set();
  private mouseButtons: Set<number> = new Set();
  private mousePosition: Vec2 = Vec2.zero();
  private _canvas: HTMLCanvasElement | null = null;

  private _onKeyDown = (e: KeyboardEvent) => {
    if (!this.keysDown.has(e.key)) {
      this.keysPressed.add(e.key);
    }
    this.keysDown.add(e.key);
  };

  private _onKeyUp = (e: KeyboardEvent) => {
    this.keysDown.delete(e.key);
  };

  private _onMouseDown = (e: MouseEvent) => {
    this.mouseButtons.add(e.button);
  };

  private _onMouseUp = (e: MouseEvent) => {
    this.mouseButtons.delete(e.button);
  };

  private _onMouseMove = (e: MouseEvent) => {
    if (this._canvas) {
      const rect = this._canvas.getBoundingClientRect();
      this.mousePosition = new Vec2(e.clientX - rect.left, e.clientY - rect.top);
    }
  };

  attach(canvas: HTMLCanvasElement): void {
    this._canvas = canvas;
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    canvas.addEventListener('mousedown', this._onMouseDown);
    canvas.addEventListener('mouseup', this._onMouseUp);
    canvas.addEventListener('mousemove', this._onMouseMove);
  }

  detach(): void {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    if (this._canvas) {
      this._canvas.removeEventListener('mousedown', this._onMouseDown);
      this._canvas.removeEventListener('mouseup', this._onMouseUp);
      this._canvas.removeEventListener('mousemove', this._onMouseMove);
    }
    this._canvas = null;
  }

  isKeyDown(key: string): boolean {
    return this.keysDown.has(key);
  }

  isKeyPressed(key: string): boolean {
    return this.keysPressed.has(key);
  }

  isMouseButtonDown(button: number): boolean {
    return this.mouseButtons.has(button);
  }

  getMousePosition(): { x: number; y: number } {
    return { x: this.mousePosition.x, y: this.mousePosition.y };
  }

  /** Call at end of each frame to clear per-frame states */
  endFrame(): void {
    this.keysPressed.clear();
  }
}
