"use strict";
class GameScreen {
    constructor(canvas, mainCameraObject) {
        this.renderer = new Renderer(canvas, mainCameraObject);
    }
    render() {
        this.renderer.renderBackground();
        GameObject.gameObjectPool.sort((a, b) => {
            const aTransform = a.getComponent(Transform);
            const bTransform = b.getComponent(Transform);
            if (!aTransform || !bTransform)
                return 0;
            return aTransform.getGlobalPosition().z - bTransform.getGlobalPosition().z;
        });
        for (const gameObject of GameObject.gameObjectPool) {
            this.renderer.renderGameObject(gameObject);
        }
    }
}
