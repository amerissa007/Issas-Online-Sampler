import React, { useId } from "react";
import "./toggleswitch.css";

export default function ToggleSwitch({
  checked = false,
  onChange,
  label,
  size = "md",
  id,
}) {
  const autoId = useId();
  const inputId = id || autoId;

  const sizeToFont = { sm: 14, md: 17, lg: 20 };

  return (
    <div className="toggle-wrap">
      <label
        className="switch"
        style={{ fontSize: `${sizeToFont[size] || 17}px` }}
        aria-label={label || "toggle"}
      >
        <input
          id={inputId}
          type="checkbox"
          checked={!!checked}
          onChange={(e) => onChange?.(e.target.checked)}
        />
        <span className="slider" />
      </label>
      {label ? <span className="toggle-text">{label}</span> : null}
    </div>
  );
}
