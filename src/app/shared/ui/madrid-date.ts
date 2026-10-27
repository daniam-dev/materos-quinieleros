import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'madridDate' })
export class MadridDatePipe implements PipeTransform {
  transform(value: string | null | undefined, format = 'dd/MM/yyyy HH:mm'): string {
    if (!value || !Number.isFinite(Date.parse(value))) return 'Pendiente';
    return new Intl.DateTimeFormat('es', {
      timeZone: 'Europe/Madrid',
      day: '2-digit',
      month: '2-digit',
      ...(format.includes('yyyy') ? { year: 'numeric' as const } : {}),
      ...(format.includes('HH') ? { hour: '2-digit' as const, minute: '2-digit' as const } : {}),
    }).format(new Date(value));
  }
}
