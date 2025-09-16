export async function decodeAudioFile(file, audioCtx) {
  if (!file) throw new Error("No file provided");
  if (!audioCtx) throw new Error("AudioContext not ready");

  const arrayBuf = await file.arrayBuffer();

  const decoded = await new Promise((resolve, reject) => {
    const maybePromise = audioCtx.decodeAudioData(
      arrayBuf,
      (buf) => resolve(buf),
      (err) => reject(err)
    );
    if (maybePromise && typeof maybePromise.then === "function") {
      maybePromise.then(resolve).catch(reject);
    }
  });

  return decoded;
}
