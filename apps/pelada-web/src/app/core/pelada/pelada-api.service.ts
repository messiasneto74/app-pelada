import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface CreatePeladaPayload {
  name: string;
  defaultWeekday: number | null;
  defaultLocation: string;
  photoFile: File | null;
}

export interface PeladaCreatedApi {
  id: string;
  name: string;
  photoUrl: string | null;
  defaultWeekday: number | null;
  defaultLocation: string | null;
}

@Injectable({ providedIn: 'root' })
export class PeladaApiService {
  private readonly http = inject(HttpClient);

  createPelada(payload: CreatePeladaPayload) {
    const form = new FormData();
    form.set('name', payload.name);
    if (payload.defaultWeekday !== null) {
      form.set('defaultWeekday', String(payload.defaultWeekday));
    }
    if (payload.defaultLocation) {
      form.set('defaultLocation', payload.defaultLocation);
    }
    if (payload.photoFile) {
      form.append('photo', payload.photoFile);
    }
    return this.http.post<PeladaCreatedApi>(`${environment.apiUrl}/peladas`, form);
  }
}
