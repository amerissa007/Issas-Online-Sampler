// src/components/SliceControls/slicecontrols.jsx
import "./slicecontrols.css";

export default function SliceControls({
  buffer,
  slicePoints,
  setSlicePoints,
  loopStart,
  loopEnd,
}) {
  if (!buffer) return null;

  const clearAll = () => setSlicePoints([]);
  const fitLoopAsOne = () => setSlicePoints([loopStart]); // single slice start; PadGrid will end at loopEnd
  const autoEven = (n) => {
    const arr = [];
    const len = Math.max(0, loopEnd - loopStart);
    if (len <= 0) return;
    for (let i = 0; i < n; i++) arr.push(loopStart + (i / n) * len);
    setSlicePoints(arr);
  };

  return (
    <div className="slice-controls">
      <h3>Slices</h3>
      <div className="row">
        <button onClick={clearAll}>Clear All</button>
        <button onClick={() => fitLoopAsOne()}>One Slice (Loop)</button>
        <label>Auto:</label>
        {[4, 8, 12, 16, 24, 32].map(n => (
          <button key={n} onClick={() => autoEven(n)}>{n}</button>
        ))}
      </div>
      <div className="row small">
        <span className="hint">
          Add: Alt/⌥-click waveform. Remove: Ctrl/⌘-click marker. Pads use slice segments inside the current loop.
        </span>
      </div>
      <div className="rows">
        {slicePoints.slice().sort((a,b)=>a-b).map((t, i) => (
          <div className="row" key={`${t}-${i}`}>
            <span className="idx">#{i+1}</span>
            <span className="time">{t.toFixed(3)}s</span>
          </div>
        ))}
      </div>
    </div>
  );
}
