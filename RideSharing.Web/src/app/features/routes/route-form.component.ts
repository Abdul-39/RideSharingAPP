import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { LocationApiService, PlaceSearchResult } from '../../core/services/location-api.service';
import { environment } from '../../../environments/environment';

import {
  CommutePlace,
  RAWALPINDI_ISLAMABAD_PLACES,
  findMatchingTwinCitiesPlaces,
  findClosestTwinCitiesPlace
} from '../../core/constants/places.constants';

interface DayOption {
  key: string;
  label: string;
  active: boolean;
}

@Component({
  selector: 'app-route-form',
  standalone: true,
  imports: [CommonModule, FormsModule],

  template: `
    <div class="rs-page">

      <header class="head">
        <div>
          <div class="chips">
            <span class="chip">Daily Repeat Corridor</span>
            <span class="chip gold">Pakistan</span>
          </div>

          <h1>
            {{ isEdit ? 'Edit Repeat Route' : 'Publish Repeat Route' }}
          </h1>

          <p class="sub">
            Search and select pickup and drop-off places anywhere in Pakistan.
          </p>
        </div>
      </header>

      <form (ngSubmit)="submit()" class="card form-card">

        <!-- ROLE SELECTION -->
        <div class="sec">
          <label class="lbl">Publish as</label>

          <div class="role-grid">

            <label
              class="opt-card"
              [class.on]="routeType === 'Driver'"
            >
              <input
                type="radio"
                [(ngModel)]="routeType"
                name="rt"
                value="Driver"
              />

              <div>
                <strong>Driver Route</strong>
                <p>
                  Offer seats in your car or bike along your daily corridor
                </p>
              </div>
            </label>

            <label
              class="opt-card"
              [class.on]="routeType === 'Passenger'"
            >
              <input
                type="radio"
                [(ngModel)]="routeType"
                name="rt"
                value="Passenger"
              />

              <div>
                <strong>Passenger Route</strong>
                <p>
                  Request repeat rides to campus or office every weekday
                </p>
              </div>
            </label>

          </div>
        </div>

        <!-- SOURCE -->
        <div class="sec">

          <label class="lbl">
            <span class="dot green">🟢</span>
            Source / Pickup Place (Pakistan)
          </label>

          <div class="place-box">

            <div class="input-with-action">

              <input
                class="inp place-inp"
                [(ngModel)]="sourceSearch"
                name="srcSearch"
                placeholder="Type any place (e.g. Saddar, F-10, Commercial Market, Faizabad)..."
                (input)="onSourceSearchInput()"
                autocomplete="off"
              />

              <button
                type="button"
                class="btn-detect"
                (click)="searchSourcePlace()"
                [disabled]="sourceSearching()"
                title="Search place"
              >
                {{ sourceSearching() ? 'Searching...' : '🔎 Search' }}
              </button>

              <button
                type="button"
                class="btn-detect"
                (click)="detectCurrentLocationForSource()"
                title="Use Current GPS Location"
              >
                📍 GPS
              </button>

            </div>

            @if (sourceAddress) {
              <div class="picked-place-card">
                <span class="pp-tag">SELECTED PICKUP</span>
                <strong class="pp-name">
                  {{ sourceAddress }}
                </strong>
              </div>
            }

            @if (sourceSuggestions().length > 0) {

              <ul class="suggestions-list">

                @for (place of sourceSuggestions(); track place.name) {

                  <li>

                    <button
                      type="button"
                      class="sugg-item"
                      (click)="selectSource(place)"
                    >

                      <div class="sugg-text">
                        <strong>{{ place.name }}</strong>
                        <span class="sugg-badge">
                          {{ place.category }}
                        </span>
                      </div>

                      <span class="sugg-area">
                        {{ place.area }}
                      </span>

                    </button>

                  </li>

                }

              </ul>

            }

            <div class="quick-chips">

              <span class="chips-title">Popular:</span>

              <button
                type="button"
                class="chip-btn"
                (click)="pickQuickSource('Faizabad Interchange, Islamabad')"
              >
                Faizabad
              </button>

              <button
                type="button"
                class="chip-btn"
                (click)="pickQuickSource('Saddar (Bank Road / Cantt), Rawalpindi')"
              >
                Saddar
              </button>

              <button
                type="button"
                class="chip-btn"
                (click)="pickQuickSource('Commercial Market, Satellite Town, Rawalpindi')"
              >
                Commercial Mkt
              </button>

              <button
                type="button"
                class="chip-btn"
                (click)="pickQuickSource('F-10 Markaz, Islamabad')"
              >
                F-10
              </button>

              <button
                type="button"
                class="chip-btn"
                (click)="pickQuickSource('I-8 Markaz, Islamabad')"
              >
                I-8
              </button>

              <button
                type="button"
                class="chip-btn"
                (click)="pickQuickSource('Bahria Town Phase 4 (Civic Center / Arena), Rawalpindi')"
              >
                Bahria Ph 4
              </button>

            </div>

            <div class="area-filter-row">

              <span class="filter-lbl">Browse:</span>

              <button
                type="button"
                class="area-pill"
                [class.on]="activeSourceArea === 'Islamabad'"
                (click)="filterSourceByArea('Islamabad')"
              >
                Islamabad
              </button>

              <button
                type="button"
                class="area-pill"
                [class.on]="activeSourceArea === 'Rawalpindi'"
                (click)="filterSourceByArea('Rawalpindi')"
              >
                Rawalpindi
              </button>

              <button
                type="button"
                class="area-pill"
                [class.on]="activeSourceArea === 'University'"
                (click)="filterSourceByArea('University')"
              >
                Universities
              </button>

              <button
                type="button"
                class="area-pill"
                [class.on]="activeSourceArea === 'Commercial'"
                (click)="filterSourceByArea('Commercial')"
              >
                Commercial
              </button>

            </div>

          </div>
        </div>

        <!-- DESTINATION -->
        <div class="sec">

          <label class="lbl">
            <span class="dot red">🔴</span>
            Destination / Drop-off Place (Pakistan)
          </label>

          <div class="place-box">

            <div class="input-with-action">

              <input
                class="inp place-inp"
                [(ngModel)]="destinationSearch"
                name="dstSearch"
                placeholder="Type destination (e.g. NUST, Blue Area, Centaurus, FAST, Secretariat)..."
                (input)="onDestSearchInput()"
                autocomplete="off"
              />

              <button
                type="button"
                class="btn-detect"
                (click)="searchDestinationPlace()"
                [disabled]="destSearching()"
                title="Search place"
              >
                {{ destSearching() ? 'Searching...' : '🔎 Search' }}
              </button>

              <button
                type="button"
                class="btn-detect"
                (click)="detectCurrentLocationForDestination()"
                title="Use Current GPS Location"
              >
                📍 GPS
              </button>

            </div>

            @if (destinationAddress) {

              <div class="picked-place-card dest">

                <span class="pp-tag dest">
                  SELECTED DESTINATION
                </span>

                <strong class="pp-name">
                  {{ destinationAddress }}
                </strong>

              </div>

            }

            @if (destSuggestions().length > 0) {

              <ul class="suggestions-list">

                @for (place of destSuggestions(); track place.name) {

                  <li>

                    <button
                      type="button"
                      class="sugg-item"
                      (click)="selectDest(place)"
                    >

                      <div class="sugg-text">

                        <strong>{{ place.name }}</strong>

                        <span class="sugg-badge">
                          {{ place.category }}
                        </span>

                      </div>

                      <span class="sugg-area">
                        {{ place.area }}
                      </span>

                    </button>

                  </li>

                }

              </ul>

            }

            <div class="quick-chips">

              <span class="chips-title">Popular:</span>

              <button
                type="button"
                class="chip-btn"
                (click)="pickQuickDest('Blue Area (Jinnah Avenue), Islamabad')"
              >
                Blue Area
              </button>

              <button
                type="button"
                class="chip-btn"
                (click)="pickQuickDest('NUST (National University of Sciences & Tech), H-12 Campus, Islamabad')"
              >
                NUST
              </button>

              <button
                type="button"
                class="chip-btn"
                (click)="pickQuickDest('FAST-NUCES, H-11 Campus, Islamabad')"
              >
                FAST
              </button>

              <button
                type="button"
                class="chip-btn"
                (click)="pickQuickDest('COMSATS University Islamabad, Park Road, Chak Shahzad')"
              >
                COMSATS
              </button>

              <button
                type="button"
                class="chip-btn"
                (click)="pickQuickDest('Pak Secretariat, Constitution Avenue, Islamabad')"
              >
                Secretariat
              </button>

              <button
                type="button"
                class="chip-btn"
                (click)="pickQuickDest('Giga Mall (World Trade Center), DHA Phase 2, GT Road')"
              >
                Giga Mall
              </button>

            </div>

            <div class="area-filter-row">

              <span class="filter-lbl">Browse:</span>

              <button
                type="button"
                class="area-pill"
                [class.on]="activeDestArea === 'Islamabad'"
                (click)="filterDestByArea('Islamabad')"
              >
                Islamabad
              </button>

              <button
                type="button"
                class="area-pill"
                [class.on]="activeDestArea === 'Rawalpindi'"
                (click)="filterDestByArea('Rawalpindi')"
              >
                Rawalpindi
              </button>

              <button
                type="button"
                class="area-pill"
                [class.on]="activeDestArea === 'University'"
                (click)="filterDestByArea('University')"
              >
                Universities
              </button>

              <button
                type="button"
                class="area-pill"
                [class.on]="activeDestArea === 'Commercial'"
                (click)="filterDestByArea('Commercial')"
              >
                Commercial
              </button>

            </div>

          </div>
        </div>

        <!-- ROUTE PREVIEW -->
        @if (sourceAddress && destinationAddress) {

          <div class="corridor-summary">

            <div class="cs-head">
              ACTIVE CORRIDOR MATCHING ROUTE
            </div>

            <div class="cs-body">

              <div class="cs-point">

                <span class="cs-icon g">●</span>

                <span class="cs-text">
                  <strong>From:</strong>
                  {{ sourceAddress }}
                </span>

              </div>

              <div class="cs-arrow">↓</div>

              <div class="cs-point">

                <span class="cs-icon r">●</span>

                <span class="cs-text">
                  <strong>To:</strong>
                  {{ destinationAddress }}
                </span>

              </div>

            </div>

          </div>

        }

        <!-- TIME -->
        <div class="row2">

          <label class="lbl">
            Preferred Departure Time

            <input
              class="inp"
              type="time"
              [(ngModel)]="preferredDepartureTime"
              name="time"
              required
            />

          </label>

          <label class="lbl">
            Time Tolerance (minutes)

            <select
              class="inp"
              [(ngModel)]="timeToleranceMinutes"
              name="tol"
            >
              <option [ngValue]="5">± 5 min</option>
              <option [ngValue]="10">± 10 min</option>
              <option [ngValue]="15">± 15 min (Recommended)</option>
              <option [ngValue]="20">± 20 min</option>
              <option [ngValue]="30">± 30 min</option>
            </select>

          </label>

        </div>

        <!-- DAYS -->
        <div class="sec">

          <label class="lbl">
            Active Days of Week
          </label>

          <div class="day-chips">

            @for (d of days; track d.key) {

              <button
                type="button"
                class="day-btn"
                [class.on]="d.active"
                (click)="toggleDay(d)"
              >
                {{ d.label }}
              </button>

            }

          </div>

        </div>

        <!-- DRIVER VEHICLE DETAILS -->
        @if (routeType === 'Driver') {

          <div class="row2">

            <label class="lbl">
              Available Seats

              <select
                class="inp"
                [(ngModel)]="availableSeats"
                name="seats"
              >
                <option [ngValue]="1">1 seat</option>
                <option [ngValue]="2">2 seats</option>
                <option [ngValue]="3">3 seats</option>
                <option [ngValue]="4">4 seats</option>
              </select>

            </label>

            <label class="lbl">
              Fare Contribution (PKR, optional)

              <input
                class="inp"
                type="number"
                [(ngModel)]="estimatedFare"
                name="fare"
                placeholder="e.g. 250"
              />

            </label>

          </div>

        }

        @if (err()) {
          <p class="err">{{ err() }}</p>
        }

        @if (msg()) {
          <p class="ok">{{ msg() }}</p>
        }

        <div class="actions">

          <button
            type="submit"
            class="btn primary"
            [disabled]="busy()"
          >
            {{
              busy()
                ? 'Saving Route…'
                : (isEdit ? 'Update Route' : 'Publish Repeat Route')
            }}
          </button>

          <button
            type="button"
            class="btn ghost"
            (click)="cancel()"
          >
            Cancel
          </button>

        </div>

      </form>

    </div>
  `,

  styles: [`

    .head {
      margin-bottom: 1.1rem;
    }

    .chips {
      display: flex;
      gap: 0.4rem;
      margin-bottom: 0.4rem;
      flex-wrap: wrap;
    }

    .chip {
      font-size: 0.72rem;
      font-weight: 800;
      padding: 0.28rem 0.7rem;
      border-radius: 999px;
      background: #e8f8f1;
      color: #0b7f58;
    }

    .chip.gold {
      background: #fff7cc;
      color: #a16207;
    }

    h1 {
      margin: 0;
      font-size: 1.45rem;
      font-weight: 800;
      color: #0f172a;
    }

    .sub {
      margin: 0.3rem 0 0;
      color: #64748b;
      font-size: 0.9rem;
    }

    .form-card {
      background: #fff;
      border: 1px solid #b7ebc9;
      border-radius: 16px;
      padding: 1.35rem;
      box-shadow: 0 6px 18px rgba(15,23,42,0.04);
      max-width: 720px;
    }

    .sec {
      margin-bottom: 1.15rem;
    }

    .lbl {
      display: block;
      font-size: 0.82rem;
      font-weight: 700;
      color: #334155;
      margin-bottom: 0.4rem;
    }

    .dot {
      font-size: 0.75rem;
      margin-right: 0.25rem;
    }

    .inp {
      display: block;
      width: 100%;
      min-height: 44px;
      padding: 0.55rem 0.85rem;
      border-radius: 12px;
      border: 1px solid #cbd5e1;
      font-size: 0.92rem;
      color: #0f172a;
      background: #fff;
      font-family: inherit;
    }

    .inp:focus {
      outline: none;
      border-color: #0d9f6e;
      box-shadow: 0 0 0 3px rgba(13,159,110,0.12);
    }

    .role-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.65rem;
    }

    @media (max-width: 560px) {
      .role-grid {
        grid-template-columns: 1fr;
      }
    }

    .opt-card {
      display: flex;
      gap: 0.65rem;
      align-items: flex-start;
      padding: 0.75rem 0.9rem;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      cursor: pointer;
      background: #f8fafc;
      transition: all 0.15s ease;
    }

    .opt-card.on {
      border-color: #0d9f6e;
      background: #f0fdf4;
      box-shadow: 0 0 0 2px rgba(13,159,110,0.15);
    }

    .opt-card input {
      margin-top: 3px;
      accent-color: #0d9f6e;
    }

    .opt-card strong {
      font-size: 0.9rem;
      color: #0f172a;
      display: block;
    }

    .opt-card p {
      margin: 0.15rem 0 0;
      font-size: 0.75rem;
      color: #64748b;
      line-height: 1.3;
    }

    .place-box {
      position: relative;
    }

    .input-with-action {
      display: flex;
      gap: 0.4rem;
    }

    .place-inp {
      flex: 1;
    }

    .btn-detect {
      min-height: 44px;
      padding: 0 0.85rem;
      border-radius: 12px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      font-weight: 700;
      font-size: 0.82rem;
      color: #0f172a;
      cursor: pointer;
      white-space: nowrap;
    }

    .btn-detect:hover {
      background: #e8f8f1;
      border-color: #a7f3d0;
      color: #0b7f58;
    }

    .picked-place-card {
      margin-top: 0.4rem;
      padding: 0.55rem 0.75rem;
      border-radius: 10px;
      background: #f0fdf4;
      border: 1px solid #a7f3d0;
    }

    .picked-place-card.dest {
      background: #fef2f2;
      border-color: #fecaca;
    }

    .pp-tag {
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      color: #0b7f58;
      display: block;
    }

    .pp-tag.dest {
      color: #dc2626;
    }

    .pp-name {
      font-size: 0.88rem;
      color: #0f172a;
    }

    .suggestions-list {
      list-style: none;
      margin: 0.35rem 0 0;
      padding: 0;
      background: #fff;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      max-height: 220px;
      overflow-y: auto;
      box-shadow: 0 8px 24px rgba(15,23,42,0.08);
      z-index: 50;
      position: relative;
    }

    .sugg-item {
      width: 100%;
      text-align: left;
      padding: 0.6rem 0.85rem;
      border: none;
      background: #fff;
      border-bottom: 1px solid #f1f5f9;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: inherit;
    }

    .sugg-item:hover {
      background: #f0fdf4;
    }

    .sugg-text strong {
      display: block;
      font-size: 0.88rem;
      color: #0f172a;
      font-weight: 700;
    }

    .sugg-badge {
      display: inline-block;
      font-size: 0.65rem;
      font-weight: 700;
      color: #047857;
      background: #d1fae5;
      padding: 0.1rem 0.45rem;
      border-radius: 999px;
      margin-top: 0.2rem;
    }

    .sugg-area {
      font-size: 0.75rem;
      color: #64748b;
      font-weight: 600;
    }

    .quick-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      align-items: center;
      margin-top: 0.45rem;
    }

    .chips-title {
      font-size: 0.72rem;
      font-weight: 700;
      color: #94a3b8;
    }

    .chip-btn {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 999px;
      padding: 0.25rem 0.65rem;
      font-size: 0.74rem;
      font-weight: 700;
      color: #334155;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.1s;
    }

    .chip-btn:hover {
      background: #e8f8f1;
      border-color: #a7f3d0;
      color: #0b7f58;
    }

    .area-filter-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
      align-items: center;
      margin-top: 0.35rem;
    }

    .filter-lbl {
      font-size: 0.7rem;
      font-weight: 700;
      color: #94a3b8;
    }

    .area-pill {
      background: transparent;
      border: 1px dashed #cbd5e1;
      border-radius: 999px;
      padding: 0.2rem 0.55rem;
      font-size: 0.7rem;
      font-weight: 700;
      color: #64748b;
      cursor: pointer;
      font-family: inherit;
    }

    .area-pill.on,
    .area-pill:hover {
      background: #e0f2fe;
      border-color: #7dd3fc;
      border-style: solid;
      color: #0369a1;
    }

    .corridor-summary {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 12px;
      padding: 0.75rem 0.95rem;
      margin-bottom: 1.15rem;
    }

    .cs-head {
      font-size: 0.68rem;
      font-weight: 800;
      color: #065f46;
      letter-spacing: 0.05em;
      margin-bottom: 0.4rem;
    }

    .cs-body {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .cs-point {
      display: flex;
      align-items: flex-start;
      gap: 0.4rem;
      font-size: 0.85rem;
      color: #0f172a;
    }

    .cs-icon.g {
      color: #0d9f6e;
      font-size: 0.75rem;
    }

    .cs-icon.r {
      color: #e11d48;
      font-size: 0.75rem;
    }

    .cs-arrow {
      margin-left: 0.85rem;
      color: #94a3b8;
      font-size: 0.8rem;
    }

    .row2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.85rem;
      margin-bottom: 1.15rem;
    }

    @media (max-width: 560px) {
      .row2 {
        grid-template-columns: 1fr;
      }
    }

    .day-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }

    .day-btn {
      min-width: 44px;
      height: 38px;
      border-radius: 10px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      font-weight: 700;
      font-size: 0.82rem;
      color: #475569;
      cursor: pointer;
      font-family: inherit;
    }

    .day-btn.on {
      background: #0d9f6e;
      border-color: #0d9f6e;
      color: #fff;
    }

    .actions {
      display: flex;
      gap: 0.65rem;
      margin-top: 1.4rem;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 0.5rem 1.25rem;
      border-radius: 999px;
      font-weight: 800;
      font-size: 0.88rem;
      cursor: pointer;
      border: none;
      font-family: inherit;
    }

    .btn.primary {
      background: #0d9f6e;
      color: #fff;
    }

    .btn.ghost {
      background: #fff;
      border: 1px solid #cbd5e1;
      color: #334155;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .err {
      color: #e11d48;
      font-size: 0.85rem;
      margin: 0.5rem 0 0;
    }

    .ok {
      color: #0d9f6e;
      font-size: 0.85rem;
      margin: 0.5rem 0 0;
    }

  `]
})
export class RouteFormComponent implements OnInit {

