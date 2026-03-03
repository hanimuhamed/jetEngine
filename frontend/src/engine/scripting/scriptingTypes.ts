// engine/scripting/scriptingTypes.ts — Type declarations for the Monaco script editor

/** TypeScript type declarations injected into the Monaco editor for script autocompletion */
export const SCRIPTING_TYPES = `
declare const entity: {
  id: string;
  name: string;
  tag: string;
  active: boolean;
  getComponent(type: "Transform2D"): {
    position: { x: number; y: number };
    rotation: number;
    scale: { x: number; y: number };
    translate(dx: number, dy: number): void;
    enabled: boolean;
  } | null;
  getComponent(type: "RigidBody2D"): {
    velocity: { x: number; y: number };
    acceleration: { x: number; y: number };
    mass: number;
    gravityScale: number;
    isKinematic: boolean;
    drag: number;
    bounciness: number;
    setVelocity(x: number, y: number): void;
    enabled: boolean;
  } | null;
  getComponent(type: "Collider2D"): {
    width: number;
    height: number;
    radius: number;
    shape: string;
    offset: { x: number; y: number };
    isTrigger: boolean;
    showHitbox: boolean;
    enabled: boolean;
  } | null;
  getComponent(type: "SpriteRenderer"): {
    color: string;
    shapeType: string;
    width: number;
    height: number;
    visible: boolean;
    layer: number;
    flipX: boolean;
    flipY: boolean;
    enabled: boolean;
  } | null;
  getComponent(type: "Camera2DComponent"): {
    backgroundColor: string;
    zoom: number;
    enabled: boolean;
  } | null;
  getComponent(type: "TextComponent"): {
    text: string;
    fontFamily: string;
    fontSize: number;
    color: string;
    bold: boolean;
    italic: boolean;
    textAlign: string;
    layer: number;
    enabled: boolean;
  } | null;
  getComponent(type: "ButtonComponent"): {
    shape: string;
    width: number;
    height: number;
    radius: number;
    offset: { x: number; y: number };
    enabled: boolean;
  } | null;
  getComponent(type: string): any;
  destroy(): void;
};
declare const transform: {
  position: { x: number; y: number };
  rotation: number;
  scale: { x: number; y: number };
  translate(dx: number, dy: number): void;
  enabled: boolean;
};
declare const input: {
  isKeyDown(key: string): boolean;
  isKeyPressed(key: string): boolean;
  isMouseButtonDown(button: number): boolean;
  isMouseButtonPressed(button: number): boolean;
  getMousePosition(): { x: number; y: number };
};
declare const time: {
  deltaTime: number;
  elapsed: number;
  frameCount: number;
};
declare const scene: {
  getEntityByName(name: string): typeof entity | null;
  getAllEntities(): (typeof entity)[];
  spawn(prefabName: string, x: number, y: number): { id: string; name: string; tag: string } | null;
  destroy(target: { id?: string; name?: string }): void;
};
declare const assets: {
  spawn(prefabName: string, x: number, y: number): { id: string; name: string; tag: string } | null;
};
declare function onStart(): void;
declare function onUpdate(deltaTime: number): void;
declare function onCollision(other: { id: string; name: string; tag: string; isTrigger: boolean; active: boolean }): void;
declare function onDestroy(): void;
`;
