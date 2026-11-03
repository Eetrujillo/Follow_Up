import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';

import { Notepad } from './notepad';
import { NotepadApiService } from '../../shared/services/notepad-api.service';
import { LibraryService } from '../../shared/services/library';
import { AiService } from '../../shared/services/ai.service';
import { TaskService } from '../../shared/services/task';

const SAVE_DEBOUNCE_MS = 900;

/**
 * The draft is read from and written to `/notepad`. This pins the load, the
 * debounced upsert and the "guardar en biblioteca" hand-off.
 */
describe('Notepad page', () => {
  let fixture: ComponentFixture<Notepad>;
  let savedDrafts: string[];
  let notes: { name: string; content: string }[];

  const emptyDraft = { id: null, userId: 'u1', contentHtml: '', lastModifiedAt: null };

  function arrange(
    getResult: Observable<unknown>,
    saveResult: Observable<unknown> = of(emptyDraft),
  ): void {
    savedDrafts = [];
    notes = [];

    TestBed.configureTestingModule({
      imports: [Notepad],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: NotepadApiService,
          useValue: {
            get: () => getResult,
            save: (contentHtml: string) => {
              savedDrafts.push(contentHtml);
              return saveResult;
            },
            delete: () => of({ deleted: true }),
          },
        },
        {
          provide: LibraryService,
          useValue: {
            saveNote: (name: string, content: string) => {
              notes.push({ name, content });
              return of([]);
            },
            folders: of([]),
            reloadForUser: () => undefined,
          },
        },
        { provide: AiService, useValue: { generateTasksFromNotes: () => of({}) } },
        { provide: TaskService, useValue: { reloadForUser: () => undefined } },
      ],
    });

    fixture = TestBed.createComponent(Notepad);
    fixture.detectChanges();
  }

  function editor(): HTMLElement {
    return fixture.debugElement.query(By.css('#editor, .editor')).nativeElement as HTMLElement;
  }

  async function waitForDebounce(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, SAVE_DEBOUNCE_MS));
    await fixture.whenStable();
  }

  it('renders the draft stored on the server and counts its characters', async () => {
    arrange(of({ id: 'n1', userId: 'u1', contentHtml: '<p>Hola mundo</p>', lastModifiedAt: null }));
    await fixture.whenStable();

    expect(editor().innerHTML).toContain('Hola mundo');
    expect(fixture.nativeElement.textContent).toContain('10 / 3000');
  });

  it('upserts the draft with the editor HTML after the debounce', async () => {
    arrange(of(emptyDraft));
    await fixture.whenStable();

    editor().innerHTML = '<p>Primera nota</p>';
    fixture.componentInstance.onContentChange();
    await waitForDebounce();

    expect(savedDrafts).toEqual(['<p>Primera nota</p>']);
  });

  it('shows the error line when the draft cannot be saved', async () => {
    arrange(of(emptyDraft), throwError(() => new Error('boom')));
    await fixture.whenStable();

    editor().innerHTML = '<p>Sin conexion</p>';
    fixture.componentInstance.onContentChange();
    await waitForDebounce();

    expect(fixture.nativeElement.textContent).toContain('No se pudo guardar la nota en el servidor');
  });

  it('sends the note name and its plain text to the library', async () => {
    arrange(of({ id: 'n1', userId: 'u1', contentHtml: '<p>Hola mundo</p>', lastModifiedAt: null }));
    await fixture.whenStable();

    fixture.debugElement.query(By.css('.btn-library')).nativeElement.click();
    await fixture.whenStable();

    const input = fixture.debugElement.query(By.css('.modal input')).nativeElement as HTMLInputElement;
    input.value = 'Resumen';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    fixture.debugElement.query(By.css('.modal .btn-save')).nativeElement.click();
    await fixture.whenStable();

    expect(notes).toEqual([{ name: 'Resumen', content: 'Hola mundo' }]);
    expect(fixture.nativeElement.textContent).toContain('Guardado en biblioteca');
  });
});
