import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PeladaChipComponent } from './chip.component';

describe('PeladaChipComponent', () => {
  let fixture: ComponentFixture<PeladaChipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PeladaChipComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(PeladaChipComponent);
  });

  it('variante verde', () => {
    fixture.componentRef.setInput('variant', 'green');
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('span');
    expect(el.className).toContain('pelada-chip--green');
  });
});
