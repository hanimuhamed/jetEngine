"use strict";
class Physics extends Component {
    constructor(mass) {
        super("Physics");
        this.mass = mass;
        this.velocity = new Vec3();
        this.gravity = new Vec3(0, 9.81, 0);
        this.mass = mass;
    }
}
