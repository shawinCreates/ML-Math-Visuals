interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange(v: number): void;
  format?(v: number): string;
  disabled?: boolean;
}

export function Slider({ label, value, min, max, step, onChange, format, disabled }: SliderProps) {
  return (
    <label className={"slider" + (disabled ? " slider-disabled" : "")}>
      <span className="slider-label">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="slider-value">{format ? format(value) : value}</span>
    </label>
  );
}
