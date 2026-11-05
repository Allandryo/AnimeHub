import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { SupabaseService } from './supabase.service';

export type WatchStatus = 'watching' | 'watched' | 'plan_to_watch';

export interface WatchlistItem {
  anime_id: number;
  status: WatchStatus;
  episodes_watched: number;
  total_episodes: number | null;
  anime_data: any; // Objeto del anime proveniente de AniList
}

@Injectable({ providedIn: 'root' })
export class WatchlistService {
  private supabaseService = inject(SupabaseService);
  
  // Signal principal de la lista
  private itemsSignal = signal<WatchlistItem[]>([]);

  // Selectores Computed para las pestañas de /my-list
  readonly allItems = this.itemsSignal.asReadonly();
  readonly watchingList = computed(() => this.itemsSignal().filter(i => i.status === 'watching'));
  readonly watchedList = computed(() => this.itemsSignal().filter(i => i.status === 'watched'));
  readonly planToWatchList = computed(() => this.itemsSignal().filter(i => i.status === 'plan_to_watch'));

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

  async loadWatchlist(userId: string) {
    if (this.supabaseService.isLocalMode() || !this.supabaseService.client) {
      this.loadFromLocal(userId);
      return;
    }

    const { data, error } = await this.supabaseService.client
      .from('anime_lists')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      this.itemsSignal.set(data);
    } else {
      this.loadFromLocal(userId); // Fallback en caso de caída de red
    }
  }

  async upsertAnime(anime: any, status: WatchStatus, episodesWatched = 0) {
    const totalEpisodes = anime.episodes || null;
    // Regla de negocio del README: si completa episodios -> cambia a 'watched'
    const finalStatus: WatchStatus = (totalEpisodes && episodesWatched >= totalEpisodes) 
      ? 'watched' 
      : status;

    const newItem: WatchlistItem = {
      anime_id: anime.id,
      status: finalStatus,
      episodes_watched: episodesWatched,
      total_episodes: totalEpisodes,
      anime_data: anime
    };

    // Actualización optimista en la UI con Signals
    this.itemsSignal.update(list => {
      const exists = list.some(i => i.anime_id === anime.id);
      return exists 
        ? list.map(i => i.anime_id === anime.id ? newItem : i)
        : [newItem, ...list];
    });

    await this.persistItem(newItem);
  }

  async updateEpisodeProgress(animeId: number, delta: number) {
    const item = this.itemsSignal().find(i => i.anime_id === animeId);
    if (!item) return;

    const maxEps = item.total_episodes ?? Infinity;
    const newCount = Math.max(0, Math.min(item.episodes_watched + delta, maxEps));
    
    await this.upsertAnime(item.anime_data, item.status, newCount);
  }

  async removeAnime(animeId: number) {
    this.itemsSignal.update(list => list.filter(i => i.anime_id !== animeId));
    
    const user = this.supabaseService.currentUser();
    if (!user || this.supabaseService.isLocalMode() || !this.supabaseService.client) {
      this.saveToLocal(user?.id || 'guest');
      return;
    }

    await this.supabaseService.client
      .from('anime_lists')
      .delete()
      .eq('user_id', user.id)
      .eq('anime_id', animeId);
  }

  private async persistItem(item: WatchlistItem) {
    const user = this.supabaseService.currentUser();
    if (!user || this.supabaseService.isLocalMode() || !this.supabaseService.client) {
      this.saveToLocal(user?.id || 'guest');
      return;
    }

    await this.supabaseService.client
      .from('anime_lists')
      .upsert({
        user_id: user.id,
        anime_id: item.anime_id,
        status: item.status,
        episodes_watched: item.episodes_watched,
        total_episodes: item.total_episodes,
        anime_data: item.anime_data,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,anime_id' });
  }

  private loadFromLocal(key: string) {
    const raw = localStorage.getItem(`animehub_list_${key}`);
    this.itemsSignal.set(raw ? JSON.parse(raw) : []);
  }

  private saveToLocal(key: string) {
    localStorage.setItem(`animehub_list_${key}`, JSON.stringify(this.itemsSignal()));
  }
}