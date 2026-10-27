import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PeladaSwitchComponent } from './switch.component';

describe('PeladaSwitchComponent', () => {
  let fixture: ComponentFixture<PeladaSwitchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PeladaSwitchComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(PeladaSwitchComponent);
    fixture.detectChanges();
  });

  it('alterna checked ao clicar', () => {
    const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    btn.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.checked()).toBe(true);
    expect(btn.classList.contains('pelada-switch--on')).toBe(true);
  });
});
