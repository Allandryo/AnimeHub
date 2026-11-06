import { Injectable, signal, computed } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
}

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient | null = null;
  
  // Signals de estado
  readonly currentUser = signal<UserProfile | null>(null);
  readonly userProfile = this.currentUser.asReadonly();
  readonly isInitializingSession = signal<boolean>(true);
  readonly authModalOpen = signal<boolean>(false);
  readonly isLocalMode = signal<boolean>(false);
  readonly isAuthenticated = computed(() => !!this.currentUser());

  constructor() {
    this.initConnection();
  }

  openAuthModal() {
    this.authModalOpen.set(true);
  }

  closeAuthModal() {
    this.authModalOpen.set(false);
  }

  private initConnection() {
    const { supabaseUrl, supabaseKey } = environment;
    if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('TU-PROYECTO')) {
      console.warn('⚠️ Supabase no configurado. Activando Modo Local (localStorage).');
      this.isLocalMode.set(true);
      this.loadLocalSession();
      this.isInitializingSession.set(false);
      return;
    }

    let url = supabaseUrl.trim();
    if (url.endsWith('/rest/v1') || url.endsWith('/rest/v1/')) {
      url = url.replace(/\/rest\/v1\/?$/, '');
    }

    try {
      this.supabase = createClient(url, supabaseKey);
      
      // Escuchar cambios de sesión
      this.supabase.auth.onAuthStateChange((_, session) => {
        if (session?.user) {
          // Asignar datos de inmediato para evitar parpadeos y desbloquear la UI
          this.currentUser.set({
            id: session.user.id,
            email: session.user.email || '',
            username: session.user.user_metadata?.['username'] || session.user.email?.split('@')[0] || 'User',
            avatar_url: session.user.user_metadata?.['avatar_url']
          });
          this.isInitializingSession.set(false);

          // Ejecutar fetchProfile en el siguiente tick para evitar el deadlock con el lock interno de Supabase
          setTimeout(() => {
            this.fetchProfile(session.user);
          }, 0);
        } else {
          this.currentUser.set(null);
          this.isInitializingSession.set(false);
        }
      });
    } catch (err) {
      console.warn('Error inicializando Supabase, activando modo local:', err);
      this.isLocalMode.set(true);
      this.loadLocalSession();
      this.isInitializingSession.set(false);
    }
  }

  // --- AUTENTICACIÓN ---
  async signUp(usernameOrEmail: string, emailOrPassword?: string, passwordOrUsername?: string) {
    let username = '';
    let email = '';
    let password = '';

    if (usernameOrEmail.includes('@')) {
      email = usernameOrEmail;
      password = emailOrPassword || '';
      username = passwordOrUsername || email.split('@')[0];
    } else if (emailOrPassword && emailOrPassword.includes('@')) {
      username = usernameOrEmail;
      email = emailOrPassword;
      password = passwordOrUsername || '';
    } else {
      username = usernameOrEmail;
      email = emailOrPassword || '';
      password = passwordOrUsername || '';
    }

    if (this.isLocalMode() || !this.supabase) {
      const mockUser: UserProfile = { id: 'local-user', email, username };
      localStorage.setItem('animehub_user', JSON.stringify(mockUser));
      this.currentUser.set(mockUser);
      return { data: mockUser, error: null };
    }

    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: { data: { username } }
    });
    if (error) throw error;
    return data;
  }

  async signIn(identifier: string, password: string) {
    const cleanId = identifier.trim();
    if (this.isLocalMode() || !this.supabase) {
      const mockUser: UserProfile = { id: 'local-user', email: cleanId, username: cleanId.split('@')[0] };
      localStorage.setItem('animehub_user', JSON.stringify(mockUser));
      this.currentUser.set(mockUser);
      return;
    }

    let email = cleanId;
    // Si ingresa nombre de usuario en lugar de correo, buscamos su email en profiles (insensible a mayúsculas)
    if (!cleanId.includes('@')) {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('email')
        .ilike('username', cleanId)
        .single();
      
      if (error || !data) throw new Error('Usuario no encontrado');
      email = data.email;
    }

    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async signOut() {
    if (this.isLocalMode() || !this.supabase) {
      localStorage.removeItem('animehub_user');
      this.currentUser.set(null);
      return;
    }
    await this.supabase.auth.signOut();
  }

  // --- PERFIL Y STORAGE ---
  private async fetchProfile(user: User) {
    if (!this.supabase) return;
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data && !error) {
        this.currentUser.set(data);
      }
    } catch (e) {
      console.warn('Error fetching profile from Supabase:', e);
    }
  }

  async uploadAvatar(file: File): Promise<string> {
    const user = this.currentUser();
    if (!user) throw new Error('No autenticado');

    if (this.isLocalMode() || !this.supabase) {
      const localUrl = URL.createObjectURL(file);
      const updated = { ...user, avatar_url: localUrl };
      this.currentUser.set(updated);
      localStorage.setItem('animehub_user', JSON.stringify(updated));
      return localUrl;
    }

    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await this.supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = this.supabase.storage.from('avatars').getPublicUrl(filePath);
    const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;

    await this.supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id);
    this.currentUser.set({ ...user, avatar_url: avatarUrl });
    return avatarUrl;
  }

  private loadLocalSession() {
    const saved = localStorage.getItem('animehub_user');
    if (saved) {
      try {
        this.currentUser.set(JSON.parse(saved));
      } catch {
        this.currentUser.set(null);
      }
    }
  }

  get client(): SupabaseClient | null {
    return this.supabase;
  }
}