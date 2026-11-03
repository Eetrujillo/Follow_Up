import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Observable, of } from 'rxjs';

import { LibraryService } from './library';
import { BackendFolder, FoldersApiService } from './folders-api.service';
import { DocumentsApiService } from './documents-api.service';

/**
 * The library state comes from the API. This pins the backend-to-domain mapping and
 * the notes-folder guarantee, without reading the database.
 */
describe('LibraryService', () => {
  let service: LibraryService;
  let folderCalls: { method: string; args: unknown[] }[];
  let documentCalls: { method: string; args: unknown[] }[];

  const biologyFolder: BackendFolder = {
    id: 'folder-1',
    userId: 'u1',
    name: 'Biologia',
    isNotesFolder: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    Document: [
      {
        id: 'doc-1',
        folderId: 'folder-1',
        userId: 'u1',
        title: 'Mitosis',
        contentHtml: '<p>La mitosis es</p>',
        fromNotepad: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  };

  function arrange(folders: BackendFolder[]): void {
    folderCalls = [];
    documentCalls = [];
    let current = folders;

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: FoldersApiService,
          useValue: {
            getAll: (): Observable<BackendFolder[]> => of([...current]),
            create: (request: unknown) => {
              folderCalls.push({ method: 'create', args: [request] });
              const created: BackendFolder = {
                id: 'created',
                userId: 'u1',
                name: 'Mis Notas',
                isNotesFolder: true,
                createdAt: '2026-01-02T00:00:00.000Z',
                Document: [],
              };
              current = [...current, created];
              return of(created);
            },
            update: (id: string, changes: unknown) => {
              folderCalls.push({ method: 'update', args: [id, changes] });
              return of(biologyFolder);
            },
            delete: (id: string) => {
              folderCalls.push({ method: 'delete', args: [id] });
              current = current.filter((folder) => folder.id !== id);
              return of(biologyFolder);
            },
          },
        },
        {
          provide: DocumentsApiService,
          useValue: {
            getAll: () => of([]),
            create: (request: unknown) => {
              documentCalls.push({ method: 'create', args: [request] });
              return of(biologyFolder.Document[0]);
            },
            update: (id: string, changes: unknown) => {
              documentCalls.push({ method: 'update', args: [id, changes] });
              return of(biologyFolder.Document[0]);
            },
            delete: (id: string) => {
              documentCalls.push({ method: 'delete', args: [id] });
              return of(biologyFolder.Document[0]);
            },
          },
        },
      ],
    });

    service = TestBed.inject(LibraryService);
  }

  it('maps the backend folders and documents into the page model', async () => {
    arrange([]);
    service.reloadForUser();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const notes = service.getNotesFolder();
    expect(notes?.name).toBe('Mis Notas');
    expect(folderCalls.filter((call) => call.method === 'create').map((call) => call.args)).toEqual([
      [{ name: 'Mis Notas', isNotesFolder: true }],
    ]);
  });

  it('keeps the document title, plain text content and note flag', async () => {
    arrange([biologyFolder, { ...biologyFolder, id: 'folder-2', name: 'Mis Notas', isNotesFolder: true }]);
    service.reloadForUser();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const biology = service.getFolders().find((folder) => folder.name === 'Biologia');
    expect(biology?.documents[0].name).toBe('Mitosis');
    expect(biology?.documents[0].content).toBe('La mitosis es');
    expect(biology?.documents[0].isNote).toBe(false);
    expect(folderCalls.filter((call) => call.method === 'create')).toEqual([]);
  });

  it('stores a document body as HTML through the documents API', async () => {
    arrange([biologyFolder, { ...biologyFolder, id: 'folder-2', name: 'Mis Notas', isNotesFolder: true }]);
    service.reloadForUser();
    await new Promise((resolve) => setTimeout(resolve, 0));

    service.updateDocument('doc-1', 'linea <uno>').subscribe();

    expect(documentCalls.map((call) => call.args)).toEqual([
      ['doc-1', { contentHtml: '<p>linea &lt;uno&gt;</p>' }],
    ]);
  });

  it('never deletes the notes folder', async () => {
    arrange([{ ...biologyFolder, id: 'folder-2', name: 'Mis Notas', isNotesFolder: true }]);
    service.reloadForUser();
    await new Promise((resolve) => setTimeout(resolve, 0));

    service.deleteFolder('folder-2').subscribe();

    expect(folderCalls.filter((call) => call.method === 'delete')).toEqual([]);
  });
});
