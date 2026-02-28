// engine/systems/PhysicsSystem.ts — Basic 2D physics
import { Entity } from '../core/Entity';
import { Vec2 } from '../core/Math2D';
import { Transform2D } from '../components/Transform2D';
import { RigidBody2D } from '../components/RigidBody2D';
import { Collider2D } from '../components/Collider2D';

const GRAVITY = new Vec2(0, -400); // pixels/s² downward (Y-up convention)

/** Collision event emitted each frame for overlapping pairs */
export interface CollisionEvent {
  entityA: Entity;
  entityB: Entity;
  isTrigger: boolean;
}

interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function getAABB(entity: Entity): AABB | null {
  const transform = entity.getComponent<Transform2D>('Transform2D');
  const collider = entity.getComponent<Collider2D>('Collider2D');
  if (!transform || !collider) return null;

  const hw = (collider.width * transform.scale.x) / 2;
  const hh = (collider.height * transform.scale.y) / 2;
  const cx = transform.position.x + collider.offset.x;
  const cy = transform.position.y + collider.offset.y;

  return {
    minX: cx - hw,
    minY: cy - hh,
    maxX: cx + hw,
    maxY: cy + hh,
  };
}

function aabbOverlap(a: AABB, b: AABB): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}

export class PhysicsSystem {
  /** Collision events from the last update — consumed by ScriptRunner */
  public collisionEvents: CollisionEvent[] = [];

  update(entities: Entity[], dt: number): void {
    this.collisionEvents = [];

    // Apply gravity and velocity
    for (const entity of entities) {
      const rb = entity.getComponent<RigidBody2D>('RigidBody2D');
      const transform = entity.getComponent<Transform2D>('Transform2D');
      if (!rb || !transform || rb.isKinematic) continue;

      // Apply gravity
      rb.velocity = rb.velocity.add(GRAVITY.scale(rb.gravityScale * dt));

      // Apply acceleration
      rb.velocity = rb.velocity.add(rb.acceleration.scale(dt));

      // Apply drag (frame-rate independent: use exponential damping)
      const dragFactor = Math.pow(1 - rb.drag, dt * 60);
      rb.velocity = rb.velocity.scale(dragFactor);

      // Update position
      transform.position = transform.position.add(rb.velocity.scale(dt));

      // Reset acceleration each frame
      rb.acceleration = Vec2.zero();
    }

    // Collision detection & response (AABB only)
    const collidables = entities.filter(
      e => e.hasComponent('Collider2D') && e.hasComponent('Transform2D')
    );

    for (let i = 0; i < collidables.length; i++) {
      for (let j = i + 1; j < collidables.length; j++) {
        const a = collidables[i];
        const b = collidables[j];

        const aabb_a = getAABB(a);
        const aabb_b = getAABB(b);
        if (!aabb_a || !aabb_b) continue;

        if (aabbOverlap(aabb_a, aabb_b)) {
          const colliderA = a.getComponent<Collider2D>('Collider2D')!;
          const colliderB = b.getComponent<Collider2D>('Collider2D')!;
          const isTrigger = colliderA.isTrigger || colliderB.isTrigger;

          // Emit collision event for both entities
          this.collisionEvents.push({ entityA: a, entityB: b, isTrigger });

          // If either is trigger, skip physics response
          if (isTrigger) continue;

          this.resolveCollision(a, b, aabb_a, aabb_b);
        }
      }
    }
  }

  private resolveCollision(a: Entity, b: Entity, aabb_a: AABB, aabb_b: AABB): void {
    const rbA = a.getComponent<RigidBody2D>('RigidBody2D');
    const rbB = b.getComponent<RigidBody2D>('RigidBody2D');
    const tA = a.getComponent<Transform2D>('Transform2D')!;
    const tB = b.getComponent<Transform2D>('Transform2D')!;

    // Calculate overlap
    const overlapX = Math.min(aabb_a.maxX - aabb_b.minX, aabb_b.maxX - aabb_a.minX);
    const overlapY = Math.min(aabb_a.maxY - aabb_b.minY, aabb_b.maxY - aabb_a.minY);

    if (overlapX < overlapY) {
      // Resolve horizontally
      const sign = tA.position.x < tB.position.x ? -1 : 1;
      if (rbA && !rbA.isKinematic) {
        tA.position.x += (overlapX / 2) * sign;
        rbA.velocity.x *= -rbA.bounciness;
      }
      if (rbB && !rbB.isKinematic) {
        tB.position.x -= (overlapX / 2) * sign;
        rbB.velocity.x *= -rbB.bounciness;
      }
    } else {
      // Resolve vertically
      const sign = tA.position.y < tB.position.y ? -1 : 1;
      if (rbA && !rbA.isKinematic) {
        tA.position.y += (overlapY / 2) * sign;
        rbA.velocity.y *= -rbA.bounciness;
      }
      if (rbB && !rbB.isKinematic) {
        tB.position.y -= (overlapY / 2) * sign;
        rbB.velocity.y *= -rbB.bounciness;
      }
    }
  }
}
