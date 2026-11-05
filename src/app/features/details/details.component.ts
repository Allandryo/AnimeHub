import { Component, HostListener, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnilistService, Anime } from '../../core/services/anilist.service';
import { WatchlistService, AnimeStatus } from '../../core/services/watchlist.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { StarRatingComponent } from '../../shared/components/star-rating/star-rating.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule, RouterLink, StarRatingComponent, StatusBadgeComponent],
  template: `
    @if (loading()) {
      <div class="loading-skeleton container">
        <div class="skeleton-banner shimmer"></div>
        <div class="skeleton-body">
          <div class="skeleton-poster shimmer"></div>
          <div class="skeleton-info">
            <div class="shimmer" style="height:2rem;width:60%;border-radius:8px;margin-bottom:1rem"></div>
            <div class="shimmer" style="height:1rem;width:40%;border-radius:6px;margin-bottom:0.75rem"></div>
            <div class="shimmer" style="height:1rem;width:100%;border-radius:6px;margin-bottom:0.4rem"></div>
            <div class="shimmer" style="height:1rem;width:90%;border-radius:6px;margin-bottom:0.4rem"></div>
            <div class="shimmer" style="height:1rem;width:70%;border-radius:6px"></div>
          </div>
        </div>
      </div>
    } @else if (error()) {
      <div class="error-state">
        <span class="material-symbols-outlined icon-lg">error_outline</span>
        <h2>Anime no encontrado</h2>
        <p>No pudimos cargar la información de este anime.</p>
        <a routerLink="/" class="btn-glass">Volver al inicio</a>
      </div>
    } @else {
      @let a = anime()!;
      <div class="details-page">
        @if (a.banner_image || a.images.webp?.large_image_url) {
          <div class="banner-wrapper">
            <img [src]="a.banner_image || a.images.webp?.large_image_url || a.images.jpg.large_image_url" alt="" class="banner" />
            <div class="banner-overlay"></div>
          </div>
        }

        <div class="main-section container">
          <div class="poster-col">
            <img
              [src]="a.images.webp?.large_image_url || a.images.jpg.large_image_url"
              [alt]="a.title"
              class="poster"
            />
          </div>

          <div class="info-col">
            <div class="title-row">
              <h1 class="anime-title">{{ a.title }}</h1>
              @if (a.title_english && a.title_english !== a.title) {
                <p class="anime-title-en">{{ a.title_english }}</p>
              }
            </div>

            <div class="meta-tags">
              @if (a.score) {
                <app-star-rating [score]="a.score" />
              }
              @if (a.status) {
                <span class="meta-tag">{{ a.status }}</span>
              }
              @if (a.type) {
                <span class="meta-tag">{{ a.type }}</span>
              }
              @if (a.episodes) {
                <span class="meta-tag">{{ a.episodes }} episodios</span>
              }
              @if (a.year) {
                <span class="meta-tag">{{ a.year }}</span>
              }
              @if (a.rating) {
                <span class="meta-tag">{{ a.rating }}</span>
              }
            </div>

            @if (a.genres && a.genres.length > 0) {
              <div class="genres">
                @for (g of a.genres; track g.mal_id) {
                  <span class="genre-tag">{{ g.name }}</span>
                }
              </div>
            }

            @if (a.synopsis) {
              <div class="synopsis">
                <h3>Sinopsis</h3>
                <p>{{ a.synopsis }}</p>
              </div>
            }

            <!-- Acciones de Mi Lista -->
            <div class="watchlist-actions">
              @if (!supabaseService.isAuthenticated()) {
                <div class="auth-required-box surface-card">
                  <span class="material-symbols-outlined">lock</span>
                  <span>Inicia sesión para guardar este anime en tu lista personal.</span>
                  <button class="btn-primary" (click)="supabaseService.openAuthModal()">
                    <span class="material-symbols-outlined">login</span>
                    Iniciar Sesión
                  </button>
                </div>
              } @else if (!watchlistItem()) {
                <div class="add-buttons">
                  <button class="btn-primary" (click)="addToWatchlist(AnimeStatus.WATCHING)">
                    <span class="material-symbols-outlined">play_circle</span>
                    Viendo
                  </button>
                  <button class="btn-glass" (click)="addToWatchlist(AnimeStatus.PLAN_TO_WATCH)">
                    <span class="material-symbols-outlined">schedule</span>
                    Por Ver
                  </button>
                  <button class="btn-glass" (click)="addToWatchlist(AnimeStatus.WATCHED)">
                    <span class="material-symbols-outlined">check_circle</span>
                    Visto
                  </button>
                </div>
              } @else {
                <div class="in-list">
                  <app-status-badge [status]="watchlistItem()!.status" />
                  <div class="progress-section">
                    <label>Progreso</label>
                    <div class="progress-controls">
                      <button class="btn-icon" (click)="updateProgress(-1)" [disabled]="watchlistItem()!.watchedEpisodes <= 0">
                        <span class="material-symbols-outlined">remove</span>
                      </button>
                      <span class="progress-text">{{ watchlistItem()!.watchedEpisodes }} / {{ watchlistItem()!.totalEpisodes || '?' }}</span>
                      <button class="btn-icon" (click)="updateProgress(1)" [disabled]="watchlistItem()!.totalEpisodes !== undefined && watchlistItem()!.watchedEpisodes >= watchlistItem()!.totalEpisodes!">
                        <span class="material-symbols-outlined">add</span>
                      </button>
                    </div>
                  </div>
                  <div class="status-actions">
                    <select class="select-field status-select" [value]="watchlistItem()!.status" (change)="onStatusChange($event)">
                      <option value="WATCHING">Viendo</option>
                      <option value="WATCHED">Visto</option>
                      <option value="PLAN_TO_WATCH">Por Ver</option>
                    </select>
                    <button class="btn-glass btn-remove" (click)="removeFromWatchlist()">
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        @if (a.trailer?.embed_url) {
          <div class="trailer-section container">
            <h2 class="section-heading">
              <span class="material-symbols-outlined">play_circle</span>
              Trailer
            </h2>
            <div class="trailer-wrapper">
              <iframe
                [src]="trailerUrl()"
                title="Trailer"
                frameborder="0"
                allowfullscreen
                allow="autoplay; encrypted-media"
                class="trailer-iframe"
              ></iframe>
            </div>
          </div>
        }
      </div>

      <button class="back-to-top" (click)="scrollToTop()" [class.visible]="showBackToTop()">
        <span class="material-symbols-outlined">arrow_upward</span>
      </button>
    }
  `,
  styles: [`
    .loading-skeleton { padding-top: 2rem; }
    .skeleton-banner { height: 300px; border-radius: var(--radius-lg); margin-bottom: 2rem; }
    .skeleton-body { display: flex; gap: 2rem; }
    .skeleton-poster { width: 280px; height: 400px; border-radius: var(--radius-md); flex-shrink: 0; }
    .skeleton-info { flex: 1; }

    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      gap: 1rem;
      text-align: center;
      color: var(--text-secondary);
      .icon-lg { font-size: 4rem; color: var(--danger); }
      h2 { font-size: 1.5rem; }
    }

    .details-page { padding-bottom: 3rem; }
    .banner-wrapper {
      position: relative;
      height: 400px;
      overflow: hidden;
      @media (max-width: 768px) { height: 250px; }
      @media (max-width: 480px) { height: 180px; }
    }
    .banner { width: 100%; height: 100%; object-fit: cover; object-position: center top; }
    .banner-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(to top, var(--bg-deep) 0%, transparent 40%, transparent 60%, rgba(15, 23, 42, 0.3) 100%);
    }

    .main-section {
      display: flex;
      gap: 2.5rem;
      margin-top: -200px;
      position: relative;
      z-index: 2;
      @media (max-width: 768px) { flex-direction: column; margin-top: -120px; }
    }

    .poster-col {
      flex-shrink: 0;
      width: 280px;
      @media (max-width: 768px) { width: 200px; align-self: center; }
      @media (max-width: 480px) { width: 160px; }
    }

    .poster {
      width: 100%;
      border-radius: var(--radius-lg);
      box-shadow: 0 16px 48px rgba(15, 23, 42, 0.15);
      border: 2px solid var(--border);
    }

    .info-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      padding-top: 2rem;
      @media (max-width: 768px) { padding-top: 0; }
    }

    .title-row { display: flex; flex-direction: column; gap: 0.35rem; }
    .anime-title { font-size: clamp(1.5rem, 3vw, 2.5rem); font-weight: 800; letter-spacing: -0.02em; }
    .anime-title-en { color: var(--text-muted); font-size: 1rem; }
    .meta-tags { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .meta-tag {
      padding: 0.3rem 0.7rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-secondary);
      background: rgba(0, 0, 0, 0.03);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
    }

    .genres { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .genre-tag {
      padding: 0.35rem 0.75rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--primary);
      background: var(--primary-subtle);
      border: 1px solid rgba(255, 107, 107, 0.15);
      border-radius: var(--radius-sm);
    }

    .synopsis {
      h3 { font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-primary); }
      p { color: var(--text-secondary); font-size: 0.95rem; line-height: 1.7; }
    }

    .watchlist-actions { margin-top: 0.5rem; }
    .auth-required-box {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.25rem;
      flex-wrap: wrap;
      color: var(--text-secondary);
      font-size: 0.9rem;
      .material-symbols-outlined { color: var(--primary); }
    }

    .add-buttons { display: flex; flex-wrap: wrap; gap: 0.75rem; }
    .in-list {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1.25rem;
      padding: 1.25rem;
      background: var(--surface-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
    }

    .progress-section {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
    }

    .progress-controls { display: flex; align-items: center; gap: 0.5rem; }
    .progress-text { font-family: var(--font-heading); font-weight: 700; font-size: 0.95rem; min-width: 4rem; text-align: center; }
    .status-actions { display: flex; align-items: center; gap: 0.5rem; }
    .status-select { padding: 0.5rem 2.25rem 0.5rem 0.75rem; font-size: 0.85rem; cursor: pointer; }
    .btn-remove { color: var(--danger); border-color: rgba(229, 62, 62, 0.2); padding: 0.5rem; }

    .section-heading {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 1.25rem;
      font-weight: 700;
      margin-bottom: 1rem;
      .material-symbols-outlined { color: var(--primary); font-variation-settings: 'FILL' 1; }
    }

    .trailer-section { margin-top: 3rem; }
    .trailer-wrapper {
      position: relative;
      width: 100%;
      max-width: 800px;
      aspect-ratio: 16 / 9;
      border-radius: var(--radius-md);
      overflow: hidden;
      border: 1px solid var(--border);
    }
    .trailer-iframe { width: 100%; height: 100%; }

    .back-to-top {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      width: 2.75rem;
      height: 2.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--surface-card);
      border: 1px solid var(--border);
      border-radius: 50%;
      color: var(--text-primary);
      cursor: pointer;
      opacity: 0;
      transform: translateY(1rem);
      pointer-events: none;
      transition: var(--transition-normal);
      z-index: 100;
      &.visible { opacity: 1; transform: translateY(0); pointer-events: auto; }
    }
  `]
})
export class DetailsComponent {
  private route = inject(ActivatedRoute);
  private anilistService = inject(AnilistService);
  private watchlistService = inject(WatchlistService);
  supabaseService = inject(SupabaseService);
  private sanitizer = inject(DomSanitizer);

