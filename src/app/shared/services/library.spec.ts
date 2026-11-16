import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { LibraryService } from './library';
import { AuthService } from './auth.service';

/**
 * The suite shares one `--localstorage-file` between spec files, so this one owns
 * its storage: another file calling `localStorage.clear()` in parallel must not
 * wipe the fixtures the assertions depend on.
 */
class MemoryStorage {
  private readonly items = new Map<string, string>();

  get length(): number {
    return this.items.size;
  }

  clear(): void {
    this.items.clear();
  }

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.items.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.items.delete(key);
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
}

describe('Library', () => {
  let service: LibraryService;
  let currentUserId = 'alice';
  let storage: MemoryStorage;

  const foldersOf = (name: string) => [{ id: name, name, documents: [] }];

  beforeEach(() => {
    storage = new MemoryStorage();
    vi.stubGlobal('localStorage', storage);
    storage.setItem('library_alice', JSON.stringify(foldersOf('Alice')));
    storage.setItem('library_bob', JSON.stringify(foldersOf('Bob')));

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            getCurrentUser: () => ({ id: currentUserId, fullName: '', email: '', createdAt: '' }),
          },
        },
      ],
    });
    service = TestBed.inject(LibraryService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('switches to the new account cache when the session changes', () => {
    expect(service.getFolders()[0].name).toBe('Alice');

    currentUserId = 'bob';
    service.reloadForUser();

    // Showing the previous account's documents on a shared browser is the leak
    // this reload exists to prevent.
    expect(service.getFolders()[0].name).toBe('Bob');
  });
});
