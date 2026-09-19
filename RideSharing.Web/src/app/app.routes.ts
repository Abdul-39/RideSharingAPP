import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/dashboard/landing.component').then(m => m.LandingComponent),
    title: 'RideSharing – Home'
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/app-shell.component').then(m => m.AppShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard-home.component').then(m => m.DashboardHomeComponent),
        title: 'Dashboard'
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then(m => m.ProfileComponent),
        title: 'My Profile'
      },
      {
        path: 'driver-profile',
        canActivate: [roleGuard],
        data: { roles: ['Driver', 'Admin'] },
        loadComponent: () =>
          import('./features/profile/driver-profile.component').then(m => m.DriverProfileComponent),
        title: 'Driver Profile'
      },
      {
        path: 'vehicles',
        loadComponent: () =>
          import('./features/vehicle/vehicle-list.component').then(m => m.VehicleListComponent),
        title: 'My Vehicles'
      },
      {
        path: 'vehicles/add',
        canActivate: [roleGuard],
        data: { roles: ['Driver', 'Admin'] },
        loadComponent: () =>
          import('./features/vehicle/vehicle-form.component').then(m => m.VehicleFormComponent),
        title: 'Add Vehicle'
      },
      {
        path: 'vehicles/edit/:id',
        canActivate: [roleGuard],
        data: { roles: ['Driver', 'Admin'] },
        loadComponent: () =>
          import('./features/vehicle/vehicle-form.component').then(m => m.VehicleFormComponent),
        title: 'Edit Vehicle'
      },
      {
        path: 'routes',
        loadComponent: () =>
          import('./features/routes/route-list.component').then(m => m.RouteListComponent),
        title: 'My Routes'
      },
      {
        path: 'routes/add',
        loadComponent: () =>
          import('./features/routes/route-form.component').then(m => m.RouteFormComponent),
        title: 'Add Route'
      },
      {
        path: 'routes/edit/:id',
        loadComponent: () =>
          import('./features/routes/route-form.component').then(m => m.RouteFormComponent),
        title: 'Edit Route'
      },
     {
  path: 'rides',
  loadComponent: () =>
    import('./features/rides/ride-list.component')
      .then(m => m.RideListComponent),
  title: 'Ride Requests'
},

{
  path: 'rides/find',
  loadComponent: () =>
    import('./features/rides/find-ride.component')
      .then(m => m.FindRideComponent),
  title: 'Find Ride'
},

{
  path: 'rides/lifecycle',
  loadComponent: () =>
    import('./features/rides/ride-lifecycle-list.component')
      .then(m => m.RideLifecycleListComponent),
  title: 'My Rides'
},

{
  path: 'rides/lifecycle/:id',
  loadComponent: () =>
    import('./features/rides/ride-detail.component')
      .then(m => m.RideDetailComponent),
  title: 'Ride Details'
},

{
  path: 'rides/:id/matches',
  loadComponent: () =>
    import('./features/rides/match-results.component')
      .then(m => m.MatchResultsComponent),
  title: 'Match Results'
},
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/notifications/notifications.component').then(m => m.NotificationsComponent),
        title: 'Notifications'
      },
      {
        path: 'gps',
        loadComponent: () =>
          import('./features/gps/gps-page.component').then(m => m.GpsPageComponent),
        title: 'Maps & GPS'
      },
      {
        path: 'chat',
        loadComponent: () =>
          import('./features/chat/chat-page.component').then(m => m.ChatPageComponent),
        title: 'Chat'
      },
      {
        path: 'chat/:rideId',
        loadComponent: () =>
          import('./features/chat/chat-page.component').then(m => m.ChatPageComponent),
        title: 'Conversation'
      },
      {
        path: 'wallet',
        loadComponent: () =>
          import('./features/wallet/wallet-page.component').then(m => m.WalletPageComponent),
        title: 'Wallet'
      },
      {
        path: 'payments',
        loadComponent: () =>
          import('./features/payment/payment-page.component').then(m => m.PaymentPageComponent),
        title: 'Payments'
      },
      {
        path: 'safety',
        loadComponent: () =>
          import('./features/safety/safety-page.component').then(m => m.SafetyPageComponent),
        title: 'Safety'
      },
      {
        path: 'verification',
        loadComponent: () =>
          import('./features/verification/verification-page.component').then(m => m.VerificationPageComponent),
        title: 'Verification'
      },
      {
        path: 'admin/dashboard',
        canActivate: [roleGuard],
        data: { roles: ['Admin'] },
        loadComponent: () =>
          import('./features/admin/admin-dashboard.component').then(m => m.AdminDashboardComponent),
        title: 'Admin Dashboard'
      },
      {
        path: 'admin/verification',
        canActivate: [roleGuard],
        data: { roles: ['Admin'] },
        loadComponent: () =>
          import('./features/admin/admin-verification.component').then(m => m.AdminVerificationComponent),
        title: 'Admin Verification'
      },
      {
        path: 'admin',
        redirectTo: 'admin/dashboard',
        pathMatch: 'full'
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.component').then(m => m.SettingsComponent),
        title: 'Settings'
      }
    ]
  },
  // Legacy redirects so old bookmarks still work
  { path: 'dashboard', redirectTo: 'app/dashboard' },
  { path: 'profile', redirectTo: 'app/profile' },
  { path: 'routes', redirectTo: 'app/routes' },
  { path: 'rides', redirectTo: 'app/rides' },
  { path: 'vehicles', redirectTo: 'app/vehicles' },
  { path: '**', redirectTo: '' }
];
