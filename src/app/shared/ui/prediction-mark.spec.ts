import { TestBed } from '@angular/core/testing';
import { MqPredictionMark } from './prediction-mark';
describe('MqPredictionMark', () => {
  it('comunica el estado mediante texto además del color', async () => {
    const fixture = TestBed.createComponent(MqPredictionMark);
    fixture.componentRef.setInput('value', '1');
    fixture.componentRef.setInput('state', 'hit');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('1, acierto');
    fixture.componentRef.setInput('state', 'miss');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('1, fallo');
  });
});
