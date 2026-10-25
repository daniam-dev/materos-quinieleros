import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MqEmptyState } from './ui/empty-state';
@Component({
  selector: 'mq-not-found',
  imports: [RouterLink, MqEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template:
    '<mq-empty-state title="Esta página está fuera de juego" message="La dirección no corresponde a una sección de Materos."><a class="text-link" routerLink="/jornadas">Volver a Jornadas</a></mq-empty-state>',
})
export class NotFound {}
