import { Component, HostListener, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { WatchlistService, AnimeStatus, WatchlistItem } from '../../core/services/watchlist.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

interface Tab {
  key: AnimeStatus;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-my-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StatusBadgeComponent],
  template: `
    <section class="my-list-page">
      <div class="container">
        <div class="page-header">
          <div class="header-text">
            <h1 class="page-title">Mi Lista</h1>
            <p class="header-subtitle">Tu colección personal de anime</p>
          </div>
          @if (supabaseService.isAuthenticated()) {
            <div class="header-stats">
              <div class="stat-chip glass-panel">
                <span class="material-symbols-outlined">favorite</span>
                <span>{{ totalItems() }} animes</span>
              </div>
            </div>
          }
        </div>

        @if (!supabaseService.isAuthenticated()) {
          <div class="empty-state glass-card">
            <span class="material-symbols-outlined empty-icon">lock</span>
            <h3>Inicia sesión para ver tu lista</h3>
            <p class="empty-text">
              Necesitas iniciar sesión o crear una cuenta para poder guardar y organizar tus animes favoritos.
            </p>
            <button class="btn-primary" (click)="supabaseService.openAuthModal()">
              <span class="material-symbols-outlined">login</span>
              Iniciar Sesión
            </button>
          </div>
        } @else {
          <!-- Buscador local -->
          <div class="search-bar surface-panel">
            <span class="material-symbols-outlined search-icon">search</span>
            <input
              class="input-field search-input"
              type="text"
              placeholder="Buscar en tu lista..."
              [ngModel]="searchQuery()"
              (ngModelChange)="searchQuery.set($event)"
            />
            @if (searchQuery()) {
              <button class="clear-btn" (click)="searchQuery.set('')">
                <span class="material-symbols-outlined">close</span>
              </button>
            }
          </div>

          <!-- Pestañas -->
          <div class="tabs-container glass-panel">
            @for (tab of tabs; track tab.key) {
              <button
                class="tab-btn"
                [class.active]="activeTab() === tab.key"
                (click)="activeTab.set(tab.key)"
              >
                <span class="material-symbols-outlined tab-icon">{{ tab.icon }}</span>
                <span class="tab-label">{{ tab.label }}</span>
                <span class="tab-count">{{ getTabCount(tab.key) }}</span>
              </button>
            }
          </div>

          <!-- Contenido de la pestaña -->
          <div class="tab-content">
            @if (filteredItems().length === 0) {
              <div class="empty-state glass-card">
                <span class="material-symbols-outlined empty-icon">
                  {{ activeTab() === 'WATCHING' ? 'play_circle' : activeTab() === 'WATCHED' ? 'check_circle' : 'schedule' }}
                </span>
                <h3>No tienes animes en esta lista</h3>
                <p class="empty-text">
                  @if (searchQuery()) {
                    No se encontraron resultados para "{{ searchQuery() }}"
                  } @else {
                    Explora y añade animes a tu lista para empezar
                  }
                </p>
                @if (!searchQuery()) {
                  <a routerLink="/" class="btn-primary explore-btn">
                    <span class="material-symbols-outlined">explore</span>
                    Explorar anime
                  </a>
                } @else {
                  <button class="btn-glass" (click)="searchQuery.set('')">
                    <span class="material-symbols-outlined">backspace</span>
                    Limpiar búsqueda
                  </button>
                }
              </div>
            } @else {
              <div class="items-grid">
                @for (item of filteredItems(); track item.animeId) {
                  <div class="list-item glass-card">
                    <a [routerLink]="['/anime', item.animeId]" class="poster-link">
                      <img
                        [src]="item.imageUrl"
                        [alt]="item.title"
                        class="poster-img"
                        loading="lazy"
                        decoding="async"
                        referrerpolicy="no-referrer"
                      />
                      <div class="poster-overlay">
                        <span class="material-symbols-outlined">visibility</span>
                      </div>
                    </a>

                    <div class="item-info">
                      <div class="item-top">
                        <a [routerLink]="['/anime', item.animeId]" class="item-title">{{ item.title }}</a>
                        <app-status-badge [status]="item.status"></app-status-badge>
                      </div>

                      <div class="progress-section">
                        <div class="progress-header">
                          <span class="progress-label">Progreso</span>
                          <span class="progress-numbers">
                            {{ item.watchedEpisodes }} / {{ item.totalEpisodes || '?' }}
                            <span class="progress-pct">({{ getProgressPercentage(item) }}%)</span>
                          </span>
                        </div>
                        <div class="progress-track">
                          <div
                            class="progress-fill"
                            [style.width.%]="getProgressPercentage(item)"
                          ></div>
                        </div>
                      </div>

                      @if (item.status === AnimeStatus.WATCHING) {
                        <div class="episode-controls">
                          <button
                            class="ep-btn btn-glass"
                            (click)="decrementEpisode(item, $event)"
                            [disabled]="item.watchedEpisodes <= 0"
                          >
                            <span class="material-symbols-outlined">remove</span>
                          </button>
                          <span class="ep-count">Ep. {{ item.watchedEpisodes }}</span>
                          <button
                            class="ep-btn btn-glass"
                            (click)="incrementEpisode(item, $event)"
                            [disabled]="item.totalEpisodes !== undefined && item.totalEpisodes !== null && item.watchedEpisodes >= item.totalEpisodes"
                          >
                            <span class="material-symbols-outlined">add</span>
                          </button>
                        </div>
                      }

                      <div class="item-actions">
                        <div class="status-dropdown-wrapper">
                          <button class="btn-glass action-btn" (click)="toggleDropdown(item.animeId, $event)">
                            <span class="material-symbols-outlined">swap_horiz</span>
                            <span class="action-label">Cambiar estado</span>
                          </button>
                          @if (openDropdownId() === item.animeId) {
                            <div class="status-dropdown glass-panel">
                              @for (opt of statusOptions; track opt.value) {
                                <button
                                  class="dropdown-option"
                                  [class.current]="item.status === opt.value"
                                  (click)="changeStatus(item.animeId, opt.value, $event)"
                                >
                                  <span class="material-symbols-outlined">{{ opt.icon }}</span>
                                  {{ opt.label }}
                                  @if (item.status === opt.value) {
                                    <span class="material-symbols-outlined check-icon">check</span>
                                  }
                                </button>
                              }
                            </div>
                          }
                        </div>

                        <button class="btn-glass action-btn danger" (click)="confirmRemove(item, $event)">
                          <span class="material-symbols-outlined">delete</span>
                          <span class="action-label">Eliminar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>

      @if (itemToRemove()) {
        <div class="modal-backdrop" (click)="cancelRemove()">
          <div class="modal-dialog glass-panel" (click)="$event.stopPropagation()">
            <div class="modal-icon-wrapper">
              <span class="material-symbols-outlined modal-icon">delete_forever</span>
            </div>
            <h3 class="modal-title">¿Eliminar de tu lista?</h3>
            <p class="modal-text">
              Vas a eliminar <strong>{{ itemToRemove()!.title }}</strong> de tu lista. Esta acción no se puede deshacer.
            </p>
            <div class="modal-actions">
              <button class="btn-glass" (click)="cancelRemove()">
                <span class="material-symbols-outlined">close</span>
                Cancelar
              </button>
              <button class="btn-primary danger-btn" (click)="executeRemove()">
                <span class="material-symbols-outlined">delete</span>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
  styles: [`
    :host { display: block; min-height: calc(100vh - 80px); padding-top: 2rem; padding-bottom: 4rem; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; gap: 1rem; flex-wrap: wrap; }
    .page-title { font-family: var(--font-heading); font-size: 2.5rem; font-weight: 800; margin-bottom: 0.25rem; color: var(--primary); }
    .header-subtitle { color: var(--text-secondary); font-size: 1rem; }
    .stat-chip { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1rem; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); }
    .stat-chip .material-symbols-outlined { color: var(--secondary); font-size: 1.15rem; }
    .search-bar { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 1rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; }
    .search-icon { color: var(--text-muted); font-size: 1.3rem; }
    .search-input { flex: 1; background: transparent !important; border: none !important; box-shadow: none !important; padding: 0.5rem 0; font-size: 0.95rem; }
    .clear-btn { background: rgba(0, 0, 0, 0.04); border: none; border-radius: var(--radius-sm); padding: 0.35rem; cursor: pointer; color: var(--text-secondary); display: flex; align-items: center; justify-content: center; }
    .tabs-container { display: flex; gap: 0.25rem; padding: 0.35rem; border-radius: var(--radius-md); margin-bottom: 2rem; }
    .tab-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.85rem 1rem; border: none; border-radius: var(--radius-sm); background: transparent; color: var(--text-secondary); font-family: var(--font-heading); font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: var(--transition-normal); }
    .tab-btn.active { background: var(--primary-subtle); border: 1px solid rgba(255, 107, 107, 0.15); color: var(--primary); }
    .tab-btn.active .tab-count { background: var(--primary); color: #fff; }
    .tab-count { font-size: 0.7rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 9999px; background: rgba(0, 0, 0, 0.04); color: var(--text-muted); }
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 4rem 2rem; border-radius: var(--radius-lg); }
    .empty-icon { font-size: 4rem; color: var(--text-muted); margin-bottom: 1.25rem; opacity: 0.5; }
    .empty-state h3 { font-family: var(--font-heading); font-size: 1.35rem; margin-bottom: 0.5rem; }
    .empty-text { color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 1.75rem; max-width: 360px; }
    .items-grid { display: flex; flex-direction: column; gap: 1rem; }
    .list-item { display: flex; gap: 1.25rem; padding: 1rem; border-radius: var(--radius-md); align-items: stretch; }
    .poster-link { position: relative; flex-shrink: 0; width: 100px; border-radius: var(--radius-sm); overflow: hidden; display: block; }
    .poster-img { width: 100%; height: 100%; object-fit: cover; display: block; min-height: 140px; }
    .poster-overlay { position: absolute; inset: 0; background: rgba(255, 107, 107, 0.15); display: flex; align-items: center; justify-content: center; opacity: 0; transition: var(--transition-normal); }
    .poster-link:hover .poster-overlay { opacity: 1; }
    .item-info { flex: 1; display: flex; flex-direction: column; gap: 0.75rem; min-width: 0; }
    .item-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
    .item-title { font-family: var(--font-heading); font-weight: 700; font-size: 1.05rem; color: var(--text-primary); text-decoration: none; flex: 1; }
    .progress-section { display: flex; flex-direction: column; gap: 0.4rem; }
    .progress-header { display: flex; justify-content: space-between; align-items: center; }
    .progress-label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; }
    .progress-numbers { font-size: 0.8rem; color: var(--text-secondary); font-weight: 600; }
    .progress-track { width: 100%; height: 6px; background: rgba(0, 0, 0, 0.06); border-radius: 9999px; overflow: hidden; }
    .progress-fill { height: 100%; border-radius: 9999px; background: var(--primary); transition: width 0.4s ease; }
    .episode-controls { display: flex; align-items: center; gap: 0.75rem; }
    .ep-btn { padding: 0.4rem; border-radius: var(--radius-sm); }
    .ep-count { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); min-width: 3rem; text-align: center; }
    .item-actions { display: flex; gap: 0.5rem; margin-top: auto; flex-wrap: wrap; }
    .action-btn { font-size: 0.8rem; padding: 0.45rem 0.85rem; gap: 0.35rem; }
    .status-dropdown-wrapper { position: relative; }
    .status-dropdown { position: absolute; bottom: calc(100% + 6px); left: 0; min-width: 200px; border-radius: var(--radius-md); padding: 0.35rem; z-index: 50; background: var(--surface); }
    .dropdown-option { display: flex; align-items: center; gap: 0.6rem; width: 100%; padding: 0.65rem 0.85rem; border: none; border-radius: var(--radius-sm); background: transparent; color: var(--text-secondary); font-size: 0.85rem; cursor: pointer; text-align: left; }
    .dropdown-option.current { color: var(--primary); }
    .check-icon { margin-left: auto; font-size: 1rem !important; color: var(--success); }
    .modal-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
    .modal-dialog { max-width: 420px; width: 100%; padding: 2rem; border-radius: var(--radius-lg); text-align: center; background: var(--surface); }
    .modal-icon-wrapper { width: 64px; height: 64px; border-radius: 50%; background: rgba(229, 62, 62, 0.12); display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem; }
    .modal-icon { font-size: 2rem; color: var(--danger); }
    .modal-actions { display: flex; gap: 0.75rem; justify-content: center; margin-top: 1.5rem; }
    .danger-btn { background: var(--danger) !important; color: #fff !important; }
  `]
})
export class MyListComponent {
  private watchlist = inject(WatchlistService);
  supabaseService = inject(SupabaseService);

  readonly AnimeStatus = AnimeStatus;

  readonly tabs: Tab[] = [
    { key: AnimeStatus.WATCHING, label: 'Viendo', icon: 'play_circle' },
    { key: AnimeStatus.WATCHED, label: 'Visto', icon: 'check_circle' },
    { key: AnimeStatus.PLAN_TO_WATCH, label: 'Por Ver', icon: 'schedule' }
  ];

  readonly statusOptions = [
    { value: AnimeStatus.WATCHING, label: 'Viendo', icon: 'play_circle' },
    { value: AnimeStatus.WATCHED, label: 'Visto', icon: 'check_circle' },
    { value: AnimeStatus.PLAN_TO_WATCH, label: 'Por Ver', icon: 'schedule' }
  ];

  activeTab = signal<AnimeStatus>(AnimeStatus.WATCHING);
  searchQuery = signal('');
  openDropdownId = signal<number | null>(null);
  itemToRemove = signal<WatchlistItem | null>(null);

  totalItems = computed(() => this.watchlist.items().length);

  private activeItems = computed(() => {
    switch (this.activeTab()) {
      case AnimeStatus.WATCHING:
        return this.watchlist.watching();
      case AnimeStatus.WATCHED:
        return this.watchlist.watched();
      case AnimeStatus.PLAN_TO_WATCH:
        return this.watchlist.planToWatch();
      default:
        return [];
    }
  });

  filteredItems = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const items = this.activeItems();
    if (!query) return items;
    return items.filter((item: WatchlistItem) => item.title.toLowerCase().includes(query));
  });

  @HostListener('document:click')
  onDocumentClick(): void {
    this.openDropdownId.set(null);
  }

  getTabCount(tab: AnimeStatus): number {
    switch (tab) {
      case AnimeStatus.WATCHING:
        return this.watchlist.watching().length;
      case AnimeStatus.WATCHED:
        return this.watchlist.watched().length;
      case AnimeStatus.PLAN_TO_WATCH:
        return this.watchlist.planToWatch().length;
      default:
        return 0;
    }
  }

  getProgressPercentage(item: WatchlistItem): number {
    if (!item.totalEpisodes || item.totalEpisodes === 0) {
      return item.watchedEpisodes > 0 ? 50 : 0;
    }
    return Math.round((item.watchedEpisodes / item.totalEpisodes) * 100);
  }

  incrementEpisode(item: WatchlistItem, event: Event): void {
    event.stopPropagation();
    this.watchlist.updateProgress(item.animeId, item.watchedEpisodes + 1);
  }

  decrementEpisode(item: WatchlistItem, event: Event): void {
    event.stopPropagation();
    this.watchlist.updateProgress(item.animeId, item.watchedEpisodes - 1);
  }

  toggleDropdown(animeId: number, event: Event): void {
    event.stopPropagation();
    this.openDropdownId.update(current => current === animeId ? null : animeId);
  }

  changeStatus(animeId: number, status: AnimeStatus, event: Event): void {
    event.stopPropagation();
    this.watchlist.updateStatus(animeId, status);
    this.openDropdownId.set(null);
  }

  confirmRemove(item: WatchlistItem, event: Event): void {
    event.stopPropagation();
    this.itemToRemove.set(item);
  }

  cancelRemove(): void {
    this.itemToRemove.set(null);
  }

  executeRemove(): void {
    const item = this.itemToRemove();
    if (item) {
      this.watchlist.removeFromWatchlist(item.animeId);
      this.itemToRemove.set(null);
    }
  }
}