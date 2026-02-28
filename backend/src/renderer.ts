class Renderer {

    private ctx: CanvasRenderingContext2D | null;

    constructor(
        public canvas: HTMLCanvasElement,
        public mainCameraObject: GameObject
    ) {
        this.ctx = canvas.getContext("2d");
    }

    renderGameObject(gameObject: GameObject): void {
        if (!this.ctx) return;

        const camera = this.mainCameraObject.getComponent<Camera>(Camera);
        const camTransform = this.mainCameraObject.getComponent<Transform>(Transform);
        const modelTransform = gameObject.getComponent<Transform>(Transform);

        if (!camera || !camTransform || !modelTransform) return;

        const aspect = this.canvas.width / this.canvas.height;

        // ------------------------
        // Build Matrices
        // ------------------------

        const modelMatrix = Mat4.fromTRS(
            modelTransform.getGlobalPosition(),
            modelTransform.getGlobalRotation(),
            modelTransform.getGlobalSize()
        );

        const viewMatrix = Mat4.fromTRS(
            camTransform.getGlobalPosition(),
            camTransform.getGlobalRotation(),
            new Vec3(1,1,1)
        );

        // Invert camera transform (simple inverse for TRS)
        const invView = this.inverseTRS(camTransform);

        let projectionMatrix: Mat4;

        if (camera.projection === projectionType.perspective) {
            projectionMatrix = Mat4.perspective(
                camera.fov,
                aspect,
                camera.near,
                camera.far
            );
        } else {
            projectionMatrix = Mat4.orthographic(
                -1,1,-1,1,
                camera.near,
                camera.far
            );
        }

        const mvp = projectionMatrix
            .multiply(invView)
            .multiply(modelMatrix);

        const shapes = gameObject.inspector.components
            .filter(c => c instanceof Shape) as Shape[];

        for (const shape of shapes) {

            const vertices = shape.getPoints().map(v =>
                this.toScreen(mvp.multiplyVec3(v))
            );

            this.draw(vertices, gameObject);
        }
    }

    private inverseTRS(transform: Transform): Mat4 {

        const pos = transform.getGlobalPosition();
        const rot = transform.getGlobalRotation();

        const invT = Mat4.translation(new Vec3(-pos.x, -pos.y, -pos.z));
        const invR = Mat4.rotationZ(-rot.z)
            .multiply(Mat4.rotationY(-rot.y))
            .multiply(Mat4.rotationX(-rot.x));

        return invR.multiply(invT);
    }

    private toScreen(v: Vec3): Vec3 {

        const x = (v.x + 1) * 0.5 * this.canvas.width;
        const y = (1 - (v.y + 1) * 0.5) * this.canvas.height;

        return new Vec3(x, y, v.z);
    }

    private draw(vertices: Vec3[], go: GameObject) {

        const color = go.getComponent(Color);
        if (color) this.ctx!.fillStyle = color.getHex();

        this.ctx!.beginPath();
        this.ctx!.moveTo(vertices[0].x, vertices[0].y);

        for (let i = 1; i < vertices.length; i++) {
            this.ctx!.lineTo(vertices[i].x, vertices[i].y);
        }

        this.ctx!.closePath();
        this.ctx!.fill();
    }

    renderBackground(): void {
        if (!this.ctx) return;
        const color = this.mainCameraObject.getComponent<Color>(Color);
        if (color) {
            this.ctx.fillStyle = color.getHex();
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
}