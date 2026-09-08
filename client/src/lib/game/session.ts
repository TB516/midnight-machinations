import { writable, type Readable } from 'svelte/store';

import type { ChatMessageIndex, Verdict } from './chat';
import type { ControllerInput } from './controllers';
import type { ModifierSettings } from './modifiers';
import type { FastForwardSetting, PhaseTimeSettings, PhaseType } from './phases';
import type {
	RoomClientID,
	RoomCode,
	ToClientPacket,
	ToServerPacket
} from './packets';
import type { RoleList, RoleOutline } from './role-list';
import type { PlayerIndex, Role } from './roles';
import {
	createOutsideRoomState,
	reduceGamePacket,
	tickGameState,
	type ConnectionState,
	type GameSessionState
} from './state';
import {
	clearReconnectData,
	isBrowser,
	loadReconnectData,
	loadSettings,
	saveReconnectData
} from './storage';

export const DEFAULT_WILL = 'ROLE\nNight 1: \nNight 2:';

export interface ConsortOptions {
	roleblock: boolean;
	youWereRoleblockedMessage: boolean;
	youSurvivedAttackMessage: boolean;
	youWereGuardedMessage: boolean;
	youWereTransportedMessage: boolean;
	youWerePossessedMessage: boolean;
	youWereWardblockedMessage: boolean;
}

export type PacketListener = (packet: ToClientPacket, state: GameSessionState) => void;

interface PacketWaiter {
	success: ReadonlySet<ToClientPacket['type']>;
	failure: ReadonlySet<ToClientPacket['type']>;
	finish: (success: boolean) => void;
}

const OPEN_TIMEOUT_MS = 5_000;
const RESPONSE_TIMEOUT_MS = 10_000;

const TO_CLIENT_PACKET_TYPES: ReadonlySet<ToClientPacket['type']> = new Set([
	'pong',
	'rateLimitExceeded',
	'forcedDisconnect',
	'forcedOutsideLobby',
	'lobbyList',
	'acceptJoin',
	'rejectJoin',
	'lobbyName',
	'yourId',
	'lobbyClients',
	'playersHost',
	'playersReady',
	'playersLostConnection',
	'startGame',
	'rejectStart',
	'roleList',
	'randomSeed',
	'roleOutline',
	'phaseTime',
	'phaseTimes',
	'enabledRoles',
	'modifierSettings',
	'hostData',
	'gamePlayers',
	'gameInitializationComplete',
	'backToLobby',
	'yourPlayerIndex',
	'yourFellowInsiders',
	'phase',
	'phaseTimeLeft',
	'playerAlive',
	'playerVotes',
	'yourSendChatGroups',
	'yourInsiderGroups',
	'yourAllowedControllers',
	'yourAllowedController',
	'yourRoleLabels',
	'yourPlayerTags',
	'yourNotes',
	'yourCrossedOutOutlines',
	'yourCallingCard',
	'yourRole',
	'abilityState',
	'yourVoteFastForwardPhase',
	'addChatMessages',
	'addGrave',
	'nightMessages',
	'gameOver'
]);

const ARRAY_PACKET_FIELDS: Partial<Record<ToClientPacket['type'], string>> = {
	lobbyClients: 'clients',
	playersHost: 'hosts',
	playersReady: 'ready',
	playersLostConnection: 'lostConnection',
	roleList: 'roleList',
	enabledRoles: 'roles',
	hostData: 'clients',
	gamePlayers: 'players',
	yourFellowInsiders: 'fellowInsiders',
	playerAlive: 'alive',
	playerVotes: 'votesForPlayer',
	yourSendChatGroups: 'sendChatGroups',
	yourInsiderGroups: 'insiderGroups',
	yourAllowedControllers: 'save',
	yourRoleLabels: 'roleLabels',
	yourPlayerTags: 'playerTags',
	yourNotes: 'notes',
	yourCrossedOutOutlines: 'crossedOutOutlines',
	addChatMessages: 'chatMessages',
	nightMessages: 'chatMessages'
};

