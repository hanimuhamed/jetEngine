"use strict";
class Engine {
    constructor(hierarchy, inspector, assets, screen) {
        this.hierarchy = hierarchy;
        this.inspector = inspector;
        this.assets = assets;
        this.screen = screen;
        this.hierarchy = hierarchy;
        this.inspector = inspector;
        this.assets = assets;
        this.screen = screen;
        this.isPlaying = false;
    }
    onStart() {
        this.screen.render();
        function traverseAndRunStart(obj) {
            for (const child of obj.children) {
                traverseAndRunStart(child);
            }
            for (const component of obj.inspector.components) {
                if (component instanceof Script) {
                    component.start();
                }
            }
        }
        for (const obj of this.hierarchy.gameObjects) {
            traverseAndRunStart(obj);
        }
        if (!this.isPlaying) {
            return;
        }
        this.updateLoop();
    }
    updateLoop() {
        const deltaTime = 16;
        function traverseAndRunUpdate(obj) {
            for (const child of obj.children) {
                traverseAndRunUpdate(child);
            }
            for (const component of obj.inspector.components) {
                if (component instanceof Script) {
                    component.update(deltaTime);
                }
            }
        }
        for (const obj of this.hierarchy.gameObjects) {
            traverseAndRunUpdate(obj);
        }
        if (!this.isPlaying) {
            return;
        }
        requestAnimationFrame(this.updateLoop.bind(this));
    }
}
