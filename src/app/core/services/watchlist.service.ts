import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { SupabaseService } from './supabase.service';

export enum AnimeStatus {
  WATCHING = 'WATCHING',
  WATCHED = 'WATCHED',
  PLAN_TO_WATCH = 'PLAN_TO_WATCH'
}

export type WatchStatus = AnimeStatus | 'watching' | 'watched' | 'plan_to_watch' | 'WATCHING' | 'WATCHED' | 'PLAN_TO_WATCH';

export interface WatchlistItem {
  animeId: number;
  anime_id: number;
  title: string;
  imageUrl: string;
  status: AnimeStatus;
  watchedEpisodes: number;
  episodes_watched: number;
  totalEpisodes: number | null;
  total_episodes: number | null;
  anime_data?: any;
}

function normalizeStatus(status: any): AnimeStatus {
  if (!status) return AnimeStatus.WATCHING;
  const s = String(status).toUpperCase();
  if (s === 'WATCHED') return AnimeStatus.WATCHED;
  if (s === 'PLAN_TO_WATCH' || s === 'PLANNING') return AnimeStatus.PLAN_TO_WATCH;
  return AnimeStatus.WATCHING;
}

function mapToWatchlistItem(data: any): WatchlistItem {
  const animeId = Number(data.animeId ?? data.anime_id ?? data.mal_id ?? data.id);
  const animeData = data.anime_data ?? data;

  const title = data.title 
    || animeData.title?.english 
    || animeData.title?.romaji 
    || (typeof animeData.title === 'string' ? animeData.title : 'Anime');

  const imageUrl = data.imageUrl 
    || animeData.images?.webp?.large_image_url 
    || animeData.images?.jpg?.large_image_url 
    || animeData.images?.jpg?.image_url 
    || animeData.coverImage?.extraLarge 
    || animeData.coverImage?.large 
    || '';

  const watchedEpisodes = Number(data.watchedEpisodes ?? data.episodes_watched ?? 0);
  const totalEpisodes = (data.totalEpisodes ?? data.total_episodes ?? animeData.episodes) != null 
    ? Number(data.totalEpisodes ?? data.total_episodes ?? animeData.episodes) 
    : null;

  const status = normalizeStatus(data.status);

  return {
    animeId,
    anime_id: animeId,
    title,
    imageUrl,
    status,
    watchedEpisodes,
    episodes_watched: watchedEpisodes,
    totalEpisodes,
    total_episodes: totalEpisodes,
    anime_data: animeData
  };
}

@Injectable({ providedIn: 'root' })
export class WatchlistService {
  private supabaseService = inject(SupabaseService);

  // Signal principal de la lista
  private itemsSignal = signal<WatchlistItem[]>([]);

  // Selectores reactivos
  readonly items = this.itemsSignal.asReadonly();
  readonly allItems = this.items;

  readonly watching = computed(() => this.itemsSignal().filter(i => i.status === AnimeStatus.WATCHING));
  readonly watched = computed(() => this.itemsSignal().filter(i => i.status === AnimeStatus.WATCHED));
  readonly planToWatch = computed(() => this.itemsSignal().filter(i => i.status === AnimeStatus.PLAN_TO_WATCH));

  // Alias para compatibilidad
  readonly watchingList = this.watching;
  readonly watchedList = this.watched;
  readonly planToWatchList = this.planToWatch;

  constructor() {
    // Recargar lista automáticamente cuando cambia el usuario o el modo
    effect(() => {
      const user = this.supabaseService.currentUser();
      if (user) {
        this.loadWatchlist(user.id);
      } else {
        this.loadFromLocal('guest');
      }
    });
  }

  getWatchlistItem(animeId?: number): WatchlistItem | undefined {
    if (!animeId) return undefined;
    return this.itemsSignal().find(i => i.animeId === animeId || i.anime_id === animeId);
  }

  async loadWatchlist(userId: string) {
    if (this.supabaseService.isLocalMode() || !this.supabaseService.client) {
      this.loadFromLocal(userId);
      return;
    }

    try {
      const { data, error } = await this.supabaseService.client
        .from('anime_lists')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (!error && data) {
        this.itemsSignal.set(data.map(mapToWatchlistItem));
      } else {
        this.loadFromLocal(userId);
      }
    } catch {
      this.loadFromLocal(userId);
    }
  }

