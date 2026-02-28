// engine/index.ts — barrel export for the entire engine
export { Vec2 } from './core/Math2D';
export { Component } from './core/Component';
export { Entity } from './core/Entity';
export { InputManager } from './core/InputManager';
export { GameLoop } from './core/GameLoop';
export type { EngineState } from './core/GameLoop';

export { Transform2D } from './components/Transform2D';
export { SpriteRenderer } from './components/SpriteRenderer';
export type { ShapeType } from './components/SpriteRenderer';
export { RigidBody2D } from './components/RigidBody2D';
export { Collider2D } from './components/Collider2D';
export { ScriptComponent, DEFAULT_SCRIPT_TEMPLATE } from './components/ScriptComponent';

export { Renderer2D } from './rendering/Renderer2D';
export type { Camera2D } from './rendering/Renderer2D';

export { PhysicsSystem } from './systems/PhysicsSystem';

export { ScriptRunner } from './scripting/ScriptRunner';
export type { TimeInfo, SceneProxy } from './scripting/ScriptRunner';

export { Scene } from './scene/Scene';
export { SceneSerializer } from './scene/SceneSerializer';
export type { SerializedScene, SerializedEntity } from './scene/SceneSerializer';
