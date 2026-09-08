import defaultGameModesJson from '../../resources/defaultGameModes.json';
import enUs from '../../resources/lang/en_us.json';
import rolesJson from '../../resources/roles.json';
import type { GameModeStorage, ModifierId, Phase, RoleSet } from './types';

export type RoleId = keyof typeof rolesJson;

type RoleMetadata = {
  mainRoleSet: RoleSet;
  roleSets: RoleSet[];
};

const translations = enUs as Record<string, string>;
const metadata = rolesJson as Record<RoleId, RoleMetadata>;

export const roles = (Object.keys(rolesJson) as RoleId[])
  .map((id) => ({
    id,
    name: translations[`role.${id}.name`] ?? humanize(id),
    mainRoleSet: metadata[id].mainRoleSet,
    roleSets: metadata[id].roleSets
  }))
  .sort((left, right) => left.name.localeCompare(right.name));

export const roleIds = roles.map(({ id }) => id);

export const roleNames = Object.fromEntries(roles.map(({ id, name }) => [id, name])) as Record<
  RoleId,
  string
>;

export const roleSetNames: Record<RoleSet, string> = {
  any: 'Any role',
  town: 'Town',
  townCommon: 'Town common',
  townInvestigative: 'Town investigative',
  townProtective: 'Town protective',
  townKilling: 'Town killing',
  townSupport: 'Town support',
  mafia: 'Mafia',
  mafiaKilling: 'Mafia killing',
  mafiaSupport: 'Mafia support',
  neutral: 'Neutral',
  minions: 'Minions',
  fiends: 'Fiends',
  cult: 'Cult'
};

export const modifierNames: Record<ModifierId, string> = {
  obscuredGraves: 'Obscured graves',
  skipDay1: 'Skip day one',
  deadCanChat: 'Dead players can chat',
  abstaining: 'Allow abstaining',
  noDeathCause: 'Hide causes of death',
  roleSetGraveKillers: 'Show killer role sets on graves',
  autoGuilty: 'Automatic guilty vote',
  twoThirdsMajority: 'Two-thirds majority',
  noMajority: 'No majority required',
  noTrialPhases: 'Skip trial phases',
  noWhispers: 'Disable whispers',
  hiddenWhispers: 'Hide whisper recipients',
  noNightChat: 'Disable night chat',
  noChat: 'Disable all chat',
  unscheduledNominations: 'Unscheduled nominations',
  hiddenNominationVotes: 'Hide nomination votes',
  hiddenVerdictVotes: 'Hide verdict votes',
  forfeitNominationVote: 'Forfeit nomination vote',
  randomPlayerNames: 'Random player names',
  customRoleLimits: 'Custom role limits'
};

export const phaseNames: Record<Phase, string> = {
  briefing: 'Briefing',
  obituary: 'Obituary',
  discussion: 'Discussion',
  nomination: 'Nomination',
  adjournment: 'Adjournment',
  testimony: 'Testimony',
  judgement: 'Judgement',
  finalWords: 'Final words',
  dusk: 'Dusk',
  night: 'Night'
};

export const languageNames = {
  en_us: (enUs as { language?: string }).language ?? 'English',
  broken_keyboard: 'Broken Keyboard',
  dyslexic: 'Scrambled'
} as const;

export const rawDefaultGameModes = defaultGameModesJson as unknown as GameModeStorage<RoleId>;

export function isRoleId(value: string): value is RoleId {
  return Object.hasOwn(rolesJson, value);
}

export function humanize(value: string): string {
  const spaced = value.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replaceAll('_', ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
