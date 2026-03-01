// engine/systems/PhysicsSystem.ts — 2D physics with SAT collision
import { Entity } from '../core/Entity';
import { Vec2 } from '../core/Math2D';
import { Transform2D } from '../components/Transform2D';
import { RigidBody2D } from '../components/RigidBody2D';
import { Collider2D } from '../components/Collider2D';
import { SpriteRenderer } from '../components/SpriteRenderer';
import { getWorldTransform } from '../core/WorldTransform';

const GRAVITY = new Vec2(0, -400);

export interface CollisionEvent {
  entityA: Entity;
  entityB: Entity;
  isTrigger: boolean;
}

interface CircleBounds {
  cx: number;
  cy: number;
  radius: number;
}

// ─── SAT helpers ───────────────────────────────────

/** Get the world-space vertices of a collider (box or polygon) */
function getWorldVertices(entity: Entity): Vec2[] | null {
  const collider = entity.getComponent<Collider2D>('Collider2D');
  if (!collider) return null;

  const world = getWorldTransform(entity);
  const rad = (world.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const offX = collider.offset.x;
  const offY = collider.offset.y;

  let localPts: { x: number; y: number }[];

  if (collider.shape === 'polygon') {
    // Get polygon points from SpriteRenderer
    const sprite = entity.getComponent<SpriteRenderer>('SpriteRenderer');
    if (sprite && sprite.polygonPoints.length >= 3) {
      localPts = sprite.polygonPoints.map(p => ({ x: p.x + offX, y: p.y + offY }));
    } else {
      // Fallback to box
      const hw = collider.width / 2;
      const hh = collider.height / 2;
      localPts = [
        { x: -hw + offX, y: -hh + offY },
        { x:  hw + offX, y: -hh + offY },
        { x:  hw + offX, y:  hh + offY },
        { x: -hw + offX, y:  hh + offY },
      ];
    }
  } else {
    // Box collider → 4 corners
    const hw = collider.width / 2;
    const hh = collider.height / 2;
    localPts = [
      { x: -hw + offX, y: -hh + offY },
      { x:  hw + offX, y: -hh + offY },
      { x:  hw + offX, y:  hh + offY },
      { x: -hw + offX, y:  hh + offY },
    ];
  }

  // Transform local points to world space
  return localPts.map(p => {
    const sx = p.x * world.scaleX;
    const sy = p.y * world.scaleY;
    const wx = world.position.x + sx * cos - sy * sin;
    const wy = world.position.y + sx * sin + sy * cos;
    return new Vec2(wx, wy);
  });
}

/** Get perpendicular axes (edge normals) for SAT from a set of vertices */
function getAxes(verts: Vec2[]): Vec2[] {
  const axes: Vec2[] = [];
  for (let i = 0; i < verts.length; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % verts.length];
    const edge = b.sub(a);
    // Perpendicular (normal)
    const normal = new Vec2(-edge.y, edge.x).normalize();
    axes.push(normal);
  }
  return axes;
}

/** Project vertices onto an axis and return [min, max] */
function projectOnAxis(verts: Vec2[], axis: Vec2): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const v of verts) {
    const proj = v.dot(axis);
    if (proj < min) min = proj;
    if (proj > max) max = proj;
  }
  return [min, max];
}

/** SAT overlap test between two convex polygons. Returns overlap depth or -1 if no overlap. Also returns the MTV axis. */
function satOverlap(vertsA: Vec2[], vertsB: Vec2[]): { overlap: number; axis: Vec2 } | null {
  const axes = [...getAxes(vertsA), ...getAxes(vertsB)];
  let minOverlap = Infinity;
  let mtvAxis = axes[0];

  for (const axis of axes) {
    const [minA, maxA] = projectOnAxis(vertsA, axis);
    const [minB, maxB] = projectOnAxis(vertsB, axis);

    if (maxA < minB || maxB < minA) {
      return null; // Separating axis found → no collision
    }

    const overlap = Math.min(maxA - minB, maxB - minA);
    if (overlap < minOverlap) {
      minOverlap = overlap;
      mtvAxis = axis;
    }
  }

  return { overlap: minOverlap, axis: mtvAxis };
}

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

function circleCircleOverlap(a: CircleBounds, b: CircleBounds): { overlap: number; axis: Vec2 } | null {
  const dx = b.cx - a.cx;
  const dy = b.cy - a.cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const totalR = a.radius + b.radius;
  if (dist >= totalR) return null;
  const axis = dist > 0 ? new Vec2(dx / dist, dy / dist) : new Vec2(1, 0);
  return { overlap: totalR - dist, axis };
}

