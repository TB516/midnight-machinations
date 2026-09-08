import type { ChatMessage, ChatMessageIndex, ChatGroup, PlayerTag } from './chat';
import type { Controller, ControllerID, ControllerInput, ControllerMap } from './controllers';
import type { Grave, GraveReference } from './graves';
import type { ListMapData } from './list-map';
import type { ModifierSettings } from './modifiers';
import type { FastForwardSetting, PhaseState, PhaseTimeSettings, PhaseType } from './phases';
import type { RoleList, RoleOutline } from './role-list';
import type { AbilityID, ClientRoleState, InsiderGroup, PlayerIndex, Role } from './roles';

export type RoomCode = number;
export type RoomClientID = number;
export type ClientConnection = 'connected' | 'couldReconnect' | 'disconnected';

export type LobbyClientType = { type: 'spectator' } | { type: 'player'; name: string };

export interface LobbyClient {
	connection: ClientConnection;
	ready: 'host' | 'ready' | 'notReady';
	clientType: LobbyClientType;
}

export type GameClientLocation =
	| { type: 'player'; index: PlayerIndex }
	| { type: 'spectator'; index: number };

export interface HostGameClient {
	clientType: GameClientLocation;
	connection: ClientConnection;
	host: boolean;
}

export interface RoomPreviewData {
	name: string;
	inGame: boolean;
	players: ListMapData<RoomClientID, string>;
}

export type RejectJoinReason =
	| 'gameAlreadyStarted'
	| 'roomFull'
	| 'roomDoesntExist'
	| 'serverBusy'
	| 'playerTaken'
	| 'playerDoesntExist';

export type RejectStartReason =
	| 'tooManyClients'
	| 'gameEndsInstantly'
	| 'roleListTooSmall'
	| 'roleListCannotCreateRoles'
	| 'zeroTimeGame'
	| 'playerDisconnected';

export type GameOverReason = 'reachedMaxDay' | 'winner' | 'draw';

export type ToClientPacket =
	| { type: 'pong' }
	| { type: 'rateLimitExceeded' }
	| { type: 'forcedDisconnect' }
	| { type: 'forcedOutsideLobby' }
	| { type: 'lobbyList'; lobbies: Record<string, RoomPreviewData> }
	| {
			type: 'acceptJoin';
			roomCode: RoomCode;
			inGame: boolean;
			playerId: RoomClientID;
			spectator: boolean;
	  }
	| { type: 'rejectJoin'; reason: RejectJoinReason }
	| { type: 'lobbyName'; name: string }
	| { type: 'yourId'; playerId: RoomClientID }
	| { type: 'lobbyClients'; clients: ListMapData<RoomClientID, LobbyClient> }
	| { type: 'playersHost'; hosts: RoomClientID[] }
	| { type: 'playersReady'; ready: RoomClientID[] }
	| { type: 'playersLostConnection'; lostConnection: RoomClientID[] }
	| { type: 'startGame' }
	| { type: 'rejectStart'; reason: RejectStartReason }
	| { type: 'roleList'; roleList: RoleList }
	| { type: 'randomSeed'; randomSeed: number | null }
	| { type: 'roleOutline'; index: number; roleOutline: RoleOutline }
	| { type: 'phaseTime'; phase: PhaseType; time: number }
	| { type: 'phaseTimes'; phaseTimeSettings: PhaseTimeSettings }
	| { type: 'enabledRoles'; roles: Role[] }
	| { type: 'modifierSettings'; modifierSettings: ModifierSettings }
	| { type: 'hostData'; clients: ListMapData<RoomClientID, HostGameClient> }
	| { type: 'gamePlayers'; players: string[] }
	| { type: 'gameInitializationComplete' }
	| { type: 'backToLobby' }
	| { type: 'yourPlayerIndex'; playerIndex: PlayerIndex }
	| { type: 'yourFellowInsiders'; fellowInsiders: PlayerIndex[] }
	| { type: 'phase'; phase: PhaseState; dayNumber: number }
	| { type: 'phaseTimeLeft'; secondsLeft: number | null }
	| { type: 'playerAlive'; alive: boolean[] }
	| { type: 'playerVotes'; votesForPlayer: ListMapData<PlayerIndex, number> }
	| { type: 'yourSendChatGroups'; sendChatGroups: ChatGroup[] }
	| { type: 'yourInsiderGroups'; insiderGroups: InsiderGroup[] }
	| { type: 'yourAllowedControllers'; save: ControllerMap }
	| { type: 'yourAllowedController'; id: ControllerID; controller: Controller | null }
	| { type: 'yourRoleLabels'; roleLabels: ListMapData<PlayerIndex, Role> }
	| { type: 'yourPlayerTags'; playerTags: ListMapData<PlayerIndex, PlayerTag[]> }
	| { type: 'yourNotes'; notes: string[] }
	| { type: 'yourCrossedOutOutlines'; crossedOutOutlines: number[] }
	| { type: 'yourCallingCard'; callingCard: string | null }
	| { type: 'yourRole'; role: Role }
	| { type: 'abilityState'; abilityId: AbilityID; abilityState: ClientRoleState }
	| { type: 'yourVoteFastForwardPhase'; fastForward: FastForwardSetting }
	| { type: 'addChatMessages'; chatMessages: ListMapData<ChatMessageIndex, ChatMessage> }
	| { type: 'addGrave'; grave: Grave; graveRef: GraveReference }
	| { type: 'nightMessages'; chatMessages: ChatMessage[] }
	| { type: 'gameOver'; reason: GameOverReason };

