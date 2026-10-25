import { TestBed } from '@angular/core/testing';
import { MqButton } from './button';
describe('MqButton', () => {
  it('emite una acción por clic y respeta disabled y loading', async () => {
    const fixture = TestBed.createComponent(MqButton);
    const activated = vi.fn();
    fixture.componentInstance.activated.subscribe(activated);
    await fixture.whenStable();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    button.click();
    expect(activated).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput('disabled', true);
    await fixture.whenStable();
    button.click();
    expect(activated).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput('disabled', false);
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
  });
  it('expone el estado de selección a tecnologías de asistencia', async () => {
    const fixture = TestBed.createComponent(MqButton);
    fixture.componentRef.setInput('pressed', true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('button').getAttribute('aria-pressed')).toBe('true');
  });
});