  private http = inject(HttpClient);
  private locationApi = inject(LocationApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private api = (environment.apiUrl || '/api/v1').replace(/\/$/, '');

  isEdit = false;
  routeId: string | null = null;

  // Default for NEW route
  routeType = 'Driver';

  sourceSearch = '';
  sourceAddress = '';

  private sourceLatitude: number | null = null;
  private sourceLongitude: number | null = null;

  destinationSearch = '';
  destinationAddress = '';

  private destinationLatitude: number | null = null;
  private destinationLongitude: number | null = null;

  sourceSuggestions = signal<CommutePlace[]>([]);
  destSuggestions = signal<CommutePlace[]>([]);

  sourceSearching = signal(false);
  destSearching = signal(false);

  private sourceSelectedAddress = '';
  private destinationSelectedAddress = '';

  activeSourceArea: string | null = null;
  activeDestArea: string | null = null;

  preferredDepartureTime = '08:00';
  timeToleranceMinutes = 15;

  availableSeats = 3;
  estimatedFare: number | null = null;

  days: DayOption[] = [
    { key: 'monday', label: 'Mon', active: true },
    { key: 'tuesday', label: 'Tue', active: true },
    { key: 'wednesday', label: 'Wed', active: true },
    { key: 'thursday', label: 'Thu', active: true },
    { key: 'friday', label: 'Fri', active: true },
    { key: 'saturday', label: 'Sat', active: false },
    { key: 'sunday', label: 'Sun', active: false }
  ];

  busy = signal(false);
  err = signal('');
  msg = signal('');

  ngOnInit(): void {

    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.isEdit = true;
      this.routeId = id;
      this.loadExistingRoute(id);
    }
  }

