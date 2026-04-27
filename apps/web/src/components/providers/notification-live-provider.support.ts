import type { AuthUser } from "@shop/contracts";

export function shouldPlayNotificationSound(input: {
  eventName: string;
  user: AuthUser | null;
}) {
  return (
    input.eventName === "platform-event" &&
    input.user?.notificationPreferences.inAppEnabled === true &&
    input.user.notificationPreferences.soundEnabled === true
  );
}

export function playNotificationChime() {
  if (
    typeof window === "undefined" ||
    typeof window.AudioContext === "undefined"
  ) {
    return;
  }

  const audioContext = new window.AudioContext();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    audioContext.currentTime + 0.18,
  );

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.18);

  oscillator.addEventListener("ended", () => {
    void audioContext.close();
  });
}
