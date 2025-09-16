import { useEffect, useRef, useState } from "react";
import useAudioContext from "./audio/UseAudioContext";
import { decodeAudioFile } from "./audio/DecodeAudioFile";
import "./App.css";

import FileImport from "./components/FileImport/FileImport";
import WaveformViewer from "./components/WaveformViewer/WaveformViewer";
import SampleControls from "./components/SampleControls/SampleControls";
import DelayControls from "./components/DelayControls/DelayControls";
import FilterEQControls from "./components/FilterEQControls/FilterEQControls";
import TransportControls from "./components/TransportControls/TransportControls";
import StepSequencer from "./components/StepSequencer/StepSequencer";
// import ExportControls from "./components/ExportControls/ExportControls";
import PadGrid from "./components/PadGrid/PadGrid";
import SliceControls from "./components/SliceControls/SliceControls";
import ReverbControls from "./components/ReverbControls/ReverbControls";

const DEFAULT_IR = "/ir/IRx125_01C.wav";

export default function App() {
  const { ensureAudioContext } = useAudioContext();
  const [ctx, setCtx] = useState(null);

  // buffers / transport
  const [buffer, setBuffer] = useState(null);
  const [reversedBuffer, setReversedBuffer] = useState(null);
  const [reverse, setReverse] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(0);

  // master
  const [gain, setGain] = useState(0.9);
  const [pan, setPan] = useState(0);
  const [rate, setRate] = useState(1.0);
  const [bpm, setBpm] = useState(120);
  const [gate, setGate] = useState(0.20);

  // slices / seq
  const [slicePoints, setSlicePoints] = useState([]);
  const [steps, setSteps] = useState(Array(16).fill(false));
  const [stepSlices, setStepSlices] = useState(Array(16).fill(null));

  // delay
  const [delayTime, setDelayTime] = useState(0.25);
  const [delayFeedback, setDelayFeedback] = useState(0.25);
  const [delayMix, setDelayMix] = useState(0.25);

  // EQ (HP/MID/LP)
  const [hpfCutoff, setHpfCutoff] = useState(40);
  const [midFreq, setMidFreq] = useState(1000);
  const [midGainDb, setMidGainDb] = useState(0);
  const [midQ, setMidQ] = useState(0.7);
  const [lpfCutoff, setLpfCutoff] = useState(12000);

  // Reverb
  const [reverbMix, setReverbMix] = useState(0.25);
  const [reverbPreDelay, setReverbPreDelay] = useState(0.02);
  const [reverbHighCut, setReverbHighCut] = useState(8000);

  // node refs
  const inputGainRef = useRef(null);
  const hpfRef = useRef(null);
  const midRef = useRef(null);
  const lpfRef = useRef(null);
  const delayRef = useRef(null);
  const fbRef = useRef(null);
  const wetRef = useRef(null);
  const dryRef = useRef(null);
  const panRef = useRef(null);

  // reverb node refs
  const preDelayRef = useRef(null);
  const convolverRef = useRef(null);
  const revLPFRef = useRef(null);
  const revWetRef = useRef(null);

  // Build audio graph once
  useEffect(() => {
    if (!ctx) return;
    if (inputGainRef.current) return;

    const inputGain = ctx.createGain();

    // EQ
    const hpf = ctx.createBiquadFilter(); hpf.type = "highpass"; hpf.frequency.value = hpfCutoff; hpf.Q.value = 0.707;
    const mid = ctx.createBiquadFilter(); mid.type = "peaking";  mid.frequency.value = midFreq;   mid.gain.value = midGainDb; mid.Q.value = midQ;
    const lpf = ctx.createBiquadFilter(); lpf.type = "lowpass";  lpf.frequency.value = lpfCutoff; lpf.Q.value = 0.707;

    // delay
    const delay = ctx.createDelay(5.0);
    const feedback = ctx.createGain();
    const wet = ctx.createGain();
    const dry = ctx.createGain();

    // pan / out
    const panNode = ctx.createStereoPanner();

    // init
    inputGain.gain.value  = gain;
    delay.delayTime.value = delayTime;
    feedback.gain.value   = delayFeedback;
    wet.gain.value        = delayMix;
    dry.gain.value        = 1 - delayMix;
    panNode.pan.value     = pan;

    // wire EQ
    inputGain.connect(hpf);
    hpf.connect(mid);
    mid.connect(lpf);

    // split to dry + delay
    lpf.connect(dry);
    lpf.connect(delay);
    delay.connect(feedback); feedback.connect(delay); delay.connect(wet);

    // Reverb branch
    const preDelay = ctx.createDelay(2.0);     preDelay.delayTime.value = reverbPreDelay;
    const convolver = ctx.createConvolver();   convolver.normalize = true;
    const revLPF = ctx.createBiquadFilter();   revLPF.type = "lowpass"; revLPF.frequency.value = reverbHighCut;
    const revWet = ctx.createGain();           revWet.gain.value = reverbMix;

    lpf.connect(preDelay);
    preDelay.connect(convolver);
    convolver.connect(revLPF);
    revLPF.connect(revWet);

    // mix
    dry.connect(panNode);
    wet.connect(panNode);
    revWet.connect(panNode);
    panNode.connect(ctx.destination);

    // store
    inputGainRef.current = inputGain;
    hpfRef.current = hpf;   midRef.current = mid;   lpfRef.current = lpf;
    delayRef.current = delay; fbRef.current = feedback; wetRef.current = wet; dryRef.current = dry;
    panRef.current = panNode;

    preDelayRef.current = preDelay;
    convolverRef.current = convolver;
    revLPFRef.current = revLPF;
    revWetRef.current = revWet;
  }, [ctx]);

  // Live param updates
  useEffect(() => { if (ctx && inputGainRef.current) inputGainRef.current.gain.setValueAtTime(gain, ctx.currentTime); }, [gain, ctx]);
  useEffect(() => { if (ctx && panRef.current) panRef.current.pan.setValueAtTime(pan, ctx.currentTime); }, [pan, ctx]);

  useEffect(() => { if (ctx && delayRef.current) delayRef.current.delayTime.setValueAtTime(delayTime, ctx.currentTime); }, [delayTime, ctx]);
  useEffect(() => { if (ctx && fbRef.current) fbRef.current.gain.setValueAtTime(Math.min(0.95, Math.max(0, delayFeedback)), ctx.currentTime); }, [delayFeedback, ctx]);
  useEffect(() => {
    if (ctx && wetRef.current && dryRef.current) {
      const w = Math.min(1, Math.max(0, delayMix));
      wetRef.current.gain.setValueAtTime(w, ctx.currentTime);
      dryRef.current.gain.setValueAtTime(1 - w, ctx.currentTime);
    }
  }, [delayMix, ctx]);

  useEffect(() => { if (ctx && hpfRef.current) hpfRef.current.frequency.setValueAtTime(hpfCutoff, ctx.currentTime); }, [hpfCutoff, ctx]);
  useEffect(() => { if (ctx && midRef.current) midRef.current.frequency.setValueAtTime(midFreq, ctx.currentTime); }, [midFreq, ctx]);
  useEffect(() => { if (ctx && midRef.current) midRef.current.gain.setValueAtTime(midGainDb, ctx.currentTime); }, [midGainDb, ctx]);
  useEffect(() => { if (ctx && midRef.current) midRef.current.Q.setValueAtTime(midQ, ctx.currentTime); }, [midQ, ctx]);
  useEffect(() => { if (ctx && lpfRef.current) lpfRef.current.frequency.setValueAtTime(lpfCutoff, ctx.currentTime); }, [lpfCutoff, ctx]);

  // Reverb param updates
  useEffect(() => { if (ctx && preDelayRef.current) preDelayRef.current.delayTime.setValueAtTime(reverbPreDelay, ctx.currentTime); }, [reverbPreDelay, ctx]);
  useEffect(() => { if (ctx && revWetRef.current) revWetRef.current.gain.setValueAtTime(reverbMix, ctx.currentTime); }, [reverbMix, ctx]);
  useEffect(() => { if (ctx && revLPFRef.current) revLPFRef.current.frequency.setValueAtTime(reverbHighCut, ctx.currentTime); }, [reverbHighCut, ctx]);

  // Load a single default IR once
  useEffect(() => {
    if (!ctx || !convolverRef.current) return;

    const makeSimpleIR = async (ac, seconds = 1.2, decay = 3.0) => {
      const len = Math.max(1, Math.floor(seconds * ac.sampleRate));
      const ir = ac.createBuffer(2, len, ac.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        for (let i = 0; i < len; i++) {
          d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
        }
      }
      return ir;
    };

    (async () => {
      try {
        const res = await fetch(DEFAULT_IR);
        if (!res.ok) throw new Error(`IR fetch failed: ${res.status}`);
        const arr = await res.arrayBuffer();
        const buf = await ctx.decodeAudioData(arr);
        convolverRef.current.buffer = buf;
      } catch (e) {
        console.warn("Default IR failed, using synthetic fallback:", e);
        const fb = await makeSimpleIR(ctx, 1.0, 2.8);
        convolverRef.current.buffer = fb;
      }
    })();
  }, [ctx]);

  // helpers
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

      const N = 8;
      const arr = Array.from({ length: N }, (_, i) => (i / N) * audioBuffer.duration);
      setSlicePoints(arr);
    } catch (err) {
      console.error(err);
      alert("Could not decode this audio file.");
    }
  };

  return (
    <div className="app">
      <div className="app-header">
        <h1>Issa&apos;s Online Sampler</h1>
        <h3>Created by Issa</h3>
        <p>Load your own samples and play around! Built with React and the Web Audio API.</p>
        
      </div>

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
            onAddSlice={(t) => setSlicePoints((prev) => [...prev, t].sort((a,b)=>a-b))}
            onRemoveSlice={(t) => {
              setSlicePoints((prev) => {
                if (!buffer) return prev;
                const threshSec = (8 / 800) * buffer.duration;
                let best=-1, dist=Infinity;
                prev.forEach((s,i) => { const d=Math.abs(s-t); if (d<dist){dist=d;best=i;} });
                if (best>=0 && dist<=threshSec) { const n=prev.slice(); n.splice(best,1); return n; }
                return prev;
              });
            }}
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
            onPlayhead={setPlayhead}
          />

          <SampleControls
            buffer={buffer}
            volume={gain} onVolume={setGain}
            pan={pan}     onPan={setPan}
            rate={rate}   onRate={setRate}
            loopStart={loopStart} setLoopStart={setLoopStart}
            loopEnd={loopEnd}     setLoopEnd={setLoopEnd}
            gate={gate}           setGate={setGate}
            reverse={reverse}     setReverse={setReverse}
            bpm={bpm}             setBpm={setBpm}
          />

          <DelayControls
            delayTime={delayTime}         setDelayTime={setDelayTime}
            delayFeedback={delayFeedback} setDelayFeedback={setDelayFeedback}
            delayMix={delayMix}           setDelayMix={setDelayMix}
          />

          <ReverbControls
            reverbMix={reverbMix}               setReverbMix={setReverbMix}
            reverbPreDelay={reverbPreDelay}     setReverbPreDelay={setReverbPreDelay}
            reverbHighCut={reverbHighCut}       setReverbHighCut={setReverbHighCut}
          />

          <FilterEQControls
            hpfCutoff={hpfCutoff}   setHpfCutoff={setHpfCutoff}
            midFreq={midFreq}       setMidFreq={setMidFreq}
            midGainDb={midGainDb}   setMidGainDb={setMidGainDb}
            midQ={midQ}             setMidQ={setMidQ}
            lpfCutoff={lpfCutoff}   setLpfCutoff={setLpfCutoff}
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
            gainNode={inputGainRef.current}
            slicePoints={slicePoints}
            setLoopStart={setLoopStart}
            setLoopEnd={setLoopEnd}
          />

          {/* <ExportControls
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
          /> */}
        </div>
      </div>
    </div>
  );
}
