class Physics extends Component {
    velocity: Vec3 = new Vec3();
    gravity: Vec3 = new Vec3(0, 9.81, 0);
    constructor(public mass: number) {
        super("Physics");
        this.mass = mass;
    }
    // TODO: add physics update method that applies gravity and velocity to the transform component
}