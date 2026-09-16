import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NativeShellService } from './core/services/native-shell.service';
import { NetworkService } from './core/services/network.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  private shell = inject(NativeShellService);
  network = inject(NetworkService);

  ngOnInit(): void {
    void this.shell.init();
    void this.network.init();
  }

  ngOnDestroy(): void {
    void this.network.destroy();
  }
}