import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnimeStatus } from '../../../core/services/watchlist.service';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="badge" [ngClass]="badgeClass()">
      <span class="material-symbols-outlined icon-sm">{{ icon() }}</span>
      {{ label() }}
    </span>
  `,
  styles: [`
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-radius: var(--radius-sm);
      user-select: none;
      backdrop-filter: blur(4px);
    }
  `]
})
export class StatusBadgeComponent {
  statusSignal = signal<AnimeStatus | undefined>(undefined);

  @Input()
  set status(value: AnimeStatus | undefined) {
    this.statusSignal.set(value);
  }
  get status(): AnimeStatus | undefined {
    return this.statusSignal();
  }

  badgeClass = computed(() => {
    const status = this.statusSignal();
    switch (status) {
      case AnimeStatus.WATCHING:
        return 'badge-primary';
      case AnimeStatus.WATCHED:
        return 'badge-success';
      case AnimeStatus.PLAN_TO_WATCH:
        return 'badge-warning';
      default:
        return '';
    }
  });

  label = computed(() => {
    const status = this.statusSignal();
    switch (status) {
      case AnimeStatus.WATCHING:
        return 'Viendo';
      case AnimeStatus.WATCHED:
        return 'Visto';
      case AnimeStatus.PLAN_TO_WATCH:
        return 'Por Ver';
      default:
        return 'Sin Estado';
    }
  });

  icon = computed(() => {
    const status = this.statusSignal();
    switch (status) {
      case AnimeStatus.WATCHING:
        return 'play_circle';
      case AnimeStatus.WATCHED:
        return 'check_circle';
      case AnimeStatus.PLAN_TO_WATCH:
        return 'schedule';
      default:
        return 'help_outline';
    }
  });
}
