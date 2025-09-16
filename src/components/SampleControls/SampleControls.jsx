import "./samplecontrols.css";

export default function SampleControls({
  buffer,
  loopStart, loopEnd,
  setLoopStart, setLoopEnd
}) {
  if (!buffer) return null;
  const dur = buffer.duration;

  const onStart = (v) => setLoopStart(Math.min(+v, loopEnd - 0.01));
  const onEnd   = (v) => setLoopEnd(Math.max(+v, loopStart + 0.01));

  return (
    <div className="sample-controls">
      <div className="row">
        <label>Loop Start: {loopStart.toFixed(2)}s</label>
        <input type="range" min="0" max={dur} step="0.01" value={loopStart} onChange={e=>onStart(e.target.value)} />
      </div>
      <div className="row">
        <label>Loop End: {loopEnd.toFixed(2)}s</label>
        <input type="range" min="0" max={dur} step="0.01" value={loopEnd} onChange={e=>onEnd(e.target.value)} />
      </div>
    </div>
  );
}
