import React, { useEffect, useState } from "react";
import './fileimport.css';

export default function FileImport({ onFileSelected }) {
  const [fileName, setFileName] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      onFileSelected(file); // send file up to App
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setFileName(file.name);
      onFileSelected(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div
      className="file-import"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <p>Drag & drop an audio file, or choose below:</p>
      <input type="file" accept="audio/*" onChange={handleFileChange} />
      {fileName && <p className="file-name">Loaded: {fileName}</p>}
    </div>
  );
}