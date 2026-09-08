import type { ChatMessage, ChatMessageIndex, PlayerTag } from './chat';
import { abilityIdKey, type AbilityID, type ClientRoleState, type InsiderGroup, type PlayerIndex, type Role } from './roles';
import { controllerIdsEqual, type ControllerMap } from './controllers';
import type { Grave, GraveReference } from './graves';
import { listMapDelete, listMapSet, numericRecordToListMap, type ListMapData } from './list-map';
import type { ModifierSettings } from './modifiers';
import { defaultPhaseTimes, type FastForwardSetting, type PhaseState, type PhaseTimeSettings } from './phases';
import type { RoleList } from './role-list';
import type {
	ClientConnection,
	GameOverReason,
	HostGameClient,
	LobbyClient,
	RejectJoinReason,
	RejectStartReason,
	RoomClientID,
	RoomCode,
	RoomPreviewData,
	ToClientPacket
} from './packets';

export interface RoomSettingsState {
	roleList: RoleList;
	randomSeed: number | null;
	phaseTimes: PhaseTimeSettings;
	enabledRoles: Role[];
	modifierSettings: ModifierSettings;
}

interface RoomStateBase extends RoomSettingsState {
	roomCode: RoomCode;
	lobbyName: string;
	myId: RoomClientID | null;
}

export interface OutsideRoomState {
	kind: 'outsideRoom';
	lobbies: ListMapData<RoomCode, RoomPreviewData>;
	lastJoinRejection: RejectJoinReason | null;
}

export interface LobbyState extends RoomStateBase {
	kind: 'lobby';
	players: ListMapData<RoomClientID, LobbyClient>;
	chatMessages: ListMapData<ChatMessageIndex, ChatMessage>;
	lastStartRejection: RejectStartReason | null;
}

export interface GamePlayer {
	index: PlayerIndex;
	name: string;
	alive: boolean;
	numVoted: number;
	roleLabel: Role | null;
	tags: PlayerTag[];
}

export interface PlayerGameState {
	type: 'player';
	myIndex: PlayerIndex | null;
	myRole: Role | null;
	abilityStates: ListMapData<AbilityID, ClientRoleState>;
	controllers: ControllerMap;
	notes: string[];
	crossedOutOutlines: number[];
	callingCard: string | null;
	fellowInsiders: PlayerIndex[];
	sendChatGroups: import('./chat').ChatGroup[];
	insiderGroups: InsiderGroup[];
}

export interface SpectatorGameState {
	type: 'spectator';
}

export interface GameState extends RoomStateBase {
	kind: 'game';
	initialized: boolean;
	players: GamePlayer[];
	chatMessages: ListMapData<ChatMessageIndex, ChatMessage>;
	nightMessages: ChatMessage[];
	graves: ListMapData<GraveReference, Grave>;
	phase: PhaseState;
	dayNumber: number;
	timeLeftMs: number | null;
	ticking: boolean;
	client: PlayerGameState | SpectatorGameState;
	hostClients: ListMapData<RoomClientID, HostGameClient> | null;
	fastForward: FastForwardSetting;
	gameOverReason: GameOverReason | null;
}

export type GameSessionState = OutsideRoomState | LobbyState | GameState;

export type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'closing' | 'closed' | 'error';

export interface ConnectionState {
	status: ConnectionStatus;
	address: string | null;
	error: string | null;
}

export function createOutsideRoomState(): OutsideRoomState {
	return {
		kind: 'outsideRoom',
		lobbies: [],
		lastJoinRejection: null
	};
}

function createRoomSettings(): RoomSettingsState {
	return {
		roleList: [],
		randomSeed: null,
		phaseTimes: defaultPhaseTimes(),
		enabledRoles: [],
		modifierSettings: { modifiers: [] }
	};
}

function createLobbyState(roomCode: RoomCode, myId: RoomClientID): LobbyState {
	return {
		kind: 'lobby',
		roomCode,
		lobbyName: 'Midnight Machinations Lobby',
		myId,
		...createRoomSettings(),
		players: [],
		chatMessages: [],
		lastStartRejection: null
	};
}

