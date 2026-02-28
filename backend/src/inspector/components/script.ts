abstract class Script extends Component {
    abstract start(): void;
    abstract update(deltaTime: number): void;
}