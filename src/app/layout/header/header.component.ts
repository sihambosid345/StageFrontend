import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  @Output() toggleSidebar = new EventEmitter<void>();
  today = new Date();
  showUserMenu = false;

  constructor(public auth: AuthService) {}

  onToggle() { this.toggleSidebar.emit(); }

  get userInitials(): string {
    const u = this.auth.currentUser();
    if (!u) return 'A';
    return `${u.firstName[0] ?? ''}${u.lastName[0] ?? ''}`.toUpperCase();
  }

  get userName(): string {
    const u = this.auth.currentUser();
    return u ? `${u.firstName} ${u.lastName}` : 'Admin';
  }

  get userEmail(): string {
    return this.auth.currentUser()?.email ?? '';
  }

  logout() { this.auth.logout(); }
}
