import type { ListMapData } from './list-map';

export const GAME_STORAGE_KEYS = {
	settings: 'settings',
	reconnect: 'reconnectData'
} as const;

export const RECONNECT_LIFETIME_MS = 3_600_000;

export const CONTENT_MENUS = [
	'ChatMenu',
	'RoleSpecificMenu',
	'WillMenu',
	'PlayerListMenu',
	'GraveyardMenu',
	'WikiMenu'
] as const;

export const LANGUAGES = ['en_us', 'broken_keyboard', 'dyslexic'] as const;

export type ContentMenu = (typeof CONTENT_MENUS)[number];
export type Language = (typeof LANGUAGES)[number];

export interface Settings {
	format: string;
	volume: number;
	fontSize: number;
	accessibilityFont: boolean;
	defaultName: string | null;
	language: Language;
	maxMenus: number;
	menuOrder: ListMapData<ContentMenu, boolean>;
	headerEnabled?: boolean;
}

export interface ReconnectData {
	roomCode: number;
	playerId: number;
	lastSaveTime: number;
}

export function isBrowser(): boolean {
	return typeof window !== 'undefined';
}

function browserStorage(): Storage | null {
	if (!isBrowser()) {
		return null;
	}

	try {
		return window.localStorage;
	} catch {
		return null;
	}
}

export function getDefaultSettings(viewportWidth?: number): Readonly<Settings> {
	let width = viewportWidth;
	if (width === undefined && isBrowser()) {
		width = window.innerWidth;
	}
	const mobile = width !== undefined && width < 600;

	const menuOrder: ListMapData<ContentMenu, boolean> = mobile
		? [
				['ChatMenu', true],
				['WikiMenu', false],
				['GraveyardMenu', false],
				['PlayerListMenu', false],
				['WillMenu', false],
				['RoleSpecificMenu', false]
			]
		: [
				['WikiMenu', false],
				['GraveyardMenu', false],
				['PlayerListMenu', true],
				['ChatMenu', true],
				['WillMenu', false],
				['RoleSpecificMenu', true]
			];

	return {
		format: 'v6',
		volume: 0.5,
		fontSize: 1,
		accessibilityFont: false,
		defaultName: null,
		language: 'en_us',
		maxMenus: mobile ? 1 : 6,
		menuOrder,
		headerEnabled: true
	};
}

function parseSettings(value: unknown, defaults: Readonly<Settings>): Settings {
	if (typeof value !== 'object' || value === null) {
		return { ...defaults, menuOrder: defaults.menuOrder.map(([menu, visible]) => [menu, visible]) };
	}

	const saved = value as Partial<Settings>;
	const language = LANGUAGES.includes(saved.language as Language) ? (saved.language as Language) : defaults.language;
	const menuOrder = Array.isArray(saved.menuOrder)
		? saved.menuOrder.filter(
				(entry): entry is [ContentMenu, boolean] =>
					Array.isArray(entry) &&
					CONTENT_MENUS.includes(entry[0] as ContentMenu) &&
					typeof entry[1] === 'boolean'
			)
		: defaults.menuOrder;

	return {
		format: typeof saved.format === 'string' ? saved.format : defaults.format,
		volume: typeof saved.volume === 'number' ? saved.volume : defaults.volume,
		fontSize: typeof saved.fontSize === 'number' ? saved.fontSize : defaults.fontSize,
		accessibilityFont:
			typeof saved.accessibilityFont === 'boolean' ? saved.accessibilityFont : defaults.accessibilityFont,
		defaultName: typeof saved.defaultName === 'string' || saved.defaultName === null ? saved.defaultName : defaults.defaultName,
		language,
		maxMenus: typeof saved.maxMenus === 'number' ? saved.maxMenus : defaults.maxMenus,
		menuOrder: menuOrder.length > 0 ? menuOrder : defaults.menuOrder,
		headerEnabled: typeof saved.headerEnabled === 'boolean' ? saved.headerEnabled : true
	};
}

export function loadSettings(storage: Storage | null = browserStorage(), viewportWidth?: number): Settings {
	const defaults = getDefaultSettings(viewportWidth);
	if (storage === null) {
		return { ...defaults, menuOrder: defaults.menuOrder.map(([menu, visible]) => [menu, visible]) };
	}

	try {
		const saved = storage.getItem(GAME_STORAGE_KEYS.settings);
		return saved === null ? { ...defaults } : parseSettings(JSON.parse(saved) as unknown, defaults);
	} catch {
		return { ...defaults, menuOrder: defaults.menuOrder.map(([menu, visible]) => [menu, visible]) };
	}
}

export function saveSettings(
	changes: Partial<Settings>,
	storage: Storage | null = browserStorage(),
	viewportWidth?: number
): Settings {
	const next = { ...loadSettings(storage, viewportWidth), ...changes, format: 'v6' };
	if (storage !== null) {
		try {
			storage.setItem(GAME_STORAGE_KEYS.settings, JSON.stringify(next));
		} catch {
			// Storage can be unavailable in private browsing; the returned value remains useful.
		}
	}
	return next;
}

export function saveReconnectData(
	roomCode: number,
	playerId: number,
	storage: Storage | null = browserStorage(),
	now = Date.now()
): ReconnectData {
	const reconnect = { roomCode, playerId, lastSaveTime: now };
	if (storage !== null) {
		try {
			storage.setItem(GAME_STORAGE_KEYS.reconnect, JSON.stringify(reconnect));
		} catch {
			// Reconnect persistence is best-effort.
		}
	}
	return reconnect;
}

export function loadReconnectData(
	storage: Storage | null = browserStorage(),
	now = Date.now()
): ReconnectData | null {
	if (storage === null) {
		return null;
	}

	try {
		const saved = storage.getItem(GAME_STORAGE_KEYS.reconnect);
		if (saved === null) {
			return null;
		}
		const value = JSON.parse(saved) as Partial<ReconnectData>;
		if (
			typeof value.roomCode !== 'number' ||
			!Number.isSafeInteger(value.roomCode) ||
			value.roomCode < 0 ||
			typeof value.playerId !== 'number' ||
			!Number.isSafeInteger(value.playerId) ||
			value.playerId < 0 ||
			typeof value.lastSaveTime !== 'number' ||
			value.lastSaveTime < now - RECONNECT_LIFETIME_MS
		) {
			storage.removeItem(GAME_STORAGE_KEYS.reconnect);
			return null;
		}
		return value as ReconnectData;
	} catch {
		try {
			storage.removeItem(GAME_STORAGE_KEYS.reconnect);
		} catch {
			// Ignore storage cleanup errors.
		}
		return null;
	}
}

export function clearReconnectData(storage: Storage | null = browserStorage()): void {
	if (storage === null) {
		return;
	}

	try {
		storage.removeItem(GAME_STORAGE_KEYS.reconnect);
	} catch {
		// Storage cleanup is best-effort.
	}
}