  /**
   * Loads an existing route.
   *
   * IMPORTANT:
   * Current backend response does not contain routeType/isDriverRoute.
   * Therefore we use backend value when available and localStorage as
   * fallback so Driver does not become Passenger.
   */
  private loadExistingRoute(id: string): void {

    this.busy.set(true);

    this.http.get<any>(`${this.api}/routes/${id}`).subscribe({

      next: (res) => {

        console.log('================================');
        console.log('===== EDIT ROUTE RESPONSE =====');
        console.log('FULL RESPONSE:', res);

        const d = res?.data ?? res;

        console.log('ROUTE DATA:', d);

        if (d) {

          console.log('routeType:', d?.routeType);
          console.log('isDriverRoute:', d?.isDriverRoute);
          console.log('availableSeats:', d?.availableSeats);

          /*
           * Determine Driver / Passenger.
           *
           * Priority:
           * 1. isDriverRoute from backend
           * 2. routeType from backend
           * 3. other possible backend aliases
           * 4. localStorage saved when route was created
           * 5. current default
           */

          const backendIsDriver =
            d?.isDriverRoute === true ||
            d?.isDriver === true ||
            d?.driverRoute === true;

          const backendRouteType =
            String(
              d?.routeType ??
              d?.type ??
              ''
            ).trim().toLowerCase();

          const savedRouteType =
            localStorage.getItem(`routeType_${id}`);

          if (backendIsDriver) {

            this.routeType = 'Driver';

          } else if (backendRouteType === 'driver') {

            this.routeType = 'Driver';

          } else if (backendRouteType === 'passenger') {

            this.routeType = 'Passenger';

          } else if (savedRouteType === 'Driver') {

            this.routeType = 'Driver';

          } else if (savedRouteType === 'Passenger') {

            this.routeType = 'Passenger';

          } else {

            /*
             * Do NOT automatically turn an existing route into Passenger
             * just because the backend omitted route type.
             *
             * Keep Driver as the safe fallback because the component's
             * default route type is Driver.
             */
            this.routeType = 'Driver';
          }

          console.log(
            'FINAL EDIT ROUTE TYPE:',
            this.routeType
          );

          this.sourceAddress = d.sourceAddress || '';
          this.sourceSearch = d.sourceAddress || '';
          this.sourceSelectedAddress = this.sourceAddress;

          this.destinationAddress = d.destinationAddress || '';
          this.destinationSearch = d.destinationAddress || '';
          this.destinationSelectedAddress = this.destinationAddress;

          this.sourceLatitude =
            d?.sourceLatitude ?? null;

          this.sourceLongitude =
            d?.sourceLongitude ?? null;

          this.destinationLatitude =
            d?.destinationLatitude ?? null;

          this.destinationLongitude =
            d?.destinationLongitude ?? null;

          if (d.preferredDepartureTime) {

            const t = String(d.preferredDepartureTime);

            this.preferredDepartureTime =
              /^\d{2}:\d{2}/.test(t)
                ? t.slice(0, 5)
                : this.preferredDepartureTime;
          }

          if (d.maximumTimeToleranceMinutes != null) {

            this.timeToleranceMinutes =
              Number(d.maximumTimeToleranceMinutes);
          }

          if (d.estimatedFare != null) {

            this.estimatedFare =
              Number(d.estimatedFare);
          }

          /*
           * Load available seats when backend provides them.
           *
           * Support a few possible property names because the current
           * backend response is not returning availableSeats yet.
           */
          const backendSeats =
            d?.availableSeats ??
            d?.availableSeatCount ??
            d?.seatsAvailable ??
            d?.seatCount;

          if (
            backendSeats != null &&
            !Number.isNaN(Number(backendSeats))
          ) {

            this.availableSeats =
              Number(backendSeats);
          }

          if (
            d.schedules &&
            Array.isArray(d.schedules)
          ) {

            this.days.forEach((day) => {

              const matched = d.schedules.find(
                (s: any) =>
                  s.dayOfWeek?.toLowerCase() === day.key ||
                  s.day?.toLowerCase() === day.key
              );

              if (matched) {

                day.active =
                  matched.isActive ?? true;
              }
            });
          }
        }

        this.busy.set(false);
      },

      error: (e) => {

        console.error(
          'Failed to load route:',
          e
        );

        this.busy.set(false);

        this.err.set(
          'Could not load route details.'
        );
      }
    });
  }

