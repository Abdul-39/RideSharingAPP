import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-rs-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="rs-icon"
      [style.color]="color || null"
    >
      @switch (name) {
        @case ('logo') {
          <path fill="currentColor" d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
        }
        @case ('shield') {
          <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z"/>
        }
        @case ('wallet') {
          <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-1M16 12h5v4h-5a2 2 0 010-4z"/>
        }
        @case ('bell') {
          <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
        }
        @case ('user') {
          <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/>
        }
        @case ('logout') {
          <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
        }
        @case ('map-pin') {
          <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
          <circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2"/>
        }
        @case ('route') {
          <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1v12zM4 22v-7"/>
        }
        @case ('car') {
          <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            d="M5 17h14v2a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1H8v1a1 1 0 01-1 1H6a1 1 0 01-1-1v-2zM5 17l1.5-6h11L19 17M7 11V7a1 1 0 011-1h8a1 1 0 011 1v4"/>
        }
        @case ('chat') {
          <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        }
        @case ('check') {
          <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            d="M20 6L9 17l-5-5"/>
        }
        @case ('search') {
          <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>
          <path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M20 20l-3-3"/>
        }
        @case ('home') {
          <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            d="M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9z"/>
        }
        @case ('settings') {
          <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
          <path stroke="currentColor" stroke-width="2" stroke-linecap="round"
            d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        }
        @case ('plus') {
          <path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 5v14M5 12h14"/>
        }
        @case ('send') {
          <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
        }
        @case ('trash') {
          <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/>
        }
        @case ('sparkles') {
          <path stroke="currentColor" stroke-width="2" stroke-linecap="round"
            d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>
        }
        @default {
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
        }
      }
    </svg>
  `,
  styles: [`
    :host { display: inline-flex; align-items: center; justify-content: center; line-height: 0; }
    .rs-icon { display: block; flex-shrink: 0; }
  `]
})
export class RsIconComponent {
  @Input() name: string = 'check';
  @Input() size: number | string = 20;
  @Input() color: string = '';
}