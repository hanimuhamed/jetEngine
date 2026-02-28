"use strict";
const gameObjects = [];
class GameObject {
    constructor(name = "New GameObject") {
        this.name = name;
        this.name = name;
        const transform = new Transform(new Vec3(), new Vec3(), new Vec3(1, 1, 1));
        const color = new Color(255, 255, 255, 1);
        this.inspector = new Inspector([transform, color]);
        this.children = [];
        gameObjects.push(this);
    }
}
function Instantiate(gameObject, position = new Vec3(), rotation = 0, scale = new Vec3(1, 1)) { }
