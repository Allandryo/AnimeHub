import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Anime } from '../../../core/services/anilist.service';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { WatchlistService } from '../../../core/services/watchlist.service';

@Component({
  selector: 'app-anime-card',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent],
  template: `
    <a [routerLink]="['/anime', anime.id || anime.mal_id]" class="card" [title]="anime.title">
      <div class="poster-wrapper">
        <img
          [src]="anime.coverImage?.large || anime.images.webp?.large_image_url || anime.images.jpg.large_image_url || anime.images.jpg.image_url"
          [alt]="anime.title"
          class="poster"
          loading="lazy"
          decoding="async"
          referrerpolicy="no-referrer"
        />
        <div class="poster-overlay">
          <div class="overlay-actions">
            <span class="material-symbols-outlined icon-lg">play_circle</span>
          </div>
        </div>
        @if (anime.score) {
          <div class="score-badge">
            <span class="material-symbols-outlined icon-sm">star</span>
            {{ anime.score | number:'1.1-1' }}
          </div>
        }
        @if (anime.airing) {
          <div class="airing-badge">
            <span class="pulse-dot"></span>
            En Emisión
          </div>
        }
        @if (watchlistItem) {
          <div class="watchlist-indicator">
            <app-status-badge [status]="watchlistItem.status" />
          </div>
        }
      </div>
      <div class="card-body">
        <h3 class="title">{{ anime.title }}</h3>
        <div class="meta">
          @if (anime.type) {
            <span class="type-tag">{{ anime.type }}</span>
          }
          @if (anime.episodes) {
            <span class="episodes">{{ anime.episodes }} eps</span>
          }
          @if (anime.year) {
            <span class="year">{{ anime.year }}</span>
          }
        </div>
        @if (anime.genres && anime.genres.length > 0) {
          <div class="genres">
            @for (genre of anime.genres.slice(0, 3); track genre.mal_id) {
              <span class="genre-tag">{{ genre.name }}</span>
            }
          </div>
        }
      </div>
    </a>
  `,
  styles: [`
    .card {
      display: flex;
      flex-direction: column;
      border-radius: var(--radius-md);
      overflow: hidden;
      background: var(--surface-card);
      border: 1px solid var(--border);
      transition: var(--transition-spring);
      text-decoration: none;
      color: inherit;
      position: relative;
      will-change: transform;

      &:hover {
        transform: translateY(-4px);
        border-color: var(--border-hover);
        box-shadow: 0 8px 28px rgba(255, 107, 107, 0.08), var(--shadow-lg);

        .poster-overlay {
          opacity: 1;
        }

        .poster-wrapper::after {
          opacity: 1;
        }
      }
    }

    .poster-wrapper {
      position: relative;
      aspect-ratio: 3 / 4.2;
      overflow: hidden;
      background: rgba(15, 23, 42, 0.02);

      // Subtle inner rim highlight (not animating the img)
      &::after {
        content: '';
        position: absolute;
        inset: 0;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
        opacity: 0;
        transition: var(--transition-normal);
        pointer-events: none;
        z-index: 2;
      }
    }

    .poster {
      width: 100%;
      height: 100%;
      object-fit: cover;
      // NO transform on hover - banned per design.md
    }

    .poster-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(to top, rgba(15, 23, 42, 0.7) 0%, transparent 50%);
      opacity: 0;
      transition: var(--transition-normal);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1;
    }

    .overlay-actions {
      color: #fff;
      font-size: 2.5rem;
      opacity: 0.85;
      filter: drop-shadow(0 2px 8px rgba(15, 23, 42, 0.5));
      transform: translateY(8px);
      transition: var(--transition-spring);
    }

    .card:hover .overlay-actions {
      transform: translateY(0);
    }

    .score-badge {
      position: absolute;
      top: 0.6rem;
      left: 0.6rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.55rem;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(8px);
      border-radius: var(--radius-sm);
      font-size: 0.78rem;
      font-weight: 700;
      font-family: var(--font-heading);
      color: var(--primary);
      border: 1px solid rgba(255, 107, 107, 0.15);
      z-index: 2;
    }

    .airing-badge {
      position: absolute;
      top: 0.6rem;
      right: 0.6rem;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.55rem;
      background: rgba(15, 118, 110, 0.12);
      backdrop-filter: blur(8px);
      border-radius: var(--radius-sm);
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--success);
      border: 1px solid rgba(15, 118, 110, 0.2);
      z-index: 2;
    }

    .pulse-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--success);
      animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(1.5); }
    }

    .watchlist-indicator {
      position: absolute;
      bottom: 0.5rem;
      left: 0.5rem;
      z-index: 2;
    }

    .card-body {
      padding: 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      flex: 1;
    }

    .title {
      font-size: 0.9rem;
      font-weight: 600;
      line-height: 1.35;
      color: var(--text-primary);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      transition: var(--transition-fast);
    }

    .card:hover .title {
      color: var(--primary);
    }

    .meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.72rem;
      color: var(--text-secondary);
      flex-wrap: wrap;
    }

    .type-tag {
      padding: 0.1rem 0.4rem;
      background: var(--primary-subtle);
      border: 1px solid rgba(255, 107, 107, 0.12);
      border-radius: var(--radius-sm);
      color: var(--primary);
      font-weight: 600;
      font-size: 0.68rem;
      text-transform: uppercase;
    }

    .episodes, .year {
      font-weight: 500;
    }

    .genres {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
      margin-top: auto;
    }

    .genre-tag {
      font-size: 0.65rem;
      color: var(--text-muted);
      padding: 0.1rem 0.4rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      transition: var(--transition-fast);
    }
  `]
})
export class AnimeCardComponent {
  @Input({ required: true }) anime!: Anime;

  private watchlistService = inject(WatchlistService);

  get watchlistItem() {
    return this.watchlistService.getWatchlistItem(this.anime?.id || this.anime?.mal_id);
  }
}
