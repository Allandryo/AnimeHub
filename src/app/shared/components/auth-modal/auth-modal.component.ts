import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-overlay" (click)="close.emit()">
      <div class="modal-content glass-panel" (click)="$event.stopPropagation()">
        <button class="close-btn" (click)="close.emit()">
          <span class="material-symbols-outlined">close</span>
        </button>

        <div class="tabs">
          <button 
            class="tab-btn" 
            [class.active]="activeTab() === 'login'" 
            (click)="setTab('login')">
            Iniciar Sesión
          </button>
          <button 
            class="tab-btn" 
            [class.active]="activeTab() === 'register'" 
            (click)="setTab('register')">
            Registro
          </button>
        </div>

        @if (successMessage()) {
          <div class="success-message">
            <span class="material-symbols-outlined">mark_email_read</span>
            <p>{{ successMessage() }}</p>
          </div>
        } @else {
          <!-- LOGIN FORM -->
          @if (activeTab() === 'login') {
            <form [formGroup]="loginForm" (ngSubmit)="onLoginSubmit()">
              <h2>Bienvenido de nuevo</h2>
              <p class="subtitle">Ingresa tus credenciales para continuar</p>

              @if (error()) {
                <div class="error-banner">
                  <span class="material-symbols-outlined">error</span>
                  <span>{{ error() }}</span>
                </div>
              }

              <div class="form-group">
                <label for="login-user">Usuario o Email</label>
                  <input 
                    type="text" 
                    id="login-user" 
                    class="input-field" 
                    formControlName="emailOrUsername" 
                    placeholder="ej. anime_fan o fan@mail.com"
                    required>
              </div>

              <div class="form-group">
                <label for="login-pass">Contraseña</label>
                <input 
                  type="password" 
                  id="login-pass" 
                  class="input-field" 
                  formControlName="password" 
                  placeholder="••••••••"
                  required>
              </div>

              <button 
                type="submit" 
                class="btn-primary w-full scale-on-press" 
                [disabled]="loginForm.invalid || loading()">
                {{ loading() ? 'Cargando...' : 'Entrar' }}
              </button>
            </form>
          }

          <!-- REGISTER FORM -->
          @if (activeTab() === 'register') {
            <form [formGroup]="registerForm" (ngSubmit)="onRegisterSubmit()">
              <h2>Crear Cuenta</h2>
              <p class="subtitle">Regístrate para guardar tu lista personal de anime</p>

              @if (error()) {
                <div class="error-banner">
                  <span class="material-symbols-outlined">error</span>
                  <span>{{ error() }}</span>
                </div>
              }

              <div class="form-group">
                <label for="reg-username">Nombre de Usuario</label>
                <input 
                  type="text" 
                  id="reg-username" 
                  class="input-field" 
                  formControlName="username" 
                  placeholder="ej. otaku_99">
                @if (registerForm.get('username')?.touched && registerForm.get('username')?.invalid) {
                  <span class="validation-error">
                    El usuario debe tener entre 3 y 20 caracteres (solo letras, números y "_").
                  </span>
                }
              </div>

              <div class="form-group">
                <label for="reg-email">Correo Electrónico</label>
                <input 
                  type="email" 
                  id="reg-email" 
                  class="input-field" 
                  formControlName="email" 
                  placeholder="otaku@email.com">
                @if (registerForm.get('email')?.touched && registerForm.get('email')?.invalid) {
                  <span class="validation-error">Ingresa un formato de correo válido.</span>
                }
              </div>

              <div class="form-group">
                <label for="reg-pass">Contraseña</label>
                <input 
                  type="password" 
                  id="reg-pass" 
                  class="input-field" 
                  formControlName="password" 
                  placeholder="••••••••">
                @if (registerForm.get('password')?.touched && registerForm.get('password')?.invalid) {
                  <span class="validation-error">
                    Mínimo 8 caracteres (al menos 1 mayúscula, 1 minúscula y 1 número).
                  </span>
                }
              </div>

              <div class="form-group">
                <label for="reg-confirm">Confirmar Contraseña</label>
                <input 
                  type="password" 
                  id="reg-confirm" 
                  class="input-field" 
                  formControlName="confirmPassword" 
                  placeholder="••••••••">
                @if (registerForm.get('confirmPassword')?.touched && registerForm.hasError('mismatch')) {
                  <span class="validation-error">Las contraseñas no coinciden.</span>
                }
              </div>

              <button 
                type="submit" 
                class="btn-primary w-full scale-on-press" 
                [disabled]="registerForm.invalid || loading()">
                {{ loading() ? 'Creando cuenta...' : 'Registrarse' }}
              </button>
            </form>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.4);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }

    .modal-content {
      width: 100%;
      max-width: 440px;
      padding: 2.25rem 2rem;
      border-radius: var(--radius-lg);
      position: relative;
      background: var(--surface);
      box-shadow: var(--shadow-xl);
      border: 1px solid var(--border);
      animation: modalFadeIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      max-height: calc(100vh - 2rem);
      overflow-y: auto;

      @media (max-width: 480px) {
        padding: 1.5rem 1.25rem;
      }
    }

    @keyframes modalFadeIn {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(10px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .close-btn {
      position: absolute;
      top: 1.25rem;
      right: 1.25rem;
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 0.25rem;
      border-radius: var(--radius-full);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: var(--transition-fast);

      &:hover {
        color: var(--text-primary);
        background: rgba(0, 0, 0, 0.05);
      }
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid var(--border);
      margin-bottom: 1.75rem;
      gap: 1.5rem;
    }

    .tab-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      font-family: var(--font-heading);
      font-size: 1rem;
      font-weight: 600;
      padding: 0.5rem 0;
      cursor: pointer;
      position: relative;
      transition: var(--transition-fast);

      &:hover {
        color: var(--text-primary);
      }

      &.active {
        color: var(--primary);

        &::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--primary);
          border-radius: var(--radius-full);
        }
      }
    }

    h2 {
      font-size: 1.5rem;
      margin-bottom: 0.25rem;
    }

    .subtitle {
      color: var(--text-muted);
      font-size: 0.85rem;
      margin-bottom: 1.5rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      margin-bottom: 1.25rem;

      label {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--text-secondary);
      }

      input {
        width: 100%;
      }
    }

    .w-full {
      width: 100%;
      justify-content: center;
      padding: 0.85rem;
    }

    .error-banner {
      background: rgba(229, 62, 62, 0.08);
      border: 1px solid rgba(229, 62, 62, 0.25);
      color: var(--danger);
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-bottom: 1.25rem;

      .material-symbols-outlined {
        font-size: 1.2rem;
      }
    }

    .validation-error {
      color: var(--danger);
      font-size: 0.75rem;
      margin-top: 0.2rem;
    }

    .success-message {
      text-align: center;
      padding: 2rem 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;

      .material-symbols-outlined {
        font-size: 3.5rem;
        color: var(--accent);
      }

      p {
        font-size: 0.95rem;
        line-height: 1.6;
        color: var(--text-primary);
      }
    }
  `]
})
export class AuthModalComponent {
  @Output() close = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private supabaseService = inject(SupabaseService);

  activeTab = signal<'login' | 'register'>('login');
  loading = signal(false);
  error = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  loginForm: FormGroup;
  registerForm: FormGroup;

  constructor() {
    this.loginForm = this.fb.group({
      emailOrUsername: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });

    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20), Validators.pattern(/^[a-zA-Z0-9_]+$/)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  setTab(tab: 'login' | 'register') {
    this.activeTab.set(tab);
    this.error.set(null);
    this.successMessage.set(null);
  }

  private passwordMatchValidator(g: AbstractControl) {
    const password = g.get('password')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  async onLoginSubmit() {
    if (this.loginForm.invalid) return;

    this.loading.set(true);
    this.error.set(null);

    const { emailOrUsername, password } = this.loginForm.value;

    try {
      await this.supabaseService.signIn(emailOrUsername, password);
      this.close.emit();
    } catch (e: any) {
      console.error(e);
      this.error.set(e.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      this.loading.set(false);
    }
  }

  async onRegisterSubmit() {
    if (this.registerForm.invalid) return;

    this.loading.set(true);
    this.error.set(null);

    const { username, email, password } = this.registerForm.value;

    try {
      await this.supabaseService.signUp(username, email, password);
      if (this.supabaseService.isAuthenticated()) {
        this.successMessage.set('¡Cuenta creada y sesión iniciada con éxito!');
        setTimeout(() => this.close.emit(), 1200);
      } else {
        this.successMessage.set('¡Registro exitoso! Por favor revisa tu correo electrónico para verificar tu cuenta y activar tu sesión.');
      }
    } catch (e: any) {
      console.error(e);
      this.error.set(e.message || 'Error al registrar usuario.');
    } finally {
      this.loading.set(false);
    }
  }
}
