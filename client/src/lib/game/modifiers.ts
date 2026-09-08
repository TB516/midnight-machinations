import type { ListMapData } from './list-map';
import type { Role } from './roles';

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

export type ModifierID = (typeof MODIFIERS)[number];
export type ModifierState =
	| { type: Exclude<ModifierID, 'customRoleLimits'> }
	| { type: 'customRoleLimits'; limits: ListMapData<Role, number> };

export interface ModifierSettings {
	modifiers: ListMapData<ModifierID, ModifierState>;
}

export function defaultModifierState(id: ModifierID): ModifierState {
	if (id === 'customRoleLimits') {
		return { type: id, limits: [] };
	}

	return { type: id };
}