  // ---------------------------------------------------------
  // SOURCE PLACE METHODS
  // ---------------------------------------------------------

  onSourceSearchInput(): void {

    this.activeSourceArea = null;

    const q = this.sourceSearch.trim();

    // If the user edits the text after selecting a place, invalidate the
    // previous coordinates so we never save coordinates for a different name.
    if (q !== this.sourceSelectedAddress) {
      this.sourceLatitude = null;
      this.sourceLongitude = null;
      this.sourceAddress = '';
    }

    this.sourceSuggestions.set([]);
  }

  searchSourcePlace(): void {

    const q = this.sourceSearch.trim();

    if (q.length < 2) {
      this.err.set('Please enter at least 2 characters for the pickup place.');
      return;
    }

    this.err.set('');
    this.sourceSearching.set(true);

    this.locationApi.search(q).subscribe({
      next: (response) => {
        const results = response?.data ?? [];

        const mapped = results.map((p: PlaceSearchResult) => this.toCommutePlace(p));

        this.sourceSuggestions.set(mapped);
        this.sourceSearching.set(false);

        if (!mapped.length) {
          this.err.set(`No place found for "${q}". Try adding the city, e.g. "${q}, Islamabad".`);
        }
      },
      error: (error) => {
        console.error('Source place search failed:', error);
        this.sourceSearching.set(false);
        this.sourceSuggestions.set([]);
        this.err.set('Source place search failed. Please try again.');
      }
    });
  }

