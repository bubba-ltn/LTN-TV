// Collects the page's mixed audio into 1024-sample stereo blocks (planar float32) and hands them to the page, which forwards them to the NDI sender.
class NdiTap extends AudioWorkletProcessor {
  constructor() { super(); this.n = 0; this.l = new Float32Array(1024); this.r = new Float32Array(1024); }
  process(inputs) {
    const inp = inputs[0];
    if (!inp || !inp.length) return true;
    const a = inp[0], b = inp[1] || inp[0];
    for (let i = 0; i < a.length; i++) {
      this.l[this.n] = a[i]; this.r[this.n] = b[i]; this.n++;
      if (this.n === 1024) {
        const out = new Float32Array(2048);
        out.set(this.l, 0); out.set(this.r, 1024);
        this.port.postMessage(out, [out.buffer]);
        this.n = 0;
      }
    }
    return true;
  }
}
registerProcessor("ndi-tap", NdiTap);
