import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PeladaSegmentComponent } from './segment.component';

describe('PeladaSegmentComponent', () => {
  let fixture: ComponentFixture<PeladaSegmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PeladaSegmentComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(PeladaSegmentComponent);
    fixture.componentRef.setInput('options', [
      { value: 'all', label: 'Todos' },
      { value: 'gk', label: 'GK' },
    ]);
    fixture.componentRef.setInput('value', 'all');
    fixture.detectChanges();
  });

  it('seleciona opção', () => {
    const buttons = fixture.nativeElement.querySelectorAll('button');
    (buttons[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('gk');
  });
});
