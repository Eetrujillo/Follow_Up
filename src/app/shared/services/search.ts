import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { TaskService } from './task';
import { LibraryService } from './library';

export interface SearchResult {
  type: 'tarea' | 'documento' | 'carpeta' | 'pagina';
  title: string;
  subtitle: string;
  route: string;
}

@Injectable({ providedIn: 'root' })
export class SearchService {

  constructor(
    private taskService:    TaskService,
    private libraryService: LibraryService,
  ) {}

  search(query: string): SearchResult[] {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const results: SearchResult[] = [];

    // Buscar en paginas
    const pages = [
      { title: 'Panel Principal', route: '/dashboard'  },
      { title: 'Biblioteca',      route: '/library'    },
      { title: 'Calendario',      route: '/calendar'   },
      { title: 'Estadisticas',    route: '/statistics' },
      { title: 'Bloc de Notas',   route: '/notepad'    },
    ];

    pages.forEach(p => {
      if (p.title.toLowerCase().includes(q)) {
        results.push({ type: 'pagina', title: p.title, subtitle: 'Pagina', route: p.route });
      }
    });

    this.taskService.getTasks().forEach(t => {
      if (t.text.toLowerCase().includes(q)) {
        results.push({
          type: 'tarea',
          title: t.text,
          subtitle: t.completed ? 'Completada' : 'Pendiente',
          route: '/dashboard'
        });
      }
    });

    this.libraryService.getFolders().forEach(folder => {
      if (folder.name.toLowerCase().includes(q)) {
        results.push({
          type: 'carpeta',
          title: folder.name,
          subtitle: `${folder.documents.length} documentos`,
          route: '/library'
        });
      }
      folder.documents.forEach(doc => {
        if (doc.name.toLowerCase().includes(q)) {
          results.push({
            type: 'documento',
            title: doc.name,
            subtitle: `En ${folder.name}`,
            route: '/library'
          });
        }
      });
    });

    return results.slice(0, 8); 
  }
}