  async addToWatchlist(anime: any, status: AnimeStatus | WatchStatus, episodesWatched = 0) {
    const normStatus = normalizeStatus(status);
    const animeId = Number(anime.mal_id ?? anime.id ?? anime.animeId ?? anime.anime_id);
    const totalEpisodes = (anime.episodes ?? anime.totalEpisodes ?? anime.total_episodes) != null
      ? Number(anime.episodes ?? anime.totalEpisodes ?? anime.total_episodes)
      : null;

    // Si completa episodios -> cambia automáticamente a WATCHED
    const finalStatus: AnimeStatus = (totalEpisodes && episodesWatched >= totalEpisodes)
      ? AnimeStatus.WATCHED
      : normStatus;

    const newItem = mapToWatchlistItem({
      animeId,
      anime_id: animeId,
      title: typeof anime.title === 'string' ? anime.title : (anime.title?.english || anime.title?.romaji || 'Anime'),
      imageUrl: anime.images?.webp?.large_image_url || anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || anime.imageUrl || '',
      status: finalStatus,
      watchedEpisodes: episodesWatched,
      episodes_watched: episodesWatched,
      totalEpisodes,
      total_episodes: totalEpisodes,
      anime_data: anime
    });

    this.itemsSignal.update(list => {
      const exists = list.some(i => i.animeId === animeId || i.anime_id === animeId);
      return exists
        ? list.map(i => (i.animeId === animeId || i.anime_id === animeId) ? newItem : i)
        : [newItem, ...list];
    });

    await this.persistItem(newItem);
  }

  async upsertAnime(anime: any, status: WatchStatus, episodesWatched = 0) {
    await this.addToWatchlist(anime, status, episodesWatched);
  }

  async updateProgress(animeId: number, count: number) {
    const item = this.itemsSignal().find(i => i.animeId === animeId || i.anime_id === animeId);
    if (!item) return;

    const maxEps = item.totalEpisodes ?? Infinity;
    const newCount = Math.max(0, Math.min(count, maxEps));

    // Si completa episodios -> cambia a WATCHED
    const finalStatus: AnimeStatus = (item.totalEpisodes && newCount >= item.totalEpisodes)
      ? AnimeStatus.WATCHED
      : item.status;

    const updatedItem: WatchlistItem = {
      ...item,
      watchedEpisodes: newCount,
      episodes_watched: newCount,
      status: finalStatus
    };

    this.itemsSignal.update(list =>
      list.map(i => (i.animeId === animeId || i.anime_id === animeId) ? updatedItem : i)
    );

    await this.persistItem(updatedItem);
  }

  async updateEpisodeProgress(animeId: number, delta: number) {
    const item = this.itemsSignal().find(i => i.animeId === animeId || i.anime_id === animeId);
    if (!item) return;
    await this.updateProgress(animeId, item.watchedEpisodes + delta);
  }

  async updateStatus(animeId: number, status: AnimeStatus | WatchStatus) {
    const normStatus = normalizeStatus(status);
    const item = this.itemsSignal().find(i => i.animeId === animeId || i.anime_id === animeId);
    if (!item) return;

    let count = item.watchedEpisodes;
    if (normStatus === AnimeStatus.WATCHED && item.totalEpisodes && item.watchedEpisodes < item.totalEpisodes) {
      count = item.totalEpisodes;
    }

    const updatedItem: WatchlistItem = {
      ...item,
      status: normStatus,
      watchedEpisodes: count,
      episodes_watched: count
    };

    this.itemsSignal.update(list =>
      list.map(i => (i.animeId === animeId || i.anime_id === animeId) ? updatedItem : i)
    );

    await this.persistItem(updatedItem);
  }

  async removeFromWatchlist(animeId: number) {
    this.itemsSignal.update(list => list.filter(i => i.animeId !== animeId && i.anime_id !== animeId));

    const user = this.supabaseService.currentUser();
    if (!user || this.supabaseService.isLocalMode() || !this.supabaseService.client) {
      this.saveToLocal(user?.id || 'guest');
      return;
    }

    try {
      await this.supabaseService.client
        .from('anime_lists')
        .delete()
        .eq('user_id', user.id)
        .eq('anime_id', animeId);
    } catch (e) {
      console.warn('Error deleting anime from Supabase, fallback local:', e);
      this.saveToLocal(user.id);
    }
  }

  async removeAnime(animeId: number) {
    await this.removeFromWatchlist(animeId);
  }

  private async persistItem(item: WatchlistItem) {
    const user = this.supabaseService.currentUser();
    if (!user || this.supabaseService.isLocalMode() || !this.supabaseService.client) {
      this.saveToLocal(user?.id || 'guest');
      return;
    }

    try {
      await this.supabaseService.client
        .from('anime_lists')
        .upsert({
          user_id: user.id,
          anime_id: item.animeId,
          status: item.status,
          episodes_watched: item.watchedEpisodes,
          total_episodes: item.totalEpisodes,
          anime_data: item.anime_data,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,anime_id' });
    } catch (e) {
      console.warn('Error persisting item to Supabase, fallback local:', e);
      this.saveToLocal(user.id);
    }
  }

  private loadFromLocal(key: string) {
    const raw = localStorage.getItem(`animehub_list_${key}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.itemsSignal.set(parsed.map(mapToWatchlistItem));
          return;
        }
      } catch {
        // Ignorar error al parsear JSON
      }
    }
    this.itemsSignal.set([]);
  }

  private saveToLocal(key: string) {
    localStorage.setItem(`animehub_list_${key}`, JSON.stringify(this.itemsSignal()));
  }
}
