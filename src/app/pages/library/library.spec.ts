import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';

import { Library } from './library';
import { Folder, LibraryService } from '../../shared/services/library';

/**
 * The library page renders whatever the API-backed service publishes. State that
 * arrives from the service is a signal, so the page re-renders zoneless.
 */
describe('Library page', () => {
  let fixture: ComponentFixture<Library>;
  let foldersSignal: ReturnType<typeof signal<Folder[]>>;
  let calls: { method: string; args: unknown[] }[];

  const folders: Folder[] = [
    {
      id: 'folder-1',
      name: 'Biologia',
      isNotesFolder: false,
      documents: [
        { id: 'doc-1', name: 'Mitosis', content: 'La mitosis es...', createdAt: '01/01/2026', isNote: false },
      ],
    },
    { id: 'folder-2', name: 'Mis Notas', isNotesFolder: true, documents: [] },
  ];

  function arrange(overrides: { [key: string]: (...args: never[]) => Observable<unknown> } = {}): void {
    foldersSignal = signal<Folder[]>(folders);
    calls = [];

    const record = (method: string, result: Observable<unknown>) =>
      (...args: unknown[]): Observable<unknown> => {
        calls.push({ method, args });
        return result;
      };

    TestBed.configureTestingModule({
      imports: [Library],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: LibraryService,
          useValue: {
            folders: foldersSignal,
            reloadForUser: record('reloadForUser', of(undefined)),
            addFolder: overrides['addFolder'] ?? record('addFolder', of(undefined)),
            deleteFolder: overrides['deleteFolder'] ?? record('deleteFolder', of(undefined)),
            addDocument: record('addDocument', of(undefined)),
            updateDocument: record('updateDocument', of(undefined)),
            deleteDocument: record('deleteDocument', of(undefined)),
            getNotesFolder: () => folders[1],
          },
        },
      ],
    });

    fixture = TestBed.createComponent(Library);
    fixture.detectChanges();
  }

  it('renders the folders and document counts published by the service', async () => {
    arrange();
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Biologia');
    expect(text).toContain('1 documentos');
    expect(text).toContain('Mis Notas');
  });

  it('deletes a folder by its backend id', async () => {
    arrange();
    await fixture.whenStable();

    fixture.debugElement.query(By.css('.folder-card .icon-btn.del')).nativeElement.click();
    await fixture.whenStable();

    expect(calls.filter((call) => call.method === 'deleteFolder').map((call) => call.args)).toEqual([
      ['folder-1'],
    ]);
  });

  it('creates a document in the opened folder with an empty body', async () => {
    arrange();
    await fixture.whenStable();

    fixture.debugElement.query(By.css('.folder-card')).nativeElement.click();
    await fixture.whenStable();
    fixture.debugElement.query(By.css('.page-header .btn-add')).nativeElement.click();
    await fixture.whenStable();

    const input = fixture.debugElement.query(By.css('.modal input')).nativeElement as HTMLInputElement;
    input.value = 'Resumen';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    fixture.debugElement.query(By.css('.modal .btn-save')).nativeElement.click();
    await fixture.whenStable();

    const created = calls.filter((call) => call.method === 'addDocument').map((call) => call.args);
    expect(created).toEqual([['folder-1', 'Resumen', '']]);
  });

  it('shows the error banner when a write is rejected', async () => {
    arrange({ addFolder: () => throwError(() => new Error('boom')) });
    await fixture.whenStable();

    fixture.debugElement.query(By.css('.page-header .btn-add')).nativeElement.click();
    await fixture.whenStable();

    const input = fixture.debugElement.query(By.css('.modal input')).nativeElement as HTMLInputElement;
    input.value = 'Quimica';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    fixture.debugElement.query(By.css('.modal .btn-save')).nativeElement.click();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('No se pudo guardar en el servidor');
  });
});
