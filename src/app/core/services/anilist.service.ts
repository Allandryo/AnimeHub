import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, shareReplay, catchError, tap } from 'rxjs/operators';

export interface Anime {
  id: number;
  mal_id: number;
  title: string;
  title_english?: string;
  coverImage?: {
    large?: string;
    extraLarge?: string;
    medium?: string;
  };
  banner_image?: string;
  images: {
    webp?: {
      image_url: string;
      large_image_url?: string;
      small_image_url?: string;
    };
    jpg: {
      image_url: string;
      large_image_url?: string;
      small_image_url?: string;
    };
  };
  score?: number;
  averageScore?: number;
  scored_by?: number;
  synopsis?: string;
  type?: string;
  episodes?: number;
  status?: string;
  airing?: boolean;
  year?: number;
  season?: string;
  duration?: string;
  rating?: string;
  genres: Array<{ mal_id: number; name: string; type?: string }>;
  studios?: Array<{ mal_id: number; name: string }>;
  trailer?: {
    youtube_id?: string;
    url?: string;
    embed_url?: string;
  };
}

export interface AnilistResponse<T> {
  data: T;
  pagination?: {
    last_visible_page: number;
    has_next_page: boolean;
    current_page?: number;
    items?: {
      count: number;
      total: number;
      per_page: number;
    };
  };
}

export interface CharacterInfo {
  character: {
    mal_id: number;
    url: string;
    images: {
      webp: { image_url: string; small_image_url?: string };
      jpg: { image_url: string };
    };
    name: string;
  };
  role: string;
  voice_actors: Array<{
    person: {
      mal_id: number;
      name: string;
      images: {
        jpg: { image_url: string };
      };
    };
    language: string;
  }>;
}

const GENRE_LIST = [
  { mal_id: 1, name: 'Action' },
  { mal_id: 2, name: 'Adventure' },
  { mal_id: 4, name: 'Comedy' },
  { mal_id: 8, name: 'Drama' },
  { mal_id: 9, name: 'Ecchi' },
  { mal_id: 10, name: 'Fantasy' },
  { mal_id: 14, name: 'Horror' },
  { mal_id: 66, name: 'Mahou Shoujo' },
  { mal_id: 18, name: 'Mecha' },
  { mal_id: 19, name: 'Music' },
  { mal_id: 7, name: 'Mystery' },
  { mal_id: 40, name: 'Psychological' },
  { mal_id: 22, name: 'Romance' },
  { mal_id: 24, name: 'Sci-Fi' },
  { mal_id: 36, name: 'Slice of Life' },
  { mal_id: 30, name: 'Sports' },
  { mal_id: 37, name: 'Supernatural' },
  { mal_id: 41, name: 'Thriller' }
];

const GENRE_ID_TO_NAME = new Map<number, string>(GENRE_LIST.map(g => [g.mal_id, g.name]));
const GENRE_NAME_TO_ID = new Map<string, number>(GENRE_LIST.map(g => [g.name.toLowerCase(), g.mal_id]));

/**
 * ⚡ Fragmento optimizado para catálogos y listados paginados.
 * Solicita ÚNICAMENTE los campos indispensables:
 * id, title { romaji english }, coverImage { large }, averageScore, episodes, status.
 * Se evita pedir extraLarge, description, studios, etc. para no saturar la red ni bloquear el hilo principal.
 */
const CATALOG_MEDIA_FRAGMENT = `
  fragment CatalogMedia on Media {
    id
    title {
      romaji
      english
    }
    coverImage {
      large
    }
    averageScore
    episodes
    status
  }
`;

/**
 * Fragmento completo utilizado exclusivamente en la vista de detalle (/anime/:id).
 */
const DETAIL_MEDIA_FRAGMENT = `
  fragment DetailMedia on Media {
    id
    title {
      romaji
      english
      native
    }
    coverImage {
      large
      medium
      color
    }
    bannerImage
    averageScore
    popularity
    episodes
    status
    format
    seasonYear
    season
    duration
    genres
    studios(isMain: true) {
      nodes {
        id
        name
      }
    }
    description(asHtml: false)
    trailer {
      id
      site
      thumbnail
    }
  }
`;

@Injectable({
  providedIn: 'root'
})
export class AnilistService {
  private http = inject(HttpClient);
  private anilistUrl = 'https://graphql.anilist.co';

