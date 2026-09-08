import type { ControllerID, ControllerSelection, KiraGuess } from './controllers';
import type { Grave } from './graves';
import type { ListMapData } from './list-map';
import type { PhaseState } from './phases';
import type {
	AbilityID,
	Conclusion,
	InsiderGroup,
	PlayerIndex,
	Role,
	WinCondition
} from './roles';

export type ChatMessageIndex = number;
export type Verdict = 'innocent' | 'abstain' | 'guilty';
export type DefensePower = 'none' | 'armored' | 'protected' | 'invincible';
export type ChatGroup =
	| 'all'
	| 'dead'
	| 'mafia'
	| 'cult'
	| 'jail'
	| 'kidnapped'
	| 'interview'
	| 'puppeteer'
	| 'warden';

export type PlayerTag =
	| 'doused'
	| 'morticianTagged'
	| 'frame'
	| 'enfranchised'
	| 'puppeteerMarionette'
	| 'godfatherBackup'
	| 'syndicateGun'
	| 'werewolfTracked'
	| 'revolutionaryTarget'
	| 'spiraling'
	| 'forfeitNominationVote';

export type MessageSender =
	| { type: 'player'; player: PlayerIndex }
	| { type: 'livingToDead'; player: PlayerIndex }
	| { type: 'jailor' | 'reporter' };

export type VisitTag =
	| { type: 'ability'; ability: AbilityID; id: number }
	| { type: 'syndicateGun' | 'syndicateBackupAttack' | 'appeared' };

export type TrapState = { type: 'dismantled' | 'ready' | 'set' };
export type KiraGuessResult = 'correct' | 'notInGame' | 'wrongSpot';

export interface KiraResult {
	guesses: ListMapData<PlayerIndex, [KiraGuess, KiraGuessResult]>;
}

export interface SynopsisCrumb {
	night: number | null;
	role: Role;
	winCondition: WinCondition;
	insiderGroups: InsiderGroup[];
}

export interface PlayerSynopsis {
	outlineAssignment: number;
	crumbs: SynopsisCrumb[];
	won: boolean;
}

export interface Synopsis {
	playerSynopses: PlayerSynopsis[];
	conclusion: Conclusion;
}

type UnitChatVariant = {
	type:
		| 'phaseFastForwarded'
		| 'invalidWhisper'
		| 'politicianCountdownStarted'
		| 'mediumExists'
		| 'deputyShotYou'
		| 'werewolfTracked'
		| 'yourConvertFailed'
		| 'addedToNiceList'
		| 'addedToNaughtyList'
		| 'someoneSurvivedYourAttack'
		| 'youSurvivedAttack'
		| 'youGuardedSomeone'
		| 'youWereGuarded'
		| 'youDied'
		| 'youWereAttacked'
		| 'youAttackedSomeone'
		| 'youArePoisoned'
		| 'roleBlocked'
		| 'wardblocked'
		| 'psychicFailed'
		| 'transported'
		| 'silenced'
		| 'brained'
		| 'youWerePossessed'
		| 'revolutionaryWon'
		| 'mercenaryYouAreAHit'
		| 'pawnVisitedYou'
		| 'martyrWon'
		| 'martyrFailed';
};