  readonly AnimeStatus = AnimeStatus;

  loading = signal(true);
  error = signal(false);
  anime = signal<Anime | null>(null);
  showBackToTop = signal(false);

  watchlistItem = computed(() => {
    const a = this.anime();
    return a ? this.watchlistService.getWatchlistItem(a.mal_id) : undefined;
  });

  trailerUrl = computed<SafeResourceUrl | null>(() => {
    const embed = this.anime()?.trailer?.embed_url;
    if (!embed) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(embed);
  });

  constructor() {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (!id) {
        this.error.set(true);
        this.loading.set(false);
        return;
      }

      this.loading.set(true);
      this.error.set(false);

      this.anilistService.getAnimeDetails(id).subscribe({
        next: (data) => {
          this.anime.set(data);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error loading anime details:', err);
          this.error.set(true);
          this.loading.set(false);
        }
      });
    });
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    if (typeof window !== 'undefined') {
      this.showBackToTop.set(window.scrollY > 600);
    }
  }

  addToWatchlist(status: AnimeStatus) {
    const a = this.anime();
    if (a) {
      this.watchlistService.addToWatchlist(a, status);
    }
  }

  updateProgress(delta: number) {
    const item = this.watchlistItem();
    const a = this.anime();
    if (item && a) {
      this.watchlistService.updateProgress(a.mal_id, item.watchedEpisodes + delta);
    }
  }

  onStatusChange(event: Event) {
    const a = this.anime();
    if (a) {
      const status = (event.target as HTMLSelectElement).value as AnimeStatus;
      this.watchlistService.updateStatus(a.mal_id, status);
    }
  }

  removeFromWatchlist() {
    const a = this.anime();
    if (a) {
      this.watchlistService.removeFromWatchlist(a.mal_id);
    }
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}