import React from "react";
import Knob from "../ui/Knob";            
import "./reverbcontrols.css";

export default function ReverbControls({
  reverbMix, setReverbMix,
  reverbPreDelay, setReverbPreDelay,
  reverbHighCut, setReverbHighCut,
}) {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  return (
    <div className="reverb panel">
      <h3>Reverb</h3>

      <div className="knob-grid">
        <Knob
          label="Pre-Delay"
          sublabel={`${(reverbPreDelay * 1000).toFixed(0)} ms`}
          value={clamp(reverbPreDelay, 0, 0.2)}
          min={0}
          max={0.2}
          step={0.001}
          onChange={(v) => setReverbPreDelay(v)}
        />

        <Knob
          label="High-Cut"
          sublabel={`${Math.round(reverbHighCut)} Hz`}
          value={clamp(reverbHighCut, 2000, 16000)}
          min={2000}
          max={16000}
          step={10}
          onChange={(v) => setReverbHighCut(v)}
        />

        <Knob
          label="Mix"
          sublabel={`${Math.round(reverbMix * 100)}%`}
          value={clamp(reverbMix, 0, 1)}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => setReverbMix(v)}
        />
      </div>
    </div>
  );
}