function isIncomingPacket(value: unknown): value is ToClientPacket {
	if (typeof value !== 'object' || value === null || !('type' in value) || typeof value.type !== 'string') {
		return false;
	}
	if (!TO_CLIENT_PACKET_TYPES.has(value.type as ToClientPacket['type'])) {
		return false;
	}

	const packet = value as Record<string, unknown> & { type: ToClientPacket['type'] };
	const arrayField = ARRAY_PACKET_FIELDS[packet.type];
	if (arrayField !== undefined) {
		return Array.isArray(packet[arrayField]);
	}

	switch (packet.type) {
		case 'pong':
		case 'rateLimitExceeded':
		case 'forcedDisconnect':
		case 'forcedOutsideLobby':
		case 'startGame':
		case 'gameInitializationComplete':
		case 'backToLobby':
			return true;
		case 'lobbyList':
			return typeof packet.lobbies === 'object' && packet.lobbies !== null && !Array.isArray(packet.lobbies);
		case 'acceptJoin':
			return (
				typeof packet.roomCode === 'number' &&
				typeof packet.playerId === 'number' &&
				typeof packet.inGame === 'boolean' &&
				typeof packet.spectator === 'boolean'
			);
		case 'rejectJoin':
		case 'rejectStart':
		case 'gameOver':
			return typeof packet.reason === 'string';
		case 'lobbyName':
			return typeof packet.name === 'string';
		case 'yourId':
			return typeof packet.playerId === 'number';
		case 'randomSeed':
			return packet.randomSeed === null || typeof packet.randomSeed === 'number';
		case 'roleOutline':
			return typeof packet.index === 'number' && Array.isArray(packet.roleOutline);
		case 'phaseTime':
			return typeof packet.phase === 'string' && typeof packet.time === 'number';
		case 'phaseTimes':
			return typeof packet.phaseTimeSettings === 'object' && packet.phaseTimeSettings !== null;
		case 'modifierSettings':
			return (
				typeof packet.modifierSettings === 'object' &&
				packet.modifierSettings !== null &&
				'modifiers' in packet.modifierSettings &&
				Array.isArray(packet.modifierSettings.modifiers)
			);
		case 'yourPlayerIndex':
			return typeof packet.playerIndex === 'number';
		case 'phase':
			return typeof packet.phase === 'object' && packet.phase !== null && typeof packet.dayNumber === 'number';
		case 'phaseTimeLeft':
			return packet.secondsLeft === null || typeof packet.secondsLeft === 'number';
		case 'yourAllowedController':
			return (
				typeof packet.id === 'object' &&
				packet.id !== null &&
				(packet.controller === null || (typeof packet.controller === 'object' && packet.controller !== null))
			);
		case 'yourCallingCard':
			return packet.callingCard === null || typeof packet.callingCard === 'string';
		case 'yourRole':
			return typeof packet.role === 'string';
		case 'abilityState':
			return (
				typeof packet.abilityId === 'object' &&
				packet.abilityId !== null &&
				typeof packet.abilityState === 'object' &&
				packet.abilityState !== null
			);
		case 'yourVoteFastForwardPhase':
			return typeof packet.fastForward === 'object' && packet.fastForward !== null;
		case 'addGrave':
			return typeof packet.graveRef === 'number' && typeof packet.grave === 'object' && packet.grave !== null;
		default:
			return false;
	}
}

function configuredAddress(): string | undefined {
	return import.meta.env.VITE_WS_ADDRESS;
}

export class GameSession {
	readonly state: Readable<GameSessionState>;
	readonly connection: Readable<ConnectionState>;
	readonly lastPacket: Readable<ToClientPacket | null>;

	private currentState: GameSessionState = createOutsideRoomState();
	private currentConnection: ConnectionState = { status: 'idle', address: null, error: null };
	private readonly stateWritable = writable<GameSessionState>(this.currentState);
	private readonly connectionWritable = writable<ConnectionState>(this.currentConnection);
	private readonly packetWritable = writable<ToClientPacket | null>(null);
	private readonly packetListeners = new Set<PacketListener>();
	private readonly waiters = new Set<PacketWaiter>();
	private socket: WebSocket | null = null;
	private opening: Promise<boolean> | null = null;
	private incomingQueue: string[] = [];
	private drainingQueue = false;
	private ticker: number | null = null;
	private lastTickAt = 0;

