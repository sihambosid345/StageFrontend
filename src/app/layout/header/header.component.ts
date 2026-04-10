import { Component, EventEmitter, Output, HostListener, ElementRef } from '@angular/core';
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

  constructor(public auth: AuthService, private elRef: ElementRef) {}

  // ✅ Ysakar l-menu ila katdir click F BARRA l-component — bla overlay
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.showUserMenu = false;
    }
  }

  onToggle() {
    this.toggleSidebar.emit();
  }

  toggleMenu(event: Event) {
    event.stopPropagation();
    this.showUserMenu = !this.showUserMenu;
  }

  logout(event: Event) {
    event.stopPropagation();
    this.showUserMenu = false;
    this.auth.logout();
  }

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
}