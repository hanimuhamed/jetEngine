// engine/systems/PhysicsSystem.ts — Basic 2D physics
import { Entity } from '../core/Entity';
import { Vec2 } from '../core/Math2D';
import { Transform2D } from '../components/Transform2D';
import { RigidBody2D } from '../components/RigidBody2D';
import { Collider2D } from '../components/Collider2D';
import { getWorldTransform } from '../core/WorldTransform';

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

interface CircleBounds {
  cx: number;
  cy: number;
  radius: number;
}

/**
 * Compute AABB in world space, using the full parent hierarchy transform.
 * Works for box and polygon colliders. Circle uses getCircleBounds instead.
 */
function getAABB(entity: Entity): AABB | null {
  const collider = entity.getComponent<Collider2D>('Collider2D');
  if (!collider) return null;

  const world = getWorldTransform(entity);
  const absScaleX = Math.abs(world.scaleX);
  const absScaleY = Math.abs(world.scaleY);
  const rad = (world.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Offset in world space
  const offX = collider.offset.x * absScaleX;
  const offY = collider.offset.y * absScaleY;
  const worldOffX = offX * cos - offY * sin;
  const worldOffY = offX * sin + offY * cos;
  const cx = world.position.x + worldOffX;
  const cy = world.position.y + worldOffY;

  let localCorners: { x: number; y: number }[];

  if (collider.shape === 'polygon' && collider.points.length >= 3) {
    // For polygon collider with "box" bounding: compute AABB of polygon points
    // The polygon points are in local space, scaled by world scale
    localCorners = collider.points.map(p => ({
      x: p.x * absScaleX,
      y: p.y * absScaleY,
    }));
  } else {
    // Box collider
    const hw = (collider.width * absScaleX) / 2;
    const hh = (collider.height * absScaleY) / 2;
    localCorners = [
      { x: -hw, y: -hh },
      { x:  hw, y: -hh },
      { x:  hw, y:  hh },
      { x: -hw, y:  hh },
    ];
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const corner of localCorners) {
    const rx = corner.x * cos - corner.y * sin + cx;
    const ry = corner.x * sin + corner.y * cos + cy;
    if (rx < minX) minX = rx;
    if (ry < minY) minY = ry;
    if (rx > maxX) maxX = rx;
    if (ry > maxY) maxY = ry;
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Compute circle bounds in world space.
 */
function getCircleBounds(entity: Entity): CircleBounds | null {
  const collider = entity.getComponent<Collider2D>('Collider2D');
  if (!collider) return null;

  const world = getWorldTransform(entity);
  const avgScale = (Math.abs(world.scaleX) + Math.abs(world.scaleY)) / 2;
  const rad = (world.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const offX = collider.offset.x * Math.abs(world.scaleX);
  const offY = collider.offset.y * Math.abs(world.scaleY);
  const worldOffX = offX * cos - offY * sin;
  const worldOffY = offX * sin + offY * cos;

  return {
    cx: world.position.x + worldOffX,
    cy: world.position.y + worldOffY,
    radius: collider.radius * avgScale,
  };
}

function aabbOverlap(a: AABB, b: AABB): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}

function circleCircleOverlap(a: CircleBounds, b: CircleBounds): boolean {
  const dx = a.cx - b.cx;
  const dy = a.cy - b.cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < a.radius + b.radius;
}

function circleAABBOverlap(circle: CircleBounds, aabb: AABB): boolean {
  const closestX = Math.max(aabb.minX, Math.min(circle.cx, aabb.maxX));
  const closestY = Math.max(aabb.minY, Math.min(circle.cy, aabb.maxY));
  const dx = circle.cx - closestX;
  const dy = circle.cy - closestY;
  return (dx * dx + dy * dy) < (circle.radius * circle.radius);
}

/** Check overlap between two entities based on their collider shapes */
function checkOverlap(a: Entity, b: Entity): boolean {
  const colA = a.getComponent<Collider2D>('Collider2D')!;
  const colB = b.getComponent<Collider2D>('Collider2D')!;
  const shapeA = colA.shape;
  const shapeB = colB.shape;

  if (shapeA === 'circle' && shapeB === 'circle') {
    const ca = getCircleBounds(a);
    const cb = getCircleBounds(b);
    if (!ca || !cb) return false;
    return circleCircleOverlap(ca, cb);
  }

  if (shapeA === 'circle' || shapeB === 'circle') {
    const circleEntity = shapeA === 'circle' ? a : b;
    const boxEntity = shapeA === 'circle' ? b : a;
    const circle = getCircleBounds(circleEntity);
    const aabb = getAABB(boxEntity);
    if (!circle || !aabb) return false;
    return circleAABBOverlap(circle, aabb);
  }

  // Both are box or polygon — use AABB
  const aabbA = getAABB(a);
  const aabbB = getAABB(b);
  if (!aabbA || !aabbB) return false;
  return aabbOverlap(aabbA, aabbB);
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

      rb.velocity = rb.velocity.add(GRAVITY.scale(rb.gravityScale * dt));
      rb.velocity = rb.velocity.add(rb.acceleration.scale(dt));

      const dragFactor = Math.pow(1 - rb.drag, dt * 60);
      rb.velocity = rb.velocity.scale(dragFactor);

      transform.position = transform.position.add(rb.velocity.scale(dt));
      rb.acceleration = Vec2.zero();
    }

    // Collision detection & response
    const collidables = entities.filter(
      e => e.hasComponent('Collider2D') && e.hasComponent('Transform2D')
    );

    for (let i = 0; i < collidables.length; i++) {
      for (let j = i + 1; j < collidables.length; j++) {
        const a = collidables[i];
        const b = collidables[j];

        if (!checkOverlap(a, b)) continue;

        const colliderA = a.getComponent<Collider2D>('Collider2D')!;
        const colliderB = b.getComponent<Collider2D>('Collider2D')!;
        const isTrigger = colliderA.isTrigger || colliderB.isTrigger;

        this.collisionEvents.push({ entityA: a, entityB: b, isTrigger });

        if (isTrigger) continue;

        // For resolution, always use AABB (even for circles — simple approximation)
        const aabb_a = getAABB(a) ?? this.circleToAABB(a);
        const aabb_b = getAABB(b) ?? this.circleToAABB(b);
        if (aabb_a && aabb_b) {
          this.resolveCollision(a, b, aabb_a, aabb_b);
        }
      }
    }
  }

  private circleToAABB(entity: Entity): AABB | null {
    const circle = getCircleBounds(entity);
    if (!circle) return null;
    return {
      minX: circle.cx - circle.radius,
      minY: circle.cy - circle.radius,
      maxX: circle.cx + circle.radius,
      maxY: circle.cy + circle.radius,
    };
  }

  private resolveCollision(a: Entity, b: Entity, aabb_a: AABB, aabb_b: AABB): void {
    const rbA = a.getComponent<RigidBody2D>('RigidBody2D');
    const rbB = b.getComponent<RigidBody2D>('RigidBody2D');
    const tA = a.getComponent<Transform2D>('Transform2D')!;
    const tB = b.getComponent<Transform2D>('Transform2D')!;

    const centerAX = (aabb_a.minX + aabb_a.maxX) / 2;
    const centerAY = (aabb_a.minY + aabb_a.maxY) / 2;
    const centerBX = (aabb_b.minX + aabb_b.maxX) / 2;
    const centerBY = (aabb_b.minY + aabb_b.maxY) / 2;

    const overlapX = Math.min(aabb_a.maxX - aabb_b.minX, aabb_b.maxX - aabb_a.minX);
    const overlapY = Math.min(aabb_a.maxY - aabb_b.minY, aabb_b.maxY - aabb_a.minY);

    if (overlapX < overlapY) {
      const sign = centerAX < centerBX ? -1 : 1;
      if (rbA && !rbA.isKinematic) {
        tA.position.x += (overlapX / 2) * sign;
        rbA.velocity.x *= -rbA.bounciness;
      }
      if (rbB && !rbB.isKinematic) {
        tB.position.x -= (overlapX / 2) * sign;
        rbB.velocity.x *= -rbB.bounciness;
      }
    } else {
      const sign = centerAY < centerBY ? -1 : 1;
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
