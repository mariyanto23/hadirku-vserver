// Audio notification utilities using Web Audio API

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

// Play a tone with specified frequency and duration
function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume: number = 0.3
): Promise<void> {
  return new Promise((resolve) => {
    const ctx = getAudioContext();
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    // Fade in
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.05);
    
    // Fade out
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
    
    oscillator.onended = () => resolve();
  });
}

// Success sound - pleasant ascending chime
export async function playSuccessSound(): Promise<void> {
  try {
    const ctx = getAudioContext();
    
    // Resume audio context if suspended (required for some browsers)
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    
    // Play two ascending notes for a pleasant "ding-ding" sound
    await playTone(523.25, 0.15, "sine", 0.25); // C5
    await new Promise(r => setTimeout(r, 50));
    await playTone(659.25, 0.25, "sine", 0.3); // E5
  } catch (error) {
    console.error("Error playing success sound:", error);
  }
}

// Already recorded sound - neutral info tone
export async function playAlreadySound(): Promise<void> {
  try {
    const ctx = getAudioContext();
    
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    
    // Single mellow tone
    await playTone(440, 0.3, "sine", 0.2); // A4
  } catch (error) {
    console.error("Error playing already sound:", error);
  }
}

// Error/Not found sound - descending tones
export async function playErrorSound(): Promise<void> {
  try {
    const ctx = getAudioContext();
    
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    
    // Play two descending notes for an "error" indication
    await playTone(349.23, 0.15, "triangle", 0.25); // F4
    await new Promise(r => setTimeout(r, 50));
    await playTone(261.63, 0.25, "triangle", 0.3); // C4
  } catch (error) {
    console.error("Error playing error sound:", error);
  }
}

// Scanning start sound - quick beep
export async function playScanStartSound(): Promise<void> {
  try {
    const ctx = getAudioContext();
    
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    
    await playTone(880, 0.1, "sine", 0.15); // A5
  } catch (error) {
    console.error("Error playing scan start sound:", error);
  }
}
