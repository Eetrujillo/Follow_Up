import { TestBed } from '@angular/core/testing';
import { StorageService } from './storage';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [StorageService]
    });
    service = TestBed.inject(StorageService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set and get a value', () => {
    service.set('testKey', { a: 1 });
    const result = service.get<{ a: number }>('testKey', { a: 0 });
    expect(result).toEqual({ a: 1 });
  });

  it('should return default when key missing', () => {
    const result = service.get<number>('noKey', 42);
    expect(result).toBe(42);
  });

  it('should remove a key', () => {
    service.set('toRemove', 'x');
    service.remove('toRemove');
    const result = service.get<string | null>('toRemove', null);
    expect(result).toBeNull();
  });

  it('should clear all keys', () => {
    service.set('k1', 1);
    service.set('k2', 2);
    service.clear();
    expect(service.get<number>('k1', 0)).toBe(0);
    expect(service.get<number>('k2', 0)).toBe(0);
  });
});
