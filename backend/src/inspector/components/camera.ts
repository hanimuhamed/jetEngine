enum projectionType {
    perspective = "perspective",
    orthographic = "orthographic"
}

class Camera extends Component {
    constructor(public fov: number, public near: number, public far: number, public projection: projectionType = projectionType.orthographic) {
        super("Camera");
        this.fov = fov;
        this.near = near;
        this.far = far;
        this.projection = projection;
    }
}