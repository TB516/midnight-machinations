import type { ChatMessage } from '$lib/game/chat';

const AUDIO_FILES = [
  'church_bell.mp3',
  'night_bell.mp3',
  'gavel.mp3',
  'sniper_shot.mp3',
  'normal_message.mp3',
  'whisper_broadcast.mp3',
  'start_game.mp3'
] as const;

type AudioFile = (typeof AUDIO_FILES)[number];
export type AudioPath = `/audio/${AudioFile}`;

export function chatMessageAudio(message: ChatMessage): AudioPath | null {
  switch (message.variant.type) {
    case 'normal':
    case 'voted':
      return '/audio/normal_message.mp3';
    case 'broadcastWhisper':
      return '/audio/whisper_broadcast.mp3';
    case 'playerDied':
      return '/audio/church_bell.mp3';
    case 'deputyKilled':
      return '/audio/sniper_shot.mp3';
    case 'phaseChange':
      if (message.variant.phase.type === 'testimony') return '/audio/gavel.mp3';
      if (message.variant.phase.type === 'night') return '/audio/night_bell.mp3';
      return null;
    default:
      return null;
  }
}

/** Plays short notifications in order so simultaneous packets do not overlap. */
export class AudioQueue {
  #volume: number;
  #audio: HTMLAudioElement | null = null;
  #pending: AudioPath[] = [];
  #disposed = false;

  constructor(volume: number) {
    this.#volume = Math.max(0, Math.min(1, volume));
  }

  /** Apply settings to both the playing sound and queued sounds. */
  setVolume(volume: number): void {
    this.#volume = Math.max(0, Math.min(1, volume));
    if (this.#audio) this.#audio.volume = this.#volume;
  }

  enqueue(path: AudioPath | null): void {
    if (path === null || this.#disposed || this.#volume === 0) return;
    this.#pending.push(path);
    if (this.#audio === null) this.#playNext();
  }

  dispose(): void {
    this.#disposed = true;
    this.#pending = [];
    this.#audio?.pause();
    this.#audio = null;
  }

  #playNext(): void {
    const path = this.#pending.shift();
    if (path === undefined || this.#disposed) {
      this.#audio = null;
      return;
    }

    const audio = new Audio(path);
    this.#audio = audio;
    audio.volume = this.#volume;
    let finished = false;
    const finish = (): void => {
      if (finished) return;
      finished = true;
      if (this.#audio === audio) this.#audio = null;
      this.#playNext();
    };

    audio.addEventListener('ended', finish, { once: true });
    audio.addEventListener('error', finish, { once: true });
    void audio.play().catch(finish);
  }
}
