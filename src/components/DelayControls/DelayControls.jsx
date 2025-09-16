import Knob from "../ui/Knob";
import "./delaycontrols.css";

export default function DelayControls({
  delayTime, setDelayTime,
  delayFeedback, setDelayFeedback,
  delayMix, setDelayMix,
}) {
  return (
    <div className="delay panel">
      <h3>Delay</h3>
      <div className="knob-grid">
        <Knob
          label="Time"
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
          label="Mix"
          value={delayMix}
          min={0.0} max={1.0} step={0.01}
          defaultValue={0.25}
          onChange={(v) => setDelayMix(Math.min(1, Math.max(0, v)))}
          format={(x) => (x * 100).toFixed(0) + "%"}
        />
      </div>
    </div>
  );
}
