export type Sign = '1' | 'X' | '2';
export type PredictionSign = Sign | '1X' | '12' | 'X2';
export type GoalPrediction = '0' | '1' | '2' | 'M';
export interface Participant {
  readonly id: string;
  readonly name: string;
  readonly surname: string;
  readonly initials: string;
  readonly active: boolean;
  readonly role: 'admin' | 'participant';
}
export interface Season {
  readonly id: string;
  readonly label: string;
}
export interface Fixture {
  readonly id: string;
  readonly number: number;
  readonly home: string;
  readonly away: string;
  readonly kickoff: string | null;
  readonly status: 'scheduled' | 'live' | 'finished' | 'postponed' | 'suspended' | 'cancelled';
  readonly score?: { readonly home: number; readonly away: number };
  readonly minute?: number;
  readonly category?: 'men' | 'women' | 'unknown';
  readonly competitionName?: string | null;
  readonly scoreSource?: 'SELAE' | 'OddsPapi';
  readonly scoreScope?: 'coupon' | 'regulation';
  readonly scoreUpdatedAt?: string;
  readonly stale?: boolean;
  readonly scorePeriods?: Readonly<
    Record<string, { readonly home: number; readonly away: number }>
  >;
}
export interface OfficialResult {
  readonly fixtureId: string;
  readonly sign: Sign;
  readonly source: 'sporting' | 'administrative' | 'selae';
  readonly publishedAt: string;
  readonly note?: string;
}
export interface Prediction {
  readonly participantId: string;
  readonly fixtureId: string;
  readonly sign: PredictionSign;
}
export interface PlenoPrediction {
  readonly participantId: string;
  readonly home: GoalPrediction;
  readonly away: GoalPrediction;
}
export interface Journey {
  readonly id: string;
  readonly seasonId: string;
  readonly number: number;
  readonly competition: 'league' | 'europe' | 'mixed';
  readonly startsAt: string;
  readonly endsAt: string;
  readonly closesAt: string | null;
  readonly officialId?: string;
  readonly syncStatus?: 'ok' | 'error';
  readonly checkedAt?: string;
  readonly participantIds: readonly string[];
  readonly fixtures: readonly Fixture[];
  readonly predictions: readonly Prediction[];
  readonly officialResults: readonly OfficialResult[];
  readonly pleno: {
    readonly fixture: Fixture;
    readonly predictions: readonly PlenoPrediction[];
    readonly official?: {
      readonly home: GoalPrediction;
      readonly away: GoalPrediction;
      readonly publishedAt: string;
    };
  };
}
export interface SeasonSnapshot {
  readonly synchronization?: Readonly<
    Record<
      string,
      {
        readonly state: string;
        readonly message?: string;
        readonly checkedAt?: string;
        readonly used?: number;
        readonly operational?: number;
        readonly coverage?: number;
      }
    >
  >;
  readonly season: Season;
  readonly participants: readonly Participant[];
  readonly journeys: readonly Journey[];
  /** Selección automática del servidor; null cuando todavía no hay jornadas. */
  readonly currentJourneyId: string | null;
  /** Reloj del servidor utilizado para la publicación real. */
  readonly asOf: string;
}
