"use strict";
var projectionType;
(function (projectionType) {
    projectionType["perspective"] = "perspective";
    projectionType["orthographic"] = "orthographic";
})(projectionType || (projectionType = {}));
class Camera extends Component {
    constructor(fov, near, far, projection = projectionType.orthographic) {
        super("Camera");
        this.fov = fov;
        this.near = near;
        this.far = far;
        this.projection = projection;
        this.fov = fov;
        this.near = near;
        this.far = far;
        this.projection = projection;
    }
}
