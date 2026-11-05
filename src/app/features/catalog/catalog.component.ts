import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';

import { AnilistService, Anime } from '../../core/services/anilist.service';
import { AnimeCardComponent } from '../../shared/components/anime-card/anime-card.component';
import { SkeletonCardComponent } from '../../shared/components/skeleton-card/skeleton-card.component';

interface Genre {
  mal_id: number;
  name: string;
}

interface SectionData {
  title: string;
  icon: string;
  items: Anime[];
  loading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AnimeCardComponent, SkeletonCardComponent],
  template: `
    <section class="hero">
      <div class="hero-bg"></div>
      <div class="container hero-content">
        <h1 class="hero-title">
          Descubre tu<br />
          <span class="hero-highlight">próximo anime favorito</span>
        </h1>
        <p class="hero-subtitle">Explora, busca y organiza tu lista personal de animes</p>

        <!-- Barra de búsqueda -->
        <div class="search-bar-wrapper">
          <div class="search-bar surface-panel">
            <span class="material-symbols-outlined search-icon">search</span>
            <input
              type="text"
              class="search-input"
              placeholder="Buscar anime por nombre..."
              [ngModel]="searchQuery()"
              (ngModelChange)="onSearchInput($event)"
            />
            @if (searchQuery()) {
              <button class="clear-btn" (click)="clearSearch()" aria-label="Limpiar búsqueda">
                <span class="material-symbols-outlined">close</span>
              </button>
            }
          </div>
        </div>
      </div>
    </section>

    <!-- Contenido Principal -->
    <div class="container main-content">
      <div class="catalog-layout">
        <!-- Barra lateral de filtros (Sin Temporada) -->
        <aside class="filters-sidebar">
          <div class="filters-header">
            <h3>
              <span class="material-symbols-outlined">filter_list</span>
              Filtros
            </h3>
            @if (activeFilterCount() > 0 || searchQuery().trim().length > 0) {
              <button class="clear-filters-btn" (click)="clearAllFilters()">
                <span class="material-symbols-outlined icon-sm">restart_alt</span>
                Limpiar
              </button>
            }
          </div>

          <!-- Filtro de Géneros -->
          <div class="filter-group">
            <button class="filter-group-header" (click)="genresExpanded.set(!genresExpanded())">
              <span class="filter-label">
                <span class="material-symbols-outlined icon-sm">category</span>
                Géneros
              </span>
              @if (selectedGenres().length > 0) {
                <span class="active-count">{{ selectedGenres().length }}</span>
              }
              <span class="material-symbols-outlined chevron" [class.rotated]="genresExpanded()">
                expand_more
              </span>
            </button>
            @if (genresExpanded()) {
              <div class="filter-body genre-grid">
                @if (genres().length === 0) {
                  <div class="genre-loading">
                    @for (i of skeletonGenres; track i) {
                      <div class="genre-skeleton shimmer"></div>
                    }
                  </div>
                } @else {
                  @for (genre of genres(); track genre.mal_id) {
                    <button
                      class="genre-tag-btn"
                      [class.active]="isGenreSelected(genre.mal_id)"
                      (click)="toggleGenre(genre.mal_id)"
                    >
                      {{ genre.name }}
                    </button>
                  }
                }
              </div>
            }
          </div>

          <!-- Filtro de Puntuación Mínima -->
          <div class="filter-group">
            <button class="filter-group-header" (click)="scoreExpanded.set(!scoreExpanded())">
              <span class="filter-label">
                <span class="material-symbols-outlined icon-sm">star</span>
                Puntuación mínima
              </span>
              @if (selectedScore()) {
                <span class="active-count">{{ selectedScore() }}+</span>
              }
              <span class="material-symbols-outlined chevron" [class.rotated]="scoreExpanded()">
                expand_more
              </span>
            </button>
            @if (scoreExpanded()) {
              <div class="filter-body">
                <select
                  class="filter-select select-field"
                  [ngModel]="selectedScore()"
                  (ngModelChange)="onScoreChange($event)"
                >
                  <option [ngValue]="null">Cualquiera</option>
                  @for (s of scoreOptions; track s) {
                    <option [ngValue]="s">{{ s }}+ estrellas</option>
                  }
                </select>
              </div>
            }
          </div>

          <!-- Filtro de Año -->
          <div class="filter-group">
            <button class="filter-group-header" (click)="yearExpanded.set(!yearExpanded())">
              <span class="filter-label">
                <span class="material-symbols-outlined icon-sm">calendar_month</span>
                Año
              </span>
              @if (selectedYear()) {
                <span class="active-count">{{ selectedYear() }}</span>
              }
              <span class="material-symbols-outlined chevron" [class.rotated]="yearExpanded()">
                expand_more
              </span>
            </button>
            @if (yearExpanded()) {
              <div class="filter-body">
                <select
                  class="filter-select select-field"
                  [ngModel]="selectedYear()"
                  (ngModelChange)="onYearChange($event)"
                >
                  <option [ngValue]="null">Todos</option>
                  @for (y of yearOptions; track y) {
                    <option [ngValue]="y">{{ y }}</option>
                  }
                </select>
              </div>
            }
          </div>

          <!-- Filtro de Estado -->
          <div class="filter-group">
            <button class="filter-group-header" (click)="statusExpanded.set(!statusExpanded())">
              <span class="filter-label">
                <span class="material-symbols-outlined icon-sm">tv</span>
                Estado
              </span>
              @if (selectedStatus()) {
                <span class="active-count">{{ getStatusLabel(selectedStatus()!) }}</span>
              }
              <span class="material-symbols-outlined chevron" [class.rotated]="statusExpanded()">
                expand_more
              </span>
            </button>
            @if (statusExpanded()) {
              <div class="filter-body">
                <select
                  class="filter-select select-field"
                  [ngModel]="selectedStatus()"
                  (ngModelChange)="onStatusChange($event)"
                >
                  <option [ngValue]="null">Todos</option>
                  @for (st of statusOptions; track st.value) {
                    <option [ngValue]="st.value">{{ st.label }}</option>
                  }
                </select>
              </div>
            }
          </div>
        </aside>

        <main class="catalog-content">
          @if (showResults()) {
            <section class="results-area">
              @if (!loading() || animes().length > 0) {
                <div class="results-header">
                  <span class="results-count">
                    <span class="material-symbols-outlined icon-sm">dashboard</span>
                    @if (hasExactTotal() && totalResults() > 0) {
                      {{ totalResults() }} resultados encontrados @if (knownTotalPages() && knownTotalPages()! > 1) { <span class="page-indicator">· Pág. {{ currentPage() }} de {{ knownTotalPages() }}</span> }
                    } @else if (animes().length > 0) {
                      Explorando catálogo <span class="page-indicator">· Pág. {{ currentPage() }}</span>
                    } @else if (!loading()) {
                      Sin resultados
                    }
                  </span>
                  <button class="btn-ghost" (click)="clearAllFilters()">
                    <span class="material-symbols-outlined icon-sm">arrow_back</span>
                    Volver al inicio
                  </button>
                </div>
              }

              <div class="results-grid">
                @if (loading() && animes().length === 0) {
                  @for (i of skeletonCards; track i) {
                    <app-skeleton-card />
                  }
                } @else {
                  @for (anime of animes(); track anime.id) {
                    <app-anime-card [anime]="anime" />
                  }
                }
              </div>

              @if (!loading() && animes().length === 0 && hasSearched()) {
                <div class="empty-state">
                  <div class="empty-icon">
                    <span class="material-symbols-outlined">search_off</span>
                  </div>
                  <h3>No se encontraron resultados</h3>
                  <p>Intenta ajustar los filtros o busca con otros términos</p>
                  <button class="btn-glass" (click)="clearAllFilters()">
                    <span class="material-symbols-outlined icon-sm">restart_alt</span>
                    Limpiar filtros
                  </button>
                </div>
              }

              <!-- Controles de Paginación Reactiva (20 animes por página, hasta 3 páginas antes/después con la actual centrada) -->
              @if (!loading() && animes().length > 0 && (visiblePages().length > 1 || hasNextPage() || currentPage() > 1)) {
                <nav class="pagination-container" aria-label="Navegación de páginas">
                  <div class="pagination-info">
                    @if (hasExactTotal() && knownTotalPages()) {
                      <span>Página <strong>{{ currentPage() }}</strong> de <strong>{{ knownTotalPages() }}</strong></span>
                      @if (totalResults() > 0) {
                        <span class="pagination-total">({{ totalResults() }} animes)</span>
                      }
                    } @else {
                      <span>Página <strong>{{ currentPage() }}</strong></span>
                      <span class="pagination-total">(20 animes por página)</span>
                    }
                  </div>

                  <div class="pagination-controls">
                    <!-- Primera página -->
                    @if (currentPage() > 2) {
                      <button
                        class="page-nav-btn"
                        [disabled]="currentPage() === 1 || loading()"
                        (click)="goToPage(1)"
                        title="Primera página"
                        aria-label="Primera página"
                      >
                        <span class="material-symbols-outlined">first_page</span>
                      </button>
                    }

                    <!-- Página anterior -->
                    <button
                      class="page-nav-btn"
                      [disabled]="currentPage() === 1 || loading()"
                      (click)="prevPage()"
                      title="Página anterior"
                      aria-label="Página anterior"
                    >
                      <span class="material-symbols-outlined">chevron_left</span>
                    </button>

                    <!-- Salto al inicio si el rango está alejado -->
                    @if (showFirstEllipsis()) {
                      <button class="page-num-btn" [disabled]="loading()" (click)="goToPage(1)">1</button>
                      <span class="pagination-ellipsis">…</span>
                    } @else if (showFirstPage()) {
                      <button class="page-num-btn" [disabled]="loading()" (click)="goToPage(1)">1</button>
                    }

                    <!-- Páginas visibles: hasta 3 antes, página actual centrada, hasta 3 después -->
                    @for (page of visiblePages(); track page) {
                      <button
                        class="page-num-btn"
                        [class.active]="page === currentPage()"
                        [attr.aria-current]="page === currentPage() ? 'page' : null"
                        [disabled]="loading()"
                        (click)="goToPage(page)"
                      >
                        {{ page }}
                      </button>
                    }

                    <!-- Salto al final si el rango está alejado (solo si conocemos el total real) -->
                    @if (showLastEllipsis()) {
                      <span class="pagination-ellipsis">…</span>
                      <button class="page-num-btn" [disabled]="loading()" (click)="goToPage(knownTotalPages()!)">{{ knownTotalPages() }}</button>
                    } @else if (showLastPage()) {
                      <button class="page-num-btn" [disabled]="loading()" (click)="goToPage(knownTotalPages()!)">{{ knownTotalPages() }}</button>
                    }

                    <!-- Página siguiente -->
                    <button
                      class="page-nav-btn"
                      [disabled]="(!hasNextPage() && (!hasExactTotal() || currentPage() >= (knownTotalPages() ?? 1))) || loading()"
                      (click)="nextPage()"
                      title="Página siguiente"
                      aria-label="Página siguiente"
                    >
                      <span class="material-symbols-outlined">chevron_right</span>
                    </button>

                    <!-- Última página (solo si conocemos el total real) -->
                    @if (hasExactTotal() && knownTotalPages() && currentPage() < knownTotalPages()! - 1) {
                      <button
                        class="page-nav-btn"
                        [disabled]="currentPage() >= knownTotalPages()! || loading()"
                        (click)="goToPage(knownTotalPages()!)"
                        title="Última página"
                        aria-label="Última página"
                      >
                        <span class="material-symbols-outlined">last_page</span>
                      </button>
                    }
                  </div>
                </nav>
              }
            </section>
          } @else {
            <!-- Secciones por defecto de Inicio -->
            <div class="sections">
              @for (section of sections(); track section.title) {
                <section class="section">
                  <div class="section-header">
                    <div class="section-header-left">
                      <span class="material-symbols-outlined section-icon">{{ section.icon }}</span>
                      <h2 class="section-title">{{ section.title }}</h2>
                    </div>
                    <div class="section-actions">
                      <a routerLink="/" [queryParams]="getSectionQueryParams(section.title)" class="section-link">
                        Ver todo
                        <span class="material-symbols-outlined">chevron_right</span>
                      </a>
                      <div class="carousel-controls">
                        <button
                          class="carousel-arrow"
                          (click)="moveSection(section, 'left')"
                          [disabled]="!canMoveSection(section, 'left')"
                          aria-label="Mostrar animes anteriores"
                        >
                          <span class="material-symbols-outlined">chevron_left</span>
                        </button>
                        <button
                          class="carousel-arrow"
                          (click)="moveSection(section, 'right')"
                          [disabled]="!canMoveSection(section, 'right')"
                          aria-label="Mostrar animes siguientes"
                        >
                          <span class="material-symbols-outlined">chevron_right</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  @if (section.error) {
                    <div class="section-error">
                      <span class="material-symbols-outlined">error_outline</span>
                      <span>{{ section.error }}</span>
                      <button class="btn-outline btn-retry" (click)="retrySection(section.title)">
                        <span class="material-symbols-outlined icon-sm">replay</span>
                        Reintentar
                      </button>
                    </div>
                  } @else {
                    <div class="carousel-grid">
                      @if (section.loading) {
                        @for (item of carouselSkeletons; track item) {
                          <app-skeleton-card />
                        }
                      } @else {
                        @for (anime of getVisibleSectionItems(section); track anime.id) {
                          <app-anime-card [anime]="anime" />
                        }
                      }
                    </div>
                  }
                </section>
              }
            </div>
          }
        </main>
      </div>
    </div>

    <footer class="footer">
      <div class="container footer-inner">
        <span class="footer-brand">AnimeHub</span>
        <span class="footer-divider">•</span>
        <span>Datos proporcionados por <a href="https://anilist.co" target="_blank" rel="noopener">AniList API</a></span>
      </div>
    </footer>
  `,
  styles: [`
    .hero {
      position: relative;
      padding: 3rem 0 2.5rem;
      overflow: hidden;
    }

    .hero-bg {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse at 15% 50%, rgba(255, 107, 107, 0.07) 0%, transparent 60%),
        radial-gradient(ellipse at 85% 50%, rgba(108, 99, 255, 0.05) 0%, transparent 60%);
      pointer-events: none;
    }

    .hero-content {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      max-width: 720px;
    }

    .hero-title {
      font-size: clamp(2.2rem, 5vw, 3.75rem);
      font-weight: 800;
      line-height: 1.12;
      letter-spacing: -0.03em;
    }

    .hero-highlight {
      color: var(--primary);
    }

    .hero-subtitle {
      color: var(--text-secondary);
      font-size: 1.1rem;
      max-width: 480px;
      line-height: 1.5;
    }

    .search-bar-wrapper {
      width: 100%;
      max-width: 560px;
      margin-top: 1rem;
    }

    .search-bar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.25rem 0.35rem 0.25rem 1.25rem;
      border-radius: var(--radius-xl);
      background: var(--surface-card);
      border: 1px solid var(--border);
      transition: var(--transition-normal);

      &:focus-within {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px var(--primary-subtle);
      }
    }

    .search-icon {
      color: var(--text-muted);
      font-size: 1.4rem;
      flex-shrink: 0;
    }

    .search-input {
      flex: 1;
      border: none !important;
      background: transparent !important;
      padding: 0.75rem 0.5rem !important;
      font-size: 1rem;
      color: var(--text-primary);
      outline: none !important;
      box-shadow: none !important;

      &::placeholder {
        color: var(--text-muted);
        font-weight: 400;
      }
    }

    .clear-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.25rem;
      height: 2.25rem;
      border-radius: var(--radius-full);
      border: none;
      background: rgba(0, 0, 0, 0.04);
      color: var(--text-secondary);
      cursor: pointer;
      transition: var(--transition-fast);
      flex-shrink: 0;

      &:hover {
        background: rgba(0, 0, 0, 0.1);
        color: var(--text-primary);
      }
    }

    .main-content {
      padding-bottom: 4rem;
      margin-top: 1.5rem;
    }

    .catalog-layout {
      display: grid;
      grid-template-columns: 280px minmax(0, 1fr);
      gap: 1.5rem;
      align-items: start;

      @media (max-width: 900px) {
        grid-template-columns: 1fr;
      }
    }

    .catalog-content {
      min-width: 0;
    }

    .sections {
      display: flex;
      flex-direction: column;
      gap: 2.5rem;
    }

    .section {
      padding-block: 0;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1rem;

      @media (max-width: 640px) {
        align-items: flex-start;
        flex-direction: column;
      }
    }

    .section-header-left {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .section-icon {
      font-size: 1.5rem;
      color: var(--primary);
      font-variation-settings: 'FILL' 1;
    }

    .section-title {
      font-size: 1.35rem;
      font-weight: 700;
    }

    .section-link {
      display: flex;
      align-items: center;
      gap: 0.15rem;
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--text-secondary);
      transition: var(--transition-fast);

      &:hover {
        color: var(--primary);
      }

      .material-symbols-outlined {
        font-size: 1.1rem;
      }
    }

    .section-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-shrink: 0;

      @media (max-width: 640px) {
        width: 100%;
        justify-content: space-between;
        gap: 0.55rem;
      }
    }

    .carousel-controls {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }

    .carousel-arrow {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.03);
      border: 1px solid var(--border);
      color: var(--text-primary);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover:not(:disabled) {
        background: var(--primary);
        border-color: var(--primary);
        color: #0b0d11;
        box-shadow: var(--shadow-lg);
      }

      &:disabled {
        opacity: 0.38;
        cursor: not-allowed;
      }
    }

    .carousel-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 1rem;
      min-width: 0;

      @media (max-width: 1180px) {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      @media (max-width: 900px) {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      @media (max-width: 640px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.85rem;
      }
    }

    .section-error {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      background: rgba(229, 62, 62, 0.08);
      border: 1px solid rgba(229, 62, 62, 0.2);
      border-radius: var(--radius-md);
      color: var(--danger);
      font-size: 0.9rem;
    }

    .btn-retry {
      padding: 0.35rem 0.75rem;
      font-size: 0.8rem;
      margin-left: auto;
    }

    .filters-sidebar {
      position: sticky;
      top: 5.5rem;
      border-radius: var(--radius-lg);
      background: var(--surface-card);
      border: 1px solid var(--border);
      overflow: hidden;

      @media (max-width: 900px) {
        position: static;
        margin-bottom: 1.5rem;
      }
    }

    .filters-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.15rem;
      border-bottom: 1px solid var(--border);

      h3 {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 1rem;
        font-weight: 600;
      }
    }

    .clear-filters-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      background: none;
      border: none;
      color: var(--secondary);
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: var(--transition-fast);
      font-family: var(--font-body);

      &:hover {
        color: var(--primary);
      }
    }

    .filter-group {
      border-bottom: 1px solid var(--border);

      &:last-child {
        border-bottom: none;
      }
    }

    .filter-group-header {
      display: flex;
      align-items: center;
      width: 100%;
      padding: 0.85rem 1.15rem;
      background: none;
      border: none;
      color: var(--text-primary);
      font-family: var(--font-body);
      font-size: 0.88rem;
      font-weight: 500;
      cursor: pointer;
      transition: var(--transition-fast);

      &:hover {
        background: rgba(0, 0, 0, 0.02);
      }
    }

    .filter-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex: 1;
      text-align: left;
    }

    .active-count {
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--primary);
      background: var(--primary-subtle);
      padding: 0.15rem 0.45rem;
      border-radius: var(--radius-sm);
      margin-right: 0.35rem;
    }

    .chevron {
      font-size: 1.2rem;
      color: var(--text-muted);
      transition: transform var(--transition-normal);
      flex-shrink: 0;

      &.rotated {
        transform: rotate(180deg);
      }
    }

    .filter-body {
      padding: 0 1.15rem 1rem;
    }

    .genre-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .genre-tag-btn {
      padding: 0.3rem 0.7rem;
      font-size: 0.75rem;
      font-weight: 500;
      font-family: var(--font-body);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
      background: rgba(0, 0, 0, 0.02);
      color: var(--text-secondary);
      cursor: pointer;
      transition: var(--transition-fast);
      white-space: nowrap;

      &:hover {
        border-color: var(--border-hover);
        color: var(--text-primary);
        background: rgba(0, 0, 0, 0.05);
      }

      &.active {
        border-color: var(--primary);
        background: var(--primary-subtle);
        color: var(--primary);
      }
    }

    .genre-loading {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .genre-skeleton {
      width: 70px;
      height: 28px;
      border-radius: var(--radius-sm);
    }

    .filter-select {
      width: 100%;
      cursor: pointer;
      font-size: 0.85rem;
    }

    .results-area {
      min-height: 300px;
      padding-block: 0;
    }

    .results-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .results-count {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.9rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .results-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(185px, 1fr));
      gap: 1.25rem;

      @media (max-width: 640px) {
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 0.85rem;
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 4rem 2rem;
      gap: 1rem;
    }

    .empty-icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: var(--primary-subtle);
      border: 1px solid rgba(255, 107, 107, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;

      .material-symbols-outlined {
        font-size: 2.5rem;
        color: var(--text-muted);
      }
    }

    .page-indicator {
      font-weight: 400;
      color: var(--text-muted);
      margin-left: 0.25rem;
    }

    .pagination-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.25rem;
      margin-top: 3rem;
      padding: 1.5rem 1rem;
      border-radius: var(--radius-lg);
      background: var(--surface-card);
      border: 1px solid var(--border);
      backdrop-filter: blur(12px);
    }

    .pagination-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.88rem;
      color: var(--text-secondary);

      strong {
        color: var(--text-primary);
        font-weight: 700;
      }

      .pagination-total {
        color: var(--text-muted);
        font-size: 0.8rem;
      }
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      flex-wrap: wrap;
    }

    .page-nav-btn,
    .page-num-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 40px;
      height: 40px;
      padding: 0 0.65rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--border);
      background: rgba(255, 255, 255, 0.03);
      color: var(--text-secondary);
      font-family: var(--font-heading);
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition-fast);
      user-select: none;

      &:hover:not(:disabled):not(.active) {
        background: rgba(255, 107, 107, 0.1);
        border-color: rgba(255, 107, 107, 0.4);
        color: var(--text-primary);
        transform: translateY(-2px);
      }

      &:active:not(:disabled) {
        transform: scale(0.96);
      }

      &.active {
        background: var(--primary);
        border-color: var(--primary);
        color: #ffffff;
        font-weight: 700;
        box-shadow: 0 4px 14px rgba(255, 107, 107, 0.35);
        cursor: default;
      }

      &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
        border-color: var(--border);
      }

      .material-symbols-outlined {
        font-size: 1.25rem;
      }
    }

    .pagination-ellipsis {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 24px;
      height: 40px;
      color: var(--text-muted);
      font-weight: 700;
      font-size: 1rem;
      user-select: none;
    }

    @media (max-width: 640px) {
      .pagination-container {
        padding: 1.25rem 0.5rem;
        margin-top: 2rem;
      }

      .page-nav-btn,
      .page-num-btn {
        min-width: 36px;
        height: 36px;
        padding: 0 0.4rem;
        font-size: 0.82rem;

        .material-symbols-outlined {
          font-size: 1.1rem;
        }
      }

      .pagination-controls {
        gap: 0.25rem;
      }
    }

    .spinner {
      width: 22px;
      height: 22px;
      border: 2px solid var(--border);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .footer {
      border-top: 1px solid var(--border);
      padding: 1.5rem 0;
      margin-top: auto;
    }

    .footer-inner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: var(--text-muted);
      flex-wrap: wrap;
    }

    .footer-brand {
      font-family: var(--font-heading);
      font-weight: 700;
      color: var(--primary);
    }
  `]
})
export class CatalogComponent implements OnInit, OnDestroy {
  private anilistService = inject(AnilistService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  sections = signal<SectionData[]>([
    { title: 'Top Airing', icon: 'trending_up', items: [], loading: true, error: null },
    { title: 'Temporada Actual', icon: 'calendar_month', items: [], loading: true, error: null },
    { title: 'Más Populares', icon: 'whatshot', items: [], loading: true, error: null },
    { title: 'Próximamente', icon: 'new_releases', items: [], loading: true, error: null },
  ]);

  searchQuery = signal('');
  animes = signal<Anime[]>([]);
  results = this.animes;
  loading = signal(false);
  loadingMore = signal(false);
  hasSearched = signal(false);
  totalResults = signal(0);
  knownTotalPages = signal<number | null>(null);
  hasExactTotal = signal(false);
  hasNextPage = signal(false);
  currentPage = signal(1);

  totalPages = computed(() => this.knownTotalPages() ?? 1);

  // Paginación: rango visible con la página actual en el centro (hasta 3 antes y 3 después)
  visiblePages = computed(() => {
    const current = this.currentPage();
    const exactTotal = this.knownTotalPages();

    if (exactTotal !== null) {
      if (exactTotal <= 1) return [];
      const start = Math.max(1, current - 3);
      const end = Math.min(exactTotal, current + 3);
      const pages: number[] = [];
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      return pages;
    }

    // Si AniList no da un total exacto (tope artificial 250 / 5000):
    // La página actual en el centro: hasta 3 páginas antes y hasta 3 páginas después (si hay siguiente página)
    const start = Math.max(1, current - 3);
    const end = this.hasNextPage() ? current + 3 : current;

    const pages: number[] = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  });

  showFirstEllipsis = computed(() => {
    const current = this.currentPage();
    return Math.max(1, current - 3) > 2;
  });

  showFirstPage = computed(() => {
    const current = this.currentPage();
    return Math.max(1, current - 3) === 2;
  });

  showLastEllipsis = computed(() => {
    const total = this.knownTotalPages();
    if (!total || !this.hasExactTotal()) return false;
    const current = this.currentPage();
    return Math.min(total, current + 3) < total - 1;
  });

  showLastPage = computed(() => {
    const total = this.knownTotalPages();
    if (!total || !this.hasExactTotal()) return false;
    const current = this.currentPage();
    return Math.min(total, current + 3) === total - 1;
  });

  genres = signal<Genre[]>([]);
  selectedGenres = signal<number[]>([]);
  selectedScore = signal<number | null>(null);
  selectedYear = signal<number | null>(null);
  selectedStatus = signal<string | null>(null);
  selectedSort = signal<string | null>(null);

  genresExpanded = signal(false);
  scoreExpanded = signal(false);
  yearExpanded = signal(false);
  statusExpanded = signal(false);
  sectionOffsets = signal<Record<string, number>>({});

  activeFilterCount = computed(() => {
    let count = 0;
    if (this.selectedGenres().length > 0) count++;
    if (this.selectedScore()) count++;
    if (this.selectedYear()) count++;
    if (this.selectedStatus()) count++;
    if (this.selectedSort()) count++;
    return count;
  });

  showResults = computed(() => {
    return this.searchQuery().trim().length > 0 || this.activeFilterCount() > 0;
  });

  scoreOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  statusOptions = [
    { value: 'airing', label: 'En emisión' },
    { value: 'complete', label: 'Finalizado' },
    { value: 'upcoming', label: 'Próximamente' }
  ];
  yearOptions: number[] = [];
  skeletonCards = Array.from({ length: 20 }, (_, i) => i);
  skeletonGenres = Array.from({ length: 10 }, (_, i) => i);
  carouselSkeletons = Array.from({ length: 5 }, (_, i) => i);
  private readonly carouselStep = 5;

  private searchSubject = new Subject<string>();
  private subscriptions = new Subscription();
  private searchSubscription?: Subscription;
  private isInternalUrlUpdate = false;

  ngOnInit(): void {
    const currentYear = new Date().getFullYear();
    this.yearOptions = Array.from({ length: currentYear - 1980 + 1 }, (_, i) => currentYear - i);

    this.loadSection(0, () => this.anilistService.getTopAiring());
    this.loadSection(1, () => this.anilistService.getCurrentSeason());
    this.loadSection(2, () => this.anilistService.getPopular());
    this.loadSection(3, () => this.anilistService.getRecentUpcoming());

    this.subscriptions.add(
      this.anilistService.getGenres().subscribe(genres => this.genres.set(genres))
    );

    this.subscriptions.add(
      this.searchSubject.pipe(
        debounceTime(300),
        distinctUntilChanged()
      ).subscribe(() => {
        this.currentPage.set(1);
        this.syncFiltersToUrl();
        if (this.showResults()) {
          this.executeSearch();
        } else {
          this.animes.set([]);
          this.totalResults.set(0);
          this.hasSearched.set(false);
        }
      })
    );

    this.subscriptions.add(
      this.route.queryParams.subscribe(params => {
        if (this.isInternalUrlUpdate) {
          this.isInternalUrlUpdate = false;
          return;
        }

        const qParam = params['q'] ?? '';
        this.searchQuery.set(qParam);

        if (params['genres']) {
          const genreIds = String(params['genres'])
            .split(',')
            .map(id => Number(id))
            .filter(id => !isNaN(id));
          this.selectedGenres.set(genreIds);
          this.genresExpanded.set(true);
        } else {
          this.selectedGenres.set([]);
        }

        if (params['score']) {
          this.selectedScore.set(Number(params['score']) || null);
          this.scoreExpanded.set(true);
        } else {
          this.selectedScore.set(null);
        }

        if (params['year']) {
          this.selectedYear.set(Number(params['year']) || null);
          this.yearExpanded.set(true);
        } else {
          this.selectedYear.set(null);
        }

        if (params['status']) {
          this.selectedStatus.set(params['status']);
          this.statusExpanded.set(true);
        } else {
          this.selectedStatus.set(null);
        }

        this.selectedSort.set(params['sort'] || null);
        this.currentPage.set(Number(params['page']) || 1);

        if (this.showResults()) {
          this.executeSearch();
        } else {
          this.animes.set([]);
          this.totalResults.set(0);
          this.knownTotalPages.set(null);
          this.hasExactTotal.set(false);
          this.hasSearched.set(false);
          this.hasNextPage.set(false);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.searchSubject.next(value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchSubject.next('');
  }

  toggleGenre(genreId: number): void {
    this.selectedGenres.update(ids => {
      const idx = ids.indexOf(genreId);
      if (idx >= 0) {
        return ids.filter(id => id !== genreId);
      }
      return [...ids, genreId];
    });
    this.onFilterChange();
  }

  isGenreSelected(genreId: number): boolean {
    return this.selectedGenres().includes(genreId);
  }

  onScoreChange(value: number | null): void {
    this.selectedScore.set(value ? Number(value) : null);
    this.onFilterChange();
  }

  onYearChange(value: number | null): void {
    this.selectedYear.set(value ? Number(value) : null);
    this.onFilterChange();
  }

  onStatusChange(value: string | null): void {
    this.selectedStatus.set(value || null);
    this.onFilterChange();
  }

  getStatusLabel(value: string): string {
    return this.statusOptions.find(s => s.value === value)?.label || value;
  }

  clearAllFilters(): void {
    this.searchQuery.set('');
    this.selectedGenres.set([]);
    this.selectedScore.set(null);
    this.selectedYear.set(null);
    this.selectedStatus.set(null);
    this.selectedSort.set(null);
    this.currentPage.set(1);
    this.animes.set([]);
    this.hasSearched.set(false);
    this.totalResults.set(0);
    this.knownTotalPages.set(null);
    this.hasExactTotal.set(false);
    this.hasNextPage.set(false);

    this.genresExpanded.set(false);
    this.scoreExpanded.set(false);
    this.yearExpanded.set(false);
    this.statusExpanded.set(false);

    this.isInternalUrlUpdate = true;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true
    });
  }

  goToPage(page: number): void {
    if (page < 1 || page === this.currentPage()) {
      return;
    }
    if (this.hasExactTotal() && this.knownTotalPages() && page > this.knownTotalPages()!) {
      return;
    }
    this.currentPage.set(page);
    this.syncFiltersToUrl();
    this.executeSearch();
    this.scrollToResultsTop();
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.goToPage(this.currentPage() - 1);
    }
  }

  nextPage(): void {
    if (this.hasNextPage()) {
      this.goToPage(this.currentPage() + 1);
    } else if (this.hasExactTotal() && this.knownTotalPages() && this.currentPage() < this.knownTotalPages()!) {
      this.goToPage(this.currentPage() + 1);
    }
  }

  loadMore(): void {
    this.nextPage();
  }

  private scrollToResultsTop(): void {
    if (typeof window !== 'undefined') {
      const el = document.querySelector('.results-area') || document.querySelector('.main-content');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  private onFilterChange(): void {
    this.currentPage.set(1);
    this.animes.set([]);
    this.knownTotalPages.set(null);
    this.hasExactTotal.set(false);
    this.syncFiltersToUrl();
    if (this.showResults()) {
      this.executeSearch();
    } else {
      this.hasSearched.set(false);
      this.totalResults.set(0);
      this.hasNextPage.set(false);
    }
  }

  private syncFiltersToUrl(): void {
    const queryParams: Record<string, string | null> = {};

    if (this.searchQuery().trim()) queryParams['q'] = this.searchQuery().trim();
    if (this.selectedGenres().length > 0) queryParams['genres'] = this.selectedGenres().join(',');
    if (this.selectedScore()) queryParams['score'] = String(this.selectedScore());
    if (this.selectedYear()) queryParams['year'] = String(this.selectedYear());
    if (this.selectedStatus()) queryParams['status'] = this.selectedStatus();
    if (this.selectedSort()) queryParams['sort'] = this.selectedSort();
    if (this.currentPage() > 1) queryParams['page'] = String(this.currentPage());

    this.isInternalUrlUpdate = true;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true,
    });
  }

  private executeSearch(append = false): void {
    if (!this.showResults()) {
      return;
    }

    const filters: {
      q?: string;
      page?: number;
      genres?: string;
      score?: number;
      status?: string;
      year?: number;
      sort?: string;
    } = {
      page: this.currentPage()
    };

    if (this.searchQuery().trim()) filters.q = this.searchQuery().trim();
    if (this.selectedGenres().length > 0) filters.genres = this.selectedGenres().join(',');
    if (this.selectedScore()) filters.score = this.selectedScore()!;
    if (this.selectedYear()) filters.year = this.selectedYear()!;
    if (this.selectedStatus()) filters.status = this.selectedStatus()!;
    if (this.selectedSort()) filters.sort = this.selectedSort()!;

    // ⚡ Caché inteligente antes del fetch/HttpClient:
    // Si la página ya está en memoria o en sessionStorage, actualizamos instantáneamente
    // las Signals sin latencia de red ni provocar error 429 (Rate Limit).
    const cacheKey = this.anilistService.getPageCacheKey(filters);
    const cached = this.anilistService.getCachedPage(cacheKey);

    if (cached) {
      this.hasSearched.set(true);
      this.applySearchResults(cached, append);
      this.loading.set(false);
      this.loadingMore.set(false);
      return;
    }

    if (append) {
      this.loadingMore.set(true);
    } else {
      this.loading.set(true);
    }
    this.hasSearched.set(true);

    if (!append && this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }

    this.searchSubscription = this.anilistService.searchAnime(filters).pipe(
      finalize(() => {
        this.loading.set(false);
        this.loadingMore.set(false);
      })
    ).subscribe({
      next: response => {
        this.applySearchResults(response, append);
      },
      error: err => {
        console.error('Search error:', err);
        if (!append) {
          this.animes.set([]);
          this.totalResults.set(0);
          this.knownTotalPages.set(null);
          this.hasExactTotal.set(false);
          this.hasNextPage.set(false);
        }
      }
    });

    this.subscriptions.add(this.searchSubscription);
  }

  private applySearchResults(
    response: import('../../core/services/anilist.service').AnilistResponse<Anime[]>,
    append = false
  ): void {
    if (append) {
      this.animes.update(prev => [...prev, ...response.data]);
    } else {
      this.animes.set(response.data);
    }

    const rawTotal = response.pagination?.items?.total ?? response.data.length;
    const rawLastPage = response.pagination?.last_visible_page || 1;
    const hasNext = response.pagination?.has_next_page ?? false;

    // La API de AniList limita artificialmente las consultas grandes a 5000 items (250 páginas de 20).
    // Si el resultado trae ese tope por defecto, no es un conteo real.
    const isDefaultApiCap = rawLastPage >= 250 || rawTotal >= 5000;

    if (!hasNext) {
      // Ya no hay más páginas posteriores: conocemos exactamente la última página
      const finalPage = response.data.length > 0 ? this.currentPage() : Math.max(1, this.currentPage() - 1);
      this.knownTotalPages.set(finalPage);
      this.hasExactTotal.set(true);
      const computedTotal = response.data.length > 0
        ? (this.currentPage() - 1) * 20 + response.data.length
        : rawTotal;
      this.totalResults.set(computedTotal);
      this.hasNextPage.set(false);
    } else if (!isDefaultApiCap) {
      // Conteo real exacto calculado por AniList (búsquedas con pocos resultados)
      this.knownTotalPages.set(rawLastPage);
      this.hasExactTotal.set(true);
      this.totalResults.set(rawTotal);
      this.hasNextPage.set(this.currentPage() < rawLastPage);
    } else {
      // Consulta con más páginas de las visibles inicialmente:
      // Se navega dinámicamente con ventana centrada (+-3 páginas) sin mostrar el número falso de 250
      this.hasExactTotal.set(false);
      this.knownTotalPages.set(null);
      this.totalResults.set(rawTotal);
      this.hasNextPage.set(true);
    }
  }

  private loadSection(
    index: number,
    fetchFn: () => ReturnType<typeof this.anilistService.getTopAiring>
  ) {
    this.sections.update(list =>
      list.map((sec, i) => i === index ? { ...sec, loading: true, error: null } : sec)
    );

    fetchFn().subscribe({
      next: (res) => {
        this.sections.update(list =>
          list.map((sec, i) => i === index ? { ...sec, items: res.data, loading: false } : sec)
        );
      },
      error: () => {
        this.sections.update(list =>
          list.map((sec, i) => i === index ? { ...sec, loading: false, error: 'Error al cargar esta sección.' } : sec)
        );
      }
    });
  }

  retrySection(title: string) {
    const idx = this.sections().findIndex(s => s.title === title);
    if (idx < 0) return;

    let fetchFn: () => ReturnType<typeof this.anilistService.getTopAiring>;
    if (title === 'Top Airing') fetchFn = () => this.anilistService.getTopAiring();
    else if (title === 'Temporada Actual') fetchFn = () => this.anilistService.getCurrentSeason();
    else if (title === 'Más Populares') fetchFn = () => this.anilistService.getPopular();
    else fetchFn = () => this.anilistService.getRecentUpcoming();

    this.loadSection(idx, fetchFn);
  }

  getSectionQueryParams(title: string) {
    if (title === 'Top Airing') {
      return { status: 'airing' };
    } else if (title === 'Próximamente') {
      return { status: 'upcoming' };
    } else if (title === 'Temporada Actual') {
      return { status: 'airing', year: new Date().getFullYear() };
    }
    return { sort: 'popular' };
  }

  getVisibleSectionItems(section: SectionData): Anime[] {
    const offset = Math.min(this.getSectionOffset(section.title), this.getMaxSectionOffset(section));
    return section.items.slice(offset, offset + this.carouselStep);
  }

  canMoveSection(section: SectionData, direction: 'left' | 'right'): boolean {
    if (section.loading || section.items.length <= this.carouselStep) {
      return false;
    }

    const offset = this.getSectionOffset(section.title);
    return direction === 'left'
      ? offset > 0
      : offset + this.carouselStep < section.items.length;
  }

  moveSection(section: SectionData, direction: 'left' | 'right'): void {
    const offset = this.getSectionOffset(section.title);
    const nextOffset = direction === 'left'
      ? offset - this.carouselStep
      : offset + this.carouselStep;
    const clampedOffset = Math.max(0, Math.min(this.getMaxSectionOffset(section), nextOffset));

    this.sectionOffsets.update(offsets => ({
      ...offsets,
      [section.title]: clampedOffset,
    }));
  }

  private getSectionOffset(title: string): number {
    return this.sectionOffsets()[title] ?? 0;
  }

  private getMaxSectionOffset(section: SectionData): number {
    if (section.items.length <= this.carouselStep) {
      return 0;
    }

    return Math.floor((section.items.length - 1) / this.carouselStep) * this.carouselStep;
  }
}