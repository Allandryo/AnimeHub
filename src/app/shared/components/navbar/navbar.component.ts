import { Component, inject, signal, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { WatchlistService } from '../../../core/services/watchlist.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import { AuthModalComponent } from '../auth-modal/auth-modal.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, AuthModalComponent],
  template: `
    <nav class="navbar surface-panel">
      <div class="navbar-inner container">
        <a routerLink="/" class="brand">
          <span class="brand-icon material-symbols-outlined fill">movie_filter</span>
          <span class="brand-text">
            <span class="brand-highlight">Anime</span><span class="brand-accent">Hub</span>
          </span>
        </a>

        <div class="nav-links" [class.open]="mobileOpen()">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-link"
             (click)="closeMobile()">
            <span class="material-symbols-outlined">explore</span>
            Explorar
          </a>
          <a routerLink="/my-list" routerLinkActive="active" class="nav-link"
             (click)="closeMobile()">
            <span class="material-symbols-outlined">bookmark</span>
            Mi Lista
          </a>

          <!-- User auth / profile -->
          <div class="auth-wrapper">
            @if (supabaseService.isAuthenticated()) {
              <div class="user-profile-menu">
                <button class="avatar-btn" (click)="toggleDropdown($event)">
                  @if (supabaseService.userProfile()?.avatar_url) {
                    <img
                      [src]="supabaseService.userProfile()?.avatar_url"
                      alt="Avatar"
                      class="avatar-img"
                      loading="lazy"
                      decoding="async"
                      referrerpolicy="no-referrer"
                    >
                  } @else {
                    <div class="avatar-placeholder">
                      {{ supabaseService.userProfile()?.username?.substring(0, 2)?.toUpperCase() }}
                    </div>
                  }
                </button>

                @if (dropdownOpen()) {
                  <div class="dropdown-menu glass-panel">
                    <div class="dropdown-header">
                      <span class="user-name">{{ supabaseService.userProfile()?.username }}</span>
                      <span class="user-email">{{ supabaseService.userProfile()?.email }}</span>
                    </div>
                    <div class="dropdown-divider"></div>
                    <button class="dropdown-item" (click)="triggerAvatarUpload()">
                      <span class="material-symbols-outlined">image</span>
                      Cambiar Avatar
                    </button>
                    <button class="dropdown-item logout" (click)="onLogout()">
                      <span class="material-symbols-outlined">logout</span>
                      Cerrar Sesión
                    </button>
                  </div>
                }
              </div>
            } @else {
              <button class="btn-primary login-btn" (click)="openAuthModal()">
                <span class="material-symbols-outlined">login</span>
                Iniciar Sesión
              </button>
            }
          </div>
        </div>

        <button class="mobile-toggle" (click)="toggleMobile()" [attr.aria-label]="'Menu'">
          <span class="material-symbols-outlined">
            {{ mobileOpen() ? 'close' : 'menu' }}
          </span>
        </button>
      </div>
    </nav>

    @if (mobileOpen()) {
      <div class="mobile-backdrop" (click)="closeMobile()"></div>
    }

    <!-- Hidden input for avatar upload -->
    <input 
      type="file" 
      #avatarInput 
      style="display: none" 
      accept="image/*" 
      (change)="onAvatarSelected($event)">

    <!-- Auth modal overlay -->
    @if (supabaseService.authModalOpen()) {
      <app-auth-modal (close)="supabaseService.closeAuthModal()"></app-auth-modal>
    }
  `,
  styles: [`
    .navbar {
      position: fixed;
      top: 0.75rem;
      left: 0.75rem;
      right: 0.75rem;
      z-index: var(--z-sticky);
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      max-width: 1400px;
      margin: 0 auto;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      background: rgba(248, 250, 252, 0.85);
      transition: var(--transition-normal);
      box-shadow: var(--shadow-sm);

      @media (max-width: 768px) {
        top: 0;
        left: 0;
        right: 0;
        border-radius: 0;
        border-left: none;
        border-right: none;
        z-index: var(--z-mobile-nav);
      }
    }

    .navbar-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 60px;
      gap: 2rem;

      @media (max-width: 768px) {
        height: 56px;
      }
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      text-decoration: none;
      flex-shrink: 0;
      position: relative;

      &::after {
        content: '';
        position: absolute;
        inset: -0.5rem;
        border-radius: var(--radius-md);
        background: transparent;
        transition: var(--transition-fast);
      }

      &:hover::after {
        background: rgba(0, 0, 0, 0.03);
      }
    }

    .brand-icon {
      font-size: 1.65rem;
      color: var(--primary);
    }

    .brand-text {
      font-family: var(--font-heading);
      font-size: 1.3rem;
      font-weight: 800;
      letter-spacing: -0.03em;
    }

    .brand-highlight {
      color: var(--primary);
    }

    .brand-accent {
      color: var(--text-primary);
      font-weight: 600;
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.55rem 1rem;
      border-radius: var(--radius-md);
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--text-secondary);
      text-decoration: none;
      transition: var(--transition-normal);
      position: relative;
      white-space: nowrap;

      .material-symbols-outlined {
        font-size: 1.2rem;
      }

      &:hover {
        color: var(--primary);
        background: rgba(0, 0, 0, 0.04);
      }

      &.active {
        color: var(--primary);
        background: var(--primary-subtle);
        border: 1px solid rgba(255, 107, 107, 0.15);

        .material-symbols-outlined {
          color: var(--primary);
        }
      }
    }

    .nav-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.25rem;
      height: 1.25rem;
      padding: 0 0.4rem;
      background: var(--primary);
      border-radius: var(--radius-full);
      font-size: 0.65rem;
      font-weight: 700;
      color: #fff;
      box-shadow: var(--shadow-sm);
    }

    .auth-wrapper {
      margin-left: 1rem;
      display: flex;
      align-items: center;
    }

    .user-profile-menu {
      position: relative;
    }

    .avatar-btn {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-full);
      border: 2px solid var(--border);
      background: var(--surface);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      padding: 0;
      transition: var(--transition-normal);

      &:hover {
        border-color: var(--primary);
        transform: scale(1.05);
      }
    }

    .avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-placeholder {
      font-family: var(--font-heading);
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--primary);
    }

    .dropdown-menu {
      position: absolute;
      top: 50px;
      right: 0;
      width: 240px;
      background: var(--surface-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-xl);
      padding: 0.5rem 0;
      z-index: var(--z-dropdown);
      display: flex;
      flex-direction: column;
      backdrop-filter: blur(20px);
      animation: dropdownIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes dropdownIn {
      from {
        opacity: 0;
        transform: translateY(-6px) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .dropdown-header {
      padding: 0.5rem 1rem;
      display: flex;
      flex-direction: column;

      .user-name {
        font-family: var(--font-heading);
        font-weight: 600;
        font-size: 0.9rem;
        color: var(--text-primary);
      }

      .user-email {
        font-size: 0.75rem;
        color: var(--text-muted);
      }
    }

    .dropdown-divider {
      height: 1px;
      background: var(--border);
      margin: 0.5rem 0;
    }

    .dropdown-item {
      background: none;
      border: none;
      font-family: var(--font-body);
      color: var(--text-secondary);
      font-size: 0.85rem;
      padding: 0.6rem 1rem;
      width: 100%;
      text-align: left;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      transition: var(--transition-fast);

      .material-symbols-outlined {
        font-size: 1.1rem;
      }

      &:hover {
        background: rgba(0, 0, 0, 0.04);
        color: var(--primary);
      }

      &.logout {
        color: var(--danger);

        &:hover {
          background: rgba(229, 62, 62, 0.05);
          color: var(--danger);
        }
      }
    }

    .login-btn {
      padding: 0.5rem 1rem;
      font-size: 0.85rem;
      height: 38px;
    }

    .mobile-toggle {
      display: none;
      background: none;
      border: none;
      color: var(--text-primary);
      cursor: pointer;
      padding: 0.5rem;
      border-radius: var(--radius-sm);

      &:hover {
        background: rgba(0, 0, 0, 0.04);
      }
    }

    .mobile-backdrop {
      display: none;
    }

    @media (max-width: 768px) {
      .mobile-toggle {
        display: flex;
      }

      .nav-links {
        position: fixed;
        top: 56px;
        left: 0;
        right: 0;
        flex-direction: column;
        background: var(--surface);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-bottom: 1px solid var(--border);
        padding: 1.25rem 1rem 1.5rem;
        gap: 0.5rem;
        transform: translateY(-120%);
        transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
        opacity: 0;
        z-index: var(--z-mobile-nav);
        box-shadow: var(--shadow-xl);
        max-height: calc(100vh - 56px);
        overflow-y: auto;

        &.open {
          transform: translateY(0);
          opacity: 1;
        }

        .nav-link {
          width: 100%;
          padding: 0.85rem 1rem;
        }
      }

      .auth-wrapper {
        margin-left: 0;
        margin-top: 1rem;
        width: 100%;
        justify-content: center;
      }

      .login-btn {
        width: 100%;
      }

      .dropdown-menu {
        position: fixed;
        top: auto;
        bottom: 20px;
        left: 20px;
        right: 20px;
        width: calc(100% - 40px);
        z-index: var(--z-dropdown);
      }

      .mobile-backdrop {
        display: block;
        position: fixed;
        inset: 0;
        top: 56px;
        background: rgba(15, 23, 42, 0.5);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        z-index: var(--z-mobile-backdrop);
      }
    }
  `]
})
export class NavbarComponent {
  private watchlistService = inject(WatchlistService);
  supabaseService = inject(SupabaseService);

  mobileOpen = signal(false);
  dropdownOpen = signal(false);
  showAuthModal = signal(false);

  @ViewChild('avatarInput') avatarInput!: ElementRef<HTMLInputElement>;

  toggleMobile() {
    this.mobileOpen.update(v => !v);
  }

  closeMobile() {
    this.mobileOpen.set(false);
  }

  toggleDropdown(event: Event) {
    event.stopPropagation();
    this.dropdownOpen.update(v => !v);
  }

  @HostListener('document:click')
  closeDropdown() {
    this.dropdownOpen.set(false);
  }

  openAuthModal() {
    this.supabaseService.openAuthModal();
    this.closeMobile();
  }

  async onLogout() {
    try {
      await this.supabaseService.signOut();
      this.dropdownOpen.set(false);
    } catch (e) {
      console.error('Error logging out:', e);
    }
  }

  triggerAvatarUpload() {
    this.avatarInput.nativeElement.click();
    this.dropdownOpen.set(false);
  }

  async onAvatarSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      try {
        await this.supabaseService.uploadAvatar(file);
      } catch (e) {
        console.error('Error uploading avatar:', e);
        alert('Error al subir la imagen de perfil.');
      }
    }
  }
}
