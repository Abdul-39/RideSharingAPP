import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LocationApiService } from '../../core/services/location-api.service';

export interface PlaceSelection {
  displayName: string;
  latitude: number;
  longitude: number;
}

/**
 * Human-readable place search (Nominatim via your API or direct).
 * Emits place name + coordinates — UI shows only the name.
 */
@Component({
  selector: 'app-place-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ps">
      <label class="lbl">{{ label }}</label>
      <div class="row">
        <input
          class="inp"
          [(ngModel)]="query"
          [placeholder]="placeholder"
          (keydown.enter)="search()"
        />
        <button type="button" class="btn" (click)="search()" [disabled]="busy()">Search</button>
      </div>

      @if (selected()) {
        <div class="picked">
          <strong>{{ selected()!.displayName }}</strong>
          <button type="button" class="link" (click)="clear()">Change</button>
        </div>
      }

      @if (results().length) {
        <ul class="list">
          @for (r of results(); track r.displayName + r.latitude) {
            <li>
              <button type="button" (click)="pick(r)">{{ r.displayName }}</button>
            </li>
          }
        </ul>
      }
      @if (err()) { <p class="err">{{ err() }}</p> }
    </div>
  `,
  styles: [`
    .ps { margin-bottom: 0.75rem; }
    .lbl { display: block; font-size: 0.78rem; font-weight: 700; color: #64748b; margin-bottom: 0.35rem; }
    .row { display: flex; gap: 0.4rem; }
    .inp {
      flex: 1; min-height: 44px; border-radius: 12px; border: 1px solid #e2e8f0;
      padding: 0.5rem 0.75rem; font-size: 0.95rem;
    }
    .btn {
      min-height: 44px; padding: 0 1rem; border-radius: 999px; border: none;
      background: #0d9f6e; color: #fff; font-weight: 800; cursor: pointer;
    }
    .list {
      list-style: none; margin: 0.4rem 0 0; padding: 0;
      border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #fff;
    }
    .list button {
      width: 100%; text-align: left; padding: 0.65rem 0.85rem; border: none;
      background: #fff; border-bottom: 1px solid #f1f5f9; cursor: pointer; font-size: 0.88rem;
    }
    .list button:hover { background: #ecfdf5; }
    .picked {
      margin-top: 0.45rem; padding: 0.55rem 0.75rem; border-radius: 12px;
      background: #ecfdf5; border: 1px solid #a7f3d0;
      display: flex; justify-content: space-between; gap: 0.5rem; align-items: center;
      font-size: 0.88rem;
    }
    .link { border: none; background: none; color: #0d9f6e; font-weight: 700; cursor: pointer; }
    .err { color: #e11d48; font-size: 0.85rem; }
  `]
})
export class PlaceSearchComponent {
  private locationApi = inject(LocationApiService);

  @Input() label = 'Place';
  @Input() placeholder = 'Search place in Pakistan…';
  @Output() placeSelected = new EventEmitter<PlaceSelection>();

  query = '';
  results = signal<PlaceSelection[]>([]);
  selected = signal<PlaceSelection | null>(null);
  busy = signal(false);
  err = signal('');

  search(): void {
    const q = this.query.trim();
    if (q.length < 3) {
      this.err.set('Please enter at least 3 characters.');
      return;
    }

    this.busy.set(true);
    this.err.set('');

    // Always use our ASP.NET API proxy. The backend owns the Nominatim
    // integration so the browser never calls the public geocoder directly.
    this.locationApi.search(q).subscribe({
      next: (r) => {
        const list = (r?.data ?? []).map((x) => ({
          displayName: x.displayName,
          latitude: Number(x.latitude),
          longitude: Number(x.longitude)
        }));

        this.results.set(list);
        this.busy.set(false);

        if (!list.length) {
          this.err.set('No places found. Try a nearby landmark or area.');
        }
      },
      error: (e) => {
        console.error('Place search failed:', e);
        this.busy.set(false);
        this.err.set('Place search failed. Please try again.');
      }
    });
  }

  pick(p: PlaceSelection): void {
    this.selected.set(p);
    this.results.set([]);
    this.query = p.displayName;
    this.placeSelected.emit(p);
  }

  clear(): void {
    this.selected.set(null);
    this.query = '';
    this.results.set([]);
  }
}
