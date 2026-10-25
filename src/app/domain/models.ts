export type Sign = '1' | 'X' | '2';
export type GoalPrediction = '0' | '1' | '2' | 'M';
export interface Participant {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
  readonly active: boolean;
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
  readonly kickoff: string;
  readonly status: 'scheduled' | 'live' | 'finished' | 'postponed';
  readonly score?: { readonly home: number; readonly away: number };
  readonly minute?: number;
}
export interface OfficialResult {
  readonly fixtureId: string;
  readonly sign: Sign;
  readonly source: 'sporting' | 'administrative';
  readonly publishedAt: string;
  readonly note?: string;
}
export interface Prediction {
  readonly participantId: string;
  readonly fixtureId: string;
  readonly sign: Sign;
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
  readonly startsAt: string;
  readonly endsAt: string;
  readonly closesAt: string;
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
  readonly season: Season;
  readonly participants: readonly Participant[];
  readonly journeys: readonly Journey[];
  /** Reloj congelado de la demostración; el servidor controlará la publicación real. */
  readonly asOf: string;
}
