// engine/scripting/componentProxies.ts — Proxy builders for script sandboxing
import { Vec2 } from '../core/Math2D';
import { Transform2D } from '../components/Transform2D';
import { RigidBody2D } from '../components/RigidBody2D';
import { Collider2D } from '../components/Collider2D';
import { SpriteRenderer } from '../components/SpriteRenderer';
import { Camera2DComponent } from '../components/Camera2DComponent';
import { TextComponent } from '../components/TextComponent';
import { ButtonComponent } from '../components/ButtonComponent';

/** Component type names accessible via getComponent() in scripts */
export const VALID_COMPONENT_TYPES = [
  'Transform2D', 'RigidBody2D', 'Collider2D',
  'SpriteRenderer', 'Camera2DComponent', 'ScriptComponent',
  'TextComponent', 'ButtonComponent',
];

export function makeTransformProxy(t: Transform2D) {
  return {
    position: {
      get x() { return t.position.x; },
      set x(v: number) { t.position.x = v; },
      get y() { return t.position.y; },
      set y(v: number) { t.position.y = v; },
    },
    get rotation() { return t.rotation; },
    set rotation(v: number) { t.rotation = v; },
    scale: {
      get x() { return t.scale.x; },
      set x(v: number) { t.scale.x = v; },
      get y() { return t.scale.y; },
      set y(v: number) { t.scale.y = v; },
    },
    translate(dx: number, dy: number) { t.translate(dx, dy); },
    get enabled() { return t.enabled; },
    set enabled(v: boolean) { t.enabled = v; },
  };
}

export function makeRigidBodyProxy(rb: RigidBody2D) {
  return {
    velocity: {
      get x() { return rb.velocity.x; },
      set x(v: number) { rb.velocity.x = v; },
      get y() { return rb.velocity.y; },
      set y(v: number) { rb.velocity.y = v; },
    },
    acceleration: {
      get x() { return rb.acceleration.x; },
      set x(v: number) { rb.acceleration.x = v; },
      get y() { return rb.acceleration.y; },
      set y(v: number) { rb.acceleration.y = v; },
    },
    get mass() { return rb.mass; },
    set mass(v: number) { rb.mass = v; },
    get gravityScale() { return rb.gravityScale; },
    set gravityScale(v: number) { rb.gravityScale = v; },
    get isKinematic() { return rb.isKinematic; },
    set isKinematic(v: boolean) { rb.isKinematic = v; },
    get drag() { return rb.drag; },
    set drag(v: number) { rb.drag = v; },
    get bounciness() { return rb.bounciness; },
    set bounciness(v: number) { rb.bounciness = v; },
    get enabled() { return rb.enabled; },
    set enabled(v: boolean) { rb.enabled = v; },
    setVelocity(x: number, y: number) { rb.velocity = new Vec2(x, y); },
  };
}

export function makeColliderProxy(c: Collider2D) {
  return {
    get width() { return c.width; },
    set width(v: number) { c.width = v; },
    get height() { return c.height; },
    set height(v: number) { c.height = v; },
    get radius() { return c.radius; },
    set radius(v: number) { c.radius = v; },
    get shape() { return c.shape; },
    set shape(v: string) { c.shape = v as Collider2D['shape']; },
    offset: {
      get x() { return c.offset.x; },
      set x(v: number) { c.offset.x = v; },
      get y() { return c.offset.y; },
      set y(v: number) { c.offset.y = v; },
    },
    get isTrigger() { return c.isTrigger; },
    set isTrigger(v: boolean) { c.isTrigger = v; },
    get showHitbox() { return c.showHitbox; },
    set showHitbox(v: boolean) { c.showHitbox = v; },
    get enabled() { return c.enabled; },
    set enabled(v: boolean) { c.enabled = v; },
  };
}

export function makeSpriteRendererProxy(sr: SpriteRenderer) {
  return {
    get color() { return sr.color; },
    set color(v: string) { sr.color = v; },
    get shapeType() { return sr.shapeType; },
    set shapeType(v: string) { sr.shapeType = v as SpriteRenderer['shapeType']; },
    get width() { return sr.width; },
    set width(v: number) { sr.width = v; },
    get height() { return sr.height; },
    set height(v: number) { sr.height = v; },
    get visible() { return sr.visible; },
    set visible(v: boolean) { sr.visible = v; },
    get layer() { return sr.layer; },
    set layer(v: number) { sr.layer = v; },
    get enabled() { return sr.enabled; },
    set enabled(v: boolean) { sr.enabled = v; },
    get flipX() { return sr.flipX; },
    set flipX(v: boolean) { sr.flipX = v; },
    get flipY() { return sr.flipY; },
    set flipY(v: boolean) { sr.flipY = v; },
  };
}

export function makeCameraProxy(cam: Camera2DComponent) {
  return {
    get backgroundColor() { return cam.backgroundColor; },
    set backgroundColor(v: string) { cam.backgroundColor = v; },
    get zoom() { return cam.zoom; },
    set zoom(v: number) { cam.zoom = v; },
    get enabled() { return cam.enabled; },
    set enabled(v: boolean) { cam.enabled = v; },
  };
}

export function makeTextComponentProxy(tc: TextComponent) {
  return {
    get text() { return tc.text; },
    set text(v: string) { tc.text = v; },
    get fontFamily() { return tc.fontFamily; },
    set fontFamily(v: string) { tc.fontFamily = v; },
    get fontSize() { return tc.fontSize; },
    set fontSize(v: number) { tc.fontSize = v; },
    get color() { return tc.color; },
    set color(v: string) { tc.color = v; },
    get bold() { return tc.bold; },
    set bold(v: boolean) { tc.bold = v; },
    get italic() { return tc.italic; },
    set italic(v: boolean) { tc.italic = v; },
    get textAlign() { return tc.textAlign; },
    set textAlign(v: string) { tc.textAlign = v as TextComponent['textAlign']; },
    get layer() { return tc.layer; },
    set layer(v: number) { tc.layer = v; },
    get enabled() { return tc.enabled; },
    set enabled(v: boolean) { tc.enabled = v; },
  };
}

export function makeButtonComponentProxy(btn: ButtonComponent) {
  return {
    get shape() { return btn.shape; },
    set shape(v: string) { btn.shape = v as ButtonComponent['shape']; },
    get width() { return btn.width; },
    set width(v: number) { btn.width = v; },
    get height() { return btn.height; },
    set height(v: number) { btn.height = v; },
    get radius() { return btn.radius; },
    set radius(v: number) { btn.radius = v; },
    offset: {
      get x() { return btn.offset.x; },
      set x(v: number) { btn.offset.x = v; },
      get y() { return btn.offset.y; },
      set y(v: number) { btn.offset.y = v; },
    },
    get enabled() { return btn.enabled; },
    set enabled(v: boolean) { btn.enabled = v; },
  };
}

/** Route a component to its proxy builder by type name */
export function makeComponentProxy(comp: unknown, type: string): unknown {
  switch (type) {
    case 'Transform2D': return makeTransformProxy(comp as Transform2D);
    case 'RigidBody2D': return makeRigidBodyProxy(comp as RigidBody2D);
    case 'Collider2D': return makeColliderProxy(comp as Collider2D);
    case 'SpriteRenderer': return makeSpriteRendererProxy(comp as SpriteRenderer);
    case 'Camera2DComponent': return makeCameraProxy(comp as Camera2DComponent);
    case 'TextComponent': return makeTextComponentProxy(comp as TextComponent);
    case 'ButtonComponent': return makeButtonComponentProxy(comp as ButtonComponent);
    default: return null;
  }
}
