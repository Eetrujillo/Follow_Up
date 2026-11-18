import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Sidebar } from './sidebar';

describe('Sidebar', () => {
  let component: Sidebar;
  let fixture: ComponentFixture<Sidebar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Sidebar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('en un celular arranca colapsado para dejar ancho al contenido', () => {
    const originalWidth = window.innerWidth;
    try {
      window.innerWidth = 390;
      const mobile = TestBed.createComponent(Sidebar).componentInstance;
      expect(mobile.isCollapsed).toBe(true);
    } finally {
      window.innerWidth = originalWidth;
    }
  });

  it('en escritorio arranca expandido y el toggle sigue funcionando', () => {
    const originalWidth = window.innerWidth;
    try {
      window.innerWidth = 1280;
      const desktop = TestBed.createComponent(Sidebar).componentInstance;
      expect(desktop.isCollapsed).toBe(false);
      desktop.toggleSidebar();
      expect(desktop.isCollapsed).toBe(true);
    } finally {
      window.innerWidth = originalWidth;
    }
  });
});