	constructor() {
		this.state = { subscribe: this.stateWritable.subscribe };
		this.connection = { subscribe: this.connectionWritable.subscribe };
		this.lastPacket = { subscribe: this.packetWritable.subscribe };
	}

	getSnapshot(): GameSessionState {
		return this.currentState;
	}

	getConnectionSnapshot(): ConnectionState {
		return this.currentConnection;
	}

	subscribePackets(listener: PacketListener): () => void {
		this.packetListeners.add(listener);
		return () => this.packetListeners.delete(listener);
	}

	async open(address?: string): Promise<boolean> {
		if (!isBrowser()) {
			this.setConnection({
				status: 'error',
				address: address ?? null,
				error: 'The game WebSocket can only be opened in a browser.'
			});
			return false;
		}

		if (this.socket?.readyState === window.WebSocket.OPEN) {
			return true;
		}
		if (this.opening !== null) {
			return this.opening;
		}

		const socketAddress = address ?? configuredAddress();
		if (!socketAddress) {
			this.setConnection({
				status: 'error',
				address: null,
				error: 'Missing VITE_WS_ADDRESS.'
			});
			return false;
		}

		let socket: WebSocket;
		try {
			socket = new window.WebSocket(socketAddress);
		} catch (error) {
			this.setConnection({
				status: 'error',
				address: socketAddress,
				error: error instanceof Error ? error.message : 'Unable to create the game WebSocket.'
			});
			return false;
		}

		this.socket = socket;
		this.setConnection({ status: 'connecting', address: socketAddress, error: null });

		this.opening = new Promise<boolean>((resolve) => {
			let settled = false;
			const finish = (success: boolean) => {
				if (settled) return;
				settled = true;
				window.clearTimeout(timeout);
				resolve(success);
			};
			const timeout = window.setTimeout(() => {
				if (this.socket !== socket || socket.readyState === window.WebSocket.OPEN) return;
				this.setConnection({
					status: 'error',
					address: socketAddress,
					error: 'Timed out while connecting to the game server.'
				});
				socket.close();
				finish(false);
			}, OPEN_TIMEOUT_MS);

			socket.addEventListener('open', () => {
				if (this.socket !== socket) return;
				this.setConnection({ status: 'open', address: socketAddress, error: null });
				this.startTicker();
				finish(true);
			});
			socket.addEventListener('message', (event) => {
				if (this.socket !== socket || typeof event.data !== 'string') return;
				this.incomingQueue.push(event.data);
				this.drainIncomingQueue();
			});
			socket.addEventListener('error', () => {
				if (this.socket !== socket) return;
				this.setConnection({
					status: 'error',
					address: socketAddress,
					error: 'The game WebSocket encountered an error.'
				});
				finish(false);
			});
			socket.addEventListener('close', () => {
				if (this.socket !== socket) return;
				this.socket = null;
				this.stopTicker();
				this.failWaiters();
				this.setConnection({ status: 'closed', address: socketAddress, error: this.currentConnection.error });
				finish(false);
			});
		});

		const result = await this.opening;
		this.opening = null;
		return result;
	}

	close(): void {
		if (this.socket === null) {
			this.stopTicker();
			this.setConnection({ ...this.currentConnection, status: 'closed' });
			return;
		}
		this.setConnection({ ...this.currentConnection, status: 'closing' });
		this.socket.close();
	}

	/** Closes the transport and forgets local room state, while retaining reconnect credentials. */
	disconnect(): void {
		this.close();
		this.setState(createOutsideRoomState());
	}

	send(packet: ToServerPacket): boolean {
		if (!isBrowser() || this.socket?.readyState !== window.WebSocket.OPEN) {
			return false;
		}
		this.socket.send(JSON.stringify(packet));
		return true;
	}

	async requestLobbyList(): Promise<boolean> {
		return (await this.open()) && this.send({ type: 'lobbyListRequest' });
	}

	async hostRoom(): Promise<boolean> {
		if (!(await this.open())) return false;
		return this.sendAndWait({ type: 'host' }, ['acceptJoin'], ['rejectJoin']);
	}

