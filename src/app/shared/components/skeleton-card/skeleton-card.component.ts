import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton-card">
      <div class="skeleton-poster shimmer"></div>
      <div class="skeleton-body">
        <div class="skeleton-line title shimmer"></div>
        <div class="skeleton-line meta shimmer"></div>
        <div class="skeleton-tags">
          <div class="skeleton-tag shimmer"></div>
          <div class="skeleton-tag shimmer"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .skeleton-card {
      border-radius: var(--radius-md);
      overflow: hidden;
      background: var(--surface-card);
      border: 1px solid var(--border);
    }

    .skeleton-poster {
      aspect-ratio: 3 / 4.2;
      background: var(--surface);
    }

    .skeleton-body {
      padding: 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .skeleton-line {
      border-radius: 4px;
      &.title {
        height: 1rem;
        width: 80%;
      }
      &.meta {
        height: 0.75rem;
        width: 50%;
      }
    }

    .skeleton-tags {
      display: flex;
      gap: 0.35rem;
    }

    .skeleton-tag {
      height: 0.7rem;
      width: 3rem;
      border-radius: 4px;
    }
  `]
})
export class SkeletonCardComponent {}
