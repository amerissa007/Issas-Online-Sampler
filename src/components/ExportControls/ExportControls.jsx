import { useState } from "react";
import "./exportcontrols.css";
import { renderLoopToWav, downloadBlob } from "../../utils/ExportLoop";
import { renderPatternToWav } from "../../utils/ExportPattern";

export default function ExportControls({
  audioCtx,
  buffer,
  reversedBuffer,
  reverse,
  loopStart,
  loopEnd,
  rate,
  volume,
  pan,
  bpm,
  steps,
  gate,
  filterCutoff,
  filterQ,
  delayTime,
  delayFeedback,
  delayMix,
}) {
  const [bars, setBars] = useState(2);

  const loopDisabled = !buffer || !(loopEnd > loopStart);
  const pattDisabled = !buffer || !steps?.some(Boolean);

  const onExportLoop = async () => {
    try {
      const blob = await renderLoopToWav({
        ctxLike: audioCtx,
        buffer,
        reversedBuffer,
        reverse,
        loopStart,
        loopEnd,
        rate,
        filterCutoff,
        filterQ,
        delayTime,
        delayFeedback,
        delayMix,
        volume,
        pan,
        sampleRate: 44100,
      });
      downloadBlob(blob, "sampler-loop.wav");
    } catch (e) {
      console.error(e);
      alert("Export failed (loop). See console.");
    }
  };

  const onExportPattern = async () => {
    try {
      const blob = await renderPatternToWav({
        ctxLike: audioCtx,
        buffer,
        reversedBuffer,
        reverse,
        loopStart,
        loopEnd,
        steps,
        bpm,
        bars,
        rate,
        gate,
        filterCutoff,
        filterQ,
        delayTime,
        delayFeedback,
        delayMix,
        volume,
        pan,
        sampleRate: 44100,
      });
      downloadBlob(blob, `sampler-pattern-${bars}bars.wav`);
    } catch (e) {
      console.error(e);
      alert("Export failed (pattern). See console.");
    }
  };

  return (
    <div className="export-controls">
      <button onClick={onExportLoop} disabled={loopDisabled}>
        ⬇️ Export Loop as WAV
      </button>
      {loopDisabled && <span className="hint">Load audio and set a valid loop.</span>}

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
        <label>Bars</label>
        <input
          type="number"
          min="1"
          max="16"
          value={bars}
          onChange={(e) => setBars(Math.max(1, Math.min(16, +e.target.value || 1)))}
          style={{ width: 56 }}
        />
        <button onClick={onExportPattern} disabled={pattDisabled}>
          ⬇️ Export Sequencer WAV
        </button>
      </div>
    </div>
  );
}