	async joinRoom(roomCode: RoomCode): Promise<boolean> {
		if (!Number.isSafeInteger(roomCode) || roomCode < 0 || !(await this.open())) return false;
		return this.sendAndWait({ type: 'join', roomCode }, ['acceptJoin'], ['rejectJoin']);
	}

	async rejoinRoom(roomCode: RoomCode, playerId: RoomClientID): Promise<boolean> {
		if (
			!Number.isSafeInteger(roomCode) ||
			roomCode < 0 ||
			!Number.isSafeInteger(playerId) ||
			playerId < 0 ||
			!(await this.open())
		) {
			return false;
		}
		return this.sendAndWait({ type: 'reJoin', roomCode, playerId }, ['acceptJoin'], ['rejectJoin']);
	}

	async reconnectStored(): Promise<boolean> {
		const reconnect = loadReconnectData();
		if (reconnect === null) return false;
		return this.rejoinRoom(reconnect.roomCode, reconnect.playerId);
	}

	leaveRoom(): boolean {
		const sent = this.send({ type: 'leave' });
		clearReconnectData();
		this.setState(createOutsideRoomState());
		this.close();
		return sent;
	}

	kickPlayer(playerId: RoomClientID): boolean {
		return this.send({ type: 'kick', playerId });
	}

	setPlayerHost(playerId: RoomClientID): boolean {
		return this.send({ type: 'setPlayerHost', playerId });
	}

	relinquishHost(): boolean {
		return this.send({ type: 'relinquishHost' });
	}

	setSpectator(spectator: boolean): boolean {
		return this.send({ type: 'setSpectator', spectator });
	}

	setName(name: string): boolean {
		return this.send({ type: 'setName', name });
	}

	setReady(ready: boolean): boolean {
		return this.send({ type: 'readyUp', ready });
	}

	sendLobbyMessage(text: string): boolean {
		return this.send({ type: 'sendLobbyMessage', text });
	}

	setLobbyName(name: string): boolean {
		return this.send({ type: 'setLobbyName', name });
	}

	startGame(): Promise<boolean> {
		return this.sendAndWait({ type: 'startGame' }, ['startGame'], ['rejectStart']);
	}

	setRoleList(roleList: RoleList): boolean {
		return this.send({ type: 'setRoleList', roleList });
	}

	setRandomSeed(randomSeed: number | null): boolean {
		if (randomSeed !== null && (!Number.isSafeInteger(randomSeed) || randomSeed < 0)) return false;
		return this.send({ type: 'setRandomSeed', randomSeed });
	}

	setRoleOutline(index: number, roleOutline: RoleOutline): boolean {
		if (!Number.isSafeInteger(index) || index < 0 || index > 255) return false;
		return this.send({ type: 'setRoleOutline', index, roleOutline });
	}

	simplifyRoleList(): boolean {
		return this.send({ type: 'simplifyRoleList' });
	}

	setPhaseTime(phase: PhaseType, time: number): boolean {
		if (phase === 'recess' || !this.isValidPhaseTime(time)) return false;
		return this.send({ type: 'setPhaseTime', phase, time });
	}

	setPhaseTimes(phaseTimeSettings: PhaseTimeSettings): boolean {
		if (Object.values(phaseTimeSettings).some((time) => !this.isValidPhaseTime(time))) return false;
		return this.send({ type: 'setPhaseTimes', phaseTimeSettings });
	}

	setEnabledRoles(roles: Role[]): boolean {
		return this.send({ type: 'setEnabledRoles', roles });
	}

	setModifierSettings(modifierSettings: ModifierSettings): boolean {
		return this.send({ type: 'setModifierSettings', modifierSettings });
	}

	requestHostData(): boolean {
		return this.send({ type: 'hostDataRequest' });
	}

	forceBackToLobby(): boolean {
		return this.send({ type: 'hostForceBackToLobby' });
	}

	forceEndGame(): boolean {
		return this.send({ type: 'hostForceEndGame' });
	}

	forceSkipPhase(): boolean {
		return this.send({ type: 'hostForceSkipPhase' });
	}

	forceSetPlayerName(id: RoomClientID, name: string): boolean {
		return this.send({ type: 'hostForceSetPlayerName', id, name });
	}

	saveNotes(notes: string[]): boolean {
		return this.send({ type: 'saveNotes', notes });
	}

