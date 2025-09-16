import { useRef } from "react";

let _ctx = null;

export default function useAudioContext() {
  const createdRef = useRef(false);

  const ensure = () => {
    if (!_ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      _ctx = new Ctx();
      createdRef.current = true;
    } else if (_ctx.state === "suspended") {
      _ctx.resume();
    }
    return _ctx;
  };

  return {
    ensureAudioContext: ensure,
    get audioCtx() { return _ctx; },
    get isCreated() { return !!_ctx; },
    get wasCreatedByThisHook() { return createdRef.current; },
  };
}