  // Sistema de caché inteligente indexado por clave de página
  private pageCache = new Map<string, AnilistResponse<Anime[]>>();
  private inMemoryCache = new Map<string, Observable<any>>();
  private readonly CACHE_PREFIX = 'animehub_cache_v5_';
  private readonly CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos

  constructor() {
    this.clearLegacyCaches();
  }

  private clearLegacyCaches(): void {
    try {
      if (typeof sessionStorage !== 'undefined') {
        const toRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith('animehub_cache_') && !k.startsWith(this.CACHE_PREFIX)) {
            toRemove.push(k);
          }
        }
        toRemove.forEach(k => sessionStorage.removeItem(k));
      }
    } catch {
      // Ignore
    }
  }

  private hashString(str: string): string {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return (hash >>> 0).toString(36);
  }

  private getStorageKey(key: string): string {
    const hash = this.hashString(key);
    const sanitized = key.replace(/[^a-zA-Z0-9_-]/g, '_').slice(-35);
    return `${this.CACHE_PREFIX}${sanitized}_${hash}`;
  }

  /**
   * Genera una clave determinista para la caché indexada por página y filtros.
   */
  getPageCacheKey(filters: {
    q?: string;
    page?: number;
    genres?: string;
    score?: number;
    status?: string;
    year?: number;
    sort?: string;
  }): string {
    const page = filters.page || 1;
    const cleanQ = (filters.q || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `page_${page}_q_${cleanQ}_g_${filters.genres || ''}_sc_${filters.score || ''}_st_${filters.status || ''}_y_${filters.year || ''}_s_${filters.sort || ''}`;
  }

  /**
   * Obtiene la respuesta de página de la caché (en memoria o sessionStorage) síncronamente.
   * Permite actualizar Signals de forma instantánea sin latencia de red ni error 429.
   */
  getCachedPage(key: string): AnilistResponse<Anime[]> | null {
    if (this.pageCache.has(key)) {
      return this.pageCache.get(key)!;
    }

    if (typeof sessionStorage !== 'undefined') {
      try {
        const item = sessionStorage.getItem(this.getStorageKey(key));
        if (item) {
          const parsed = JSON.parse(item);
          if (Date.now() - parsed.timestamp < this.CACHE_TTL_MS) {
            this.pageCache.set(key, parsed.data);
            return parsed.data as AnilistResponse<Anime[]>;
          }
        }
      } catch {
        // Ignore
      }
    }

    return null;
  }

  /**
   * Guarda una página en la caché en memoria y en sessionStorage.
   */
  setCachedPage(key: string, data: AnilistResponse<Anime[]>): void {
    this.pageCache.set(key, data);
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem(this.getStorageKey(key), JSON.stringify({
          data,
          timestamp: Date.now()
        }));
      } catch {
        // Storage quota
      }
    }
  }

  private mapAniListMediaToAnime(media: any): Anime {
    if (!media) return null as any;

    const id = media.id;
    const title = media.title?.english || media.title?.romaji || 'Anime';
    const titleEnglish = media.title?.english || undefined;

    // Solo pedimos coverImage.large (evita extraLarge para no saturar la red)
    const largeImg = media.coverImage?.large || media.coverImage?.medium || '';

    const score = media.averageScore ? +(media.averageScore / 10).toFixed(1) : undefined;

    let statusText: string | undefined;
    if (media.status === 'RELEASING') statusText = 'Currently Airing';
    else if (media.status === 'FINISHED') statusText = 'Finished Airing';
    else if (media.status === 'NOT_YET_RELEASED') statusText = 'Not yet aired';
    else if (media.status === 'CANCELLED') statusText = 'Cancelled';
    else statusText = media.status || undefined;

    const synopsis = media.description ? media.description.replace(/<[^>]*>/g, '').trim() : '';

    const genres: Array<{ mal_id: number; name: string }> = (media.genres || []).map((name: string) => ({
      mal_id: GENRE_NAME_TO_ID.get(name.toLowerCase()) || 999,
      name
    }));

    const studios = (media.studios?.nodes || []).map((s: any) => ({
      mal_id: s.id,
      name: s.name
    }));

    let trailer: Anime['trailer'] = undefined;
    if (media.trailer?.site === 'youtube' && media.trailer.id) {
      trailer = {
        youtube_id: media.trailer.id,
        url: `https://www.youtube.com/watch?v=${media.trailer.id}`,
        embed_url: `https://www.youtube.com/embed/${media.trailer.id}`
      };
    }

    return {
      id,
      mal_id: id,
      title,
      title_english: titleEnglish,
      coverImage: {
        large: largeImg,
        medium: media.coverImage?.medium || largeImg
      },
      banner_image: media.bannerImage || largeImg || undefined,
      images: {
        webp: {
          image_url: largeImg,
          large_image_url: largeImg,
          small_image_url: media.coverImage?.medium || largeImg
        },
        jpg: {
          image_url: largeImg,
          large_image_url: largeImg,
          small_image_url: media.coverImage?.medium || largeImg
        }
      },
      score,
      averageScore: media.averageScore,
      scored_by: media.popularity,
      synopsis,
      type: media.format || 'TV',
      episodes: media.episodes,
      status: statusText,
      airing: media.status === 'RELEASING',
      year: media.seasonYear,
      season: media.season ? media.season.toLowerCase() : undefined,
      duration: media.duration ? `${media.duration} min` : undefined,
      genres,
      studios,
      trailer
    };
  }

  private queryGraphQL<T>(query: string, variables: Record<string, any> = {}, cacheKey?: string): Observable<T> {
    const key = cacheKey || `gql_${this.hashString(query)}_${JSON.stringify(variables)}`;

    if (this.inMemoryCache.has(key)) {
      return this.inMemoryCache.get(key) as Observable<T>;
    }

    const storageKey = this.getStorageKey(key);
    try {
      const cached = sessionStorage.getItem(storageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < this.CACHE_TTL_MS) {
          return of(parsed.data as T);
        }
      }
    } catch {
      // Ignore storage errors
    }

    const request$ = this.http.post<{ data: any; errors?: any[] }>(this.anilistUrl, {
      query,
      variables
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }).pipe(
      map(res => {
        if (res.errors && res.errors.length > 0 && !res.data) {
          throw new Error(res.errors[0]?.message || 'AniList API Error');
        }
        return res.data as T;
      }),
      tap(data => {
        try {
          sessionStorage.setItem(storageKey, JSON.stringify({
            data,
            timestamp: Date.now()
          }));
        } catch {
          // Ignore storage quota
        }
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
      catchError(err => {
        this.inMemoryCache.delete(key);
        throw err;
      })
    );

    this.inMemoryCache.set(key, request$);
    return request$;
  }

  getTopAiring(page: number = 1): Observable<AnilistResponse<Anime[]>> {
    const cacheKey = `top_airing_p${page}`;
    const cached = this.getCachedPage(cacheKey);
    if (cached) return of(cached);

    const query = `
      ${CATALOG_MEDIA_FRAGMENT}
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          pageInfo { currentPage hasNextPage lastPage total perPage }
          media(type: ANIME, status: RELEASING, sort: POPULARITY_DESC, isAdult: false) {
            ...CatalogMedia
          }
        }
      }
    `;

    return this.queryGraphQL<any>(query, { page, perPage: 20 }, cacheKey).pipe(
      map(res => {
        const mapped = this.mapPageResponse(res, page);
        this.setCachedPage(cacheKey, mapped);
        return mapped;
      })
    );
  }

  getPopular(page: number = 1): Observable<AnilistResponse<Anime[]>> {
    const cacheKey = `popular_p${page}`;
    const cached = this.getCachedPage(cacheKey);
    if (cached) return of(cached);

    const query = `
      ${CATALOG_MEDIA_FRAGMENT}
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          pageInfo { currentPage hasNextPage lastPage total perPage }
          media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
            ...CatalogMedia
          }
        }
      }
    `;

    return this.queryGraphQL<any>(query, { page, perPage: 20 }, cacheKey).pipe(
      map(res => {
        const mapped = this.mapPageResponse(res, page);
        this.setCachedPage(cacheKey, mapped);
        return mapped;
      })
    );
  }

  getCurrentSeason(page: number = 1): Observable<AnilistResponse<Anime[]>> {
    const now = new Date();
    const month = now.getMonth();
    let currentSeason = 'WINTER';
    if (month >= 2 && month <= 4) currentSeason = 'SPRING';
    else if (month >= 5 && month <= 7) currentSeason = 'SUMMER';
    else if (month >= 8 && month <= 10) currentSeason = 'FALL';
    const currentYear = now.getFullYear();

    const cacheKey = `season_now_${currentSeason}_${currentYear}_p${page}`;
    const cached = this.getCachedPage(cacheKey);
    if (cached) return of(cached);

    const query = `
      ${CATALOG_MEDIA_FRAGMENT}
      query ($page: Int, $perPage: Int, $season: MediaSeason, $seasonYear: Int) {
        Page(page: $page, perPage: $perPage) {
          pageInfo { currentPage hasNextPage lastPage total perPage }
          media(type: ANIME, season: $season, seasonYear: $seasonYear, sort: POPULARITY_DESC, isAdult: false) {
            ...CatalogMedia
          }
        }
      }
    `;

    return this.queryGraphQL<any>(query, {
      page,
      perPage: 20,
      season: currentSeason,
      seasonYear: currentYear
    }, cacheKey).pipe(
      map(res => {
        const mapped = this.mapPageResponse(res, page);
        this.setCachedPage(cacheKey, mapped);
        return mapped;
      })
    );
  }

  getRecentUpcoming(page: number = 1): Observable<AnilistResponse<Anime[]>> {
    const cacheKey = `upcoming_p${page}`;
    const cached = this.getCachedPage(cacheKey);
    if (cached) return of(cached);

    const query = `
      ${CATALOG_MEDIA_FRAGMENT}
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          pageInfo { currentPage hasNextPage lastPage total perPage }
          media(type: ANIME, status: NOT_YET_RELEASED, sort: POPULARITY_DESC, isAdult: false) {
            ...CatalogMedia
          }
        }
      }
    `;

    return this.queryGraphQL<any>(query, { page, perPage: 20 }, cacheKey).pipe(
      map(res => {
        const mapped = this.mapPageResponse(res, page);
        this.setCachedPage(cacheKey, mapped);
        return mapped;
      })
    );
  }

  getAnimeDetails(id: number): Observable<Anime> {
    const queryById = `
      ${DETAIL_MEDIA_FRAGMENT}
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          ...DetailMedia
        }
      }
    `;

    const queryByMal = `
      ${DETAIL_MEDIA_FRAGMENT}
      query ($idMal: Int) {
        Media(idMal: $idMal, type: ANIME) {
          ...DetailMedia
        }
      }
    `;

    return this.queryGraphQL<any>(queryById, { id }, `details_id_${id}`).pipe(
      map(res => {
        if (!res?.Media) throw new Error('Anime no encontrado');
        return this.mapAniListMediaToAnime(res.Media);
      }),
      catchError(() => {
        return this.queryGraphQL<any>(queryByMal, { idMal: id }, `details_mal_${id}`).pipe(
          map(res => {
            if (!res?.Media) throw new Error('Anime no encontrado');
            return this.mapAniListMediaToAnime(res.Media);
          })
        );
      })
    );
  }

  getAnimeCharacters(id: number): Observable<CharacterInfo[]> {
    const queryById = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          characters(sort: ROLE, perPage: 12) {
            edges {
              role
              node {
                id
                name { full }
                image { medium large }
              }
              voiceActors(language: JAPANESE) {
                id
                name { full }
                image { medium }
              }
            }
          }
        }
      }
    `;

    const queryByMal = `
      query ($idMal: Int) {
        Media(idMal: $idMal, type: ANIME) {
          characters(sort: ROLE, perPage: 12) {
            edges {
              role
              node {
                id
                name { full }
                image { medium large }
              }
              voiceActors(language: JAPANESE) {
                id
                name { full }
                image { medium }
              }
            }
          }
        }
      }
    `;

    const mapEdges = (edges: any[]) => edges.map((e: any) => ({
      character: {
        mal_id: e.node.id,
        url: '',
        images: {
          webp: { image_url: e.node.image?.large || e.node.image?.medium },
          jpg: { image_url: e.node.image?.large || e.node.image?.medium }
        },
        name: e.node.name?.full || 'Personaje'
      },
      role: e.role,
      voice_actors: (e.voiceActors || []).map((va: any) => ({
        person: {
          mal_id: va.id,
          name: va.name?.full || '',
          images: { jpg: { image_url: va.image?.medium || '' } }
        },
        language: 'Japanese'
      }))
    }));

    return this.queryGraphQL<any>(queryById, { id }, `chars_id_${id}`).pipe(
      map(res => mapEdges(res?.Media?.characters?.edges || [])),
      catchError(() => {
        return this.queryGraphQL<any>(queryByMal, { idMal: id }, `chars_mal_${id}`).pipe(
          map(res => mapEdges(res?.Media?.characters?.edges || []))
        );
      })
    );
  }

  getGenres(): Observable<Array<{ mal_id: number; name: string }>> {
    return of(GENRE_LIST);
  }

  searchAnime(filters: {
    q?: string;
    page?: number;
    genres?: string;
    score?: number;
    status?: string;
    year?: number;
    sort?: string;
  }): Observable<AnilistResponse<Anime[]>> {
    const page = filters.page || 1;
    const cacheKey = this.getPageCacheKey(filters);

    // 1. Verificación instantánea en caché (evita 429 Rate Limit)
    const cached = this.getCachedPage(cacheKey);
    if (cached) {
      return of(cached);
    }

    const hasSearchQuery = !!(filters.q && filters.q.trim().length > 0);

    const variables: Record<string, any> = {
      page,
      perPage: 20,
      sort: hasSearchQuery ? ['SEARCH_MATCH', 'POPULARITY_DESC'] : ['POPULARITY_DESC']
    };

    if (hasSearchQuery) {
      variables['search'] = filters.q!.trim();
    }

    if (filters.score) {
      variables['scoreGreater'] = Math.min(90, filters.score * 10 - 1);
    }

    if (filters.status) {
      if (filters.status === 'airing') variables['status'] = 'RELEASING';
      else if (filters.status === 'complete') variables['status'] = 'FINISHED';
      else if (filters.status === 'upcoming') variables['status'] = 'NOT_YET_RELEASED';
    }

    if (filters.year) {
      variables['seasonYear'] = Number(filters.year);
    }

    if (filters.genres) {
      const genreNames: string[] = [];
      const parts = filters.genres.split(',');
      for (const p of parts) {
        const id = parseInt(p.trim(), 10);
        if (!isNaN(id) && GENRE_ID_TO_NAME.has(id)) {
          genreNames.push(GENRE_ID_TO_NAME.get(id)!);
        } else if (p.trim()) {
          genreNames.push(p.trim());
        }
      }
      if (genreNames.length > 0) {
        variables['genres'] = genreNames;
      }
    }

    /**
     * Consulta GraphQL optimizada: limita a 20 items y pide ÚNICAMENTE los campos indispensables.
     */
    const query = `
      ${CATALOG_MEDIA_FRAGMENT}
      query (
        $page: Int,
        $perPage: Int,
        $search: String,
        $status: MediaStatus,
        $seasonYear: Int,
        $scoreGreater: Int,
        $genres: [String],
        $sort: [MediaSort]
      ) {
        Page(page: $page, perPage: $perPage) {
          pageInfo { currentPage hasNextPage lastPage total perPage }
          media(
            type: ANIME,
            isAdult: false,
            search: $search,
            status: $status,
            seasonYear: $seasonYear,
            averageScore_greater: $scoreGreater,
            genre_in: $genres,
            sort: $sort
          ) {
            ...CatalogMedia
          }
        }
      }
    `;

    return this.queryGraphQL<any>(query, variables, cacheKey).pipe(
      map(res => {
        const mapped = this.mapPageResponse(res, page);
        this.setCachedPage(cacheKey, mapped);
        return mapped;
      })
    );
  }

  private mapPageResponse(res: any, page: number): AnilistResponse<Anime[]> {
    return {
      data: (res.Page?.media || []).map((m: any) => this.mapAniListMediaToAnime(m)),
      pagination: {
        last_visible_page: res.Page?.pageInfo?.lastPage || 1,
        has_next_page: res.Page?.pageInfo?.hasNextPage || false,
        current_page: res.Page?.pageInfo?.currentPage || page,
        items: {
          count: res.Page?.media?.length || 0,
          total: res.Page?.pageInfo?.total || 0,
          per_page: 20
        }
      }
    };
  }
}