function createPlayerGameState(): PlayerGameState {
	return {
		type: 'player',
		myIndex: null,
		myRole: null,
		abilityStates: [],
		controllers: [],
		notes: [],
		crossedOutOutlines: [],
		callingCard: null,
		fellowInsiders: [],
		sendChatGroups: [],
		insiderGroups: []
	};
}

function createGameState(
	roomCode: RoomCode,
	myId: RoomClientID,
	spectator: boolean,
	previous?: LobbyState
): GameState {
	const settings = previous
		? {
				roleList: previous.roleList,
				randomSeed: previous.randomSeed,
				phaseTimes: previous.phaseTimes,
				enabledRoles: previous.enabledRoles,
				modifierSettings: previous.modifierSettings
			}
		: createRoomSettings();
	const wasHost = previous?.players.some(([id, client]) => id === myId && client.ready === 'host') ?? false;

	return {
		kind: 'game',
		roomCode,
		lobbyName: previous?.lobbyName ?? '',
		myId,
		...settings,
		initialized: false,
		players: [],
		chatMessages: [],
		nightMessages: [],
		graves: [],
		phase: { type: 'briefing' },
		dayNumber: 1,
		timeLeftMs: null,
		ticking: false,
		client: spectator ? { type: 'spectator' } : createPlayerGameState(),
		hostClients: wasHost ? [] : null,
		fastForward: { type: 'none' },
		gameOverReason: null
	};
}

function lobbyFromGame(game: GameState): LobbyState {
	return {
		kind: 'lobby',
		roomCode: game.roomCode,
		lobbyName: game.lobbyName,
		myId: game.myId,
		roleList: game.roleList,
		randomSeed: game.randomSeed,
		phaseTimes: game.phaseTimes,
		enabledRoles: game.enabledRoles,
		modifierSettings: game.modifierSettings,
		players: [],
		chatMessages: [],
		lastStartRejection: null
	};
}

function mergeMessages(
	current: ListMapData<ChatMessageIndex, ChatMessage>,
	incoming: ListMapData<ChatMessageIndex, ChatMessage>
): ListMapData<ChatMessageIndex, ChatMessage> {
	return incoming.reduce((messages, [index, message]) => listMapSet(messages, index, message), current);
}

function updatePlayer(
	players: GamePlayer[],
	index: PlayerIndex,
	change: (player: GamePlayer) => GamePlayer
): GamePlayer[] {
	return players.map((player) => (player.index === index ? change(player) : player));
}

function replaceRoleOutline(roleList: RoleList, index: number, outline: RoleList[number]): RoleList {
	const next = roleList.slice();
	if (index <= next.length) {
		next[index] = outline;
	}
	return next;
}

function updateRoomSettings(state: GameSessionState, packet: ToClientPacket): GameSessionState | null {
	if (state.kind === 'outsideRoom') {
		return null;
	}

	switch (packet.type) {
		case 'roleList':
			return { ...state, roleList: packet.roleList };
		case 'randomSeed':
			return { ...state, randomSeed: packet.randomSeed };
		case 'roleOutline':
			return { ...state, roleList: replaceRoleOutline(state.roleList, packet.index, packet.roleOutline) };
		case 'phaseTime':
			if (packet.phase === 'recess') {
				return state;
			}
			return { ...state, phaseTimes: { ...state.phaseTimes, [packet.phase]: packet.time } };
		case 'phaseTimes':
			return { ...state, phaseTimes: packet.phaseTimeSettings };
		case 'enabledRoles':
			return { ...state, enabledRoles: packet.roles };
		case 'modifierSettings':
			return { ...state, modifierSettings: packet.modifierSettings };
		default:
			return null;
	}
}

