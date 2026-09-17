import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../core/services/admin.service';

type Tab = 'overview' | 'users' | 'drivers' | 'institutions' | 'rides' | 'payments' | 'ratings' | 'analytics';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <div class="rs-page">
    <header class="head">
      <div>
        <div class="chips">
          <span class="chip">Admin Panel</span>
          <span class="chip gold">Phase 14</span>
          <span class="chip green">Only Admins</span>
        </div>
        <h1>Admin Dashboard & Reporting</h1>
        <p class="sub">Monitor platform health, manage users/drivers/institutions, and view reports with pagination & filtering.</p>
      </div>
      <div class="head-actions">
        <a routerLink="/app/admin/verification" class="btn ghost">Verification queue</a>
        <a routerLink="/app/dashboard" class="btn ghost">Back</a>
      </div>
    </header>

    <nav class="tabs">
      <button type="button" *ngFor="let t of tabs" (click)="activeTab.set(t.id)" [class.active]="activeTab()===t.id">
        {{t.icon}} {{t.label}}
      </button>
    </nav>

    <!-- OVERVIEW -->
    <section *ngIf="activeTab()==='overview'" class="section">
      <div class="section-head">
        <h2>Overview</h2>
        <button type="button" class="rs-btn rs-btn-ghost" (click)="loadDashboard()" [disabled]="dashLoading()">Refresh</button>
      </div>
      <p *ngIf="dashError()" class="err">{{dashError()}}</p>
      <p *ngIf="dashLoading()" class="muted">Loading dashboard…</p>
      <div *ngIf="dashboard() as d" class="stats-grid">
        <article class="rs-card stat"><span class="label">Total Users</span><strong>{{d.totalUsers}}</strong><span class="meta">{{d.activeUsers}} active</span></article>
        <article class="rs-card stat"><span class="label">Active Users</span><strong>{{d.activeUsers}}</strong><span class="meta">{{percent(d.activeUsers,d.totalUsers)}} of total</span></article>
        <article class="rs-card stat"><span class="label">Drivers</span><strong>{{d.drivers}}</strong><span class="meta">{{d.passengers}} passengers</span></article>
        <article class="rs-card stat"><span class="label">Passengers</span><strong>{{d.passengers}}</strong><span class="meta">{{d.drivers}} drivers</span></article>
        <article class="rs-card stat accent"><span class="label">Active Rides</span><strong>{{d.activeRides}}</strong><span class="meta">of {{d.totalRides}} total</span></article>
        <article class="rs-card stat green"><span class="label">Completed Rides</span><strong>{{d.completedRides}}</strong><span class="meta">{{d.cancelledRides}} cancelled</span></article>
        <article class="rs-card stat red"><span class="label">Cancelled Rides</span><strong>{{d.cancelledRides}}</strong><span class="meta">{{d.completedRides}} completed</span></article>
        <article class="rs-card stat gold"><span class="label">Revenue</span><strong>Rs {{d.revenue | number:'1.0-0'}}</strong><span class="meta">{{d.paymentsTotal}} payments</span></article>
        <article class="rs-card stat"><span class="label">Avg Rating</span><strong>{{d.averageRating | number:'1.1-1'}} ★</strong><span class="meta">{{d.totalRatings}} ratings</span></article>
        <article class="rs-card stat"><span class="label">Verification</span><strong>{{d.verificationRequestsPending}} pending</strong><span class="meta">{{d.verificationRequestsTotal}} total</span></article>
        <article class="rs-card stat"><span class="label">Institutions</span><strong>{{d.institutionsTotal}}</strong><span class="meta">{{d.vehiclesTotal}} vehicles</span></article>
        <article class="rs-card stat"><span class="label">Routes</span><strong>{{d.routesTotal}}</strong><span class="meta">{{d.paymentsTotal}} payments</span></article>
      </div>
      <div *ngIf="dashboard() as d" class="rs-grid-2 overview-extra">
        <div class="rs-card">
          <h3>Rides by Status</h3>
          <ul class="mini-list">
            <li><span>Active</span><strong>{{d.activeRides}}</strong></li>
            <li><span>Completed</span><strong>{{d.completedRides}}</strong></li>
            <li><span>Cancelled</span><strong>{{d.cancelledRides}}</strong></li>
            <li><span>Total</span><strong>{{d.totalRides}}</strong></li>
          </ul>
        </div>
        <div class="rs-card">
          <h3>Platform totals</h3>
          <ul class="mini-list">
            <li><span>Users</span><strong>{{d.totalUsers}}</strong></li>
            <li><span>Drivers</span><strong>{{d.drivers}}</strong></li>
            <li><span>Passengers</span><strong>{{d.passengers}}</strong></li>
            <li><span>Verification pending</span><span class="rs-badge red">{{d.verificationRequestsPending}}</span></li>
          </ul>
        </div>
      </div>
    </section>

    <!-- USERS -->
    <section *ngIf="activeTab()==='users'" class="section">
      <div class="section-head"><h2>User Management</h2><span class="muted">{{usersTotal()}} users</span></div>
      <div class="filters rs-card">
        <input class="rs-input" placeholder="Search name, email, phone…" [(ngModel)]="userSearch" (keyup.enter)="loadUsers(1)" />
        <select class="rs-select" [(ngModel)]="userRole" (change)="loadUsers(1)">
          <option value="">All roles</option><option value="Passenger">Passenger</option><option value="Driver">Driver</option><option value="Admin">Admin</option>
        </select>
        <select class="rs-select" [(ngModel)]="userActive" (change)="loadUsers(1)">
          <option [ngValue]="null">Any active</option><option [ngValue]="true">Active only</option><option [ngValue]="false">Inactive only</option>
        </select>
        <select class="rs-select" [(ngModel)]="userVerified" (change)="loadUsers(1)">
          <option [ngValue]="null">Any verification</option><option [ngValue]="true">Verified</option><option [ngValue]="false">Not verified</option>
        </select>
        <button type="button" class="rs-btn rs-btn-primary" (click)="loadUsers(1)">Search</button>
        <button type="button" class="rs-btn rs-btn-ghost" (click)="resetUserFilters()">Reset</button>
      </div>
      <p *ngIf="usersError()" class="err">{{usersError()}}</p>
      <p *ngIf="usersLoading()" class="muted">Loading users…</p>
      <div class="list">
        <article *ngFor="let u of users()" class="rs-card row-card">
          <div class="row-top">
            <div class="avatar-sm">{{initials(u.fullName)}}</div>
            <div class="row-meta">
              <strong>{{u.fullName}} <span class="rs-badge green" *ngIf="u.isVerified">Verified</span><span class="rs-badge red" *ngIf="!u.isActive">Inactive</span><span class="rs-badge yellow" *ngIf="u.isFlaggedForReview">Flagged</span></strong>
              <span class="muted">{{u.email}} · {{u.phoneNumber || 'no phone'}} · {{u.gender}}</span>
              <span class="muted">Roles: {{u.roles.join(', ') || '—'}} · {{u.institutionName || 'No institution'}} · {{u.averageRating ?? '—'}} ({{u.ratingCount}})</span>
            </div>
            <div class="row-actions">
              <button type="button" class="rs-btn rs-btn-ghost sm" (click)="viewUser(u)">View</button>
              <button type="button" class="rs-btn rs-btn-ghost sm" (click)="toggleUserActive(u)">{{u.isActive ? 'Deactivate' : 'Activate'}}</button>
              <button type="button" class="rs-btn rs-btn-primary sm" (click)="viewUserRides(u)">Rides</button>
            </div>
          </div>
        </article>
        <p *ngIf="!usersLoading() && users().length===0" class="muted">No users for this filter.</p>
      </div>
      <div class="pager" *ngIf="usersTotalPages()>1">
        <button type="button" class="rs-btn rs-btn-ghost sm" (click)="loadUsers(usersPage()-1)" [disabled]="usersPage()<=1">Prev</button>
        <span class="muted">Page {{usersPage()}} / {{usersTotalPages()}} — {{usersTotal()}} total</span>
        <button type="button" class="rs-btn rs-btn-ghost sm" (click)="loadUsers(usersPage()+1)" [disabled]="usersPage()>=usersTotalPages()">Next</button>
        <select class="rs-select sm" [(ngModel)]="usersPageSize" (change)="loadUsers(1)"><option [value]="5">5</option><option [value]="10">10</option><option [value]="20">20</option><option [value]="50">50</option></select>
      </div>
      <div *ngIf="selectedUser() as s" class="modal-bg" (click)="selectedUser.set(null)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-head"><h3>{{s.fullName}} — Profile</h3><button type="button" class="rs-btn rs-btn-ghost sm" (click)="selectedUser.set(null)">✕</button></div>
          <div class="modal-body">
            <p><strong>Email:</strong> {{s.email}} · <strong>Phone:</strong> {{s.phoneNumber || '—'}} · <strong>Status:</strong> {{s.isActive ? 'Active' : 'Inactive'}} · {{s.isVerified ? 'Verified' : 'Not verified'}}</p>
            <p><strong>Gender:</strong> {{s.gender}} · <strong>DOB:</strong> {{s.dateOfBirth || '—'}} · <strong>CNIC:</strong> ****{{s.cnicLast4 || '----'}} · <strong>Student/Employee:</strong> {{s.studentOrEmployeeId || '—'}}</p>
            <p><strong>Institution:</strong> {{s.institutionName || '—'}} · <strong>Rating:</strong> {{s.averageRating ?? '—'}} ({{s.ratingCount}})</p>
            <p><strong>Counts:</strong> {{s.vehicleCount}} vehicles · {{s.routeCount}} routes · {{s.rideCount}} rides · Created {{s.createdAt | date:'short'}}</p>
            <div class="inline-actions">
              <button type="button" class="rs-btn rs-btn-ghost sm" (click)="toggleUserActive(s)">{{s.isActive ? 'Deactivate user' : 'Activate user'}}</button>
              <button type="button" class="rs-btn rs-btn-primary sm" (click)="viewUserRides(s)">View ride history</button>
            </div>
            <div *ngIf="userRides().length>0" class="sub-list">
              <h4>Ride history (page {{userRidesPage()}})</h4>
              <div *ngFor="let r of userRides()" class="sub-item">
                <strong>{{r.sourceAddress | slice:0:28}} → {{r.destinationAddress | slice:0:28}}</strong>
                <span class="muted">{{r.travelDate}} {{r.scheduledDepartureTime}} · {{r.status}} · {{r.role}} · {{r.fareAmount ? ('Rs '+(r.fareAmount)) : ''}}</span>
              </div>
              <div class="pager sm">
                <button type="button" class="rs-btn rs-btn-ghost sm" (click)="loadUserRides(s.id, userRidesPage()-1)" [disabled]="userRidesPage()<=1">Prev</button>
                <span class="muted">Page {{userRidesPage()}} / {{userRidesTotalPages()}}</span>
                <button type="button" class="rs-btn rs-btn-ghost sm" (click)="loadUserRides(s.id, userRidesPage()+1)" [disabled]="userRidesPage()>=userRidesTotalPages()">Next</button>
              </div>
            </div>
            <p *ngIf="userRidesLoading()" class="muted">Loading rides…</p>
          </div>
        </div>
      </div>
    </section>

    <!-- DRIVERS -->
    <section *ngIf="activeTab()==='drivers'" class="section">
      <div class="section-head"><h2>Driver Management</h2><span class="muted">{{driversTotal()}} drivers</span></div>
      <div class="filters rs-card">
        <input class="rs-input" placeholder="Search driver…" [(ngModel)]="driverSearch" (keyup.enter)="loadDrivers(1)" />
        <select class="rs-select" [(ngModel)]="driverStatus" (change)="loadDrivers(1)">
          <option value="">Any verification</option><option value="Pending">Pending</option><option value="Verified">Verified</option><option value="Rejected">Rejected</option>
        </select>
        <select class="rs-select" [(ngModel)]="driverActive" (change)="loadDrivers(1)">
          <option [ngValue]="null">Any active</option><option [ngValue]="true">Active</option><option [ngValue]="false">Inactive</option>
        </select>
        <button type="button" class="rs-btn rs-btn-primary" (click)="loadDrivers(1)">Search</button>
        <button type="button" class="rs-btn rs-btn-ghost" (click)="resetDriverFilters()">Reset</button>
      </div>
      <p *ngIf="driversError()" class="err">{{driversError()}}</p>
      <p *ngIf="driversLoading()" class="muted">Loading drivers…</p>
      <div class="list">
        <article *ngFor="let d of drivers()" class="rs-card row-card">
          <div class="row-top">
            <div class="avatar-sm grad">{{initials(d.fullName)}}</div>
            <div class="row-meta">
              <strong>{{d.fullName}} <span class="rs-badge" [ngClass]="badgeForVerification(d.verificationStatus)">{{d.verificationStatus}}</span><span class="rs-badge gray" *ngIf="!d.isActive">Inactive</span><span class="rs-badge green" *ngIf="d.isAvailable">Available</span></strong>
              <span class="muted">{{d.email}} · {{d.phoneNumber || 'no phone'}} · {{d.yearsOfExperience}} yrs · License: {{d.licenseNumber || '—'}}</span>
              <span class="muted">{{d.vehicleCount}} vehicles · {{d.averageRating ?? '—'}} ({{d.ratingCount}}) · Expires {{d.licenseExpiryDate || '—'}}</span>
            </div>
            <div class="row-actions">
              <button type="button" class="rs-btn rs-btn-ghost sm" (click)="viewDriverVehicles(d)">Vehicles</button>
              <button type="button" class="rs-btn sm" [ngClass]="d.isActive ? 'rs-btn-ghost' : 'rs-btn-primary'" (click)="toggleDriverActive(d)">{{d.isActive ? 'Deactivate' : 'Activate'}}</button>
            </div>
          </div>
          <div *ngIf="expandedDriverId()===d.userId" class="sub-list">
            <p *ngIf="driverVehiclesLoading()" class="muted">Loading vehicles…</p>
            <div *ngFor="let v of driverVehicles()" class="sub-item">
              <strong>{{v.make}} {{v.model}} — {{v.registrationNumber}}</strong>
              <span class="muted">{{v.vehicleTypeName}} · {{v.seatingCapacity}} seats · {{v.color || 'no color'}} · <span [class.ok]="v.isActive" [class.bad]="!v.isActive">{{v.isActive ? 'Active' : 'Inactive'}}</span></span>
            </div>
            <p *ngIf="!driverVehiclesLoading() && driverVehicles().length===0" class="muted">No vehicles.</p>
          </div>
        </article>
        <p *ngIf="!driversLoading() && drivers().length===0" class="muted">No drivers for this filter.</p>
      </div>
      <div class="pager" *ngIf="driversTotalPages()>1">
        <button type="button" class="rs-btn rs-btn-ghost sm" (click)="loadDrivers(driversPage()-1)" [disabled]="driversPage()<=1">Prev</button>
        <span class="muted">Page {{driversPage()}} / {{driversTotalPages()}} — {{driversTotal()}} total</span>
        <button type="button" class="rs-btn rs-btn-ghost sm" (click)="loadDrivers(driversPage()+1)" [disabled]="driversPage()>=driversTotalPages()">Next</button>
        <select class="rs-select sm" [(ngModel)]="driversPageSize" (change)="loadDrivers(1)"><option [value]="5">5</option><option [value]="10">10</option><option [value]="20">20</option></select>
      </div>
    </section>

    <!-- INSTITUTIONS -->
    <section *ngIf="activeTab()==='institutions'" class="section">
      <div class="section-head"><h2>Institution Management</h2><button type="button" class="rs-btn rs-btn-primary sm" (click)="openInstitutionModal()">+ Add institution</button></div>
      <div class="filters rs-card">
        <input class="rs-input" placeholder="Search institution…" [(ngModel)]="instSearch" (keyup.enter)="loadInstitutions(1)" />
        <select class="rs-select" [(ngModel)]="instStatus" (change)="loadInstitutions(1)">
          <option value="">Any status</option><option value="Pending">Pending</option><option value="Verified">Verified</option><option value="Rejected">Rejected</option>
        </select>
        <label class="check"><input type="checkbox" [(ngModel)]="instIncludeDeleted" (change)="loadInstitutions(1)" /> Include deactivated</label>
        <button type="button" class="rs-btn rs-btn-primary" (click)="loadInstitutions(1)">Search</button>
        <button type="button" class="rs-btn rs-btn-ghost" (click)="resetInstFilters()">Reset</button>
      </div>
      <p *ngIf="instError()" class="err">{{instError()}}</p>
      <p *ngIf="instLoading()" class="muted">Loading institutions…</p>
      <div class="list">
        <article *ngFor="let inst of institutions()" class="rs-card row-card">
          <div class="row-top">
            <div class="avatar-sm teal">{{initials(inst.name)}}</div>
            <div class="row-meta">
              <strong>{{inst.name}} <span class="rs-badge" [ngClass]="badgeForVerification(inst.verificationStatus)">{{inst.verificationStatus}}</span><span *ngIf="inst.isDeleted" class="rs-badge red">Deactivated</span></strong>
              <span class="muted">{{inst.type}} · {{inst.address || 'No address'}} · {{inst.userCount}} users</span>
              <span class="muted">Created {{inst.createdAt | date:'shortDate'}}</span>
            </div>
            <div class="row-actions wrap">
              <button type="button" class="rs-btn rs-btn-ghost sm" (click)="openInstitutionModal(inst)">Edit</button>
              <button type="button" *ngIf="!inst.isDeleted && inst.verificationStatus!=='Verified'" class="rs-btn rs-btn-primary sm" (click)="verifyInst(inst,'Verified')">Verify</button>
              <button type="button" *ngIf="!inst.isDeleted && inst.verificationStatus!=='Rejected'" class="rs-btn rs-btn-ghost sm" (click)="verifyInst(inst,'Rejected')">Reject</button>
              <button type="button" *ngIf="!inst.isDeleted" class="rs-btn rs-btn-danger sm" (click)="deactivateInst(inst)">Deactivate</button>
              <button type="button" *ngIf="inst.isDeleted" class="rs-btn rs-btn-primary sm" (click)="restoreInst(inst)">Restore</button>
            </div>
          </div>
        </article>
        <p *ngIf="!instLoading() && institutions().length===0" class="muted">No institutions.</p>
      </div>
      <div class="pager" *ngIf="instTotalPages()>1">
        <button type="button" class="rs-btn rs-btn-ghost sm" (click)="loadInstitutions(instPage()-1)" [disabled]="instPage()<=1">Prev</button>
        <span class="muted">Page {{instPage()}} / {{instTotalPages()}} — {{instTotal()}} total</span>
        <button type="button" class="rs-btn rs-btn-ghost sm" (click)="loadInstitutions(instPage()+1)" [disabled]="instPage()>=instTotalPages()">Next</button>
      </div>
      <div *ngIf="showInstModal()" class="modal-bg" (click)="closeInstitutionModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-head"><h3>{{editingInst() ? 'Edit institution' : 'Add institution'}}</h3><button type="button" class="rs-btn rs-btn-ghost sm" (click)="closeInstitutionModal()">✕</button></div>
          <div class="modal-body">
            <p *ngIf="instFormError()" class="err">{{instFormError()}}</p>
            <label class="field"><span>Name</span><input class="rs-input" [(ngModel)]="instForm.name" placeholder="e.g. COMSATS University" /></label>
            <label class="field"><span>Type</span>
              <select class="rs-select" [(ngModel)]="instForm.type">
                <option [value]="1">University</option><option [value]="2">College</option><option [value]="3">Company</option><option [value]="4">School</option><option [value]="5">Factory</option><option [value]="6">Other</option>
              </select>
            </label>
            <label class="field"><span>Address</span><textarea class="rs-textarea" rows="2" [(ngModel)]="instForm.address" placeholder="Full address"></textarea></label>
            <div class="inline-actions">
              <button type="button" class="rs-btn rs-btn-primary" (click)="saveInstitution()" [disabled]="instSaving()">{{instSaving() ? 'Saving…' : (editingInst() ? 'Update' : 'Create')}}</button>
              <button type="button" class="rs-btn rs-btn-ghost" (click)="closeInstitutionModal()">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- RIDE REPORTS -->
    <section *ngIf="activeTab()==='rides'" class="section">
      <div class="section-head">
        <h2>Ride Reports</h2>
        <div class="inline">
          <input type="date" class="rs-input sm" [(ngModel)]="rideFrom" />
          <input type="date" class="rs-input sm" [(ngModel)]="rideTo" />
          <button type="button" class="rs-btn rs-btn-primary sm" (click)="loadRideReports()">Apply</button>
          <button type="button" class="rs-btn rs-btn-ghost sm" (click)="rideFrom=''; rideTo=''; loadRideReports()">Clear</button>
        </div>
      </div>
      <p *ngIf="rideReportsLoading()" class="muted">Loading ride reports…</p>
      <p *ngIf="rideReportsError()" class="err">{{rideReportsError()}}</p>
      <div *ngIf="rideReports() as r" class="reports">
        <div class="rs-grid-3">
          <div class="rs-card kpi"><span>Daily (today)</span><strong>{{r.dailyRides}}</strong></div>
          <div class="rs-card kpi"><span>Weekly (7d)</span><strong>{{r.weeklyRides}}</strong></div>
          <div class="rs-card kpi"><span>Monthly (30d)</span><strong>{{r.monthlyRides}}</strong></div>
          <div class="rs-card kpi green"><span>Completed</span><strong>{{r.completedRides}}</strong></div>
          <div class="rs-card kpi red"><span>Cancelled</span><strong>{{r.cancelledRides}}</strong></div>
          <div class="rs-card kpi accent"><span>Active</span><strong>{{r.activeRides}}</strong></div>
        </div>
        <div class="rs-card">
          <h3>Popular routes (top 5)</h3>
          <table class="tbl">
            <thead><tr><th>#</th><th>Route</th><th>Rides</th><th>Revenue</th></tr></thead>
            <tbody>
              <tr *ngFor="let p of r.popularRoutes; let i=index"><td>{{i+1}}</td><td><span class="ell">{{p.sourceAddress}} → {{p.destinationAddress}}</span></td><td><span class="rs-badge green">{{p.rideCount}}</span></td><td>{{p.totalRevenue != null ? ('Rs '+(p.totalRevenue | number:'1.0-0')) : '—'}}</td></tr>
              <tr *ngIf="r.popularRoutes.length===0"><td colspan="4" class="muted">No data.</td></tr>
            </tbody>
          </table>
          <div class="bar-chart">
            <div *ngFor="let p of r.popularRoutes" class="bar-row">
              <span class="bar-label">{{p.sourceAddress | slice:0:18}}… → {{p.destinationAddress | slice:0:18}}…</span>
              <div class="bar-track"><div class="bar-fill" [style.width.%]="barPercent(p.rideCount, maxPopular(r.popularRoutes))"></div></div>
              <span class="bar-val">{{p.rideCount}}</span>
            </div>
          </div>
        </div>
        <div class="rs-card">
          <h3>Daily trend (last 7 days)</h3>
          <div class="chart">
            <div *ngFor="let d of r.dailyTrend" class="chart-col">
              <div class="col-bars">
                <div class="col-bar" [style.height.%]="colPercent(d.total, maxDaily(r.dailyTrend))" title="Total {{d.total}}"></div>
                <div class="col-bar green" [style.height.%]="colPercent(d.completed, maxDaily(r.dailyTrend))" title="Completed {{d.completed}}"></div>
                <div class="col-bar red" [style.height.%]="colPercent(d.cancelled, maxDaily(r.dailyTrend))" title="Cancelled {{d.cancelled}}"></div>
              </div>
              <span class="col-label">{{d.label}}</span><span class="col-val">{{d.total}}</span>
            </div>
          </div>
          <p class="muted">Green = completed, Red = cancelled</p>
          <table class="tbl sm"><thead><tr><th>Date</th><th>Total</th><th>Completed</th><th>Cancelled</th><th>Active</th></tr></thead><tbody><tr *ngFor="let d of r.dailyTrend"><td>{{d.label}}</td><td>{{d.total}}</td><td>{{d.completed}}</td><td>{{d.cancelled}}</td><td>{{d.active}}</td></tr></tbody></table>
        </div>
        <div class="rs-card">
          <h3>Monthly trend (last 6 months)</h3>
          <div class="chart">
            <div *ngFor="let d of r.monthlyTrend" class="chart-col">
              <div class="col-bars"><div class="col-bar accent" [style.height.%]="colPercent(d.total, maxDaily(r.monthlyTrend))"></div></div>
              <span class="col-label">{{d.label}}</span><span class="col-val">{{d.total}}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- PAYMENTS -->
    <section *ngIf="activeTab()==='payments'" class="section">
      <div class="section-head">
        <h2>Payment Reports</h2>
        <div class="inline">
          <input type="date" class="rs-input sm" [(ngModel)]="payFrom" />
          <input type="date" class="rs-input sm" [(ngModel)]="payTo" />
          <button type="button" class="rs-btn rs-btn-primary sm" (click)="loadPaymentReports()">Apply</button>
          <button type="button" class="rs-btn rs-btn-ghost sm" (click)="payFrom=''; payTo=''; loadPaymentReports()">Clear</button>
        </div>
      </div>
      <p *ngIf="payLoading()" class="muted">Loading payment reports…</p>
      <p *ngIf="payError()" class="err">{{payError()}}</p>
      <div *ngIf="paymentReports() as p" class="reports">
        <div class="rs-grid-4">
          <div class="rs-card kpi"><span>Total payments</span><strong>{{p.totalPayments}}</strong><span class="muted">Rs {{p.totalAmount | number:'1.0-0'}}</span></div>
          <div class="rs-card kpi"><span>Cash</span><strong>{{p.cashCount}}</strong><span class="muted">Rs {{p.cashAmount | number:'1.0-0'}}</span></div>
          <div class="rs-card kpi"><span>Wallet</span><strong>{{p.walletCount}}</strong><span class="muted">Rs {{p.walletAmount | number:'1.0-0'}}</span></div>
          <div class="rs-card kpi green"><span>Completed</span><strong>{{p.completedCount}}</strong><span class="muted">Rs {{p.completedAmount | number:'1.0-0'}}</span></div>
          <div class="rs-card kpi red"><span>Failed</span><strong>{{p.failedCount}}</strong><span class="muted">Rs {{p.failedAmount | number:'1.0-0'}}</span></div>
          <div class="rs-card kpi yellow"><span>Refunded</span><strong>{{p.refundedCount}}</strong><span class="muted">Rs {{p.refundedAmount | number:'1.0-0'}}</span></div>
          <div class="rs-card kpi"><span>Pending</span><strong>{{p.pendingCount}}</strong><span class="muted">Rs {{p.pendingAmount | number:'1.0-0'}}</span></div>
          <div class="rs-card kpi"><span>Currency</span><strong>{{p.currency}}</strong><span class="muted">PKR</span></div>
        </div>
        <div class="rs-card">
          <h3>Payments by method & status</h3>
          <div class="bar-chart">
            <div class="bar-row"><span class="bar-label">Cash</span><div class="bar-track"><div class="bar-fill" [style.width.%]="barPercent(p.cashCount, p.totalPayments)"></div></div><span class="bar-val">{{p.cashCount}}</span></div>
            <div class="bar-row"><span class="bar-label">Wallet</span><div class="bar-track"><div class="bar-fill teal" [style.width.%]="barPercent(p.walletCount, p.totalPayments)"></div></div><span class="bar-val">{{p.walletCount}}</span></div>
            <div class="bar-row"><span class="bar-label">Completed</span><div class="bar-track"><div class="bar-fill green" [style.width.%]="barPercent(p.completedCount, p.totalPayments)"></div></div><span class="bar-val">{{p.completedCount}}</span></div>
            <div class="bar-row"><span class="bar-label">Failed</span><div class="bar-track"><div class="bar-fill red" [style.width.%]="barPercent(p.failedCount, p.totalPayments)"></div></div><span class="bar-val">{{p.failedCount}}</span></div>
            <div class="bar-row"><span class="bar-label">Refunded</span><div class="bar-track"><div class="bar-fill yellow" [style.width.%]="barPercent(p.refundedCount, p.totalPayments)"></div></div><span class="bar-val">{{p.refundedCount}}</span></div>
          </div>
        </div>
        <div class="rs-card">
          <h3>Daily payments (last 7 days)</h3>
          <div class="chart">
            <div *ngFor="let d of p.dailyTrend" class="chart-col">
              <div class="col-bars"><div class="col-bar" [style.height.%]="colPercent(d.count, maxPayCount(p.dailyTrend))"></div></div>
              <span class="col-label">{{d.label}}</span><span class="col-val">{{d.count}}</span><span class="col-sub">Rs{{d.amount | number:'1.0-0'}}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- RATINGS -->
    <section *ngIf="activeTab()==='ratings'" class="section">
      <div class="section-head"><h2>Rating Reports</h2><button type="button" class="rs-btn rs-btn-ghost sm" (click)="loadRatingReports()">Refresh</button></div>
      <p *ngIf="ratingLoading()" class="muted">Loading ratings…</p>
      <p *ngIf="ratingError()" class="err">{{ratingError()}}</p>
      <div *ngIf="ratingReports() as r" class="reports">
        <div class="rs-grid-3">
          <div class="rs-card kpi"><span>Average rating</span><strong>{{r.averageRating | number:'1.1-1'}} ★</strong><span class="muted">{{r.totalRatings}} total</span></div>
          <div class="rs-card kpi"><span>Total ratings</span><strong>{{r.totalRatings}}</strong><span class="muted">{{r.averageRating | number:'1.1-1'}} avg</span></div>
          <div class="rs-card kpi red"><span>Low-rated users</span><strong>{{r.lowRatedUsers.length}}</strong><span class="muted"> &lt; 2.5 or flagged</span></div>
        </div>
        <div class="rs-card">
          <h3>Rating distribution (1–5 ★)</h3>
          <div class="bar-chart">
            <div *ngFor="let star of [5,4,3,2,1]" class="bar-row">
              <span class="bar-label">{{star}} ★</span>
              <div class="bar-track"><div class="bar-fill" [style.width.%]="barPercent(r.ratingDistribution[star+'' ]||0, r.totalRatings)"></div></div>
              <span class="bar-val">{{r.ratingDistribution[star+'']||0}}</span>
            </div>
          </div>
        </div>
        <div class="rs-card">
          <h3>Low-rated users</h3>
          <table class="tbl"><thead><tr><th>User</th><th>Email</th><th>Rating</th><th>Count</th><th>Flag</th><th>Roles</th></tr></thead><tbody>
            <tr *ngFor="let u of r.lowRatedUsers"><td>{{u.fullName}}</td><td class="muted">{{u.email}}</td><td><span class="rs-badge" [ngClass]="u.averageRating && u.averageRating<2 ? 'red' : 'yellow'">{{u.averageRating ?? '—'}}</span></td><td>{{u.ratingCount}}</td><td>{{u.isFlaggedForReview ? ('Yes — '+(u.flagReason||'')) : 'No'}}</td><td class="muted">{{u.roles.join(', ')}}</td></tr>
            <tr *ngIf="r.lowRatedUsers.length===0"><td colspan="6" class="muted">No low-rated users.</td></tr>
          </tbody></table>
        </div>
        <div class="rs-card">
          <h3>Daily rating trend (last 7 days)</h3>
          <div class="chart">
            <div *ngFor="let d of r.trend" class="chart-col">
              <div class="col-bars"><div class="col-bar yellow" [style.height.%]="colPercent(d.average, 5)"></div></div>
              <span class="col-label">{{d.label}}</span><span class="col-val">{{d.average | number:'1.1-1'}} ★</span><span class="col-sub">{{d.count}} ratings</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ANALYTICS -->
    <section *ngIf="activeTab()==='analytics'" class="section">
      <div class="section-head"><h2>Analytics</h2><button type="button" class="rs-btn rs-btn-ghost sm" (click)="loadAnalytics()">Refresh</button></div>
      <p *ngIf="analyticsLoading()" class="muted">Loading analytics…</p>
      <p *ngIf="analyticsError()" class="err">{{analyticsError()}}</p>
      <div *ngIf="analytics() as a" class="reports">
        <div class="rs-card">
          <h3>Users — last 7 days</h3>
          <div class="chart">
            <div *ngFor="let p of a.usersByDay" class="chart-col">
              <div class="col-bars"><div class="col-bar" [style.height.%]="colPercent(p.value, maxChart(a.usersByDay))"></div></div>
              <span class="col-label">{{p.label}}</span><span class="col-val">{{p.value}}</span>
            </div>
          </div>
          <h4>Users — last 6 months</h4>
          <div class="chart">
            <div *ngFor="let p of a.usersByMonth" class="chart-col">
              <div class="col-bars"><div class="col-bar teal" [style.height.%]="colPercent(p.value, maxChart(a.usersByMonth))"></div></div>
              <span class="col-label">{{p.label}}</span><span class="col-val">{{p.value}}</span>
            </div>
          </div>
        </div>
        <div class="rs-card">
          <h3>Rides — last 7 days & 6 months</h3>
          <div class="chart">
            <div *ngFor="let p of a.ridesByDay" class="chart-col">
              <div class="col-bars"><div class="col-bar accent" [style.height.%]="colPercent(p.value, maxChart(a.ridesByDay))"></div></div>
              <span class="col-label">{{p.label}}</span><span class="col-val">{{p.value}}</span>
            </div>
          </div>
          <div class="chart">
            <div *ngFor="let p of a.ridesByMonth" class="chart-col">
              <div class="col-bars"><div class="col-bar" [style.height.%]="colPercent(p.value, maxChart(a.ridesByMonth))"></div></div>
              <span class="col-label">{{p.label}}</span><span class="col-val">{{p.value}}</span>
            </div>
          </div>
        </div>
        <div class="rs-card">
          <h3>Revenue — PKR (completed payments)</h3>
          <div class="chart">
            <div *ngFor="let p of a.revenueByDay" class="chart-col">
              <div class="col-bars"><div class="col-bar gold" [style.height.%]="colPercent(p.value, maxChart(a.revenueByDay))"></div></div>
              <span class="col-label">{{p.label}}</span><span class="col-val">Rs{{p.value | number:'1.0-0'}}</span>
            </div>
          </div>
          <div class="chart">
            <div *ngFor="let p of a.revenueByMonth" class="chart-col">
              <div class="col-bars"><div class="col-bar yellow" [style.height.%]="colPercent(p.value, maxChart(a.revenueByMonth))"></div></div>
              <span class="col-label">{{p.label}}</span><span class="col-val">Rs{{p.value | number:'1.0-0'}}</span>
            </div>
          </div>
        </div>
        <div class="rs-card">
          <h3>Popular routes</h3>
          <table class="tbl"><thead><tr><th>#</th><th>Route</th><th>Rides</th><th>Revenue</th></tr></thead><tbody>
            <tr *ngFor="let p of a.popularRoutes; let i=index"><td>{{i+1}}</td><td><span class="ell">{{p.sourceAddress}} → {{p.destinationAddress}}</span></td><td><span class="rs-badge green">{{p.rideCount}}</span></td><td>{{p.totalRevenue != null ? ('Rs '+(p.totalRevenue | number:'1.0-0')) : '—'}}</td></tr>
            <tr *ngIf="a.popularRoutes.length===0"><td colspan="4" class="muted">No data.</td></tr>
          </tbody></table>
        </div>
        <div class="rs-grid-2">
          <div class="rs-card">
            <h3>Rides by status</h3>
            <div class="bar-chart">
              <div *ngFor="let kv of mapEntries(a.ridesByStatus)" class="bar-row"><span class="bar-label">{{kv.key}}</span><div class="bar-track"><div class="bar-fill" [style.width.%]="barPercent(kv.value, maxMap(a.ridesByStatus))"></div></div><span class="bar-val">{{kv.value}}</span></div>
              <p *ngIf="mapEntries(a.ridesByStatus).length===0" class="muted">No rides.</p>
            </div>
          </div>
          <div class="rs-card">
            <h3>Payments by method & status</h3>
            <div class="bar-chart">
              <div *ngFor="let kv of mapEntries(a.paymentsByMethod)" class="bar-row"><span class="bar-label">{{kv.key}}</span><div class="bar-track"><div class="bar-fill teal" [style.width.%]="barPercent(kv.value, maxMap(a.paymentsByMethod))"></div></div><span class="bar-val">{{kv.value}}</span></div>
            </div>
            <div class="bar-chart">
              <div *ngFor="let kv of mapEntries(a.paymentsByStatus)" class="bar-row"><span class="bar-label">{{kv.key}}</span><div class="bar-track"><div class="bar-fill" [style.width.%]="barPercent(kv.value, maxMap(a.paymentsByStatus))"></div></div><span class="bar-val">{{kv.value}}</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <p class="foot muted">Phase 14 — Admin dashboard with pagination & filtering. Live API data.</p>
  </div>
  `,
  styles: [`
    .head { display:flex; flex-wrap:wrap; justify-content:space-between; gap:1rem; margin-bottom:1rem; }
    .head-actions { display:flex; gap:0.5rem; flex-wrap:wrap; }
    .chips { display:flex; gap:0.35rem; flex-wrap:wrap; margin-bottom:0.35rem; }
    .chip { font-size:0.72rem; font-weight:800; padding:0.25rem 0.65rem; border-radius:999px; background:#e8f8f1; color:#0b7f58; border:1px solid #b7ebc9; }
    .chip.gold { background:#fff7cc; color:#a16207; border-color:#f5d76e; }
    .chip.green { background:#e8f8f1; color:#0b7f58; }
    h1 { margin:0; font-size:1.45rem; font-weight:800; }
    .sub { margin:0.3rem 0 0; color:#64748b; font-size:0.9rem; max-width:48rem; }
    h2 { margin:0; font-size:1.15rem; font-weight:800; }
    h3 { margin:0 0 0.35rem; font-size:1rem; font-weight:800; }
    h4 { margin:0.9rem 0 0.4rem; font-size:0.9rem; font-weight:800; }
    .tabs { display:flex; gap:0.35rem; overflow-x:auto; padding:0.45rem 0; margin-bottom:0.9rem; border-bottom:1px solid #e2e8f0; scrollbar-width:none; }
    .tabs::-webkit-scrollbar{ display:none; }
    .tabs button { flex:0 0 auto; white-space:nowrap; min-height:40px; padding:0.45rem 0.85rem; border-radius:999px; border:1px solid #e2e8f0; background:#fff; color:#475569; font-weight:700; font-size:0.82rem; cursor:pointer; }
    .tabs button.active { background:#0d9f6e; color:#fff; border-color:#0d9f6e; }
    .section { display:flex; flex-direction:column; gap:0.9rem; }
    .section-head { display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:0.6rem; }
    .inline { display:flex; gap:0.45rem; align-items:center; flex-wrap:wrap; }
    .filters { display:flex; flex-wrap:wrap; gap:0.5rem; align-items:center; }
    .filters .rs-input { flex:1 1 220px; min-width:180px; }
    .filters .rs-select { min-width:140px; flex:0 0 auto; }
    .check { display:inline-flex; align-items:center; gap:0.35rem; font-size:0.85rem; cursor:pointer; }
    .stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:0.7rem; }
    @media (max-width:1000px){ .stats-grid{ grid-template-columns:1fr 1fr; } }
    @media (max-width:560px){ .stats-grid{ grid-template-columns:1fr; } }
    .stat { display:flex; flex-direction:column; gap:0.25rem; }
    .stat .label { font-size:0.72rem; font-weight:800; color:#64748b; text-transform:uppercase; }
    .stat strong { font-size:1.35rem; font-weight:800; }
    .stat .meta { font-size:0.82rem; color:#64748b; }
    .stat.accent { background:linear-gradient(180deg,#fff,#fff8db); border-color:#f5d76e; }
    .stat.green { border-color:#86efac; } .stat.red { border-color:#fecdd3; } .stat.gold { background:linear-gradient(180deg,#fff,#fefce8); border-color:#fde68a; }
    .overview-extra { margin-top:0.7rem; }
    .mini-list { list-style:none; padding:0; margin:0.4rem 0 0; display:flex; flex-direction:column; gap:0.4rem; }
    .mini-list li { display:flex; justify-content:space-between; font-size:0.9rem; }
    .mini-list span { color:#64748b; } .mini-list strong { color:#0f172a; }
    .list { display:flex; flex-direction:column; gap:0.6rem; }
    .row-card { padding:0.85rem 1rem; }
    .row-top { display:flex; gap:0.75rem; align-items:flex-start; flex-wrap:wrap; }
    .row-meta { flex:1 1 260px; min-width:200px; display:flex; flex-direction:column; gap:0.2rem; }
    .row-meta strong { font-size:0.95rem; display:flex; gap:0.35rem; align-items:center; flex-wrap:wrap; }
    .row-actions { display:flex; gap:0.35rem; flex-wrap:wrap; }
    .avatar-sm { width:36px; height:36px; border-radius:999px; display:grid; place-items:center; font-weight:800; font-size:0.72rem; color:#0b7f58; background:#e8f8f1; border:1px solid #b7ebc9; flex-shrink:0; }
    .avatar-sm.grad { background:linear-gradient(135deg,#0d9f6e,#14b8a6); color:#fff; border:none; }
    .avatar-sm.teal { background:#ccfbf1; color:#0f766e; border-color:#99f6e4; }
    .pager { display:flex; gap:0.5rem; align-items:center; justify-content:center; flex-wrap:wrap; margin-top:0.7rem; }
    .pager.sm { justify-content:flex-start; }
    .rs-select.sm { min-height:34px; padding:0.3rem 0.6rem; font-size:0.8rem; }
    .rs-input.sm { min-height:36px; padding:0.4rem 0.6rem; font-size:0.85rem; width:auto; }
    .modal-bg { position:fixed; inset:0; background:rgba(15,23,42,0.45); display:grid; place-items:center; z-index:100; padding:1rem; }
    .modal { background:#fff; border-radius:18px; max-width:720px; width:100%; max-height:85vh; overflow:auto; box-shadow:0 20px 40px rgba(15,23,42,0.2); border:1px solid #e2e8f0; }
    .modal-head { display:flex; justify-content:space-between; align-items:center; padding:1rem 1.1rem 0.7rem; border-bottom:1px solid #f1f5f9; position:sticky; top:0; background:#fff; }
    .modal-body { padding:1rem 1.1rem 1.2rem; display:flex; flex-direction:column; gap:0.6rem; }
    .field { display:flex; flex-direction:column; gap:0.3rem; }
    .field span { font-size:0.85rem; font-weight:700; color:#334155; }
    .inline-actions { display:flex; gap:0.4rem; flex-wrap:wrap; }
    .sub-list { margin-top:0.5rem; display:flex; flex-direction:column; gap:0.4rem; }
    .sub-item { background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:0.6rem 0.75rem; display:flex; flex-direction:column; gap:0.2rem; }
    .reports { display:flex; flex-direction:column; gap:0.9rem; }
    .kpi { display:flex; flex-direction:column; gap:0.2rem; }
    .kpi span { font-size:0.72rem; font-weight:800; color:#64748b; text-transform:uppercase; }
    .kpi strong { font-size:1.25rem; font-weight:800; }
    .kpi.green { border-color:#86efac; } .kpi.red { border-color:#fecdd3; } .kpi.yellow { border-color:#fde68a; } .kpi.accent { border-color:#f5d76e; background:linear-gradient(180deg,#fff,#fff8db); }
    .tbl { width:100%; border-collapse:collapse; font-size:0.88rem; margin-top:0.4rem; }
    .tbl th { text-align:left; font-size:0.72rem; font-weight:800; color:#64748b; text-transform:uppercase; padding:0.45rem 0.5rem; border-bottom:1px solid #e2e8f0; }
    .tbl td { padding:0.55rem 0.5rem; border-bottom:1px solid #f1f5f9; }
    .tbl.sm th, .tbl.sm td { padding:0.35rem 0.4rem; font-size:0.82rem; }
    .ell { display:inline-block; max-width:28ch; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; vertical-align:bottom; }
    .bar-chart { display:flex; flex-direction:column; gap:0.5rem; margin-top:0.6rem; }
    .bar-row { display:flex; align-items:center; gap:0.5rem; }
    .bar-label { width:120px; flex-shrink:0; font-size:0.82rem; font-weight:700; color:#334155; text-align:right; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .bar-track { flex:1; height:14px; background:#f1f5f9; border-radius:999px; overflow:hidden; }
    .bar-fill { height:100%; background:linear-gradient(90deg,#0d9f6e,#14b8a6); border-radius:999px; transition:width 0.4s; }
    .bar-fill.teal { background:linear-gradient(90deg,#0d9f6e,#06b6d4); } .bar-fill.green { background:linear-gradient(90deg,#16a34a,#86efac); } .bar-fill.red { background:linear-gradient(90deg,#e11d48,#fb7185); } .bar-fill.yellow { background:linear-gradient(90deg,#f5c518,#fde68a); } .bar-fill.gold { background:linear-gradient(90deg,#d97706,#fbbf24); }
    .bar-val { width:36px; font-weight:800; font-size:0.82rem; }
    .chart { display:flex; gap:0.4rem; align-items:flex-end; overflow-x:auto; padding:0.5rem 0 0.3rem; min-height:120px; }
    .chart-col { flex:1; min-width:56px; display:flex; flex-direction:column; align-items:center; gap:0.25rem; }
    .col-bars { display:flex; gap:2px; align-items:flex-end; height:80px; }
    .col-bar { width:12px; border-radius:6px 6px 0 0; background:linear-gradient(180deg,#0d9f6e,#14b8a6); min-height:4px; }
    .col-bar.green { background:linear-gradient(180deg,#16a34a,#86efac); } .col-bar.red { background:linear-gradient(180deg,#e11d48,#fb7185); } .col-bar.accent { background:linear-gradient(180deg,#f5c518,#fde68a); } .col-bar.teal { background:linear-gradient(180deg,#0d9488,#5eead4); } .col-bar.yellow { background:linear-gradient(180deg,#f59e0b,#fde68a); } .col-bar.gold { background:linear-gradient(180deg,#d97706,#fbbf24); }
    .col-label { font-size:0.7rem; font-weight:700; color:#64748b; } .col-val { font-size:0.75rem; font-weight:800; } .col-sub { font-size:0.68rem; color:#64748b; }
    .muted { color:#64748b; font-size:0.85rem; } .err { color:#e11d48; background:#fff1f2; border:1px solid #fecdd3; padding:0.6rem 0.8rem; border-radius:12px; font-size:0.88rem; }
    .ok { color:#0b7f58; font-weight:700; } .bad { color:#e11d48; font-weight:700; } .foot { margin-top:1rem; text-align:center; }
    .rs-badge.red { background:#fff1f2; color:#e11d48; } .rs-badge.green { background:#e8f8f1; color:#0b7f58; } .rs-badge.yellow { background:#fff7cc; color:#a16207; } .rs-badge.gray { background:#f1f5f9; color:#475569; }
  `]
})
export class AdminDashboardComponent implements OnInit {
  private admin = inject(AdminService);
  tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'drivers', label: 'Drivers', icon: '🚗' },
    { id: 'institutions', label: 'Institutions', icon: '🏫' },
    { id: 'rides', label: 'Ride Reports', icon: '🛣️' },
    { id: 'payments', label: 'Payment Reports', icon: '💳' },
    { id: 'ratings', label: 'Rating Reports', icon: '⭐' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
  ];
  activeTab = signal<Tab>('overview');
  dashboard = signal<any | null>(null);
  dashLoading = signal(false);
  dashError = signal('');
  users = signal<any[]>([]);
  usersLoading = signal(false);
  usersError = signal('');
  usersPage = signal(1);
  usersPageSize = 10;
  usersTotal = signal(0);
  usersTotalPages = computed(() => Math.max(1, Math.ceil(this.usersTotal() / this.usersPageSize)));
  userSearch = '';
  userRole = '';
  userActive: boolean | null = null;
  userVerified: boolean | null = null;
  selectedUser = signal<any | null>(null);
  userRides = signal<any[]>([]);
  userRidesLoading = signal(false);
  userRidesPage = signal(1);
  userRidesTotal = signal(0);
  userRidesTotalPages = computed(() => Math.max(1, Math.ceil(this.userRidesTotal() / 10)));
  drivers = signal<any[]>([]);
  driversLoading = signal(false);
  driversError = signal('');
  driversPage = signal(1);
  driversPageSize = 10;
  driversTotal = signal(0);
  driversTotalPages = computed(() => Math.max(1, Math.ceil(this.driversTotal() / this.driversPageSize)));
  driverSearch = '';
  driverStatus = '';
  driverActive: boolean | null = null;
  expandedDriverId = signal<string | null>(null);
  driverVehicles = signal<any[]>([]);
  driverVehiclesLoading = signal(false);
  institutions = signal<any[]>([]);
  instLoading = signal(false);
  instError = signal('');
  instPage = signal(1);
  instPageSize = 10;
  instTotal = signal(0);
  instTotalPages = computed(() => Math.max(1, Math.ceil(this.instTotal() / this.instPageSize)));
  instSearch = '';
  instStatus = '';
  instIncludeDeleted = false;
  showInstModal = signal(false);
  editingInst = signal<any | null>(null);
  instForm = { name: '', type: 1, address: '' };
  instSaving = signal(false);
  instFormError = signal('');
  rideReports = signal<any | null>(null);
  rideReportsLoading = signal(false);
  rideReportsError = signal('');
  rideFrom = '';
  rideTo = '';
  paymentReports = signal<any | null>(null);
  payLoading = signal(false);
  payError = signal('');
  payFrom = '';
  payTo = '';
  ratingReports = signal<any | null>(null);
  ratingLoading = signal(false);
  ratingError = signal('');
  analytics = signal<any | null>(null);
  analyticsLoading = signal(false);
  analyticsError = signal('');
  ngOnInit(): void {
    this.loadDashboard();
    this.loadUsers(1);
    this.loadDrivers(1);
    this.loadInstitutions(1);
    this.loadRideReports();
    this.loadPaymentReports();
    this.loadRatingReports();
    this.loadAnalytics();
  }
  percent(a: number, b: number): string { if (!b) return '0%'; return Math.round((a / b) * 100) + '%'; }
  initials(s: string): string { if (!s) return '?'; const p = s.trim().split(/\s+/); return (p[0][0] || '').toUpperCase() + (p[1]?.[0] || '').toUpperCase(); }
  badgeForVerification(s: string): string { const v = (s || '').toLowerCase(); if (v === 'verified') return 'green'; if (v === 'rejected') return 'red'; if (v === 'pending') return 'yellow'; return 'gray'; }
  barPercent(v: number, m: number): number { if (!m) return 0; return Math.min(100, Math.round((v / m) * 100)); }
  colPercent(v: number, m: number): number { if (!m) return 4; return Math.max(4, Math.round((v / m) * 100)); }
  maxPopular(l: any[]): number { if (!l || !l.length) return 1; return Math.max(...l.map((x: any) => x.rideCount || 0), 1); }
  maxDaily(l: any[]): number { if (!l || !l.length) return 1; return Math.max(...l.map((x: any) => x.total ?? x.value ?? 0), 1); }
  maxPayCount(l: any[]): number { if (!l || !l.length) return 1; return Math.max(...l.map((x: any) => x.count), 1); }
  maxChart(l: any[]): number { if (!l || !l.length) return 1; return Math.max(...l.map((x: any) => x.value), 1); }
  maxMap(m: Record<string, number>): number { const vals = Object.values(m || {}); if (!vals.length) return 1; return Math.max(...vals, 1); }
  mapEntries(m: Record<string, number>): { key: string; value: number }[] { if (!m) return []; return Object.entries(m).map(([k, v]) => ({ key: k, value: v })); }
  loadDashboard(): void {
    this.dashLoading.set(true); this.dashError.set('');
    this.admin.getDashboard().subscribe({
      next: (res: any) => { const d = res.data ?? res; if (res.success === false) this.dashError.set(res.message || 'Failed'); else this.dashboard.set(d); this.dashLoading.set(false); },
      error: (e) => { this.dashError.set(e.error?.message || 'Failed'); this.dashLoading.set(false); }
    });
  }
  loadUsers(page = 1): void {
    this.usersLoading.set(true); this.usersError.set(''); this.usersPage.set(page);
    this.admin.getUsers({ search: this.userSearch || undefined, role: this.userRole || undefined, isActive: (this.userActive ?? undefined), isVerified: (this.userVerified ?? undefined), page, pageSize: this.usersPageSize }).subscribe({
      next: (res: any) => { const d = res.data ?? res; if (res.success === false) this.usersError.set(res.message); else { this.users.set(d.items || []); this.usersTotal.set(d.totalCount ?? 0); } this.usersLoading.set(false); },
      error: (e) => { this.usersError.set(e.error?.message || 'Failed'); this.usersLoading.set(false); }
    });
  }
  resetUserFilters(): void { this.userSearch=''; this.userRole=''; this.userActive=null; this.userVerified=null; this.loadUsers(1); }
  viewUser(u: any): void { this.admin.getUser(u.id).subscribe({ next: (res: any) => { const d = res.data ?? res; this.selectedUser.set(d); this.userRides.set([]); this.userRidesTotal.set(0); this.userRidesPage.set(1); }, error: (e) => alert(e.error?.message || 'Failed') }); }
  toggleUserActive(u: any): void { const isActive = !u.isActive; if (!confirm((isActive ? 'Activate' : 'Deactivate') + ' user ' + (u.fullName || u.email) + '?')) return; this.admin.toggleUserActive(u.id || u.userId, isActive).subscribe({ next: () => { this.loadUsers(this.usersPage()); if (this.selectedUser()?.id === u.id) this.viewUser(u); }, error: (e) => alert(e.error?.message || 'Failed') }); }
  viewUserRides(u: any): void { if (!this.selectedUser() || this.selectedUser().id !== u.id) { this.viewUser(u); setTimeout(() => this.loadUserRides(u.id, 1), 200); } else this.loadUserRides(u.id, 1); }
  loadUserRides(userId: string, page: number): void { if (page < 1) return; this.userRidesLoading.set(true); this.userRidesPage.set(page); this.admin.getUserRides(userId, page, 10).subscribe({ next: (res: any) => { const d = res.data ?? res; this.userRides.set(d.items || []); this.userRidesTotal.set(d.totalCount ?? 0); this.userRidesLoading.set(false); }, error: () => this.userRidesLoading.set(false) }); }
  loadDrivers(page = 1): void { this.driversLoading.set(true); this.driversError.set(''); this.driversPage.set(page); this.admin.getDrivers({ search: this.driverSearch || undefined, verificationStatus: this.driverStatus || undefined, isActive: (this.driverActive ?? undefined), page, pageSize: this.driversPageSize }).subscribe({ next: (res: any) => { const d = res.data ?? res; if (res.success === false) this.driversError.set(res.message); else { this.drivers.set(d.items || []); this.driversTotal.set(d.totalCount ?? 0); } this.driversLoading.set(false); }, error: (e) => { this.driversError.set(e.error?.message || 'Failed'); this.driversLoading.set(false); } }); }
  resetDriverFilters(): void { this.driverSearch=''; this.driverStatus=''; this.driverActive=null; this.loadDrivers(1); }
  toggleDriverActive(d: any): void { const isActive = !d.isActive; if (!confirm((isActive ? 'Activate' : 'Deactivate') + ' driver ' + d.fullName + '?')) return; this.admin.toggleDriverActive(d.userId, isActive).subscribe({ next: () => this.loadDrivers(this.driversPage()), error: (e) => alert(e.error?.message || 'Failed') }); }
  viewDriverVehicles(d: any): void { if (this.expandedDriverId() === d.userId) { this.expandedDriverId.set(null); return; } this.expandedDriverId.set(d.userId); this.driverVehicles.set([]); this.driverVehiclesLoading.set(true); this.admin.getDriverVehicles(d.userId).subscribe({ next: (res: any) => { const data = res.data ?? res; this.driverVehicles.set(Array.isArray(data) ? data : data.items || []); this.driverVehiclesLoading.set(false); }, error: (e) => { this.driverVehiclesLoading.set(false); alert(e.error?.message || 'Failed'); } }); }
  loadInstitutions(page = 1): void { this.instLoading.set(true); this.instError.set(''); this.instPage.set(page); this.admin.getInstitutions({ search: this.instSearch || undefined, verificationStatus: this.instStatus || undefined, includeDeleted: this.instIncludeDeleted, page, pageSize: this.instPageSize }).subscribe({ next: (res: any) => { const d = res.data ?? res; if (res.success === false) this.instError.set(res.message); else { this.institutions.set(d.items || []); this.instTotal.set(d.totalCount ?? 0); } this.instLoading.set(false); }, error: (e) => { this.instError.set(e.error?.message || 'Failed'); this.instLoading.set(false); } }); }
  resetInstFilters(): void { this.instSearch=''; this.instStatus=''; this.instIncludeDeleted=false; this.loadInstitutions(1); }
  openInstitutionModal(inst?: any): void { if (inst) { this.editingInst.set(inst); this.instForm = { name: inst.name, type: inst.typeId, address: inst.address || '' }; } else { this.editingInst.set(null); this.instForm = { name: '', type: 1, address: '' }; } this.instFormError.set(''); this.showInstModal.set(true); }
  closeInstitutionModal(): void { this.showInstModal.set(false); this.editingInst.set(null); this.instFormError.set(''); }
  saveInstitution(): void { if (!this.instForm.name.trim()) { this.instFormError.set('Name required'); return; } this.instSaving.set(true); this.instFormError.set(''); const body = { name: this.instForm.name.trim(), type: Number(this.instForm.type), address: this.instForm.address?.trim() || undefined }; const obs = this.editingInst() ? this.admin.updateInstitution(this.editingInst()!.id, body) : this.admin.createInstitution(body); obs.subscribe({ next: (res: any) => { if (res.success === false) { this.instFormError.set(res.message || 'Failed'); this.instSaving.set(false); return; } this.instSaving.set(false); this.closeInstitutionModal(); this.loadInstitutions(this.editingInst() ? this.instPage() : 1); }, error: (e) => { this.instFormError.set(e.error?.message || 'Failed'); this.instSaving.set(false); } }); }
  verifyInst(inst: any, status: string): void { if (!confirm(status + ' institution "' + inst.name + '"?')) return; this.admin.verifyInstitution(inst.id, status).subscribe({ next: (res: any) => { if (res.success === false) alert(res.message); else this.loadInstitutions(this.instPage()); }, error: (e) => alert(e.error?.message || 'Failed') }); }
  deactivateInst(inst: any): void { if (!confirm('Deactivate institution "' + inst.name + '"?')) return; this.admin.deactivateInstitution(inst.id).subscribe({ next: () => this.loadInstitutions(this.instPage()), error: (e) => alert(e.error?.message || 'Failed') }); }
  restoreInst(inst: any): void { this.admin.restoreInstitution(inst.id).subscribe({ next: () => this.loadInstitutions(this.instPage()), error: (e) => alert(e.error?.message || 'Failed') }); }
  loadRideReports(): void { this.rideReportsLoading.set(true); this.rideReportsError.set(''); this.admin.getRideReports(this.rideFrom || undefined, this.rideTo || undefined).subscribe({ next: (res: any) => { const d = res.data ?? res; if (res.success === false) this.rideReportsError.set(res.message); else this.rideReports.set(d); this.rideReportsLoading.set(false); }, error: (e) => { this.rideReportsError.set(e.error?.message || 'Failed'); this.rideReportsLoading.set(false); } }); }
  loadPaymentReports(): void { this.payLoading.set(true); this.payError.set(''); this.admin.getPaymentReports(this.payFrom || undefined, this.payTo || undefined).subscribe({ next: (res: any) => { const d = res.data ?? res; if (res.success === false) this.payError.set(res.message); else this.paymentReports.set(d); this.payLoading.set(false); }, error: (e) => { this.payError.set(e.error?.message || 'Failed'); this.payLoading.set(false); } }); }
  loadRatingReports(): void { this.ratingLoading.set(true); this.ratingError.set(''); this.admin.getRatingReports().subscribe({ next: (res: any) => { const d = res.data ?? res; if (res.success === false) this.ratingError.set(res.message); else this.ratingReports.set(d); this.ratingLoading.set(false); }, error: (e) => { this.ratingError.set(e.error?.message || 'Failed'); this.ratingLoading.set(false); } }); }
  loadAnalytics(): void { this.analyticsLoading.set(true); this.analyticsError.set(''); this.admin.getAnalytics().subscribe({ next: (res: any) => { const d = res.data ?? res; if (res.success === false) this.analyticsError.set(res.message); else this.analytics.set(d); this.analyticsLoading.set(false); }, error: (e) => { this.analyticsError.set(e.error?.message || 'Failed'); this.analyticsLoading.set(false); } }); }
}