	saveCrossedOutOutlines(crossedOutOutlines: number[]): boolean {
		return this.send({ type: 'saveCrossedOutOutlines', crossedOutOutlines });
	}

	saveCallingCard(callingCard: string | null): boolean {
		const normalized = callingCard === null || callingCard.trim().length === 0 ? null : callingCard;
		return this.send({ type: 'saveCallingCard', callingCard: normalized });
	}

	sendControllerInput(controllerInput: ControllerInput): boolean {
		return this.send({ type: 'controllerInput', controllerInput });
	}

	setConsortOptions(options: ConsortOptions): boolean {
		return this.send({ type: 'setConsortOptions', ...options });
	}

	voteFastForward(fastForward: FastForwardSetting): boolean {
		return this.send({ type: 'voteFastForwardPhase', fastForward });
	}

	voteJudgement(verdict: Verdict, controllingPlayer?: PlayerIndex): boolean {
		const player = this.controllingPlayer(controllingPlayer);
		if (player === null) return false;
		let selection = 2;
		if (verdict === 'innocent') selection = 0;
		else if (verdict === 'guilty') selection = 1;
		return this.sendControllerInput({
			id: { type: 'judge', player },
			selection: { type: 'integer', selection }
		});
	}

	saveWill(will: string, controllingPlayer?: PlayerIndex): boolean {
		const player = this.controllingPlayer(controllingPlayer);
		if (player === null) return false;
		return this.sendControllerInput({
			id: { type: 'alibi', player },
			selection: { type: 'string', selection: will === '' ? DEFAULT_WILL : will }
		});
	}

	sendChatMessage(text: string, block = false, controllingPlayer?: PlayerIndex): boolean {
		const player = this.controllingPlayer(controllingPlayer);
		if (player === null) return false;
		const packets: ControllerInput[] = [
			{
				id: { type: 'chatIsBlock', player },
				selection: { type: 'boolean', selection: block }
			},
			{ id: { type: 'chat', player }, selection: { type: 'string', selection: text } },
			{ id: { type: 'sendChat', player }, selection: { type: 'unit', selection: null } }
		];
		return packets.every((packet) => this.sendControllerInput(packet));
	}

	sendWhisper(to: PlayerIndex, text: string, controllingPlayer?: PlayerIndex): boolean {
		const player = this.controllingPlayer(controllingPlayer);
		if (player === null) return false;
		const packets: ControllerInput[] = [
			{
				id: { type: 'whisperToPlayer', player },
				selection: { type: 'playerList', selection: [to] }
			},
			{ id: { type: 'whisper', player }, selection: { type: 'string', selection: text } },
			{ id: { type: 'sendWhisper', player }, selection: { type: 'unit', selection: null } }
		];
		return packets.every((packet) => this.sendControllerInput(packet));
	}

	forwardMessage(message: ChatMessageIndex, controllingPlayer?: PlayerIndex): boolean {
		const player = this.controllingPlayer(controllingPlayer);
		if (player === null) return false;
		return this.sendControllerInput({
			id: { type: 'forwardMessage', player },
			selection: { type: 'chatMessage', selection: message }
		});
	}

	private setState(state: GameSessionState): void {
		this.currentState = state;
		this.stateWritable.set(state);
	}

	private setConnection(connection: ConnectionState): void {
		this.currentConnection = connection;
		this.connectionWritable.set(connection);
	}

	private drainIncomingQueue(): void {
		if (this.drainingQueue) return;
		this.drainingQueue = true;
		try {
			while (this.incomingQueue.length > 0) {
				const serialized = this.incomingQueue.shift();
				if (serialized === undefined) continue;
				let value: unknown;
				try {
					value = JSON.parse(serialized) as unknown;
				} catch {
					this.setConnection({ ...this.currentConnection, error: 'Received invalid JSON from the game server.' });
					continue;
				}
				if (!isIncomingPacket(value)) {
					this.setConnection({ ...this.currentConnection, error: 'Received an invalid packet from the game server.' });
					continue;
				}
				this.processPacket(value);
			}
		} finally {
			this.drainingQueue = false;
		}
	}

