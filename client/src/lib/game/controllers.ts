import type { GraveDeathCause } from './graves';
import type { ChatMessageIndex } from './chat';
import type { ListMapData } from './list-map';
import type { PhaseType } from './phases';
import type { PlayerIndex, Role } from './roles';

export type RoleControllerID = number;
export type KiraGuess = 'none' | 'nonTown' | Role;

type PlayerControllerType =
	| 'callWitness'
	| 'nominate'
	| 'judge'
	| 'chat'
	| 'chatIsBlock'
	| 'sendChat'
	| 'whisper'
	| 'whisperToPlayer'
	| 'sendWhisper'
	| 'alibi'
	| 'forfeitNominationVote'
	| 'pitchforkVote'
	| 'forwardMessage';

type GlobalControllerType =
	| 'syndicateGunShoot'
	| 'syndicateGunGive'
	| 'syndicateChooseBackup'
	| 'syndicateBackupAttack';

export type ControllerID =
	| { type: PlayerControllerType; player: PlayerIndex }
	| { type: GlobalControllerType }
	| { type: 'role'; player: PlayerIndex; role: Role; id: RoleControllerID }
	| { type: 'wardenCooperate'; warden: PlayerIndex; player: PlayerIndex }
	| { type: 'lichVote'; lich: PlayerIndex; player: PlayerIndex };

export type ControllerIDLink = `role/${Role}/${RoleControllerID}` | ControllerID['type'];

export function controllerIdLink(id: ControllerID): ControllerIDLink {
	if (id.type === 'role') {
		return `role/${id.role}/${id.id}`;
	}

	return id.type;
}

/** Stable key for object-valued VecMap keys. */
export function controllerIdKey(id: ControllerID): string {
	if (id.type === 'role') {
		return `role/${id.player}/${id.role}/${id.id}`;
	}
	if (id.type === 'wardenCooperate') {
		return `${id.type}/${id.warden}/${id.player}`;
	}
	if (id.type === 'lichVote') {
		return `${id.type}/${id.lich}/${id.player}`;
	}
	if ('player' in id) {
		return `${id.type}/${id.player}`;
	}

	return id.type;
}

export function controllerIdsEqual(left: ControllerID, right: ControllerID): boolean {
	return controllerIdKey(left) === controllerIdKey(right);
}

export type ControllerSelection =
	| { type: 'unit'; selection: null }
	| { type: 'boolean'; selection: boolean }
	| { type: 'playerList'; selection: PlayerIndex[] }
	| { type: 'twoPlayerOption'; selection: [PlayerIndex, PlayerIndex] | null }
	| { type: 'roleList'; selection: Role[] }
	| { type: 'twoRoleOption'; selection: [Role | null, Role | null] }
	| { type: 'twoRoleOutlineOption'; selection: [number | null, number | null] }
	| { type: 'graveDeathCauses'; selection: GraveDeathCause[] }
	| { type: 'string'; selection: string }
	| { type: 'integer'; selection: number }
	| { type: 'kira'; selection: ListMapData<PlayerIndex, KiraGuess> }
	| { type: 'chatMessage'; selection: ChatMessageIndex | null };

export type AvailableControllerSelection =
	| { type: 'unit'; selection: null }
	| { type: 'boolean'; selection: null }
	| {
			type: 'playerList';
			selection: {
				availablePlayers: PlayerIndex[];
				canChooseDuplicates: boolean;
				maxPlayers: number | null;
			};
	  }
	| {
			type: 'twoPlayerOption';
			selection: {
				availableFirstPlayers: PlayerIndex[];
				availableSecondPlayers: PlayerIndex[];
				canChooseDuplicates: boolean;
				canChooseNone: boolean;
			};
	  }
	| {
			type: 'roleList';
			selection: { availableRoles: Role[]; canChooseDuplicates: boolean; maxRoles: number | null };
	  }
	| {
			type: 'twoRoleOption';
			selection: { availableRoles: Array<Role | null>; canChooseDuplicates: boolean };
	  }
	| { type: 'twoRoleOutlineOption'; selection: Array<number | null> }
	| { type: 'graveDeathCauses'; selection: null }
	| { type: 'string'; selection: null }
	| { type: 'integer'; selection: { min: number; max: number } }
	| { type: 'kira'; selection: { countMustGuess: number } }
	| { type: 'chatMessage'; selection: null };

export interface ControllerParameters {
	available: AvailableControllerSelection;
	grayedOut: boolean;
	resetOnPhaseStart: PhaseType | null;
	dontSave: boolean;
	defaultSelection: ControllerSelection;
	allowedPlayers: PlayerIndex[];
}

export interface Controller {
	selection: ControllerSelection;
	parameters: ControllerParameters;
}

export interface ControllerInput {
	id: ControllerID;
	selection: ControllerSelection;
}

export type ControllerMap = ListMapData<ControllerID, Controller>;

export function defaultControllerSelection(available: AvailableControllerSelection): ControllerSelection {
	switch (available.type) {
		case 'unit':
			return { type: 'unit', selection: null };
		case 'boolean':
			return { type: 'boolean', selection: false };
		case 'playerList':
			return { type: 'playerList', selection: [] };
		case 'twoPlayerOption':
			return { type: 'twoPlayerOption', selection: null };
		case 'roleList':
			return { type: 'roleList', selection: [] };
		case 'twoRoleOption':
			return { type: 'twoRoleOption', selection: [null, null] };
		case 'twoRoleOutlineOption':
			return { type: 'twoRoleOutlineOption', selection: [null, null] };
		case 'graveDeathCauses':
			return { type: 'graveDeathCauses', selection: [] };
		case 'string':
			return { type: 'string', selection: '' };
		case 'integer':
			return { type: 'integer', selection: 0 };
		case 'kira':
			return { type: 'kira', selection: [] };
		case 'chatMessage':
			return { type: 'chatMessage', selection: null };
	}
}
