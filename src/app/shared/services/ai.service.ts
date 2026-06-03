import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AiService {
  private apiUrl = 'https://api.cohere.com/v2/chat';
  private apiKey = 'ZBOi6pq8hh2NayX6qveiyJNJsQTCfzCK0k1nnPbt';

  constructor(private http: HttpClient) {}

  generateTasksFromNotes(content: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    });

    const body = {
      model: 'command-r-plus-08-2024',
      messages: [
        {
          role: 'user',
          content: `Convierte el siguiente texto en una lista de tareas claras y accionables. Devuelve solo las tareas, una por línea, cada línea empezando con un guion y un espacio ("- "). No incluyas explicaciones, encabezados ni texto adicional. Mantén cada tarea en 6–12 palabras, orientadas a una acción concreta y con verbo al inicio cuando sea posible.\n\nTexto:\n${content}`
        }
      ],
      max_tokens: 400,
      temperature: 0.2
    };

    return this.http.post<any>(this.apiUrl, body, { headers });
  }
}