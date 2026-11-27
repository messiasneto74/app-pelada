import { DestroyRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LiveRefreshService } from './live-refresh';

describe('LiveRefreshService (issue #233)', () => {
  let onDestroy: (() => void) | null;
  const destroyRef = { onDestroy: (fn: () => void) => (onDestroy = fn) } as unknown as DestroyRef;

  beforeEach(() => {
    onDestroy = null;
    jasmine.clock().install();
  });
  afterEach(() => jasmine.clock().uninstall());

  it('chama a atualização a cada intervalo e para ao destruir a tela', () => {
    const refresh = jasmine.createSpy('refresh');
    TestBed.inject(LiveRefreshService).start(destroyRef, refresh, 5000);
    jasmine.clock().tick(5001);
    expect(refresh).toHaveBeenCalledTimes(1);
    jasmine.clock().tick(5000);
    expect(refresh).toHaveBeenCalledTimes(2);
    onDestroy!();
    jasmine.clock().tick(20000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('não atualiza com a tela em segundo plano', () => {
    const refresh = jasmine.createSpy('refresh');
    const vis = spyOnProperty(document, 'visibilityState', 'get').and.returnValue('hidden');
    TestBed.inject(LiveRefreshService).start(destroyRef, refresh, 5000);
    jasmine.clock().tick(15000);
    expect(refresh).not.toHaveBeenCalled();
    vis.and.returnValue('visible');
    jasmine.clock().tick(5000);
    expect(refresh).toHaveBeenCalledTimes(1);
    onDestroy!();
  });
});
