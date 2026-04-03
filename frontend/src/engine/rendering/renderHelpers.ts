// engine/rendering/renderHelpers.ts — Extracted rendering subroutines
import { Entity } from '../core/Entity';
import { Vec2 } from '../core/Math2D';
import { SpriteRenderer } from '../components/SpriteRenderer';
import { Collider2D } from '../components/Collider2D';
import { TextComponent } from '../components/TextComponent';
import { getWorldTransform } from '../core/WorldTransform';
import { convexHull } from '../systems/PhysicsSystem';

type LocalToScreenFn = (entity: Entity, localX: number, localY: number) => Vec2;

// ── Sprite / shape rendering ──────────────────────────

export function drawSprite(ctx: CanvasRenderingContext2D, sprite: SpriteRenderer): void {
  const hw = sprite.width / 2;
  const hh = sprite.height / 2;
  const image = sprite.getImage();

  if (sprite.shapeType === 'sprite' && image) {
    ctx.drawImage(image, -hw, -hh, sprite.width, sprite.height);
  } else if (sprite.shapeType === 'circle') {
    ctx.fillStyle = sprite.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, hw, hh, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (sprite.shapeType === 'triangle') {
    ctx.fillStyle = sprite.color;
    ctx.beginPath();
    ctx.moveTo(0, -hh);
    ctx.lineTo(-hw, hh);
    ctx.lineTo(hw, hh);
    ctx.closePath();
    ctx.fill();
  } else if (sprite.shapeType === 'polygon' && sprite.polygonPoints.length >= 3) {
    ctx.fillStyle = sprite.color;
    ctx.beginPath();
    ctx.moveTo(sprite.polygonPoints[0].x, -sprite.polygonPoints[0].y);
    for (let i = 1; i < sprite.polygonPoints.length; i++) {
      ctx.lineTo(sprite.polygonPoints[i].x, -sprite.polygonPoints[i].y);
    }
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = sprite.color;
    ctx.fillRect(-hw, -hh, sprite.width, sprite.height);
  }
}

export function drawText(ctx: CanvasRenderingContext2D, textComp: TextComponent): void {
  if (!textComp.text) return;
  const style = `${textComp.italic ? 'italic ' : ''}${textComp.bold ? 'bold ' : ''}${textComp.fontSize}px ${textComp.fontFamily}`;
  ctx.font = style;
  ctx.fillStyle = textComp.color;
  ctx.textAlign = textComp.textAlign as CanvasTextAlign;
  ctx.textBaseline = 'middle';

  const lines = textComp.text.split('\n');
  const lineHeight = textComp.fontSize * 1.2;
  const totalHeight = (lines.length - 1) * lineHeight;
  const startY = -totalHeight / 2;

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], 0, startY + i * lineHeight);
  }
}

// ── Selection box ─────────────────────────────────────

export function drawSelectionBox(
  ctx: CanvasRenderingContext2D,
  entity: Entity,
  localToScreen: LocalToScreenFn,
): void {
  if (entity.hasComponent('Camera2DComponent')) return;

  const sprite = entity.getComponent<SpriteRenderer>('SpriteRenderer');
  const w = sprite ? sprite.width : 50;
  const h = sprite ? sprite.height : 50;
  const hw = w / 2;
  const hh = h / 2;

  const tl = localToScreen(entity, -hw, hh);
  const tr = localToScreen(entity, hw, hh);
  const br = localToScreen(entity, hw, -hh);
  const bl = localToScreen(entity, -hw, -hh);
  const corners = [tl, tr, br, bl];

  ctx.save();
  ctx.strokeStyle = '#4a9eff';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < 4; i++) ctx.lineTo(corners[i].x, corners[i].y);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);

  const handleSize = 6;
  ctx.fillStyle = '#4a9eff';
  for (const c of corners) {
    ctx.fillRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
  }
  ctx.restore();
}

// ── Hitbox rendering ──────────────────────────────────

export function drawHitbox(
  ctx: CanvasRenderingContext2D,
  entity: Entity,
  localToScreen: LocalToScreenFn,
  activeZoom: number,
): void {
  if (!entity.active) return;
  const collider = entity.getComponent<Collider2D>('Collider2D');
  if (!collider || !collider.showHitbox) return;

  if (collider.shape === 'circle') {
    drawCircleHitbox(ctx, entity, collider, localToScreen, activeZoom);
  } else if (collider.shape === 'polygon') {
    drawPolygonHitbox(ctx, entity, collider, localToScreen);
  } else {
    drawBoxHitbox(ctx, entity, collider, localToScreen);
  }
}

function drawCircleHitbox(
  ctx: CanvasRenderingContext2D,
  entity: Entity,
  collider: Collider2D,
  localToScreen: LocalToScreenFn,
  activeZoom: number,
): void {
  const center = localToScreen(entity, collider.offset.x, collider.offset.y);
  const world = getWorldTransform(entity);
  const avgScale = (Math.abs(world.scaleX) + Math.abs(world.scaleY)) / 2;
  const screenRadius = collider.radius * avgScale * activeZoom;

  ctx.save();
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(center.x, center.y, screenRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawPolygonHitbox(
  ctx: CanvasRenderingContext2D,
  entity: Entity,
  collider: Collider2D,
  localToScreen: LocalToScreenFn,
): void {
  const sprite = entity.getComponent<SpriteRenderer>('SpriteRenderer');
  let rawPts: { x: number; y: number }[] | null = null;

  if (sprite) {
    if (sprite.shapeType === 'polygon' && sprite.polygonPoints.length >= 3) {
      rawPts = sprite.polygonPoints.map(p => ({ x: p.x, y: p.y }));
    } else if (sprite.shapeType === 'triangle') {
      const hw = sprite.width / 2, hh = sprite.height / 2;
      rawPts = [{ x: 0, y: hh }, { x: -hw, y: -hh }, { x: hw, y: -hh }];
    } else if (sprite.shapeType === 'rectangle') {
      const hw = sprite.width / 2, hh = sprite.height / 2;
      rawPts = [{ x: -hw, y: -hh }, { x: hw, y: -hh }, { x: hw, y: hh }, { x: -hw, y: hh }];
    }
  }

  if (!rawPts || rawPts.length < 3) {
    const hw = collider.width / 2, hh = collider.height / 2;
    rawPts = [{ x: -hw, y: -hh }, { x: hw, y: -hh }, { x: hw, y: hh }, { x: -hw, y: hh }];
  }

  const hull = convexHull(rawPts);
  if (hull.length < 3) return;

  ctx.save();
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  ctx.beginPath();
  const first = localToScreen(entity, hull[0].x + collider.offset.x, hull[0].y + collider.offset.y);
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < hull.length; i++) {
    const p = localToScreen(entity, hull[i].x + collider.offset.x, hull[i].y + collider.offset.y);
    ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawBoxHitbox(
  ctx: CanvasRenderingContext2D,
  entity: Entity,
  collider: Collider2D,
  localToScreen: LocalToScreenFn,
): void {
  const hw = collider.width / 2, hh = collider.height / 2;
  const ox = collider.offset.x, oy = collider.offset.y;
  const c0 = localToScreen(entity, -hw + ox, -hh + oy);
  const c1 = localToScreen(entity,  hw + ox, -hh + oy);
  const c2 = localToScreen(entity,  hw + ox,  hh + oy);
  const c3 = localToScreen(entity, -hw + ox,  hh + oy);

  ctx.save();
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(c0.x, c0.y);
  ctx.lineTo(c1.x, c1.y);
  ctx.lineTo(c2.x, c2.y);
  ctx.lineTo(c3.x, c3.y);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}