  private toCommutePlace(p: PlaceSearchResult): CommutePlace {
    const parts = p.displayName.split(',').map((x: string) => x.trim()).filter(Boolean);

    return {
      name: p.displayName,
      lat: p.latitude,
      lng: p.longitude,
      area: parts.length > 1 ? parts[parts.length - 2] : 'Pakistan',
      category: 'Geocoded place'
    };
  }

  filterSourceByArea(area: string): void {

    if (this.activeSourceArea === area) {

      this.activeSourceArea = null;
      this.onSourceSearchInput();

      return;
    }

    this.activeSourceArea = area;

    if (area === 'University') {

      this.sourceSuggestions.set(
        RAWALPINDI_ISLAMABAD_PLACES
          .filter(
            (p) => p.category === 'University'
          )
          .slice(0, 8)
      );

    } else if (area === 'Commercial') {

      this.sourceSuggestions.set(
        RAWALPINDI_ISLAMABAD_PLACES
          .filter(
            (p) => p.category === 'Commercial'
          )
          .slice(0, 8)
      );

    } else {

      this.sourceSuggestions.set(
        RAWALPINDI_ISLAMABAD_PLACES
          .filter(
            (p) => p.area === area
          )
          .slice(0, 8)
      );
    }
  }

  selectSource(p: CommutePlace): void {

    this.sourceAddress = p.name;
    this.sourceSearch = p.name;

    this.sourceLatitude = p.lat;
    this.sourceLongitude = p.lng;
    this.sourceSelectedAddress = p.name;

    this.sourceSuggestions.set([]);
    this.activeSourceArea = null;
  }

