import Knob from "../ui/Knob";
import "./filtereqcontrols.css";

export default function FilterEQControls({
  // HPF
  hpfCutoff, setHpfCutoff,
  // MID (peaking)
  midFreq, setMidFreq,
  midGainDb, setMidGainDb,
  midQ, setMidQ,
  // LPF
  lpfCutoff, setLpfCutoff,
}) {
  const fmtHz = (v) =>
    v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + " kHz" : v.toFixed(0) + " Hz";
  const fmtDb = (v) => (v >= 0 ? "+" : "") + v.toFixed(1) + " dB";

  return (
    <div className="eq3 panel">
      <h3>EQ (HP • MID • LP)</h3>
      <div className="eq-grid">
        {/* High-pass */}
        <Knob
          label="HPF Cut"
          value={hpfCutoff}
          min={20} max={1000} step={1}
          defaultValue={40}
          onChange={(v)=>setHpfCutoff(Math.min(1000, Math.max(20, v)))}
          format={fmtHz}
        />

        {/* Mid peaking */}
        <Knob
          label="Mid Freq"
          value={midFreq}
          min={200} max={5000} step={1}
          defaultValue={1000}
          onChange={(v)=>setMidFreq(Math.min(5000, Math.max(200, v)))}
          format={fmtHz}
        />
        <Knob
          label="Mid Gain"
          value={midGainDb}
          min={-12} max={12} step={0.5}
          defaultValue={0}
          onChange={(v)=>setMidGainDb(Math.min(12, Math.max(-12, v)))}
          format={fmtDb}
        />
        <Knob
          label="Mid Q"
          value={midQ}
          min={0.1} max={10} step={0.1}
          defaultValue={0.7}
          onChange={(v)=>setMidQ(Math.min(10, Math.max(0.1, v)))}
          format={(x)=>x.toFixed(1)}
        />

        {/* Low-pass */}
        <Knob
          label="LPF Cut"
          value={lpfCutoff}
          min={1000} max={20000} step={1}
          defaultValue={12000}
          onChange={(v)=>setLpfCutoff(Math.min(20000, Math.max(1000, v)))}
          format={fmtHz}
        />
      </div>
      <p className="hint">Shift-drag = fine • Double-click = reset</p>
    </div>
  );
}
