import "./samplecontrols.css";

export default function SampleControls({
  buffer,
  volume, setVolume,
  pan, setPan,
  semitones, setSemitones,
  rate,
  loopStart, setLoopStart,
  loopEnd, setLoopEnd,
  gate, setGate,
  reverse, setReverse,
  bpm, setBpm,
}) {
  if (!buffer) return null;
  const dur = buffer.duration;

  const clampStart = (v) => setLoopStart(Math.min(+v, loopEnd - 0.01));
  const clampEnd   = (v) => setLoopEnd(Math.max(+v, loopStart + 0.01));

  return (
    <div className="sample-controls">
      <div className="row">
        <label>Volume</label>
        <input type="range" min="0" max="1" step="0.01"
               value={volume} onChange={(e)=>setVolume(+e.target.value)} />
        <span className="value">{volume.toFixed(2)}</span>
      </div>

      <div className="row">
        <label>Pan</label>
        <input type="range" min="-1" max="1" step="0.01"
               value={pan} onChange={(e)=>setPan(+e.target.value)} />
        <span className="value">{pan.toFixed(2)}</span>
      </div>

      <div className="row">
        <label>Pitch (st)</label>
        <input type="range" min="-12" max="12" step="1"
               value={semitones} onChange={(e)=>setSemitones(+e.target.value)} />
        <span className="value">
          {semitones >= 0 ? `+${semitones}` : semitones} st · {rate.toFixed(2)}×
        </span>
      </div>

      <div className="row">
        <label>Reverse</label>
        <input
          type="checkbox"
          checked={reverse}
          onChange={(e)=>setReverse(e.target.checked)}
        />
        <span className="value">{reverse ? "On" : "Off"}</span>
      </div>

      <hr />

      <div className="row">
        <label>Loop Start</label>
        <input type="range" min="0" max={dur} step="0.01"
               value={loopStart} onChange={(e)=>clampStart(e.target.value)} />
        <span className="value">{loopStart.toFixed(2)}s</span>
      </div>

      <div className="row">
        <label>Loop End</label>
        <input type="range" min="0" max={dur} step="0.01"
               value={loopEnd} onChange={(e)=>clampEnd(e.target.value)} />
        <span className="value">{loopEnd.toFixed(2)}s</span>
      </div>

      <div className="row">
        <label>Gate</label>
        <input type="range" min="0.05" max={Math.min(1, dur)} step="0.01"
               value={gate} onChange={(e)=>setGate(+e.target.value)} />
        <span className="value">{gate.toFixed(2)}s</span>
      </div>

      <hr />

      <div className="row">
        <label>BPM</label>
        <input type="range" min="60" max="180" step="1"
               value={bpm} onChange={(e)=>setBpm(+e.target.value)} />
        <span className="value">{bpm}</span>
      </div>
    </div>
  );
}