export type ChatMessageVariant =
	| UnitChatVariant
	| { type: 'lobbyMessage'; sender: string; text: string }
	| { type: 'normal'; messageSender: MessageSender; text: string; block: boolean }
	| { type: 'whisper'; fromPlayerIndex: PlayerIndex; toPlayerIndex: PlayerIndex; text: string }
	| { type: 'broadcastWhisper'; whisperer: PlayerIndex; whisperee: PlayerIndex }
	| { type: 'roleAssignment' | 'gainedRoleAbility'; role: Role }
	| { type: 'playerDied'; grave: Grave }
	| { type: 'playersRoleRevealed'; player: PlayerIndex; role: Role }
	| { type: 'playersRoleConcealed'; player: PlayerIndex }
	| { type: 'tagAdded' | 'tagRemoved'; player: PlayerIndex; tag: PlayerTag }
	| { type: 'gameOver'; synopsis: Synopsis }
	| { type: 'playerQuit'; playerIndex: PlayerIndex; gameOver: boolean }
	| { type: 'phaseChange'; phase: PhaseState; dayNumber: number }
	| { type: 'trialInformation'; requiredVotes: number; trialsLeft: number }
	| { type: 'voted'; voter: PlayerIndex; votee: PlayerIndex | null }
	| { type: 'playerNominated'; playerIndex: PlayerIndex; playersVoted: PlayerIndex[] }
	| { type: 'judgementVerdict'; voterPlayerIndex: PlayerIndex; verdict: Verdict }
	| { type: 'trialVerdict'; playerOnTrial: PlayerIndex; innocent: number; guilty: number }
	| { type: 'witnessesCalled'; playerOnTrial: PlayerIndex; witnesses: PlayerIndex[] }
	| {
			type: 'abilityUsed';
			player: PlayerIndex;
			abilityId: ControllerID;
			selection: ControllerSelection;
	  }
	| { type: 'playerEnfranchised'; playerIndex: PlayerIndex }
	| { type: 'reporterReport'; report: string }
	| { type: 'playerIsBeingInterviewed' | 'jailedTarget' | 'jailedSomeone'; playerIndex: PlayerIndex }
	| { type: 'mediumHauntStarted' | 'mediumSeance'; medium: PlayerIndex; player: PlayerIndex }
	| { type: 'votesHidden'; value: boolean }
	| { type: 'deputyKilled'; shot: PlayerIndex }
	| { type: 'wardenPlayersImprisoned'; players: PlayerIndex[] }
	| { type: 'cultSacrificeCount'; count: number }
	| { type: 'puppeteerPlayerIsNowMarionette' | 'recruiterPlayerIsNowRecruit'; player: PlayerIndex }
	| { type: 'nextSantaAbility'; ability: 'naughty' | 'nice' }
	| { type: 'nextKrampusAbility'; ability: 'doNothing' | 'kill' }
	| { type: 'santaAddedPlayerToNaughtyList'; player: PlayerIndex }
	| { type: 'detectiveResult'; suspicious: boolean }
	| { type: 'lookoutResult' | 'trackerResult' | 'spyMafiaVisit'; players: PlayerIndex[] }
	| { type: 'seerResult' | 'gossipResult'; enemies: boolean }
	| { type: 'spyBug'; visitTags: VisitTag[] }
	| { type: 'psychicGood'; player: PlayerIndex }
	| { type: 'psychicEvil'; first: PlayerIndex; second: PlayerIndex }
	| { type: 'auditorResult'; outlineIndex: number; result: Role[] }
	| { type: 'dreamwalkerResult'; result: Role[] }
	| { type: 'dreamwalkerTarget'; target: PlayerIndex }
	| { type: 'snoopResult'; townie: boolean }
	| { type: 'polymathSnoopResult'; inno: boolean }
	| { type: 'tallyClerkResult'; evilCount: number }
	| { type: 'trapState' | 'trapStateEndOfNight'; state: TrapState }
	| { type: 'fragileVestBreak'; playerWithVest: PlayerIndex; defense: DefensePower }
	| { type: 'godfatherBackup'; backup: PlayerIndex | null }
	| { type: 'godfatherBackupKilled'; backup: PlayerIndex }
	| { type: 'playerRoleAndAlibi'; player: PlayerIndex; role: Role; will: string }
	| {
			type: 'informantResult';
			player: PlayerIndex;
			role: Role;
			visitedBy: PlayerIndex[];
			visited: PlayerIndex[];
			winCondition: WinCondition;
	  }
	| { type: 'ambusherCaught'; ambusher: PlayerIndex }
	| { type: 'targetsMessage'; message: ChatMessageVariant }
	| { type: 'playerForwardedMessage'; forwarder: PlayerIndex; message: ChatMessageVariant }
	| { type: 'targetHasRole'; role: Role }
	| { type: 'targetHasWinCondition'; winCondition: WinCondition }
	| { type: 'werewolfTrackingResult'; trackedPlayer: PlayerIndex; players: PlayerIndex[] }
	| { type: 'chronokaiserSpeedUp'; percent: number }
	| { type: 'mercenaryResult'; hit: boolean }
	| { type: 'mercenaryHits'; roles: Role[] }
	| { type: 'kiraResult'; result: KiraResult }
	| { type: 'martyrRevealed'; martyr: PlayerIndex }
	| { type: 'wildcardConvertFailed'; role: Role };

export interface ChatMessage {
	variant: ChatMessageVariant;
	chatGroup: ChatGroup | null;
}
