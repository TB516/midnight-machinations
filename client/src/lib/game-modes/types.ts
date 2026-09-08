export const PHASES = [
  'briefing',
  'obituary',
  'discussion',
  'nomination',
  'adjournment',
  'testimony',
  'judgement',
  'finalWords',
  'dusk',
  'night'
] as const;

export type Phase = (typeof PHASES)[number];
export type PhaseTimes = Record<Phase, number>;

export const ROLE_SETS = [
  'any',
  'town',
  'townCommon',
  'townInvestigative',
  'townProtective',
  'townKilling',
  'townSupport',
  'mafia',
  'mafiaKilling',
  'mafiaSupport',
  'neutral',
  'minions',
  'fiends',
  'cult'
] as const;

export type RoleSet = (typeof ROLE_SETS)[number];

export const CONCLUSIONS = [
  'town',
  'mafia',
  'cult',
  'fiends',
  'politician',
  'niceList',
  'naughtyList',
  'draw'
] as const;

export type Conclusion = (typeof CONCLUSIONS)[number];

export const INSIDER_GROUPS = ['mafia', 'cult', 'puppeteer'] as const;

export type InsiderGroup = (typeof INSIDER_GROUPS)[number];

export const MODIFIERS = [
  'obscuredGraves',
  'skipDay1',
  'deadCanChat',
  'abstaining',
  'noDeathCause',
  'roleSetGraveKillers',
  'autoGuilty',
  'twoThirdsMajority',
  'noMajority',
  'noTrialPhases',
  'noWhispers',
  'hiddenWhispers',
  'noNightChat',
  'noChat',
  'unscheduledNominations',
  'hiddenNominationVotes',
  'hiddenVerdictVotes',
  'forfeitNominationVote',
  'randomPlayerNames',
  'customRoleLimits'
] as const;

export type ModifierId = (typeof MODIFIERS)[number];

export type RoleOption<Role extends string = string> = (
  | { role: Role; roleSet?: never }
  | { role?: never; roleSet: RoleSet }
) & {
  winIfAny?: Conclusion[];
  insiderGroups?: InsiderGroup[];
  playerPool?: number[];
};

export type RoleOutline<Role extends string = string> = RoleOption<Role>[];
export type RoleList<Role extends string = string> = RoleOutline<Role>[];

export type ModifierState<Role extends string = string> = {
  type: ModifierId;
  limits?: [Role, number][];
};

export type ModifierSettings<Role extends string = string> = [ModifierId, ModifierState<Role>][];

export type GameModeData<Role extends string = string> = {
  roleList: RoleList<Role>;
  phaseTimes: PhaseTimes;
  enabledRoles: Role[];
  modifierSettings: ModifierSettings<Role>;
  /** A null seed lets the server choose one. Older saved modes omit this field. */
  randomSeed?: number | null;
};

export type GameMode<Role extends string = string> = {
  name: string;
  /** Player counts are serialized as object keys. */
  data: Record<number, GameModeData<Role>>;
};

export type GameModeStorage<Role extends string = string> = {
  format: string;
  gameModes: GameMode<Role>[];
};

export type ShareableGameMode<Role extends string = string> = GameModeData<Role> & {
  format: string;
  name: string;
};

export const MENU_IDS = [
  'WikiMenu',
  'GraveyardMenu',
  'PlayerListMenu',
  'ChatMenu',
  'WillMenu',
  'RoleSpecificMenu'
] as const;

export type MenuId = (typeof MENU_IDS)[number];
export type MenuPreference = [MenuId, boolean];

export const LANGUAGES = ['en_us', 'broken_keyboard', 'dyslexic'] as const;
export type Language = (typeof LANGUAGES)[number];

export type Settings = {
  format: string;
  volume: number;
  fontSize: number;
  accessibilityFont: boolean;
  defaultName: string | null;
  language: Language;
  maxMenus: number;
  menuOrder: MenuPreference[];
  headerEnabled?: boolean;
};

export type ReconnectData = {
  roomCode: number;
  playerId: number;
  lastSaveTime: number;
};

export type ParseSuccess<T> = { ok: true; value: T };
export type ParseFailure = { ok: false; reason: string; snippet: string };
export type ParseResult<T> = ParseSuccess<T> | ParseFailure;

export function defaultPhaseTimes(): PhaseTimes {
  return {
    briefing: 45,
    obituary: 20,
    discussion: 100,
    nomination: 35,
    adjournment: 60,
    testimony: 30,
    judgement: 30,
    finalWords: 10,
    dusk: 30,
    night: 60
  };
}

export function defaultModifierState<Role extends string>(modifier: ModifierId): ModifierState<Role> {
  if (modifier === 'customRoleLimits') {
    return { type: modifier, limits: [] };
  }

  return { type: modifier };
}

export function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
