import { rawDefaultGameModes } from './catalog';
import {
  LATEST_GAME_MODE_FORMAT,
  LATEST_SETTINGS_FORMAT,
  parseGameModeStorage,
  parseSettings
} from './migrations';
import {
  cloneValue,
  type GameModeStorage,
  type MenuPreference,
  type ParseResult,
  type ReconnectData,
  type Settings
} from './types';
import type { RoleId } from './catalog';

export const STORAGE_KEYS = {
  gameModes: 'savedGameModes',
  settings: 'settings',
  reconnect: 'reconnectData'
} as const;

const RECONNECT_LIFETIME_MS = 3_600_000;

export function defaultSettings(mobile: boolean): Settings {
  const menuOrder: MenuPreference[] = mobile
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
    format: LATEST_SETTINGS_FORMAT,
    volume: 0.5,
    fontSize: 1,
    accessibilityFont: false,
    language: 'en_us',
    defaultName: null,
    maxMenus: mobile ? 1 : 6,
    menuOrder,
    headerEnabled: true
  };
}

export function defaultGameModes(): GameModeStorage<RoleId> {
  const parsed = parseGameModeStorage(cloneValue(rawDefaultGameModes));
  if (parsed.ok) return parsed.value;
  return { format: LATEST_GAME_MODE_FORMAT, gameModes: [] };
}

export function loadGameModes(storage: Storage): ParseResult<GameModeStorage<RoleId>> {
  const saved = storage.getItem(STORAGE_KEYS.gameModes);
  if (saved === null) return { ok: true, value: defaultGameModes() };

  try {
    return parseGameModeStorage(JSON.parse(saved) as unknown);
  } catch {
    return { ok: false, reason: 'Saved game modes are not valid JSON', snippet: saved.slice(0, 500) };
  }
}

export function saveGameModes(storage: Storage, value: GameModeStorage<RoleId>): void {
  storage.setItem(
    STORAGE_KEYS.gameModes,
    JSON.stringify({ ...cloneValue(value), format: LATEST_GAME_MODE_FORMAT })
  );
}

export function resetGameModes(storage: Storage): GameModeStorage<RoleId> {
  storage.removeItem(STORAGE_KEYS.gameModes);
  return defaultGameModes();
}

export function loadSettings(storage: Storage, mobile: boolean): Settings {
  const defaults = defaultSettings(mobile);
  const saved = storage.getItem(STORAGE_KEYS.settings);
  if (saved === null) return defaults;

  try {
    const parsed = parseSettings(JSON.parse(saved) as unknown, defaults);
    return parsed.ok ? parsed.value : defaults;
  } catch {
    return defaults;
  }
}

export function saveSettings(storage: Storage, value: Settings): void {
  storage.setItem(
    STORAGE_KEYS.settings,
    JSON.stringify({ ...cloneValue(value), format: LATEST_SETTINGS_FORMAT })
  );
}

export function saveReconnectData(
  storage: Storage,
  roomCode: number,
  playerId: number,
  now = Date.now()
): void {
  storage.setItem(STORAGE_KEYS.reconnect, JSON.stringify({ roomCode, playerId, lastSaveTime: now }));
}

export function loadReconnectData(
  storage: Storage,
  now = Date.now()
): ReconnectData | null {
  const saved = storage.getItem(STORAGE_KEYS.reconnect);
  if (saved === null) return null;

  try {
    const value = JSON.parse(saved) as Partial<ReconnectData>;
    if (
      typeof value.roomCode !== 'number' ||
      typeof value.playerId !== 'number' ||
      typeof value.lastSaveTime !== 'number'
    ) {
      storage.removeItem(STORAGE_KEYS.reconnect);
      return null;
    }
    if (value.lastSaveTime < now - RECONNECT_LIFETIME_MS) {
      storage.removeItem(STORAGE_KEYS.reconnect);
      return null;
    }
    return value as ReconnectData;
  } catch {
    storage.removeItem(STORAGE_KEYS.reconnect);
    return null;
  }
}

export function deleteReconnectData(storage: Storage): void {
  storage.removeItem(STORAGE_KEYS.reconnect);
}

export function clearApplicationStorage(storage: Storage): void {
  storage.removeItem(STORAGE_KEYS.gameModes);
  storage.removeItem(STORAGE_KEYS.settings);
  storage.removeItem(STORAGE_KEYS.reconnect);
}
