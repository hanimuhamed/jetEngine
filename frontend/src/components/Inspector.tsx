import DraggableNumber from "../io/draggableNumber";

function Inspector({ components }: { components: React.ReactNode[] }) {
  const selectedGameObject = "Selected GameObject"; // TODO: get this from state
  return (
    <div className="inspector">
      <h2>{selectedGameObject}</h2>
      {components}
    </div>
  )
}

// TODO: fix InspectorComponent //

function InspectorComponent({name, attributes }: { name: string, attributes: Record<string, any>}) {
  const renderField = (key: string, value: any) => {
    function onChange(key: string, value: any) {
      attributes[key] = value;
    }
    if (typeof value === "number") {
      return (
        <DraggableNumber
          value={value}
          onChange={(val) => onChange(key, val)}
        />
      );
    } else if (typeof value === "boolean") {
      return (
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(key, e.target.checked)}
        />
      );
    } else if (typeof value === "string") {
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(key, e.target.value)}
        />
      );
    } else if (typeof value === "object" && "x" in value && "y" in value && "z" in value) {
      return (
        <div className="vector3-field">
          <DraggableNumber
            value={value.x}
            onChange={(val) => onChange(key, { ...value, x: val })}
          />
          <DraggableNumber
            value={value.y}
            onChange={(val) => onChange(key, { ...value, y: val })}
          />
          <DraggableNumber
            value={value.z}
            onChange={(val) => onChange(key, { ...value, z: val })}
          />
        </div>
      );
    }
  };
  return (
    <div className="inspector-component">
      <h3>{name}</h3>
      {Object.entries(attributes).map(([key, value]) => (
        <div key={key} className="field">
          <label>{key}</label>
          {renderField(key, value)}
        </div>
      ))}
    </div>
  );
}

export default Inspector;
export { InspectorComponent };