/**
 * Plays the notification bell sound from the public folder.
 * Uses Web Audio API with fallback to simple audio play.
 */
export async function playNotificationSound() {
  try {
    // Check if audio context is available
    const audioContext =
      typeof window !== "undefined" &&
      (window.AudioContext ||
        (window as any).webkitAudioContext ||
        (window as any).mozAudioContext);

    if (!audioContext) {
      // Fallback: use HTML5 audio element
      const audio = new Audio("/notif-sound/mixkit-cartoon-door-melodic-bell-110.wav");
      audio.volume = 0.5;
      await audio.play().catch((err) => {
        console.warn("Could not play notification sound:", err);
      });
      return;
    }

    // Use Web Audio API if available
    const context = new audioContext();
    const response = await fetch(
      "/notif-sound/mixkit-cartoon-door-melodic-bell-110.wav"
    );
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await context.decodeAudioData(arrayBuffer);

    const source = context.createBufferSource();
    const gainNode = context.createGain();

    source.buffer = audioBuffer;
    gainNode.gain.value = 0.5; // Set volume to 50%

    source.connect(gainNode);
    gainNode.connect(context.destination);
    source.start(0);
  } catch (err) {
    console.warn("Error playing notification sound:", err);
  }
}
