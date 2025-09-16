import { useState } from "react";
import useAudioContext from "./audio/UseAudioContext";
import { decodeAudioFile } from "./audio/DecodeAudioFile";
import "./App.css";

import FileImport from "./components/FileImport/FileImport";
import WaveformViewer from "./components/WaveformViewer/WaveformViewer";
import TransportControls from "./components/TransportControls/TransportControls";
import SampleControls from "./components/SampleControls/SampleControls";

export default function App() {
  const { ensureAudioContext, audioCtx } = useAudioContext();

  const [buffer, setBuffer] = useState(null);        
  const [fileInfo, setFileInfo] = useState(null);    
  const [playhead, setPlayhead] = useState(0);       
  const [loopStart, setLoopStart] = useState(0);    
  const [loopEnd, setLoopEnd] = useState(0);        

  const handleFileSelected = async (file) => {
    if (!file) return;
    try {
      const ctx = ensureAudioContext();                  
      const audioBuffer = await decodeAudioFile(file, ctx);

      setBuffer(audioBuffer);
      setFileInfo({ name: file.name, type: file.type, size: file.size });
      setLoopStart(0);
      setLoopEnd(audioBuffer.duration);
      setPlayhead(0);

      console.log("Decoded:", {
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels,
      });
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
        />

        <SampleControls
          buffer={buffer}
          loopStart={loopStart}
          loopEnd={loopEnd}
          setLoopStart={setLoopStart}
          setLoopEnd={setLoopEnd}
        />

        <TransportControls
          audioCtx={audioCtx}
          buffer={buffer}
          loopStart={loopStart}
          loopEnd={loopEnd}
          onPlayhead={setPlayhead}
        />
      </div>
    </div>
  );
}
