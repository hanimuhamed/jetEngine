class GameScreen {
    renderer: Renderer;
    constructor(canvas: HTMLCanvasElement, mainCameraObject: GameObject) {
        this.renderer = new Renderer(canvas, mainCameraObject);
    }

    render(): void {
        this.renderer.renderBackground();
        GameObject.gameObjectPool.sort((a, b) => {
            const aTransform = a.getComponent<Transform>(Transform);
            const bTransform = b.getComponent<Transform>(Transform);
            if (!aTransform || !bTransform) return 0;
            return aTransform.getGlobalPosition().z - bTransform.getGlobalPosition().z;
        });
        for (const gameObject of GameObject.gameObjectPool) {
            this.renderer.renderGameObject(gameObject);
        }
    }
}