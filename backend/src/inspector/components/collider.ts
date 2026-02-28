class Collider extends Component {
    // supports AABB rectangle linear collision only
    constructor(public width: number, public height: number) {
        super("Collider");
        this.width = width;
        this.height = height;
    }
    // TODO: add collision detection methods
}