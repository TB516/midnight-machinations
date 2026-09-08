import type { RoleOutline, RoleList } from './role-list';
import type { PlayerIndex, Role, RoleSet } from './roles';

export type GraveReference = number;
export type GravePhase = 'day' | 'night';

export interface Grave {
	player: PlayerIndex;
	diedPhase: GravePhase;
	dayNumber: number;
	information: GraveInformation;
}

export type GraveInformation =
	| { type: 'obscured' }
	| {
			type: 'normal';
			role: Role;
			alibi: string;
			deathCauses: GraveDeathCause[];
			callingCards: string[];
	  };

export type GraveDeathCause =
	| { type: 'execution' | 'ascension' | 'suicide' | 'quit' }
	| { type: 'roleSet'; value: RoleSet }
	| { type: 'role'; value: Role };

// Re-exporting these related wire shapes keeps grave/controller consumers simple.
export type { RoleList, RoleOutline };