	private processPacket(packet: ToClientPacket): void {
		const previousState = this.currentState;
		let nextState: GameSessionState;
		try {
			nextState = reduceGamePacket(previousState, packet);
		} catch {
			this.setConnection({ ...this.currentConnection, error: 'Received a malformed packet from the game server.' });
			return;
		}
		this.setState(nextState);
		if (packet.type === 'pong') {
			// The Rust server initiates its application heartbeat with `pong`.
			this.send({ type: 'ping' });
		}
		this.packetWritable.set(packet);
		this.settleWaiters(packet);
		for (const listener of this.packetListeners) {
			try {
				listener(packet, this.currentState);
			} catch (error) {
				console.error('A game packet listener failed.', error);
			}
		}

		if (packet.type === 'pong') return;
		if (packet.type === 'acceptJoin') {
			saveReconnectData(packet.roomCode, packet.playerId);
			this.restoreDefaultName();
			return;
		}
		if (packet.type === 'lobbyClients' && previousState.kind === 'lobby' && nextState.kind === 'lobby') {
			const previousClient = previousState.players.find(([id]) => id === previousState.myId)?.[1];
			const nextClient = nextState.players.find(([id]) => id === nextState.myId)?.[1];
			if (
				previousClient?.clientType.type === 'spectator' &&
				nextClient?.clientType.type === 'player'
			) {
				this.restoreDefaultName(nextClient.clientType.name);
			}
			return;
		}
		if (packet.type === 'rejectJoin') {
			clearReconnectData();
			return;
		}
		if (packet.type === 'forcedOutsideLobby') {
			clearReconnectData();
			return;
		}
		if (packet.type === 'forcedDisconnect') {
			clearReconnectData();
			this.close();
		}
	}

	private restoreDefaultName(currentName?: string): void {
		const defaultName = loadSettings().defaultName;
		if (!defaultName || defaultName === currentName) return;
		this.setName(defaultName);
	}

	private sendAndWait(
		packet: ToServerPacket,
		success: ToClientPacket['type'][],
		failure: ToClientPacket['type'][]
	): Promise<boolean> {
		if (!isBrowser()) return Promise.resolve(false);

		return new Promise<boolean>((resolve) => {
			let settled = false;
			let timeout = 0;
			let waiter: PacketWaiter;
			const finish = (result: boolean) => {
				if (settled) return;
				settled = true;
				window.clearTimeout(timeout);
				this.waiters.delete(waiter);
				resolve(result);
			};
			waiter = {
				success: new Set(success),
				failure: new Set(failure),
				finish
			};
			timeout = window.setTimeout(() => finish(false), RESPONSE_TIMEOUT_MS);
			this.waiters.add(waiter);
			if (!this.send(packet)) finish(false);
		});
	}

	private settleWaiters(packet: ToClientPacket): void {
		for (const waiter of [...this.waiters]) {
			if (waiter.success.has(packet.type)) waiter.finish(true);
			else if (waiter.failure.has(packet.type)) waiter.finish(false);
		}
	}

	private failWaiters(): void {
		for (const waiter of [...this.waiters]) waiter.finish(false);
	}

	private controllingPlayer(explicit?: PlayerIndex): PlayerIndex | null {
		if (explicit !== undefined) return explicit;
		if (this.currentState.kind !== 'game' || this.currentState.client.type !== 'player') return null;
		return this.currentState.client.myIndex;
	}

	private isValidPhaseTime(time: number): boolean {
		return Number.isSafeInteger(time) && time >= 0 && time <= 1_000;
	}

	private startTicker(): void {
		this.stopTicker();
		this.lastTickAt = Date.now();
		this.ticker = window.setInterval(() => {
			const now = Date.now();
			const next = tickGameState(this.currentState, now - this.lastTickAt);
			this.lastTickAt = now;
			if (next !== this.currentState) this.setState(next);
		}, 250);
	}

	private stopTicker(): void {
		if (this.ticker === null || !isBrowser()) return;
		window.clearInterval(this.ticker);
		this.ticker = null;
	}
}

export const gameSession = new GameSession();
export const gameState = gameSession.state;
export const gameConnection = gameSession.connection;
export const lastGamePacket = gameSession.lastPacket;
