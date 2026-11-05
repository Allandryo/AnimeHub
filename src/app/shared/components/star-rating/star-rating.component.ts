import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="star-rating-container" [title]="'Rating: ' + (score || 'N/A') + '/10'">
      @if (score) {
        @for (star of stars(); track $index) {
          <span class="material-symbols-outlined star-icon" [ngClass]="star">
            @if (star === 'full') { star }
            @else if (star === 'half') { star_half }
            @else { grade }
          </span>
        }
        <span class="score-number">{{ score | number:'1.1-1' }}</span>
      } @else {
        <span class="no-score">No score</span>
      }
    </div>
  `,
  styles: [`
    .star-rating-container {
      display: inline-flex;
      align-items: center;
      gap: 0.15rem;
      color: var(--primary);
      font-size: 0.85rem;
    }
    .star-icon {
      font-size: 1.1rem;
      font-variation-settings: 'FILL' 1, 'wght' 400;
      
      &.empty {
        color: rgba(15, 23, 42, 0.12);
        font-variation-settings: 'FILL' 0;
      }
      &.half {
        font-variation-settings: 'FILL' 1;
      }
    }
    .score-number {
      margin-left: 0.35rem;
      font-weight: 700;
      color: var(--text-primary);
      font-family: var(--font-heading);
    }
    .no-score {
      color: var(--text-muted);
      font-style: italic;
    }
  `]
})
export class StarRatingComponent {
  private scoreSignal = signal<number | undefined>(undefined);

  @Input()
  set score(value: number | undefined) {
    this.scoreSignal.set(value);
  }
  get score(): number | undefined {
    return this.scoreSignal();
  }

  stars = computed(() => {
    const val = this.scoreSignal();
    if (val === undefined || val === null) return [];
    
    // Scale 0-10 to 0-5
    const scaled = val / 2;
    const result: ('full' | 'half' | 'empty')[] = [];
    
    const fullStars = Math.floor(scaled);
    const hasHalf = scaled % 1 >= 0.25 && scaled % 1 < 0.75;
    const extraFull = scaled % 1 >= 0.75 ? 1 : 0;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars + extraFull) {
        result.push('full');
      } else if (i === fullStars + extraFull && hasHalf) {
        result.push('half');
      } else {
        result.push('empty');
      }
    }
    
    return result;
  });
}
