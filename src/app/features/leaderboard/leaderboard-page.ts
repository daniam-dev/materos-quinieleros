import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { QuinielaStore } from '../../core/data/quiniela-store';
import { seasonRanking } from '../../domain/scoring';
import { MqPageHeader } from '../../shared/ui/page-header';
import { MqBadge } from '../../shared/ui/badge';
import { MqCard } from '../../shared/ui/card';
import { MqEmptyState } from '../../shared/ui/empty-state';
@Component({
  selector: 'mq-leaderboard-page',
  imports: [DecimalPipe, RouterLink, MqPageHeader, MqBadge, MqCard, MqEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './leaderboard-page.html',
})
export class LeaderboardPage {
  readonly store = inject(QuinielaStore);
  readonly rows = computed(() => {
    const snapshot = this.store.snapshot();
    return snapshot ? seasonRanking(snapshot) : [];
  });
}
