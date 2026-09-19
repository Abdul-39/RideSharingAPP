
import {
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  ActivatedRoute,
  Router,
  RouterLink
} from '@angular/router';

import {
  RideRequestService,
  RideRequestDto,
  MatchResultDto
} from '../../core/services/ride-request.service';

import { RideService } from '../../core/services/ride.service';

@Component({
  selector: 'app-match-results',
  standalone: true,

  imports: [
    CommonModule,
    RouterLink
  ],

  template: `
    <div class="page">

      <!-- HEADER -->
      <header class="head">

        <div>
          <h1>Ride Matches</h1>

          <p class="subtitle">
            Choose a matched ride for your journey
          </p>
        </div>

        <a
          routerLink="/app/rides/find"
          class="back">

          Find Another Ride

        </a>

      </header>


      <!-- REQUEST SUMMARY -->
      @if (request()) {

        <div class="summary">

          <div class="summary-route">

            <span class="route-dot pickup">
              A
            </span>

            <div>
              <small>PICKUP</small>

              <strong>
                {{ request()!.sourceAddress }}
              </strong>
            </div>

          </div>


          <div class="route-line"></div>


          <div class="summary-route">

            <span class="route-dot dropoff">
              B
            </span>

            <div>
              <small>DROP-OFF</small>

              <strong>
                {{ request()!.destinationAddress }}
              </strong>
            </div>

          </div>


          <div class="summary-info">

            <span>
              🕐
              {{ request()!.preferredDepartureTime }}
            </span>

            <span>
              📅
              {{ request()!.travelDate }}
            </span>

            <span>
              ±{{ request()!.timeToleranceMinutes }} min
            </span>

          </div>

        </div>

      }


      <!-- ERROR -->
      @if (error()) {

        <div class="alert">
          {{ error() }}
        </div>

      }


      <!-- SUCCESS -->
      @if (message()) {

        <div class="success">
          {{ message() }}
        </div>

      }


      <!-- TOOLBAR -->
      <div class="toolbar">

        <button
          type="button"
          class="btn rerun"
          [disabled]="loading()"
          (click)="rematch()">

          {{ loading()
            ? 'Finding...'
            : '⟳ Re-run Matching'
          }}

        </button>

      </div>


      <!-- LOADING -->
      @if (
        loading() &&
        !matches().length
      ) {

        <div class="empty">

          <div class="loader"></div>

          <p>
            Finding matching rides...
          </p>

        </div>

      }


      <!-- NO MATCH -->
      @else if (!matches().length) {

        <div class="card empty">

          <h3>
            No matches found
          </h3>

          <p>
            No suitable driver was found
            for this ride request.
          </p>

        </div>

      }


      <!-- MATCHES -->
      @else {

        <div class="matches">

          @for (
            m of matches();
            track m.matchId
          ) {

            <article class="card">


              <!-- DRIVER HEADER -->
              <div class="driver-header">

                <div class="driver-info">

                  <div class="avatar">
                    {{ getInitials(
                      m.matchedUserName ||
                      'Driver'
                    ) }}
                  </div>

                  <div>

                    <h2>
                      {{ m.matchedUserName || 'Driver' }}
                    </h2>

                    <p>
                      {{ m.vehicleInfo ||
                      'Vehicle information unavailable' }}
                    </p>

                  </div>

                </div>


                <div class="match-number">

                  <small>
                    MATCH
                  </small>

                  <strong>
                    {{ getMatchNumber(m) }}
                  </strong>

                </div>

              </div>


              <!-- VERIFIED -->
              @if (m.isVerified) {

                <div class="verified">

                  ✓
                  Verified Driver

                </div>

              }


              <!-- ROUTE -->
              <div class="route-box">

                <div class="route-item">

                  <span class="point pickup-point">
                    A
                  </span>

                  <div>

                    <small>
                      PICKUP
                    </small>

                    <strong>
                      {{ m.matchedRouteSource || '—' }}
                    </strong>

                  </div>

                </div>


                <div class="vertical-line"></div>


                <div class="route-item">

                  <span class="point dropoff-point">
                    B
                  </span>

                  <div>

                    <small>
                      DROP-OFF
                    </small>

                    <strong>
                      {{ m.matchedRouteDestination || '—' }}
                    </strong>

                  </div>

                </div>

              </div>


              <!-- DETAILS -->
              <div class="details">

                <div class="detail-box">

                  <span class="icon">
                    🕐
                  </span>

                  <div>

                    <small>
                      DEPARTURE
                    </small>

                    <strong>
                      {{ m.matchedDepartureTime || '—' }}
                    </strong>

                  </div>

                </div>


                <div class="detail-box">

                  <span class="icon">
                    💺
                  </span>

                  <div>

                    <small>
                      AVAILABLE SEATS
                    </small>

                    <strong>
                      {{ m.seatingCapacity || 0 }}
                    </strong>

                  </div>

                </div>


                <div class="detail-box">

                  <span class="icon">
                    📍
                  </span>

                  <div>

                    <small>
                      MATCH STATUS
                    </small>

                    <strong>
                      {{ m.status }}
                    </strong>

                  </div>

                </div>

              </div>


              <!-- WHY MATCH -->
              @if (m.scoreBreakdown) {

                <div class="reasons">

                  <strong>
                    Why this ride matches
                  </strong>

                  <p>
                    {{ m.scoreBreakdown }}
                  </p>

                </div>

              }


              <!-- PENDING ACTIONS -->
              @if (
                m.status === 'Pending' ||
                m.status === 'pending'
              ) {

                <div class="actions">

                  <button
                    type="button"
                    class="btn accept"
                    [disabled]="acceptingMatchId() === m.matchId"
                    (click)="respond(m, true)">

                    @if (
                      acceptingMatchId() === m.matchId
                    ) {

                      Creating Ride...

                    } @else {

                      Accept Ride

                    }

                  </button>


                  <button
                    type="button"
                    class="btn reject"
                    [disabled]="acceptingMatchId() === m.matchId"
                    (click)="respond(m, false)">

                    Reject

                  </button>

                </div>

              }


              <!-- ACCEPTED -->
              @if (
                isAccepted(m)
              ) {

                <div class="accepted">

                  <div class="accepted-text">

                    <span>
                      ✓
                    </span>

                    <strong>
                      Accepted
                    </strong>

                  </div>


                  <!-- OPEN RIDE DETAILS -->
                  @if (createdRideId()) {

                    <a
                      class="ride-details-btn"
                      [routerLink]="[
                        '/app',
                        'rides',
                        'lifecycle',
                        createdRideId()
                      ]"
                      aria-label="Open Ride Details">

                      🚗
                      Open Ride Details
                      →

                    </a>

                  }

                </div>

              }

            </article>

          }

        </div>

      }

    </div>
  `,


  styles: [`

    /* =========================
       PAGE
    ========================= */

    .page {
      min-height: calc(100vh - 140px);
      max-width: 1050px;
      margin: 0 auto;
      padding: 1.5rem;
      color: #0f172a;
    }


    /* =========================
       HEADER
    ========================= */

    .head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 1.2rem;
    }

    .head h1 {
      margin: 0;
      color: #0f172a;
      font-size: 1.6rem;
      font-weight: 800;
    }

    .subtitle {
      margin: .3rem 0 0;
      color: #64748b;
      font-size: .85rem;
    }

    .back {
      color: #0d9f6e;
      font-weight: 700;
      font-size: .85rem;
      text-decoration: none;
    }

    .back:hover {
      text-decoration: underline;
    }


    /* =========================
       SUMMARY
    ========================= */

    .summary {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 1.2rem;
      padding: 1.2rem;
      margin-bottom: 1rem;
      box-shadow:
        0 8px 30px rgba(15,23,42,.05);
    }

    .summary-route {
      display: flex;
      align-items: center;
      gap: .75rem;
    }

    .summary-route small {
      display: block;
      color: #94a3b8;
      font-size: .68rem;
      font-weight: 800;
      letter-spacing: .06em;
    }

    .summary-route strong {
      display: block;
      margin-top: .15rem;
      font-size: .9rem;
    }

    .route-dot {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      display: grid;
      place-items: center;
      color: #fff;
      font-weight: 800;
      flex-shrink: 0;
    }

    .route-dot.pickup {
      background: #0d9f6e;
    }

    .route-dot.dropoff {
      background: #117c78;
    }

    .route-line {
      height: 18px;
      width: 2px;
      margin-left: 16px;
      border-left: 2px dashed #9de7ca;
    }

    .summary-info {
      display: flex;
      flex-wrap: wrap;
      gap: .7rem;
      margin-top: 1rem;
      padding-top: .8rem;
      border-top: 1px solid #f1f5f9;
      color: #64748b;
      font-size: .78rem;
      font-weight: 600;
    }


    /* =========================
       ALERTS
    ========================= */

    .alert {
      padding: .85rem 1rem;
      margin-bottom: 1rem;
      border-radius: .8rem;
      background: #fff1f2;
      border: 1px solid #fecdd3;
      color: #be123c;
    }

    .success {
      padding: .85rem 1rem;
      margin-bottom: 1rem;
      border-radius: .8rem;
      background: #ecfdf5;
      border: 1px solid #bbf7d0;
      color: #047857;
      font-weight: 700;
    }


    /* =========================
       TOOLBAR
    ========================= */

    .toolbar {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 1rem;
    }

    .btn {
      border: none;
      border-radius: 999px;
      min-height: 42px;
      padding: .55rem 1rem;
      cursor: pointer;
      font-weight: 800;
      font-family: inherit;
    }

    .rerun {
      background: #fff;
      color: #0d9f6e;
      border: 1px solid #b7ebc9;
      box-shadow:
        0 3px 12px rgba(13,159,110,.08);
    }

    .rerun:hover {
      background: #f0fdf6;
    }

    .btn:disabled {
      opacity: .55;
      cursor: not-allowed;
    }


    /* =========================
       MATCHES
    ========================= */

    .matches {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .card {
      background: #fff;
      border: 1px solid #dfe7ee;
      border-radius: 1.25rem;
      padding: 1.35rem;
      box-shadow:
        0 12px 35px rgba(15,23,42,.06);
    }


    /* =========================
       DRIVER
    ========================= */

    .driver-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }

    .driver-info {
      display: flex;
      align-items: center;
      gap: .75rem;
    }

    .avatar {
      width: 68px;
      height: 68px;
      border-radius: 18px;
      display: grid;
      place-items: center;
      background: linear-gradient(
        145deg,
        #0d9f6e,
        #14b8a6
      );
      color: #fff;
      font-size: 1.2rem;
      font-weight: 800;
      box-shadow:
        0 6px 16px rgba(13,159,110,.25);
    }

    .driver-info h2 {
      margin: 0;
      font-size: 1.15rem;
      color: #0f172a;
    }

    .driver-info p {
      margin: .2rem 0 0;
      color: #64748b;
      font-size: .85rem;
    }

    .match-number {
      min-width: 74px;
      padding: .55rem .7rem;
      text-align: center;
      border-radius: 14px;
      background: #f0fdf6;
      border: 1px solid #bbf7d0;
      color: #047857;
    }

    .match-number small {
      display: block;
      font-size: .62rem;
      font-weight: 800;
      letter-spacing: .06em;
    }

    .match-number strong {
      display: block;
      font-size: 1.2rem;
    }


    /* =========================
       VERIFIED
    ========================= */

    .verified {
      display: inline-flex;
      align-items: center;
      gap: .4rem;
      margin-top: 1rem;
      padding: .4rem .7rem;
      border-radius: 999px;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #047857;
      font-size: .75rem;
      font-weight: 800;
    }


    /* =========================
       ROUTE
    ========================= */

    .route-box {
      margin-top: 1.1rem;
      padding: 1rem;
      border-radius: 1rem;
      background: #f8fafc;
      border: 1px solid #e8eef3;
    }

    .route-item {
      display: flex;
      align-items: center;
      gap: .75rem;
    }

    .route-item small {
      display: block;
      color: #94a3b8;
      font-size: .68rem;
      font-weight: 800;
      letter-spacing: .05em;
    }

    .route-item strong {
      display: block;
      margin-top: .2rem;
      font-size: .88rem;
      color: #173052;
    }

    .point {
      width: 46px;
      height: 46px;
      border-radius: 13px;
      display: grid;
      place-items: center;
      color: #fff;
      font-weight: 800;
      flex-shrink: 0;
    }

    .pickup-point {
      background: #0d9f6e;
    }

    .dropoff-point {
      background: #117c78;
    }

    .vertical-line {
      height: 24px;
      border-left: 2px dashed #9de7ca;
      margin-left: 22px;
    }


    /* =========================
       DETAILS
    ========================= */

    .details {
      display: grid;
      grid-template-columns:
        repeat(3, 1fr);
      gap: .8rem;
      margin-top: 1rem;
    }

    .detail-box {
      display: flex;
      align-items: center;
      gap: .65rem;
      padding: .85rem;
      border-radius: .9rem;
      background: #f8fafc;
      border: 1px solid #e8eef3;
    }

    .detail-box .icon {
      font-size: 1rem;
    }

    .detail-box small {
      display: block;
      color: #94a3b8;
      font-size: .62rem;
      font-weight: 800;
      letter-spacing: .04em;
    }

    .detail-box strong {
      display: block;
      margin-top: .15rem;
      color: #173052;
      font-size: .85rem;
    }


    /* =========================
       REASONS
    ========================= */

    .reasons {
      margin-top: 1rem;
      padding: .9rem 1rem;
      border-radius: 1rem;
      background: #f0fdf6;
      border: 1px solid #bbf7d0;
    }

    .reasons strong {
      color: #047857;
      font-size: .82rem;
    }

    .reasons p {
      margin: .35rem 0 0;
      color: #52708c;
      font-size: .8rem;
      line-height: 1.55;
    }


    /* =========================
       ACTIONS
    ========================= */

    .actions {
      display: flex;
      gap: .65rem;
      margin-top: 1rem;
    }

    .accept {
      flex: 1;
      color: #fff;
      background: linear-gradient(
        135deg,
        #0d9f6e,
        #059669
      );
      box-shadow:
        0 6px 16px rgba(13,159,110,.2);
    }

    .accept:hover {
      transform: translateY(-1px);
    }

    .reject {
      color: #be123c;
      background: #fff1f2;
      border: 1px solid #fecdd3;
    }


    /* =========================
       ACCEPTED
    ========================= */

    .accepted {
      margin-top: 1rem;
      padding: .8rem;
      border-radius: 1rem;
      background: #ecfdf5;
      border: 1px solid #bbf7d0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: .8rem;
    }

    .accepted-text {
      display: flex;
      align-items: center;
      gap: .45rem;
      color: #047857;
    }

    .accepted-text span {
      font-size: 1rem;
    }

    .accepted-text strong {
      font-size: .9rem;
    }

    .ride-details-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: .35rem;
      padding: .65rem 1rem;
      border-radius: 999px;
      background: linear-gradient(
        135deg,
        #0d9f6e,
        #059669
      );
      color: #fff;
      text-decoration: none;
      font-size: .78rem;
      font-weight: 800;
      box-shadow:
        0 5px 14px rgba(13,159,110,.2);
      white-space: nowrap;
    }

    .ride-details-btn:hover {
      background: #087f59;
    }


    /* =========================
       EMPTY
    ========================= */

    .empty {
      text-align: center;
      padding: 2.5rem;
      color: #64748b;
    }

    .empty h3 {
      color: #0f172a;
    }

    .loader {
      width: 30px;
      height: 30px;
      margin: 0 auto .8rem;
      border-radius: 50%;
      border: 3px solid #d1fae5;
      border-top-color: #0d9f6e;
      animation: spin .8s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }


    /* =========================
       MOBILE
    ========================= */

    @media (max-width: 700px) {

      .page {
        padding: 1rem;
      }

      .head {
        flex-direction: column;
      }

      .details {
        grid-template-columns: 1fr;
      }

      .driver-header {
        flex-direction: column;
      }

      .match-number {
        align-self: flex-start;
      }

      .accepted {
        flex-direction: column;
        align-items: stretch;
      }

      .ride-details-btn {
        width: 100%;
      }

    }

  `]
})
export class MatchResultsComponent
  implements OnInit {

  private rideRequestService =
    inject(RideRequestService);

  private rideService =
    inject(RideService);

  private route =
    inject(ActivatedRoute);

  private router =
    inject(Router);


  request =
    signal<RideRequestDto | null>(null);

  matches =
    signal<MatchResultDto[]>([]);

  loading =
    signal(true);

  error =
    signal('');

  message =
    signal('');


  /*
   * ID of the Ride created after
   * passenger accepts a match.
   *
   * This is used by:
   *
   * Open Ride Details
   *
   * /app/rides/lifecycle/{rideId}
   */
  createdRideId =
    signal<string | null>(null);


  /*
   * Which match is currently
   * being accepted.
   */
  acceptingMatchId =
    signal<string | null>(null);


  requestId = '';


  ngOnInit(): void {

    this.requestId =
      this.route.snapshot.paramMap.get('id') || '';

    if (!this.requestId) {

      this.error.set(
        'Ride request ID is missing.'
      );

      this.loading.set(false);

      return;
    }

    this.load();
  }


  load(): void {

    this.loading.set(true);
    this.error.set('');

    this.rideRequestService
      .getById(this.requestId)
      .subscribe({

        next: res => {

          if (
            res.success &&
            res.data
          ) {

            this.request.set(
              res.data
            );

          }

        },

        error: err => {

          console.error(
            'Failed to load ride request:',
            err
          );

        }

      });


    this.rideRequestService
      .getMatches(this.requestId)
      .subscribe({

        next: res => {

          this.loading.set(false);

          if (
            res.success &&
            res.data
          ) {

            this.matches.set(
              res.data
            );

          } else {

            this.error.set(
              res.message ||
              'Failed to load matches.'
            );

          }

        },

        error: err => {

          this.loading.set(false);

          this.error.set(
            err.error?.message ||
            'Failed to load matches.'
          );

        }

      });
  }


  rematch(): void {

    this.loading.set(true);
    this.error.set('');
    this.message.set('');

    this.rideRequestService
      .runMatch(this.requestId)
      .subscribe({

        next: res => {

          this.loading.set(false);

          if (
            res.success &&
            res.data
          ) {

            this.matches.set(
              res.data
            );

            this.message.set(
              res.message ||
              'Matching completed.'
            );

          } else {

            this.error.set(
              res.message ||
              'Matching failed.'
            );

          }

        },

        error: err => {

          this.loading.set(false);

          this.error.set(
            err.error?.message ||
            'Matching failed.'
          );

        }

      });
  }


  respond(
    match: MatchResultDto,
    accept: boolean
  ): void {

    this.error.set('');
    this.message.set('');

    if (accept) {

      this.acceptingMatchId.set(
        match.matchId
      );

    }


    this.rideRequestService
      .respond(
        match.matchId,
        accept
      )
      .subscribe({

        next: response => {

          if (!response.success) {

            this.acceptingMatchId.set(null);

            this.error.set(
              response.message ||
              'Failed to respond to match.'
            );

            return;
          }


          /*
           * =========================
           * REJECT
           * =========================
           */

          if (!accept) {

            this.message.set(
              response.message ||
              'Match rejected.'
            );

            this.load();

            return;
          }


          /*
           * =========================
           * ACCEPT
           * =========================
           *
           * Create the actual Ride.
           *
           * IMPORTANT:
           * We DO NOT navigate automatically.
           *
           * Instead we save the Ride ID
           * and show:
           *
           * Open Ride Details
           */

          this.message.set(
            'Match accepted. Your ride has been created.'
          );


          this.rideService
            .createFromMatch(match.matchId)
            .subscribe({

              next: rideResponse => {

                console.log(
                  'CREATE RIDE RESPONSE:',
                  rideResponse
                );


                this.acceptingMatchId.set(
                  null
                );


                if (
                  rideResponse.success &&
                  rideResponse.data?.id
                ) {

                  const rideId =
                    rideResponse.data.id;


                  /*
                   * Save created Ride ID.
                   */
                  this.createdRideId.set(
                    rideId
                  );


                  /*
                   * Update the accepted
                   * match status locally.
                   */
                  this.matches.update(
                    list =>
                      list.map(item =>
                        item.matchId ===
                        match.matchId
                          ? {
                              ...item,
                              status: 'Accepted'
                            }
                          : item
                      )
                  );


                  console.log(
                    'RIDE CREATED:',
                    rideId
                  );


                  console.log(
                    'Ride Details URL:',
                    `/app/rides/lifecycle/${rideId}`
                  );


                  return;
                }


                this.error.set(
                  rideResponse.message ||
                  'Ride could not be created.'
                );

              },


              error: err => {

                this.acceptingMatchId.set(
                  null
                );

                console.error(
                  'CREATE RIDE ERROR:',
                  err
                );

                this.error.set(
                  err.error?.message ||
                  'Match was accepted, but ride could not be created.'
                );

              }

            });

        },


        error: err => {

          this.acceptingMatchId.set(null);

          console.error(
            'MATCH RESPONSE ERROR:',
            err
          );

          this.error.set(
            err.error?.message ||
            'Failed to respond to match.'
          );

        }

      });
  }


  /*
   * Check if match is accepted.
   */
  isAccepted(
    match: MatchResultDto
  ): boolean {

    return (
      match.status === 'Accepted' ||
      match.status === 'accepted'
    );
  }


  /*
   * Generate driver initials.
   */
  getInitials(
    name: string
  ): string {

    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(
        x =>
          x.charAt(0).toUpperCase()
      )
      .join('');
  }


  /*
   * Match number.
   */
  getMatchNumber(
    match: MatchResultDto
  ): number {

    const index =
      this.matches().findIndex(
        x =>
          x.matchId ===
          match.matchId
      );

    return index >= 0
      ? index + 1
      : 1;
  }
}

