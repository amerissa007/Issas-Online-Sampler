import Knob from "../ui/Knob";
import "./effectscontrols.css";

export default function EffectsControls({
  filterCutoff,   setFilterCutoff,
  filterQ,        setFilterQ,
  delayTime,      setDelayTime,
  delayFeedback,  setDelayFeedback,
  delayMix,       setDelayMix,
}) {
  // helper to give a log-ish feel for cutoff using linear knob
  const formatHz = (v) => {
    if (v >= 1000) return (v / 1000).toFixed(v >= 10000 ? 0 : 1) + " kHz";
    return Math.max(20, v).toFixed(0) + " Hz";
  };

  return (
    <div className="fx panel">
      <h3>Effects</h3>

      <div className="knob-grid">
        <Knob
          label="Delay Time"
          value={delayTime}
          min={0.0} max={1.0} step={0.005}
          defaultValue={0.25}
          onChange={setDelayTime}
          format={(x) => x.toFixed(3) + " s"}
        />

        <Knob
          label="Feedback"
          value={delayFeedback}
          min={0.0} max={0.95} step={0.01}
          defaultValue={0.25}
          onChange={(v) => setDelayFeedback(Math.min(0.95, Math.max(0, v)))}
          format={(x) => (x * 100).toFixed(0) + "%"}
        />

        <Knob
          label="Delay Mix"
          value={delayMix}
          min={0.0} max={1.0} step={0.01}
          defaultValue={0.25}
          onChange={(v) => setDelayMix(Math.min(1, Math.max(0, v)))}
          format={(x) => (x * 100).toFixed(0) + "%"}
        />

        <Knob
          label="LPF Cutoff"
          value={filterCutoff}
          min={40} max={20000} step={1}
          defaultValue={12000}
          onChange={(v) => setFilterCutoff(Math.min(20000, Math.max(40, v)))}
          format={formatHz}
        />

        <Knob
          label="LPF Q"
          value={filterQ}
          min={0.1} max={18} step={0.1}
          defaultValue={0.7}
          onChange={(v) => setFilterQ(Math.min(18, Math.max(0.1, v)))}
          format={(x) => x.toFixed(1)}
        />
      </div>

      <p className="hint">Shift-drag = fine; double-click any knob to reset.</p>
    </div>
  );
}