/** SAT circle vs convex polygon */
function circlePolyOverlap(circle: CircleBounds, verts: Vec2[]): { overlap: number; axis: Vec2 } | null {
  const center = new Vec2(circle.cx, circle.cy);

  // Find closest vertex to circle center
  let closestDist = Infinity;
  let closestVert = verts[0];
  for (const v of verts) {
    const d = center.distanceTo(v);
    if (d < closestDist) {
      closestDist = d;
      closestVert = v;
    }
  }

  // Axes: polygon edge normals + axis from circle center to closest vertex
  const axes = getAxes(verts);
  const toClosest = closestVert.sub(center).normalize();
  axes.push(toClosest);

  let minOverlap = Infinity;
  let mtvAxis = axes[0];

  for (const axis of axes) {
    // Project polygon
    const [minP, maxP] = projectOnAxis(verts, axis);
    // Project circle
    const centerProj = center.dot(axis);
    const minC = centerProj - circle.radius;
    const maxC = centerProj + circle.radius;

    if (maxP < minC || maxC < minP) return null;

    const overlap = Math.min(maxP - minC, maxC - minP);
    if (overlap < minOverlap) {
      minOverlap = overlap;
      mtvAxis = axis;
    }
  }

  return { overlap: minOverlap, axis: mtvAxis };
}

/** Check overlap between two entities using SAT */
function checkOverlap(a: Entity, b: Entity): { overlap: number; axis: Vec2 } | null {
  const colA = a.getComponent<Collider2D>('Collider2D')!;
  const colB = b.getComponent<Collider2D>('Collider2D')!;

  if (colA.shape === 'circle' && colB.shape === 'circle') {
    const ca = getCircleBounds(a);
    const cb = getCircleBounds(b);
    if (!ca || !cb) return null;
    return circleCircleOverlap(ca, cb);
  }

  if (colA.shape === 'circle') {
    const ca = getCircleBounds(a);
    const vb = getWorldVertices(b);
    if (!ca || !vb) return null;
    return circlePolyOverlap(ca, vb);
  }

  if (colB.shape === 'circle') {
    const cb = getCircleBounds(b);
    const va = getWorldVertices(a);
    if (!cb || !va) return null;
    const result = circlePolyOverlap(cb, va);
    if (result) {
      // Flip axis since we swapped the order
      result.axis = result.axis.scale(-1);
    }
    return result;
  }

  // Both are box or polygon → SAT on convex polygons
  const va = getWorldVertices(a);
  const vb = getWorldVertices(b);
  if (!va || !vb) return null;
  return satOverlap(va, vb);
}

export class PhysicsSystem {
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

    // Collision detection & response (SAT)
    const collidables = entities.filter(
      e => e.hasComponent('Collider2D') && e.hasComponent('Transform2D')
    );

    for (let i = 0; i < collidables.length; i++) {
      for (let j = i + 1; j < collidables.length; j++) {
        const a = collidables[i];
        const b = collidables[j];

        const result = checkOverlap(a, b);
        if (!result) continue;

        const colliderA = a.getComponent<Collider2D>('Collider2D')!;
        const colliderB = b.getComponent<Collider2D>('Collider2D')!;
        const isTrigger = colliderA.isTrigger || colliderB.isTrigger;

        this.collisionEvents.push({ entityA: a, entityB: b, isTrigger });

        if (isTrigger) continue;

        this.resolveCollision(a, b, result.overlap, result.axis);
      }
    }
  }

  private resolveCollision(a: Entity, b: Entity, overlap: number, axis: Vec2): void {
    const rbA = a.getComponent<RigidBody2D>('RigidBody2D');
    const rbB = b.getComponent<RigidBody2D>('RigidBody2D');
    const tA = a.getComponent<Transform2D>('Transform2D')!;
    const tB = b.getComponent<Transform2D>('Transform2D')!;

    // Ensure axis points from A to B
    const worldA = getWorldTransform(a);
    const worldB = getWorldTransform(b);
    const d = worldB.position.sub(worldA.position);
    let mtv = axis;
    if (d.dot(axis) < 0) {
      mtv = axis.scale(-1);
    }

    const aKinematic = !rbA || rbA.isKinematic;
    const bKinematic = !rbB || rbB.isKinematic;

    if (!aKinematic && !bKinematic) {
      // Both dynamic: split evenly
      tA.position = tA.position.sub(mtv.scale(overlap / 2));
      tB.position = tB.position.add(mtv.scale(overlap / 2));
    } else if (!aKinematic) {
      tA.position = tA.position.sub(mtv.scale(overlap));
    } else if (!bKinematic) {
      tB.position = tB.position.add(mtv.scale(overlap));
    }

    // Bounce: project velocity onto MTV axis and reflect
    const velAlongMtv = (v: Vec2) => mtv.scale(v.dot(mtv));
    if (rbA && !rbA.isKinematic) {
      const vn = velAlongMtv(rbA.velocity);
      rbA.velocity = rbA.velocity.sub(vn.scale(1 + rbA.bounciness));
    }
    if (rbB && !rbB.isKinematic) {
      const vn = velAlongMtv(rbB.velocity);
      rbB.velocity = rbB.velocity.sub(vn.scale(1 + rbB.bounciness));
    }
  }
}
