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
	'night',
	'recess'
] as const;

export type PhaseType = (typeof PHASES)[number];

export type PhaseState =
	| { type: 'briefing' | 'obituary' | 'discussion' | 'dusk' | 'night' | 'recess' }
	| { type: 'nomination' | 'adjournment'; trialsLeft: number }
	| { type: 'testimony' | 'judgement'; trialsLeft: number; playerOnTrial: number }
	| { type: 'finalWords'; playerOnTrial: number };

export type PhaseTimeSettings = Record<Exclude<PhaseType, 'recess'>, number>;

export function defaultPhaseTimes(): PhaseTimeSettings {
	return {
		briefing: 45,
		obituary: 20,
		discussion: 100,
		nomination: 100,
		adjournment: 60,
		testimony: 30,
		judgement: 30,
		finalWords: 10,
		dusk: 30,
		night: 60
	};
}

export type FastForwardSetting =
	| { type: 'none' }
	| { type: 'skip' }
	| { type: 'phase'; phase: PhaseType; day: number };
