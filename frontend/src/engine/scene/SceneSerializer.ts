// engine/scene/SceneSerializer.ts
import { Entity } from '../core/Entity';
import { Component } from '../core/Component';
import { Transform2D } from '../components/Transform2D';
import { SpriteRenderer } from '../components/SpriteRenderer';
import { RigidBody2D } from '../components/RigidBody2D';
import { Collider2D } from '../components/Collider2D';
import { ScriptComponent } from '../components/ScriptComponent';
import { Camera2DComponent } from '../components/Camera2DComponent';
import { Scene } from './Scene';

export interface SerializedScene {
  name: string;
  entities: SerializedEntity[];
}

export interface SerializedEntity {
  id: string;
  name: string;
  active: boolean;
  components: Record<string, unknown>[];
  children?: SerializedEntity[];
}

function createComponentFromType(type: string): Component | null {
  switch (type) {
    case 'Transform2D':
      return new Transform2D();
    case 'SpriteRenderer':
      return new SpriteRenderer();
    case 'RigidBody2D':
      return new RigidBody2D();
    case 'Collider2D':
      return new Collider2D();
    case 'ScriptComponent':
      return new ScriptComponent();
    case 'Camera2DComponent':
      return new Camera2DComponent();
    default:
      console.warn(`Unknown component type: ${type}`);
      return null;
  }
}

function serializeEntity(entity: Entity): SerializedEntity {
  return {
    id: entity.id,
    name: entity.name,
    active: entity.active,
    components: entity.getComponentsList().map(c => c.serialize()),
    children: entity.children.length > 0
      ? entity.children.map(child => serializeEntity(child))
      : undefined,
  };
}

function deserializeEntity(data: SerializedEntity): Entity {
  const entity = new Entity(data.name, data.id);
  entity.active = data.active;

  for (const compData of data.components) {
    const type = compData.type as string;
    const component = createComponentFromType(type);
    if (component) {
      component.deserialize(compData);
      entity.addComponent(component);
    }
  }

  if (data.children) {
    for (const childData of data.children) {
      const child = deserializeEntity(childData);
      entity.addChild(child);
    }
  }

  return entity;
}

export class SceneSerializer {
  static serialize(scene: Scene): SerializedScene {
    return {
      name: scene.name,
      entities: scene.entities.map(entity => serializeEntity(entity)),
    };
  }

  static deserialize(data: SerializedScene): Scene {
    const scene = new Scene(data.name);

    for (const entityData of data.entities) {
      const entity = deserializeEntity(entityData);
      scene.addEntity(entity);
    }

    return scene;
  }

  static toJSON(scene: Scene): string {
    return JSON.stringify(SceneSerializer.serialize(scene), null, 2);
  }

  static fromJSON(json: string): Scene {
    const data = JSON.parse(json) as SerializedScene;
    return SceneSerializer.deserialize(data);
  }
}