export type ToServerPacket =
	| { type: 'ping' }
	| { type: 'lobbyListRequest' }
	| { type: 'reJoin'; roomCode: RoomCode; playerId: RoomClientID }
	| { type: 'join'; roomCode: RoomCode }
	| { type: 'host' }
	| { type: 'leave' }
	| { type: 'kick'; playerId: RoomClientID }
	| { type: 'setPlayerHost'; playerId: RoomClientID }
	| { type: 'relinquishHost' }
	| { type: 'sendLobbyMessage'; text: string }
	| { type: 'setSpectator'; spectator: boolean }
	| { type: 'setName'; name: string }
	| { type: 'readyUp'; ready: boolean }
	| { type: 'setLobbyName'; name: string }
	| { type: 'startGame' }
	| { type: 'setRoleList'; roleList: RoleList }
	| { type: 'setRandomSeed'; randomSeed: number | null }
	| { type: 'setRoleOutline'; index: number; roleOutline: RoleOutline }
	| { type: 'simplifyRoleList' }
	| { type: 'setPhaseTime'; phase: PhaseType; time: number }
	| { type: 'setPhaseTimes'; phaseTimeSettings: PhaseTimeSettings }
	| { type: 'setEnabledRoles'; roles: Role[] }
	| { type: 'setModifierSettings'; modifierSettings: ModifierSettings }
	| { type: 'hostDataRequest' }
	| { type: 'hostForceBackToLobby' }
	| { type: 'hostForceEndGame' }
	| { type: 'hostForceSkipPhase' }
	| { type: 'hostForceSetPlayerName'; id: RoomClientID; name: string }
	| { type: 'saveNotes'; notes: string[] }
	| { type: 'saveCrossedOutOutlines'; crossedOutOutlines: number[] }
	| { type: 'saveCallingCard'; callingCard: string | null }
	| { type: 'controllerInput'; controllerInput: ControllerInput }
	| {
			type: 'setConsortOptions';
			roleblock: boolean;
			youWereRoleblockedMessage: boolean;
			youSurvivedAttackMessage: boolean;
			youWereGuardedMessage: boolean;
			youWereTransportedMessage: boolean;
			youWerePossessedMessage: boolean;
			youWereWardblockedMessage: boolean;
	  }
	| { type: 'voteFastForwardPhase'; fastForward: FastForwardSetting };
