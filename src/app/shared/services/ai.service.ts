import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';

export interface AiTaskGenerationResponse {
  message?: {
    content?: string | Array<{ text?: string }>;
  };
}

/**
 * AI task generation is disabled until the call moves to the backend.
 * A browser-side call cannot hold a provider key: anything shipped in the bundle
 * is public, which is how the previous Cohere key leaked.
 */
@Injectable({ providedIn: 'root' })
export class AiService {
  generateTasksFromNotes(_content: string): Observable<AiTaskGenerationResponse> {
    return throwError(
      () =>
        new Error(
          'La generación de tareas con IA necesita un endpoint en el backend: la clave no puede viajar en el navegador.',
        ),
    );
  }
}
