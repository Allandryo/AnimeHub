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
  readonly isLocalMode = signal<boolean>(false);
  readonly isAuthenticated = computed(() => !!this.currentUser());

  constructor() {
    this.initConnection();
  }

  private initConnection() {
    const { supabaseUrl, supabaseKey } = environment;
    if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('TU-PROYECTO')) {
      console.warn('⚠️ Supabase no configurado. Activando Modo Local (localStorage).');
      this.isLocalMode.set(true);
      this.loadLocalSession();
      return;
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    // Escuchar cambios de sesión
    this.supabase.auth.onAuthStateChange(async (_, session) => {
      if (session?.user) {
        await this.fetchProfile(session.user);
      } else {
        this.currentUser.set(null);
      }
    });
  }

  // --- AUTENTICACIÓN ---
  async signUp(email: string, password: string, username: string) {
    if (this.isLocalMode()) {
      const mockUser: UserProfile = { id: 'local-user', email, username };
      localStorage.setItem('animehub_user', JSON.stringify(mockUser));
      this.currentUser.set(mockUser);
      return { data: mockUser, error: null };
    }

    const { data, error } = await this.supabase!.auth.signUp({
      email,
      password,
      options: { data: { username } }
    });
    if (error) throw error;
    return data;
  }

  async signIn(identifier: string, password: string) {
    if (this.isLocalMode()) {
      const mockUser: UserProfile = { id: 'local-user', email: identifier, username: identifier.split('@')[0] };
      localStorage.setItem('animehub_user', JSON.stringify(mockUser));
      this.currentUser.set(mockUser);
      return;
    }

    let email = identifier;
    // Si ingresa nombre de usuario en lugar de correo, buscamos su email en profiles
    if (!identifier.includes('@')) {
      const { data, error } = await this.supabase!
        .from('profiles')
        .select('email')
        .eq('username', identifier)
        .single();
      
      if (error || !data) throw new Error('Usuario no encontrado');
      email = data.email;
    }

    const { error } = await this.supabase!.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async signOut() {
    if (this.isLocalMode()) {
      localStorage.removeItem('animehub_user');
      this.currentUser.set(null);
      return;
    }
    await this.supabase?.auth.signOut();
  }

  // --- PERFIL Y STORAGE ---
  private async fetchProfile(user: User) {
    const { data } = await this.supabase!
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      this.currentUser.set(data);
    }
  }

  async uploadAvatar(file: File): Promise<string> {
    const user = this.currentUser();
    if (!user) throw new Error('No autenticado');

    if (this.isLocalMode()) {
      const localUrl = URL.createObjectURL(file);
      const updated = { ...user, avatar_url: localUrl };
      this.currentUser.set(updated);
      localStorage.setItem('animehub_user', JSON.stringify(updated));
      return localUrl;
    }

    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await this.supabase!.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = this.supabase!.storage.from('avatars').getPublicUrl(filePath);
    const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;

    await this.supabase!.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id);
    this.currentUser.set({ ...user, avatar_url: avatarUrl });
    return avatarUrl;
  }

  private loadLocalSession() {
    const saved = localStorage.getItem('animehub_user');
    if (saved) this.currentUser.set(JSON.parse(saved));
  }

  get client(): SupabaseClient | null {
    return this.supabase;
  }
}