// src/App.js
import { useEffect, useRef, useState } from "react";
import useAudioContext from "./audio/UseAudioContext";
import { decodeAudioFile } from "./audio/DecodeAudioFile";
import "./App.css";

import FileImport from "./components/FileImport/FileImport";
import WaveformViewer from "./components/WaveformViewer/WaveformViewer";
import SampleControls from "./components/SampleControls/SampleControls";
import TransportControls from "./components/TransportControls/TransportControls";
import StepSequencer from "./components/StepSequencer/StepSequencer";
import ExportControls from "./components/ExportControls/ExportControls";
import PadGrid from "./components/PadGrid/PadGrid";
import SliceControls from "./components/SliceControls/SliceControls";

import DelayControls from "./components/DelayControls/DelayControls";
// Use the casing that matches your file on disk:
import FilterEQControls from "./components/FilterEQControls/FilterEQControls";

export default function App() {
  // ---- Audio context ----
  const { ensureAudioContext } = useAudioContext();
  const [ctx, setCtx] = useState(null);

  // ---- Buffers / transport ----
  const [buffer, setBuffer] = useState(null);
  const [reversedBuffer, setReversedBuffer] = useState(null);
  const [reverse, setReverse] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(0);

  // ---- Master controls ----
  const [gain, setGain] = useState(0.9);     // 0..1
  const [pan, setPan] = useState(0);         // -1..1
  const [detuneSemis, setDetuneSemis] = useState(0);
  const [rate, setRate] = useState(1.0);     // 0.25..2.0

  // ---- Sequencer / loop params ----
  const [bpm, setBpm] = useState(120);
  const [gate, setGate] = useState(0.20);
  const [steps, setSteps] = useState(Array(16).fill(false));

  // ---- Slices ----
  const [slicePoints, setSlicePoints] = useState([]);
  const [stepSlices, setStepSlices] = useState(Array(16).fill(null));

  // ---- Delay state ----
  const [delayTime, setDelayTime] = useState(0.25);
  const [delayFeedback, setDelayFeedback] = useState(0.25);
  const [delayMix, setDelayMix] = useState(0.25);

  // ---- EQ state (HP • MID • LP) ----
  const [hpfCutoff, setHpfCutoff] = useState(40);
  const [midFreq, setMidFreq] = useState(1000);
  const [midGainDb, setMidGainDb] = useState(0);
  const [midQ, setMidQ] = useState(0.7);
  const [lpfCutoff, setLpfCutoff] = useState(12000);

  // ---- Master nodes / EQ / FX refs ----
  const inputGainRef = useRef(null);
  const hpfRef = useRef(null);
  const midRef = useRef(null);
  const lpfRef = useRef(null);
  const delayRef = useRef(null);
  const fbRef = useRef(null);
  const wetRef = useRef(null);
  const dryRef = useRef(null);
  const panRef = useRef(null);

  // Build audio graph when ctx is ready (one-time per context)
  useEffect(() => {
    if (!ctx) return;
    if (inputGainRef.current) return; // already built

    const inputGain = ctx.createGain();

    // --- 3-band EQ ---
    const hpf = ctx.createBiquadFilter();
    hpf.type = "highpass";
    hpf.frequency.value = hpfCutoff;
    hpf.Q.value = 0.707;

    const mid = ctx.createBiquadFilter();
    mid.type = "peaking";
    mid.frequency.value = midFreq;
    mid.gain.value = midGainDb; // dB
    mid.Q.value = midQ;

    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = lpfCutoff;
    lpf.Q.value = 0.707;

    // --- Delay chain ---
    const delay = ctx.createDelay(5.0);
    const feedback = ctx.createGain();
    const wet = ctx.createGain();
    const dry = ctx.createGain();
    const panNode = ctx.createStereoPanner();

    // init with current UI state
    inputGain.gain.value = gain;
    delay.delayTime.value = delayTime;
    feedback.gain.value = delayFeedback;
    wet.gain.value = delayMix;
    dry.gain.value = 1 - delayMix;
    panNode.pan.value = pan;

    // WIRING:
    // inputGain → HPF → MID → LPF → (dry + delay loop) → mix → pan → destination
    inputGain.connect(hpf);
    hpf.connect(mid);
    mid.connect(lpf);

    // Split to dry + delay
    lpf.connect(dry);
    lpf.connect(delay);

    // Delay feedback loop + wet branch
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);

    // Mix wet/dry → pan → destination
    dry.connect(panNode);
    wet.connect(panNode);
    panNode.connect(ctx.destination);

    // Store refs for later updates
    inputGainRef.current = inputGain;
    hpfRef.current = hpf;
    midRef.current = mid;
    lpfRef.current = lpf;
    delayRef.current = delay;
    fbRef.current = feedback;
    wetRef.current = wet;
    dryRef.current = dry;
    panRef.current = panNode;
  }, [ctx]); // only when context becomes available

  // React to control changes (use ctx + refs)
  useEffect(() => {
    if (ctx && inputGainRef.current)
      inputGainRef.current.gain.setValueAtTime(gain, ctx.currentTime);
  }, [gain, ctx]);

  useEffect(() => {
    if (ctx && panRef.current)
      panRef.current.pan.setValueAtTime(pan, ctx.currentTime);
  }, [pan, ctx]);

  // Delay params
  useEffect(() => {
    if (ctx && delayRef.current)
      delayRef.current.delayTime.setValueAtTime(delayTime, ctx.currentTime);
  }, [delayTime, ctx]);

  useEffect(() => {
    if (ctx && fbRef.current) {
      const fb = Math.min(0.95, Math.max(0, delayFeedback));
      fbRef.current.gain.setValueAtTime(fb, ctx.currentTime);
    }
  }, [delayFeedback, ctx]);

  useEffect(() => {
    if (ctx && wetRef.current && dryRef.current) {
      const w = Math.min(1, Math.max(0, delayMix));
      wetRef.current.gain.setValueAtTime(w, ctx.currentTime);
      dryRef.current.gain.setValueAtTime(1 - w, ctx.currentTime);
    }
  }, [delayMix, ctx]);

  // EQ updates
  useEffect(() => {
    if (ctx && hpfRef.current)
      hpfRef.current.frequency.setValueAtTime(hpfCutoff, ctx.currentTime);
  }, [hpfCutoff, ctx]);

  useEffect(() => {
    if (ctx && midRef.current)
      midRef.current.frequency.setValueAtTime(midFreq, ctx.currentTime);
  }, [midFreq, ctx]);

  useEffect(() => {
    if (ctx && midRef.current)
      midRef.current.gain.setValueAtTime(midGainDb, ctx.currentTime); // dB
  }, [midGainDb, ctx]);

  useEffect(() => {
    if (ctx && midRef.current)
      midRef.current.Q.setValueAtTime(midQ, ctx.currentTime);
  }, [midQ, ctx]);

  useEffect(() => {
    if (ctx && lpfRef.current)
      lpfRef.current.frequency.setValueAtTime(lpfCutoff, ctx.currentTime);
  }, [lpfCutoff, ctx]);

  // Slicing helpers
  const addSliceAt = (timeSec) => {
    if (!buffer) return;
    const t = Math.max(0, Math.min(buffer.duration, timeSec));
    if (slicePoints.some((s) => Math.abs(s - t) < 0.005)) return;
    setSlicePoints([...slicePoints, t].sort((a, b) => a - b));
  };

  const removeSliceNear = (timeSec, threshPx = 8, wrapWidthPx = 800) => {
    if (!buffer || slicePoints.length === 0) return;
    const threshSec = (threshPx / wrapWidthPx) * buffer.duration;
    let bestIdx = -1, bestDist = Infinity;
    slicePoints.forEach((s, i) => {
      const d = Math.abs(s - timeSec);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    });
    if (bestDist <= threshSec && bestIdx >= 0) {
      const next = slicePoints.slice(); next.splice(bestIdx, 1);
      setSlicePoints(next);
    }
  };

  // Reverse helper
  const makeReversedBuffer = (ac, buf) => {
    if (!ac || !buf) return null;
    const rev = ac.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const src = buf.getChannelData(ch);
      const dst = rev.getChannelData(ch);
      for (let i = 0, j = src.length - 1; i < src.length; i++, j--) dst[i] = src[j];
    }
    return rev;
  };

  // File import
  const handleFileSelected = async (file) => {
    if (!file) return;
    try {
      const ac = ensureAudioContext();
      setCtx(ac);
      const audioBuffer = await decodeAudioFile(file, ac);
      setBuffer(audioBuffer);
      setReversedBuffer(makeReversedBuffer(ac, audioBuffer));
      setLoopStart(0);
      setLoopEnd(audioBuffer.duration);
      setPlayhead(0);

      // bootstrap N even slices
      const N = 8;
      const arr = [];
      for (let i = 0; i < N; i++) arr.push((i / N) * audioBuffer.duration);
      setSlicePoints(arr);
    } catch (err) {
      console.error(err);
      alert("Could not decode this audio file.");
    }
  };

  return (
    <div className="app">
      <h1>Issa&apos;s Online Sampler</h1>

      <div className="app-container">
        <div className="left-panel">
          <FileImport onFileSelected={handleFileSelected} />

          <WaveformViewer
            buffer={buffer}
            playhead={playhead}
            loopStart={loopStart}
            loopEnd={loopEnd}
            setLoopStart={setLoopStart}
            setLoopEnd={setLoopEnd}
            slicePoints={slicePoints}
            onAddSlice={addSliceAt}
            onRemoveSlice={removeSliceNear}
          />

          <SampleControls
            buffer={buffer}
            volume={gain}           onVolume={setGain}
            pan={pan}               onPan={setPan}
            pitchSt={detuneSemis}   onPitchSt={setDetuneSemis}
            rate={rate}             onRate={setRate}
            loopStart={loopStart}   setLoopStart={setLoopStart}
            loopEnd={loopEnd}       setLoopEnd={setLoopEnd}
            gate={gate}             setGate={setGate}
            reverse={reverse}       setReverse={setReverse}
            bpm={bpm}               setBpm={setBpm}
          />

          {/* Delay panel then EQ panel (always stacked) */}
          <DelayControls
            delayTime={delayTime}         setDelayTime={setDelayTime}
            delayFeedback={delayFeedback} setDelayFeedback={setDelayFeedback}
            delayMix={delayMix}           setDelayMix={setDelayMix}
          />
          <FilterEQControls
            hpfCutoff={hpfCutoff}   setHpfCutoff={setHpfCutoff}
            midFreq={midFreq}       setMidFreq={setMidFreq}
            midGainDb={midGainDb}   setMidGainDb={setMidGainDb}
            midQ={midQ}             setMidQ={setMidQ}
            lpfCutoff={lpfCutoff}   setLpfCutoff={setLpfCutoff}
          />

          <TransportControls
            audioCtx={ctx}
            buffer={buffer}
            reversedBuffer={reversedBuffer}
            reverse={reverse}
            loopStart={loopStart}
            loopEnd={loopEnd}
            gainNode={inputGainRef.current}
            panNode={panRef.current}
            rate={rate}
            detuneSemis={detuneSemis}   // ✅ NEW
            onPlayhead={setPlayhead}
          />
        </div>

        <div className="right-panel">
          <StepSequencer
            audioCtx={ctx}
            buffer={buffer}
            reversedBuffer={reversedBuffer}
            reverse={reverse}
            loopStart={loopStart}
            loopEnd={loopEnd}
            gainNode={inputGainRef.current}
            rate={rate}
            detuneSemis={detuneSemis}   // ✅ NEW
            bpm={bpm}
            setBpm={setBpm}
            steps={steps}
            setSteps={setSteps}
            gate={gate}
            slicePoints={slicePoints}
            stepSlices={stepSlices}
            setStepSlices={setStepSlices}
          />

          <SliceControls
            buffer={buffer}
            slicePoints={slicePoints}
            setSlicePoints={setSlicePoints}
            loopStart={loopStart}
            loopEnd={loopEnd}
          />

          <PadGrid
            audioCtx={ctx}
            buffer={buffer}
            reversedBuffer={reversedBuffer}
            reverse={reverse}
            loopStart={loopStart}
            loopEnd={loopEnd}
            rate={rate}
            detuneSemis={detuneSemis}   // ✅ NEW
            gainNode={inputGainRef.current}
            slicePoints={slicePoints}
            setLoopStart={setLoopStart}
            setLoopEnd={setLoopEnd}
          />

          <ExportControls
            audioCtx={ctx}
            buffer={buffer}
            reversedBuffer={reversedBuffer}
            reverse={reverse}
            loopStart={loopStart}
            loopEnd={loopEnd}
            rate={rate}
            volume={gain}
            pan={pan}
            bpm={bpm}
            steps={steps}
            gate={gate}
            // EQ + Delay values (if your exporter needs them)
            hpfCutoff={hpfCutoff}
            midFreq={midFreq}
            midGainDb={midGainDb}
            midQ={midQ}
            lpfCutoff={lpfCutoff}
            delayTime={delayTime}
            delayFeedback={delayFeedback}
            delayMix={delayMix}
          />
        </div>
      </div>
    </div>
  );
}
