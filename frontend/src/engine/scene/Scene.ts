// engine/scene/Scene.ts
import { Entity } from '../core/Entity';

export class Scene {
  public name: string;
  public entities: Entity[];

  constructor(name: string = 'Untitled Scene') {
    this.name = name;
    this.entities = [];
  }

  addEntity(entity: Entity): void {
    this.entities.push(entity);
  }

  removeEntity(id: string): void {
    this.entities = this.entities.filter(e => e.id !== id);
  }

  getEntityById(id: string): Entity | null {
    return this.entities.find(e => e.id === id) ?? null;
  }

  getEntityByName(name: string): Entity | null {
    return this.entities.find(e => e.name === name) ?? null;
  }

  clear(): void {
    this.entities = [];
  }
}