  pickQuickSource(name: string): void {

    const place =
      RAWALPINDI_ISLAMABAD_PLACES.find(
        (p) => p.name === name
      );

    if (place) {

      this.selectSource(place);

    } else {

      this.sourceAddress = name;
      this.sourceSearch = name;
      this.sourceSelectedAddress = name;
    }
  }

  detectCurrentLocationForSource(): void {

    if (!navigator.geolocation) {

      this.err.set(
        'Geolocation is not supported by your browser.'
      );

      return;
    }

    this.busy.set(true);

    navigator.geolocation.getCurrentPosition(

      (pos) => {

        const lat =
          +pos.coords.latitude.toFixed(6);

        const lng =
          +pos.coords.longitude.toFixed(6);

        this.sourceLatitude = lat;
        this.sourceLongitude = lng;

        const closest =
          findClosestTwinCitiesPlace(
            lat,
            lng
          );

        this.sourceAddress =
          closest.name;

        this.sourceSearch =
          closest.name;

        this.busy.set(false);

        this.msg.set(
          `Location resolved to nearest Twin Cities place: ${closest.name}`
        );
      },

      () => {

        this.busy.set(false);

        this.err.set(
          'Unable to retrieve your current location.'
        );
      },

      {
        timeout: 10000,
        enableHighAccuracy: true
      }
    );
  }

