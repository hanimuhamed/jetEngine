"use strict";
class Transform extends Component {
    constructor(localPosition = new Vec3(), localRotation = new Vec3(), localSize = new Vec3(1, 1, 1)) {
        super("Transform");
        this.localPosition = localPosition;
        this.localRotation = localRotation;
        this.localSize = localSize;
        // TODO: fix this piece of shit
        this.parent = null;
        this.children = [];
        this.globalPosition = new Vec3();
        this.globalRotation = new Vec3();
        this.globalSize = new Vec3(1, 1, 1);
        this.localPosition = localPosition;
        this.localRotation = localRotation;
        this.localSize = localSize;
        this.globalPosition = this.localPosition.add(this.parent ? this.parent.globalPosition : new Vec3());
        this.globalRotation = this.localRotation.add(this.parent ? this.parent.globalRotation : new Vec3());
        this.globalSize = this.localSize.scale(this.parent ? this.parent.globalSize.x : 1, this.parent ? this.parent.globalSize.y : 1, this.parent ? this.parent.globalSize.z : 1);
    }
    translate(x, y, z) {
        this.localPosition = this.localPosition.add(new Vec3(x, y, z));
        for (const child of this.children) {
            child.globalPosition = child.localPosition.add(this.globalPosition);
        }
    }
    rotate(angle) {
        this.localRotation = this.localRotation.add(new Vec3(0, angle, 0));
        for (const child of this.children) {
            child.globalRotation = child.localRotation.add(this.globalRotation);
        }
    }
    scale(x, y, z) {
        this.localSize = this.localSize.add(new Vec3(x, y, z));
        for (const child of this.children) {
            child.globalSize = child.localSize.scale(this.globalSize.x, this.globalSize.y, this.globalSize.z);
        }
    }
}
