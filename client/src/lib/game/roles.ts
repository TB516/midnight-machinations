import roleDataJson from '../../resources/roles.json';

import type { ListMapData } from './list-map';

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

export const INSIDER_GROUPS = ['mafia', 'cult', 'puppeteer'] as const;

export type Role = keyof typeof roleDataJson;
export type RoleSet = (typeof ROLE_SETS)[number];
export type Conclusion = (typeof CONCLUSIONS)[number];
export type InsiderGroup = (typeof INSIDER_GROUPS)[number];

export type WinCondition =
	| { type: 'gameConclusionReached'; winIfAny: Conclusion[] }
	| { type: 'roleStateWon' };

export interface RoleJsonEntry {
	mainRoleSet: RoleSet;
	roleSets: RoleSet[];
	armor: boolean;
	aura: 'innocent' | 'suspicious' | null;
	maxCount: number | null;
	canWriteCallingCard: boolean;
	chatMessages: unknown[];
}

export type RoleJsonData = Record<Role, RoleJsonEntry>;

export const roleData = roleDataJson as RoleJsonData;

export function allRoles(): Role[] {
	return Object.keys(roleData) as Role[];
}

export function rolesForSet(roleSet: RoleSet): Role[] {
	if (roleSet === 'any') {
		return allRoles();
	}

	return allRoles().filter((role) => roleData[role].roleSets.includes(roleSet));
}

export function roleSetsForRole(role: Role): RoleSet[] {
	return [...roleData[role].roleSets, 'any'];
}

export type AbilityID =
	| { type: 'role'; role: Role; player: PlayerIndex }
	| { type: 'pitchfork' }
	| { type: 'syndicateGun' }
	| { type: 'pawnConvert' };

export function abilityIdKey(id: AbilityID): string {
	if (id.type === 'role') {
		return `role/${id.role}/${id.player}`;
	}

	return id.type;
}

export type PlayerIndex = number;

/**
 * Role ability states are tagged with the concrete role by Serde. Fields differ
 * by role and evolve independently; common current fields are represented while
 * retaining future wire fields.
 */
export type ClientRoleState = {
	type: Role;
	[key: string]: unknown;
};

export type RoleStateMap = ListMapData<Role, ClientRoleState>;