  detectCurrentLocationForDestination(): void {

    if (!navigator.geolocation) {
      this.err.set('Geolocation is not supported by your browser.');
      return;
    }

    this.busy.set(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = +pos.coords.latitude.toFixed(6);
        const lng = +pos.coords.longitude.toFixed(6);

        this.destinationLatitude = lat;
        this.destinationLongitude = lng;

        const closest = findClosestTwinCitiesPlace(lat, lng);

        this.destinationAddress = closest.name;
        this.destinationSearch = closest.name;
        this.destinationSelectedAddress = closest.name;

        this.busy.set(false);
        this.msg.set(`Destination resolved to nearest known place: ${closest.name}`);
      },
      () => {
        this.busy.set(false);
        this.err.set('Unable to retrieve your current location.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  // ---------------------------------------------------------
  // DESTINATION PLACE METHODS
  // ---------------------------------------------------------

  onDestSearchInput(): void {

    this.activeDestArea = null;

    const q = this.destinationSearch.trim();

    if (q !== this.destinationSelectedAddress) {
      this.destinationLatitude = null;
      this.destinationLongitude = null;
      this.destinationAddress = '';
    }

    this.destSuggestions.set([]);
  }

  searchDestinationPlace(): void {

    const q = this.destinationSearch.trim();

    if (q.length < 2) {
      this.err.set('Please enter at least 2 characters for the destination place.');
      return;
    }

    this.err.set('');
    this.destSearching.set(true);

    this.locationApi.search(q).subscribe({
      next: (response) => {
        const results = response?.data ?? [];

        const mapped = results.map((p: PlaceSearchResult) => this.toCommutePlace(p));

        this.destSuggestions.set(mapped);
        this.destSearching.set(false);

        if (!mapped.length) {
          this.err.set(`No place found for "${q}". Try adding the city, e.g. "${q}, Islamabad".`);
        }
      },
      error: (error) => {
        console.error('Destination place search failed:', error);
        this.destSearching.set(false);
        this.destSuggestions.set([]);
        this.err.set('Destination place search failed. Please try again.');
      }
    });
  }

  filterDestByArea(area: string): void {

    if (this.activeDestArea === area) {

      this.activeDestArea = null;
      this.onDestSearchInput();

      return;
    }

    this.activeDestArea = area;

    if (area === 'University') {

      this.destSuggestions.set(
        RAWALPINDI_ISLAMABAD_PLACES
          .filter(
            (p) => p.category === 'University'
          )
          .slice(0, 8)
      );

    } else if (area === 'Commercial') {

      this.destSuggestions.set(
        RAWALPINDI_ISLAMABAD_PLACES
          .filter(
            (p) => p.category === 'Commercial'
          )
          .slice(0, 8)
      );

    } else {

      this.destSuggestions.set(
        RAWALPINDI_ISLAMABAD_PLACES
          .filter(
            (p) => p.area === area
          )
          .slice(0, 8)
      );
    }
  }

  selectDest(p: CommutePlace): void {

    this.destinationAddress = p.name;
    this.destinationSearch = p.name;

    this.destinationLatitude = p.lat;
    this.destinationLongitude = p.lng;
    this.destinationSelectedAddress = p.name;

    this.destSuggestions.set([]);
    this.activeDestArea = null;
  }

  pickQuickDest(name: string): void {

    const place =
      RAWALPINDI_ISLAMABAD_PLACES.find(
        (p) => p.name === name
      );

    if (place) {

      this.selectDest(place);

    } else {

      this.destinationAddress = name;
      this.destinationSearch = name;
      this.destinationSelectedAddress = name;
    }
  }

  // ---------------------------------------------------------
  // DAYS
  // ---------------------------------------------------------

  toggleDay(d: DayOption): void {

    d.active = !d.active;
  }

  // ---------------------------------------------------------
  // SUBMIT
  // ---------------------------------------------------------

  submit(): void {

    this.err.set('');
    this.msg.set('');

    const src =
      (this.sourceAddress ||
        this.sourceSearch).trim();

    const dst =
      (this.destinationAddress ||
        this.destinationSearch).trim();

    // A route must use coordinates selected from a real geocoding result.
    // Never fall back to Pakistan default coordinates.
    if (!src) {
      this.err.set('Please search and select a source / pickup place.');
      return;
    }

    if (!dst) {
      this.err.set('Please search and select a destination place.');
      return;
    }

    if (
      this.sourceLatitude == null ||
      this.sourceLongitude == null ||
      this.sourceSelectedAddress !== src
    ) {
      this.err.set('Please press Search and select the source place from the results.');
      return;
    }

    if (
      this.destinationLatitude == null ||
      this.destinationLongitude == null ||
      this.destinationSelectedAddress !== dst
    ) {
      this.err.set('Please press Search and select the destination place from the results.');
      return;
    }

    // Validate days
    const hasAnyDay =
      this.days.some(
        (d) => d.active
      );

    if (!hasAnyDay) {
      this.err.set(
        'Please select at least one active day of the week.'
      );
      return;
    }

    // -------------------------------------------------------
    // TIME
    // -------------------------------------------------------

    const cleanTime =
      (this.preferredDepartureTime ||
        '08:00')
        .trim()
        .slice(0, 5);

    // -------------------------------------------------------
    // SCHEDULE
    // -------------------------------------------------------

    const scheduleDto = {

      monday:
        this.days.find(
          (d) => d.key === 'monday'
        )?.active ?? false,

      tuesday:
        this.days.find(
          (d) => d.key === 'tuesday'
        )?.active ?? false,

      wednesday:
        this.days.find(
          (d) => d.key === 'wednesday'
        )?.active ?? false,

      thursday:
        this.days.find(
          (d) => d.key === 'thursday'
        )?.active ?? false,

      friday:
        this.days.find(
          (d) => d.key === 'friday'
        )?.active ?? false,

      saturday:
        this.days.find(
          (d) => d.key === 'saturday'
        )?.active ?? false,

      sunday:
        this.days.find(
          (d) => d.key === 'sunday'
        )?.active ?? false,

      isActive: true
    };

    // -------------------------------------------------------
    // ROUTE PAYLOAD
    // -------------------------------------------------------

    const isDriver =
      this.routeType === 'Driver';

    const payload: any = {

      sourceAddress:
        this.sourceAddress,

      destinationAddress:
        this.destinationAddress,

      sourceLatitude:
        this.sourceLatitude,

      sourceLongitude:
        this.sourceLongitude,

      destinationLatitude:
        this.destinationLatitude,

      destinationLongitude:
        this.destinationLongitude,

      preferredDepartureTime:
        cleanTime,

      maximumTimeToleranceMinutes:
        Number(
          this.timeToleranceMinutes
        ),

      /*
       * IMPORTANT
       */
      isDriverRoute:
        isDriver,

      routeType:
        this.routeType,

      isActive:
        true,

      schedules: [
        scheduleDto
      ],

      monday:
        scheduleDto.monday,

      tuesday:
        scheduleDto.tuesday,

      wednesday:
        scheduleDto.wednesday,

      thursday:
        scheduleDto.thursday,

      friday:
        scheduleDto.friday,

      saturday:
        scheduleDto.saturday,

      sunday:
        scheduleDto.sunday
    };

    // -------------------------------------------------------
    // DRIVER DETAILS
    // -------------------------------------------------------

    if (isDriver) {

      payload.availableSeats =
        Number(
          this.availableSeats
        );

      if (
        this.estimatedFare != null
      ) {

        payload.estimatedFare =
          Number(
            this.estimatedFare
          );
      }

    } else {

      /*
       * Passenger routes don't offer seats.
       */
      payload.availableSeats = 0;
    }

    // -------------------------------------------------------
    // DEBUG
    // -------------------------------------------------------

    console.log('====================================');
    console.log('===== ROUTE SAVE PAYLOAD =====');
    console.log('routeType:', this.routeType);
    console.log('isDriverRoute:', isDriver);
    console.log('availableSeats:', payload.availableSeats);
    console.log('FULL PAYLOAD:', payload);
    console.log('====================================');

    this.busy.set(true);

    // -------------------------------------------------------
    // CREATE OR UPDATE
    // -------------------------------------------------------

    const req$ =
      this.isEdit && this.routeId

        ? this.http.put<any>(
            `${this.api}/routes/${this.routeId}`,
            payload
          )

        : this.http.post<any>(
            `${this.api}/routes`,
            payload
          );

    req$.subscribe({

      next: (res) => {

        console.log('====================================');
        console.log('===== ROUTE SAVE RESPONSE =====');
        console.log(res);

        console.log(
          'Saved route type:',
          res?.data?.routeType
        );

        console.log(
          'Saved isDriverRoute:',
          res?.data?.isDriverRoute
        );

        console.log(
          'Saved availableSeats:',
          res?.data?.availableSeats
        );

        console.log('====================================');

        /*
         * IMPORTANT FALLBACK
         *
         * The current backend response does NOT return
         * routeType/isDriverRoute.
         *
         * Save the route type locally using the route ID.
         * When Edit is opened, loadExistingRoute() will use
         * this value if backend doesn't return the field.
         */

        const savedRouteId =
          res?.data?.id ||
          this.routeId;

        if (savedRouteId) {

          localStorage.setItem(
            `routeType_${savedRouteId}`,
            this.routeType
          );

          if (isDriver) {

            localStorage.setItem(
              `availableSeats_${savedRouteId}`,
              String(
                Number(
                  this.availableSeats
                )
              )
            );
          }
        }

        this.busy.set(false);

        this.msg.set(
          res?.message ||
          (
            this.isEdit
              ? 'Route updated successfully!'
              : 'Route published successfully!'
          )
        );

        setTimeout(() => {

          this.router.navigateByUrl(
            '/app/routes'
          );

        }, 800);
      },

      error: (e) => {

        console.error(
          '===== ROUTE SAVE ERROR =====',
          e
        );

        this.busy.set(false);

        const errs =
          e.error?.errors;

        if (
          Array.isArray(errs) &&
          errs.length > 0
        ) {

          this.err.set(
            errs.join(' ')
          );

        } else if (
          typeof errs === 'object' &&
          errs !== null
        ) {

          const msgs =
            Object.values(errs)
              .flat()
              .join(' ');

          this.err.set(
            msgs ||
            e.error?.message ||
            'Validation failed. Please verify fields.'
          );

        } else {

          this.err.set(
            e.error?.message ||
            'Failed to save route. Please verify fields.'
          );
        }
      }
    });
  }

  // ---------------------------------------------------------
  // CANCEL
  // ---------------------------------------------------------

  cancel(): void {

    this.router.navigateByUrl(
      '/app/routes'
    );
  }
}