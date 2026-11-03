import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';

import { App } from './app';

@Component({ selector: 'test-route', standalone: true, template: '' })
class TestRouteComponent {}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([
          { path: '', component: TestRouteComponent },
          { path: 'login', component: TestRouteComponent },
          { path: 'dashboard', component: TestRouteComponent },
        ]),
      ],
    }).compileComponents();
  });

  it('renders the sidebar on a work route', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('app-sidebar')).toBeTruthy();
  });

  it('hides the sidebar on the login route and brings it back on a work route', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await fixture.whenStable();

    await router.navigateByUrl('/login');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('app-sidebar')).toBeFalsy();

    await router.navigateByUrl('/dashboard');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('app-sidebar')).toBeTruthy();
  });
});
