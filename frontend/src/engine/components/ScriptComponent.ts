// engine/components/ScriptComponent.ts
import { Component } from '../core/Component';

export const DEFAULT_SCRIPT_TEMPLATE = (entityName: string) => `// Script for entity: ${entityName}
// Available globals: entity, transform, input, time, scene, assets, console
//
// ── Transform ──
// transform.position.x / transform.position.y
// transform.rotation
// transform.scale.x / transform.scale.y
// transform.translate(dx, dy)
//
// ── Entity ──
// entity.tag — get/set the entity tag
// entity.applyForce(x, y) — apply a force (needs RigidBody2D)
// entity.getComponent("RigidBody2D") — returns component proxy
// entity.getComponent("Collider2D")
// entity.getComponent("SpriteRenderer")
// entity.destroy()
//
// ── RigidBody2D proxy ──
// rb = entity.getComponent("RigidBody2D")
// rb.velocity.x / rb.velocity.y
// rb.setVelocity(x, y)
// rb.applyForce(x, y)
// rb.mass, rb.gravityScale, rb.drag, rb.bounciness, rb.isKinematic
//
// ── Collider2D proxy ──
// col = entity.getComponent("Collider2D")
// col.width, col.height, col.offset.x, col.offset.y, col.isTrigger
//
// ── SpriteRenderer proxy ──
// sr = entity.getComponent("SpriteRenderer")
// sr.color, sr.width, sr.height, sr.visible, sr.layer, sr.shapeType
//
// ── Scene / Assets ──
// assets.spawn("PrefabName", x, y) — spawn a prefab at position
// scene.destroy({ name: "Enemy" }) — destroy an entity
//
// Collision callback receives: { name, tag, isTrigger }

function onStart() {
  // Called once when the scene starts
}

function onUpdate(deltaTime) {
  // Called every frame
  // transform.position.x += 100 * deltaTime;
}

function onCollision(other) {
  // Called when colliding with another entity (needs Collider2D)
  // if (other.tag === "Enemy") { console.log("Hit enemy!"); }
}

function onDestroy() {
  // Called when entity is destroyed
}
`;

export class ScriptComponent extends Component {
  public scriptName: string;
  public scriptSource: string;

  constructor(scriptName: string = 'NewScript', scriptSource?: string) {
    super('ScriptComponent');
    this.scriptName = scriptName;
    this.scriptSource = scriptSource ?? DEFAULT_SCRIPT_TEMPLATE(scriptName);
  }

  serialize(): Record<string, unknown> {
    return {
      type: this.type,
      scriptName: this.scriptName,
      scriptSource: this.scriptSource,
    };
  }

  deserialize(data: Record<string, unknown>): void {
    this.scriptName = (data.scriptName as string) ?? 'NewScript';
    this.scriptSource = (data.scriptSource as string) ?? '';
  }
}
