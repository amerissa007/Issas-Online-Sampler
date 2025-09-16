import "./effectscontrols.css";

export default function EffectsControls({
  filterCutoff, setFilterCutoff,
  filterQ, setFilterQ,
  delayTime, setDelayTime,
  delayFeedback, setDelayFeedback,
  delayMix, setDelayMix,
}) {
  return (
    <div className="effects-controls">
      <h3>Effects</h3>

      <div className="row">
        <label>LPF Cutoff</label>
        <input
          type="range" min="50" max="20000" step="1"
          value={filterCutoff}
          onChange={(e)=>setFilterCutoff(+e.target.value)}
        />
        <span className="value">{formatHz(filterCutoff)}</span>
      </div>

      <div className="row">
        <label>LPF Q</label>
        <input
          type="range" min="0.1" max="18" step="0.1"
          value={filterQ}
          onChange={(e)=>setFilterQ(+e.target.value)}
        />
        <span className="value">{filterQ.toFixed(1)}</span>
      </div>

      <hr />

      <div className="row">
        <label>Delay Time</label>
        <input
          type="range" min="0" max="1.0" step="0.01"
          value={delayTime}
          onChange={(e)=>setDelayTime(+e.target.value)}
        />
        <span className="value">{delayTime.toFixed(2)}s</span>
      </div>

      <div className="row">
        <label>Feedback</label>
        <input
          type="range" min="0" max="0.95" step="0.01"
          value={delayFeedback}
          onChange={(e)=>setDelayFeedback(+e.target.value)}
        />
        <span className="value">{Math.round(delayFeedback*100)}%</span>
      </div>

      <div className="row">
        <label>Delay Mix</label>
        <input
          type="range" min="0" max="1" step="0.01"
          value={delayMix}
          onChange={(e)=>setDelayMix(+e.target.value)}
        />
        <span className="value">{Math.round(delayMix*100)}%</span>
      </div>
    </div>
  );
}

function formatHz(v) {
  if (v >= 1000) return (v/1000).toFixed(2) + " kHz";
  return Math.round(v) + " Hz";
}
