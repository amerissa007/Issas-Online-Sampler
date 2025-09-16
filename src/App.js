import { useEffect, useMemo, useRef, useState } from "react";
import useAudioContext from "./audio/UseAudioContext";
import { decodeAudioFile } from "./audio/DecodeAudioFile";
import "./App.css";

import FileImport from "./components/FileImport/FileImport";
import WaveformViewer from "./components/WaveformViewer/WaveformViewer";
import SampleControls from "./components/SampleControls/SampleControls";
import EffectsControls from "./components/EffectsControls/EffectsControls";
import TransportControls from "./components/TransportControls/TransportControls";
import StepSequencer from "./components/StepSequencer/StepSequencer";
import ExportControls from "./components/ExportControls/ExportControls";

export default function App() {
  const { ensureAudioContext } = useAudioContext();
  const [ctx, setCtx] = useState(null);

  const [buffer, setBuffer] = useState(null);
  const [reversedBuffer, setReversedBuffer] = useState(null);
  const [reverse, setReverse] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(0);

  const [volume, setVolume] = useState(0.9);
  const [pan, setPan] = useState(0);
  const [semitones, setSemitones] = useState(0);
  const rate = useMemo(() => Math.pow(2, semitones / 12), [semitones]);

  const [bpm, setBpm] = useState(120);
  const [gate, setGate] = useState(0.20);
  const [steps, setSteps] = useState(Array(16).fill(false));

  const [filterCutoff, setFilterCutoff] = useState(12000); 
  const [filterQ, setFilterQ] = useState(0.7);
  const [delayTime, setDelayTime] = useState(0.25);        
  const [delayFeedback, setDelayFeedback] = useState(0.25);
  const [delayMix, setDelayMix] = useState(0.25);          

  const inputGainRef = useRef(null);  
  const filterRef    = useRef(null);
  const delayRef     = useRef(null);
  const fbRef        = useRef(null);  
  const wetRef       = useRef(null);  
  const dryRef       = useRef(null);  
  const panRef       = useRef(null);

  useEffect(() => {
    if (!ctx) return;
    if (inputGainRef.current) return; 

    const inputGain = ctx.createGain();
    const filter    = ctx.createBiquadFilter();
    const delay     = ctx.createDelay(5.0);
    const feedback  = ctx.createGain();
    const wet       = ctx.createGain();
    const dry       = ctx.createGain();
    const panNode   = ctx.createStereoPanner();

    inputGain.gain.value = volume;
    filter.type = "lowpass";
    filter.frequency.value = filterCutoff;
    filter.Q.value = filterQ;
    delay.delayTime.value = delayTime;
    feedback.gain.value = delayFeedback;
    wet.gain.value = delayMix;
    dry.gain.value = 1 - delayMix;
    panNode.pan.value = pan;

    inputGain.connect(filter);

    filter.connect(dry);
    filter.connect(delay);

    delay.connect(feedback);
    feedback.connect(delay);

    delay.connect(wet);

    dry.connect(panNode);
    wet.connect(panNode);
    panNode.connect(ctx.destination);

    inputGainRef.current = inputGain;
    filterRef.current = filter;
    delayRef.current = delay;
    fbRef.current = feedback;
    wetRef.current = wet;
    dryRef.current = dry;
    panRef.current = panNode;
  }, [ctx]);

  useEffect(() => { inputGainRef.current && (inputGainRef.current.gain.value = volume); }, [volume]);
  useEffect(() => { panRef.current && (panRef.current.pan.value = pan); }, [pan]);
  useEffect(() => { filterRef.current && (filterRef.current.frequency.value = filterCutoff); }, [filterCutoff]);
  useEffect(() => { filterRef.current && (filterRef.current.Q.value = filterQ); }, [filterQ]);
  useEffect(() => { delayRef.current && (delayRef.current.delayTime.value = delayTime); }, [delayTime]);
  useEffect(() => { fbRef.current && (fbRef.current.gain.value = Math.min(0.95, Math.max(0, delayFeedback))); }, [delayFeedback]);
  useEffect(() => {
    if (wetRef.current && dryRef.current) {
      const wet = Math.min(1, Math.max(0, delayMix));
      wetRef.current.gain.value = wet;
      dryRef.current.gain.value = 1 - wet;
    }
  }, [delayMix]);

  const makeReversedBuffer = (ac, buf) => {
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
    } catch (err) {
      console.error(err);
      alert("Could not decode this audio file.");
    }
  };

  return (
    <div className="app">
      <h1>Online Sampler</h1>
      <div className="app-container">
        <FileImport onFileSelected={handleFileSelected} />

        <WaveformViewer
          buffer={buffer}
          playhead={playhead}
          loopStart={loopStart}
          loopEnd={loopEnd}
          setLoopStart={setLoopStart}
          setLoopEnd={setLoopEnd}
        />

        <SampleControls
          buffer={buffer}
          volume={volume} setVolume={setVolume}
          pan={pan}       setPan={setPan}
          semitones={semitones} setSemitones={setSemitones}
          rate={rate}
          loopStart={loopStart} setLoopStart={setLoopStart}
          loopEnd={loopEnd}     setLoopEnd={setLoopEnd}
          gate={gate}           setGate={setGate}
          reverse={reverse}     setReverse={setReverse}
          bpm={bpm} setBpm={setBpm}
        />

        <EffectsControls
          filterCutoff={filterCutoff}   setFilterCutoff={setFilterCutoff}
          filterQ={filterQ}             setFilterQ={setFilterQ}
          delayTime={delayTime}         setDelayTime={setDelayTime}
          delayFeedback={delayFeedback} setDelayFeedback={setDelayFeedback}
          delayMix={delayMix}           setDelayMix={setDelayMix}
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
        />

        <ExportControls
          audioCtx={ctx}
          buffer={buffer}
          reversedBuffer={reversedBuffer}
          reverse={reverse}
          loopStart={loopStart}
          loopEnd={loopEnd}
          rate={rate}
          volume={volume}
          pan={pan}
          bpm={bpm}
          steps={steps}
          gate={gate}
          filterCutoff={filterCutoff}
          filterQ={filterQ}
          delayTime={delayTime}
          delayFeedback={delayFeedback}
          delayMix={delayMix}
        />

      </div>
    </div>
  );
}
