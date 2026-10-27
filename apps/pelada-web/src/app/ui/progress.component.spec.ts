import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PeladaProgressComponent } from './progress.component';

describe('PeladaProgressComponent', () => {
  let fixture: ComponentFixture<PeladaProgressComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PeladaProgressComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(PeladaProgressComponent);
  });

  it('limita valor entre 0 e 100', () => {
    fixture.componentRef.setInput('value', 150);
    fixture.detectChanges();
    const fill = fixture.nativeElement.querySelector('.pelada-progress__fill') as HTMLElement;
    expect(fill.style.width).toBe('100%');
  });
});
