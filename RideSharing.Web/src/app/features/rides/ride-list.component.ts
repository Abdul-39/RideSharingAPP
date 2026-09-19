import {
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';

import { RouterLink } from '@angular/router';

import {
  RideRequestDto,
  RideRequestService
} from '../../core/services/ride-request.service';

@Component({
  selector: 'app-ride-list',
  standalone: true,

  imports: [
    CommonModule,
    RouterLink
  ],

  template: `
    <div class="page">

      <div class="container">

        <!-- HEADER -->
        <div class="page-header">

          <div class="title-section">

            <div class="title-icon">
              🚗
            </div>

            <div>
              <h1>
                My Ride Requests
              </h1>

              <p>
                Manage your requested rides and view available matches.
              </p>
            </div>

          </div>

          <a
            routerLink="/app/rides/find"
            class="find-btn">

            <span>＋</span>
            Find Ride

          </a>

        </div>


        <!-- ERROR -->
        @if (error()) {

          <div class="alert">

            <span class="alert-icon">
              !
            </span>

            <span>
              {{ error() }}
            </span>

          </div>

        }


        <!-- LOADING -->
        @if (loading()) {

          <div class="loading-card">

            <div class="spinner"></div>

            <p>
              Loading your ride requests...
            </p>

          </div>

        }


        <!-- EMPTY -->
        @else if (items().length === 0) {

          <div class="empty-card">

            <div class="empty-icon">
              🚗
            </div>

            <h2>
              No ride requests yet
            </h2>

            <p>
              You haven't created any ride requests.
              Find a ride and start matching with drivers.
            </p>

            <a
              routerLink="/app/rides/find"
              class="empty-btn">

              Find a Ride

            </a>

          </div>

        }


        <!-- RIDE REQUESTS -->
        @else {

          <div class="section-heading">

            <div>
              <h2>
                Your Requests
              </h2>

              <span>
                {{ items().length }}
                {{ items().length === 1 ? 'request' : 'requests' }}
              </span>
            </div>

          </div>


          <div class="ride-grid">

            @for (
              r of items();
              track r.id
            ) {

              <article class="ride-card">

                <!-- CARD TOP -->
                <div class="card-top">

                  <div class="route-icon">
                    <span>●</span>
                    <i></i>
                    <span>●</span>
                  </div>

                  <div class="route-info">

                    <div class="location">

                      <small>
                        FROM
                      </small>

                      <strong>
                        {{ r.sourceAddress }}
                      </strong>

                    </div>

                    <div class="location">

                      <small>
                        TO
                      </small>

                      <strong>
                        {{ r.destinationAddress }}
                      </strong>

                    </div>

                  </div>

                  <span
                    class="status"
                    [class.matched]="
                      r.status === 'Matched' ||
                      r.status === 'Accepted'
                    "
                    [class.cancelled]="
                      r.status === 'Cancelled'
                    "
                    [class.completed]="
                      r.status === 'Completed'
                    ">

                    <span class="status-dot"></span>

                    {{ r.status }}

                  </span>

                </div>


                <!-- DETAILS -->
                <div class="details">

                  <div class="detail">

                    <span class="detail-icon">
                      📅
                    </span>

                    <div>
                      <small>
                        DATE
                      </small>

                      <strong>
                        {{ r.travelDate }}
                      </strong>
                    </div>

                  </div>


                  <div class="detail">

                    <span class="detail-icon">
                      🕐
                    </span>

                    <div>
                      <small>
                        DEPARTURE
                      </small>

                      <strong>
                        {{ r.preferredDepartureTime }}
                      </strong>
                    </div>

                  </div>


                  <div class="detail">

                    <span class="detail-icon">
                      👤
                    </span>

                    <div>
                      <small>
                        SEATS
                      </small>

                      <strong>
                        {{ r.seatsNeeded }}
                      </strong>
                    </div>

                  </div>


                  <div class="detail">

                    <span class="detail-icon">
                      ⏱
                    </span>

                    <div>
                      <small>
                        TOLERANCE
                      </small>

                      <strong>
                        ±{{ r.timeToleranceMinutes }} min
                      </strong>
                    </div>

                  </div>

                </div>


                <!-- MATCH INFO -->
                <div class="match-box">

                  <div class="match-left">

                    <div class="match-icon">
                      ✓
                    </div>

                    <div>

                      <strong>
                        {{ r.matchCount || 0 }}
                        {{
                          (r.matchCount || 0) === 1
                            ? 'Match found'
                            : 'Matches found'
                        }}
                      </strong>

                      <span>
                        Available drivers for this request
                      </span>

                    </div>

                  </div>

                  <span class="match-arrow">
                    →
                  </span>

                </div>


                <!-- PREFERENCE -->
                <div class="preferences">

                  <span>
                    Gender:
                    <strong>
                      {{ r.genderPreference || 'Any' }}
                    </strong>
                  </span>

                  <span class="separator">
                    •
                  </span>

                  <span>
                    ±{{ r.timeToleranceMinutes }} min
                  </span>

                </div>


                <!-- ACTIONS -->
                <div class="actions">

                  <a
                    [routerLink]="[
                      '/app/rides',
                      r.id,
                      'matches'
                    ]"
                    class="btn primary">

                    <span>🔎</span>
                    View Matches

                  </a>


                  @if (
                    r.status !== 'Cancelled' &&
                    r.status !== 'Completed'
                  ) {

                    <button
                      type="button"
                      class="btn danger"
                      (click)="cancel(r)">

                      <span>×</span>
                      Cancel

                    </button>

                  }

                </div>

              </article>

            }

          </div>

        }

      </div>

    </div>
  `,

  styles: [`

    /* =========================
       PAGE
    ========================= */

    .page {
      min-height: calc(100vh - 150px);
      background:
        linear-gradient(
          180deg,
          #eefaf4 0%,
          #f7fbf9 180px,
          #f8fafc 100%
        );

      padding: 1.5rem 1rem 3rem;
    }


    .container {
      max-width: 1100px;
      margin: 0 auto;
    }


    /* =========================
       HEADER
    ========================= */

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;

      margin-bottom: 1.5rem;
    }


    .title-section {
      display: flex;
      align-items: center;
      gap: 0.9rem;
    }


    .title-icon {
      width: 52px;
      height: 52px;

      border-radius: 16px;

      display: grid;
      place-items: center;

      background:
        linear-gradient(
          145deg,
          #0d9f6e,
          #14b8a6
        );

      color: #fff;

      font-size: 1.35rem;

      box-shadow:
        0 8px 20px
        rgba(
          13,
          159,
          110,
          0.22
        );
    }


    .title-section h1 {
      margin: 0;

      color: #0f172a;

      font-size: 1.55rem;
      font-weight: 800;

      letter-spacing: -0.03em;
    }


    .title-section p {
      margin: 0.25rem 0 0;

      color: #64748b;

      font-size: 0.82rem;
    }


    .find-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;

      padding: 0.7rem 1.1rem;

      border-radius: 999px;

      background:
        linear-gradient(
          135deg,
          #0d9f6e,
          #059669
        );

      color: #fff;

      text-decoration: none;

      font-size: 0.82rem;
      font-weight: 800;

      box-shadow:
        0 6px 18px
        rgba(
          13,
          159,
          110,
          0.22
        );

      transition:
        transform 0.2s,
        box-shadow 0.2s;
    }


    .find-btn:hover {
      transform: translateY(-1px);

      box-shadow:
        0 9px 22px
        rgba(
          13,
          159,
          110,
          0.3
        );
    }


    .find-btn span {
      font-size: 1.05rem;
      line-height: 1;
    }


    /* =========================
       ALERT
    ========================= */

    .alert {
      display: flex;
      align-items: center;
      gap: 0.6rem;

      padding: 0.85rem 1rem;

      margin-bottom: 1rem;

      border-radius: 12px;

      background: #fff1f2;

      border: 1px solid #fecdd3;

      color: #be123c;

      font-size: 0.82rem;
      font-weight: 600;
    }


    .alert-icon {
      width: 22px;
      height: 22px;

      border-radius: 50%;

      display: grid;
      place-items: center;

      background: #e11d48;
      color: #fff;

      font-size: 0.75rem;
      font-weight: 800;
    }


    /* =========================
       LOADING
    ========================= */

    .loading-card {
      min-height: 280px;

      display: flex;
      flex-direction: column;

      align-items: center;
      justify-content: center;

      gap: 0.8rem;

      background: #fff;

      border: 1px solid #e2e8f0;

      border-radius: 18px;

      box-shadow:
        0 5px 20px
        rgba(
          15,
          23,
          42,
          0.05
        );

      color: #64748b;
    }


    .spinner {
      width: 34px;
      height: 34px;

      border-radius: 50%;

      border:
        3px solid
        #d1fae5;

      border-top-color:
        #0d9f6e;

      animation:
        spin 0.8s linear infinite;
    }


    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }


    /* =========================
       EMPTY
    ========================= */

    .empty-card {
      text-align: center;

      background: #fff;

      border:
        1px solid
        #e2e8f0;

      border-radius: 20px;

      padding: 3rem 1.5rem;

      box-shadow:
        0 5px 20px
        rgba(
          15,
          23,
          42,
          0.05
        );
    }


    .empty-icon {
      width: 70px;
      height: 70px;

      margin: 0 auto 1rem;

      display: grid;
      place-items: center;

      border-radius: 22px;

      background: #e8f8f1;

      font-size: 1.8rem;
    }


    .empty-card h2 {
      margin: 0;

      color: #0f172a;

      font-size: 1.15rem;
    }


    .empty-card p {
      max-width: 430px;

      margin: 0.55rem auto 1.25rem;

      color: #64748b;

      font-size: 0.85rem;

      line-height: 1.6;
    }


    .empty-btn {
      display: inline-flex;

      padding: 0.65rem 1.1rem;

      border-radius: 999px;

      background: #0d9f6e;

      color: #fff;

      text-decoration: none;

      font-size: 0.82rem;
      font-weight: 800;
    }


    /* =========================
       SECTION HEADING
    ========================= */

    .section-heading {
      margin-bottom: 0.85rem;
    }


    .section-heading div {
      display: flex;
      align-items: center;
      gap: 0.55rem;
    }


    .section-heading h2 {
      margin: 0;

      color: #0f172a;

      font-size: 1rem;
      font-weight: 800;
    }


    .section-heading span {
      padding: 0.2rem 0.55rem;

      border-radius: 999px;

      background: #e8f8f1;

      color: #0b7f58;

      font-size: 0.7rem;
      font-weight: 800;
    }


    /* =========================
       GRID
    ========================= */

    .ride-grid {
      display: grid;

      grid-template-columns:
        repeat(
          auto-fill,
          minmax(320px, 1fr)
        );

      gap: 1rem;
    }


    /* =========================
       RIDE CARD
    ========================= */

    .ride-card {
      background: #fff;

      border:
        1px solid
        #e2e8f0;

      border-radius: 18px;

      padding: 1.15rem;

      box-shadow:
        0 5px 20px
        rgba(
          15,
          23,
          42,
          0.05
        );

      transition:
        transform 0.2s,
        box-shadow 0.2s,
        border-color 0.2s;
    }


    .ride-card:hover {
      transform: translateY(-2px);

      border-color: #b7ebc9;

      box-shadow:
        0 10px 28px
        rgba(
          13,
          159,
          110,
          0.1
        );
    }


    /* =========================
       CARD TOP
    ========================= */

    .card-top {
      display: flex;

      align-items: flex-start;

      gap: 0.8rem;
    }


    .route-icon {
      width: 28px;

      display: flex;
      flex-direction: column;

      align-items: center;

      padding-top: 0.25rem;

      color: #0d9f6e;

      flex-shrink: 0;
    }


    .route-icon span {
      width: 9px;
      height: 9px;

      border-radius: 50%;

      background: #0d9f6e;

      font-size: 0;
    }


    .route-icon span:last-child {
      background: #14b8a6;
    }


    .route-icon i {
      width: 2px;
      height: 24px;

      background:
        #b7ebc9;

      display: block;
    }


    .route-info {
      flex: 1;

      min-width: 0;

      display: flex;
      flex-direction: column;

      gap: 0.65rem;
    }


    .location {
      display: flex;
      flex-direction: column;

      gap: 0.15rem;
    }


    .location small {
      color: #94a3b8;

      font-size: 0.62rem;

      font-weight: 800;

      letter-spacing: 0.06em;
    }


    .location strong {
      color: #0f172a;

      font-size: 0.84rem;

      line-height: 1.35;
    }


    /* =========================
       STATUS
    ========================= */

    .status {
      display: inline-flex;

      align-items: center;

      gap: 0.3rem;

      padding: 0.28rem 0.55rem;

      border-radius: 999px;

      background: #f1f5f9;

      color: #64748b;

      font-size: 0.65rem;

      font-weight: 800;

      white-space: nowrap;
    }


    .status-dot {
      width: 6px;
      height: 6px;

      border-radius: 50%;

      background: #94a3b8;
    }


    .status.matched {
      background: #e8f8f1;

      color: #0b7f58;
    }


    .status.matched .status-dot {
      background: #0d9f6e;
    }


    .status.cancelled {
      background: #fff1f2;

      color: #be123c;
    }


    .status.cancelled .status-dot {
      background: #e11d48;
    }


    .status.completed {
      background: #eff6ff;

      color: #2563eb;
    }


    .status.completed .status-dot {
      background: #2563eb;
    }


    /* =========================
       DETAILS
    ========================= */

    .details {
      display: grid;

      grid-template-columns:
        repeat(2, 1fr);

      gap: 0.7rem;

      margin-top: 1rem;

      padding-top: 1rem;

      border-top:
        1px solid
        #f1f5f9;
    }


    .detail {
      display: flex;

      align-items: center;

      gap: 0.45rem;
    }


    .detail-icon {
      width: 30px;
      height: 30px;

      display: grid;
      place-items: center;

      border-radius: 9px;

      background: #f0fdf6;

      font-size: 0.85rem;

      flex-shrink: 0;
    }


    .detail div {
      display: flex;

      flex-direction: column;

      gap: 0.08rem;
    }


    .detail small {
      color: #94a3b8;

      font-size: 0.58rem;

      font-weight: 800;

      letter-spacing: 0.04em;
    }


    .detail strong {
      color: #334155;

      font-size: 0.75rem;
    }


    /* =========================
       MATCH BOX
    ========================= */

    .match-box {
      display: flex;

      align-items: center;

      justify-content: space-between;

      margin-top: 1rem;

      padding: 0.75rem;

      border-radius: 13px;

      background:
        linear-gradient(
          135deg,
          #f0fdf6,
          #e8f8f1
        );

      border:
        1px solid
        #c6f0d8;
    }


    .match-left {
      display: flex;

      align-items: center;

      gap: 0.55rem;
    }


    .match-icon {
      width: 30px;
      height: 30px;

      display: grid;
      place-items: center;

      border-radius: 50%;

      background: #0d9f6e;

      color: #fff;

      font-size: 0.75rem;

      font-weight: 900;
    }


    .match-left div:last-child {
      display: flex;

      flex-direction: column;

      gap: 0.1rem;
    }


    .match-left strong {
      color: #0b7f58;

      font-size: 0.76rem;
    }


    .match-left span {
      color: #64748b;

      font-size: 0.64rem;
    }


    .match-arrow {
      color: #0d9f6e;

      font-size: 1.1rem;

      font-weight: 800;
    }


    /* =========================
       PREFERENCES
    ========================= */

    .preferences {
      display: flex;

      align-items: center;

      gap: 0.45rem;

      margin-top: 0.75rem;

      color: #64748b;

      font-size: 0.68rem;
    }


    .preferences strong {
      color: #334155;
    }


    .separator {
      color: #cbd5e1;
    }


    /* =========================
       ACTIONS
    ========================= */

    .actions {
      display: flex;

      gap: 0.55rem;

      margin-top: 1rem;
    }


    .btn {
      min-height: 40px;

      display: inline-flex;

      align-items: center;

      justify-content: center;

      gap: 0.35rem;

      border-radius: 11px;

      padding: 0.55rem 0.85rem;

      font-family: inherit;

      font-size: 0.76rem;

      font-weight: 800;

      text-decoration: none;

      cursor: pointer;

      transition:
        transform 0.15s,
        background 0.15s;
    }


    .btn:hover {
      transform: translateY(-1px);
    }


    .btn.primary {
      flex: 1;

      background:
        linear-gradient(
          135deg,
          #0d9f6e,
          #059669
        );

      color: #fff;

      border: none;

      box-shadow:
        0 4px 12px
        rgba(
          13,
          159,
          110,
          0.2
        );
    }


    .btn.primary:hover {
      background:
        linear-gradient(
          135deg,
          #0b8f63,
          #047857
        );
    }


    .btn.danger {
      background: #fff;

      color: #be123c;

      border:
        1px solid
        #fecdd3;
    }


    .btn.danger:hover {
      background: #fff1f2;
    }


    /* =========================
       MOBILE
    ========================= */

    @media (max-width: 700px) {

      .page {
        padding:
          1rem
          0.75rem
          2rem;
      }


      .page-header {
        align-items: flex-start;

        flex-direction: column;
      }


      .find-btn {
        width: 100%;

        justify-content: center;
      }


      .ride-grid {
        grid-template-columns: 1fr;
      }

    }


    @media (max-width: 420px) {

      .title-section {
        align-items: flex-start;
      }


      .title-icon {
        width: 44px;
        height: 44px;

        border-radius: 13px;

        font-size: 1.1rem;
      }


      .title-section h1 {
        font-size: 1.25rem;
      }


      .title-section p {
        font-size: 0.72rem;
      }


      .details {
        grid-template-columns: 1fr 1fr;
      }


      .card-top {
        flex-wrap: wrap;
      }


      .status {
        margin-left: 36px;
      }

    }

  `]
})
export class RideListComponent
  implements OnInit {

  private rideService =
    inject(RideRequestService);

  items =
    signal<RideRequestDto[]>([]);

  loading =
    signal(true);

  error =
    signal('');

  ngOnInit(): void {
    this.load();
  }


  load(): void {

    this.loading.set(true);
    this.error.set('');

    this.rideService
      .getMy()
      .subscribe({

        next: res => {

          this.loading.set(false);

          if (
            res.success &&
            res.data
          ) {

            this.items.set(
              res.data
            );

          } else {

            this.error.set(
              res.message ||
              'Failed to load ride requests'
            );

          }

        },


        error: err => {

          this.loading.set(false);

          console.error(
            'GET /ride-requests/my failed:',
            err
          );

          this.error.set(
            err.error?.message ||
            'Failed to load ride requests'
          );

        }

      });

  }


  cancel(
    r: RideRequestDto
  ): void {

    if (
      !confirm(
        'Cancel this ride request?'
      )
    ) {
      return;
    }


    this.rideService
      .cancel(r.id)
      .subscribe({

        next: res => {

          if (res.success) {

            this.load();

          } else {

            this.error.set(
              res.message ||
              'Cancel failed'
            );

          }

        },


        error: err => {

          console.error(
            'Cancel ride request failed:',
            err
          );

          this.error.set(
            err.error?.message ||
            'Cancel failed'
          );

        }

      });

  }

}