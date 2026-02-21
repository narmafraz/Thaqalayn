import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Reciter {
  id: string;
  name: string;
  subfolder: string;
}

export interface AudioState {
  playing: boolean;
  loading: boolean;
  error: boolean;
  surah: number;
  ayah: number;
  reciterId: string;
}

@Injectable({
  providedIn: 'root'
})
export class AudioService implements OnDestroy {
  private audio: HTMLAudioElement | null = null;

  static readonly RECITERS: Reciter[] = [
    { id: 'husary', name: 'Mahmoud Khalil Al-Husary', subfolder: 'Husary_128kbps' },
    { id: 'minshawi-murattal', name: 'Mohamed Siddiq Al-Minshawi', subfolder: 'Minshawy_Murattal_128kbps' },
    { id: 'abdulbasit-murattal', name: 'Abdul Basit (Murattal)', subfolder: 'Abdul_Basit_Murattal_192kbps' },
    { id: 'alafasy', name: 'Mishary Rashid Alafasy', subfolder: 'Alafasy_128kbps' },
  ];

  private stateSubject = new BehaviorSubject<AudioState>({
    playing: false,
    loading: false,
    error: false,
    surah: 0,
    ayah: 0,
    reciterId: 'husary',
  });

  state$: Observable<AudioState> = this.stateSubject.asObservable();

  private get state(): AudioState {
    return this.stateSubject.value;
  }

  play(surah: number, ayah: number, reciterId?: string): void {
    const rid = reciterId || this.state.reciterId;
    const reciter = AudioService.RECITERS.find(r => r.id === rid) || AudioService.RECITERS[0];

    // Stop current playback
    this.stop();

    // Build EveryAyah URL: https://everyayah.com/data/{subfolder}/{surah3}{ayah3}.mp3
    const surahStr = surah.toString().padStart(3, '0');
    const ayahStr = ayah.toString().padStart(3, '0');
    const url = `https://everyayah.com/data/${reciter.subfolder}/${surahStr}${ayahStr}.mp3`;

    this.audio = new Audio(url);

    this.stateSubject.next({
      ...this.state,
      playing: false,
      loading: true,
      error: false,
      surah,
      ayah,
      reciterId: rid,
    });

    this.audio.addEventListener('canplaythrough', () => {
      this.stateSubject.next({ ...this.state, loading: false, playing: true });
      this.audio?.play();
    });

    this.audio.addEventListener('ended', () => {
      this.stateSubject.next({ ...this.state, playing: false });
    });

    this.audio.addEventListener('error', () => {
      this.stateSubject.next({ ...this.state, loading: false, error: true, playing: false });
    });

    this.audio.load();
  }

  pause(): void {
    if (this.audio) {
      this.audio.pause();
      this.stateSubject.next({ ...this.state, playing: false });
    }
  }

  resume(): void {
    if (this.audio && !this.state.playing) {
      this.audio.play();
      this.stateSubject.next({ ...this.state, playing: true });
    }
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load();
      this.audio = null;
    }
    this.stateSubject.next({
      ...this.state,
      playing: false,
      loading: false,
      error: false,
    });
  }

  togglePlayPause(surah: number, ayah: number): void {
    if (this.state.surah === surah && this.state.ayah === ayah && this.state.playing) {
      this.pause();
    } else if (this.state.surah === surah && this.state.ayah === ayah && !this.state.loading) {
      this.resume();
    } else {
      this.play(surah, ayah);
    }
  }

  setReciter(reciterId: string): void {
    this.stateSubject.next({ ...this.state, reciterId });
    // If currently playing, restart with new reciter
    if (this.state.surah > 0 && this.state.ayah > 0) {
      this.play(this.state.surah, this.state.ayah, reciterId);
    }
  }

  isPlayingAyah(surah: number, ayah: number): boolean {
    return this.state.surah === surah && this.state.ayah === ayah && this.state.playing;
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