/** Pure, ordered reducer for packets emitted by `server/src/packet.rs`. */
export function reduceGamePacket(state: GameSessionState, packet: ToClientPacket): GameSessionState {
	const settingsUpdate = updateRoomSettings(state, packet);
	if (settingsUpdate) {
		return settingsUpdate;
	}

	switch (packet.type) {
		case 'pong':
		case 'rateLimitExceeded':
			return state;
		case 'forcedDisconnect':
			return createOutsideRoomState();
		case 'forcedOutsideLobby':
			return createOutsideRoomState();
		case 'lobbyList':
			if (state.kind !== 'outsideRoom') return state;
			return { ...state, lobbies: numericRecordToListMap(packet.lobbies) };
		case 'acceptJoin':
			if (packet.inGame) {
				return createGameState(packet.roomCode, packet.playerId, packet.spectator);
			}
			return createLobbyState(packet.roomCode, packet.playerId);
		case 'rejectJoin':
			return { ...createOutsideRoomState(), lastJoinRejection: packet.reason };
		case 'lobbyName':
		case 'yourId':
			if (state.kind === 'outsideRoom') return state;
			if (packet.type === 'lobbyName') return { ...state, lobbyName: packet.name };
			return { ...state, myId: packet.playerId };
		case 'lobbyClients':
			if (state.kind !== 'lobby') return state;
			return { ...state, players: packet.clients };
		case 'playersHost':
			if (state.kind === 'game') {
				if (state.myId === null || !packet.hosts.includes(state.myId)) {
					return { ...state, hostClients: null };
				}
				return {
					...state,
					hostClients: (state.hostClients ?? []).map(([id, client]) => [
						id,
						{ ...client, host: packet.hosts.includes(id) }
					])
				};
			}
			if (state.kind !== 'lobby') return state;
			return {
				...state,
				players: state.players.map(([id, client]) => [
					id,
					{ ...client, ready: packet.hosts.includes(id) ? 'host' : client.ready === 'host' ? 'notReady' : client.ready }
				])
			};
		case 'playersReady':
			if (state.kind !== 'lobby') return state;
			return {
				...state,
				players: state.players.map(([id, client]) => [
					id,
					{ ...client, ready: client.ready === 'host' ? 'host' : packet.ready.includes(id) ? 'ready' : 'notReady' }
				])
			};
		case 'playersLostConnection':
			if (state.kind !== 'lobby') return state;
			return {
				...state,
				players: state.players.map(([id, client]) => {
					let connection: ClientConnection = client.connection;
					if (packet.lostConnection.includes(id)) connection = 'couldReconnect';
					else if (connection === 'couldReconnect') connection = 'connected';
					return [id, { ...client, connection }];
				})
			};
		case 'startGame': {
			if (state.kind !== 'lobby') return state;
			const ownClient = state.players.find(([id]) => id === state.myId)?.[1];
			return createGameState(
				state.roomCode,
				state.myId ?? 0,
				ownClient?.clientType.type === 'spectator',
				state
			);
		}
		case 'rejectStart':
			if (state.kind !== 'lobby') return state;
			return { ...state, lastStartRejection: packet.reason };
		case 'hostData':
			if (state.kind !== 'game') return state;
			return { ...state, hostClients: packet.clients };
		case 'gamePlayers':
			if (state.kind !== 'game') return state;
			return {
				...state,
				players: packet.players.map((name, index) => {
					const current = state.players.find((player) => player.index === index);
					if (current) return { ...current, name };
					return {
						index,
						name,
						alive: true,
						numVoted: 0,
						roleLabel: null,
						tags: []
					};
				})
			};
		case 'gameInitializationComplete':
			if (state.kind !== 'game') return state;
			return { ...state, initialized: true };
		case 'backToLobby':
			if (state.kind !== 'game') return state;
			return lobbyFromGame(state);
		case 'yourPlayerIndex':
			if (state.kind !== 'game' || state.client.type !== 'player') return state;
			return { ...state, client: { ...state.client, myIndex: packet.playerIndex } };
		case 'yourFellowInsiders':
			if (state.kind !== 'game' || state.client.type !== 'player') return state;
			return { ...state, client: { ...state.client, fellowInsiders: packet.fellowInsiders } };
		case 'phase':
			if (state.kind !== 'game') return state;
			return { ...state, phase: packet.phase, dayNumber: packet.dayNumber, ticking: state.timeLeftMs !== null };
		case 'phaseTimeLeft':
			if (state.kind !== 'game') return state;
			return {
				...state,
				timeLeftMs: packet.secondsLeft === null ? null : packet.secondsLeft * 1_000,
				ticking: packet.secondsLeft !== null
			};
		case 'playerAlive':
			if (state.kind !== 'game') return state;
			return {
				...state,
				players: state.players.map((player) => ({ ...player, alive: packet.alive[player.index] ?? player.alive }))
			};
		case 'playerVotes':
			if (state.kind !== 'game') return state;
			return {
				...state,
				players: state.players.map((player) => ({
					...player,
					numVoted: packet.votesForPlayer.find(([index]) => index === player.index)?.[1] ?? 0
				}))
			};
		case 'yourSendChatGroups':
			if (state.kind !== 'game' || state.client.type !== 'player') return state;
			return { ...state, client: { ...state.client, sendChatGroups: packet.sendChatGroups } };
		case 'yourInsiderGroups':
			if (state.kind !== 'game' || state.client.type !== 'player') return state;
			return { ...state, client: { ...state.client, insiderGroups: packet.insiderGroups } };
		case 'yourAllowedControllers':
			if (state.kind !== 'game' || state.client.type !== 'player') return state;
			return { ...state, client: { ...state.client, controllers: packet.save } };
		case 'yourAllowedController':
			if (state.kind !== 'game' || state.client.type !== 'player') return state;
			return {
				...state,
				client: {
					...state.client,
					controllers:
						packet.controller === null
							? listMapDelete(state.client.controllers, packet.id, controllerIdsEqual)
							: listMapSet(state.client.controllers, packet.id, packet.controller, controllerIdsEqual)
				}
			};
		case 'yourRoleLabels':
			if (state.kind !== 'game') return state;
			return {
				...state,
				players: packet.roleLabels.reduce<GamePlayer[]>(
					(players, [index, role]) => updatePlayer(players, index, (player) => ({ ...player, roleLabel: role })),
					state.players.map((player): GamePlayer => ({ ...player, roleLabel: null }))
				)
			};
		case 'yourPlayerTags':
			if (state.kind !== 'game') return state;
			return {
				...state,
				players: packet.playerTags.reduce<GamePlayer[]>(
					(players, [index, tags]) => updatePlayer(players, index, (player) => ({ ...player, tags })),
					state.players.map((player): GamePlayer => ({ ...player, tags: [] }))
				)
			};
		case 'yourNotes':
			if (state.kind !== 'game' || state.client.type !== 'player') return state;
			return { ...state, client: { ...state.client, notes: packet.notes } };
		case 'yourCrossedOutOutlines':
			if (state.kind !== 'game' || state.client.type !== 'player') return state;
			return { ...state, client: { ...state.client, crossedOutOutlines: packet.crossedOutOutlines } };
		case 'yourCallingCard':
			if (state.kind !== 'game' || state.client.type !== 'player') return state;
			return { ...state, client: { ...state.client, callingCard: packet.callingCard } };
		case 'yourRole':
			if (state.kind !== 'game' || state.client.type !== 'player') return state;
			return { ...state, client: { ...state.client, myRole: packet.role } };
		case 'abilityState':
			if (state.kind !== 'game' || state.client.type !== 'player') return state;
			return {
				...state,
				client: {
					...state.client,
					abilityStates: listMapSet(
						state.client.abilityStates,
						packet.abilityId,
						packet.abilityState,
						(left, right) => abilityIdKey(left) === abilityIdKey(right)
					)
				}
			};
		case 'yourVoteFastForwardPhase':
			if (state.kind !== 'game') return state;
			return { ...state, fastForward: packet.fastForward };
		case 'addChatMessages':
			if (state.kind === 'outsideRoom') return state;
			return { ...state, chatMessages: mergeMessages(state.chatMessages, packet.chatMessages) };
		case 'addGrave':
			if (state.kind !== 'game') return state;
			return { ...state, graves: listMapSet(state.graves, packet.graveRef, packet.grave) };
		case 'nightMessages':
			if (state.kind !== 'game') return state;
			return { ...state, nightMessages: packet.chatMessages };
		case 'gameOver':
			if (state.kind !== 'game') return state;
			return { ...state, gameOverReason: packet.reason, ticking: false };
		case 'roleList':
		case 'randomSeed':
		case 'roleOutline':
		case 'phaseTime':
		case 'phaseTimes':
		case 'enabledRoles':
		case 'modifierSettings':
			return state;
		default:
			return state;
	}
}

export function tickGameState(state: GameSessionState, elapsedMs: number): GameSessionState {
	if (state.kind !== 'game' || !state.ticking || state.timeLeftMs === null || state.timeLeftMs === 0) {
		return state;
	}

	return { ...state, timeLeftMs: Math.max(0, state.timeLeftMs - elapsedMs) };
}
