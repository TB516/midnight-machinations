import { isRoleId, roleIds } from './catalog';
import {
  LANGUAGES,
  MENU_IDS,
  MODIFIERS,
  PHASES,
  CONCLUSIONS,
  INSIDER_GROUPS,
  ROLE_SETS,
  cloneValue,
  defaultPhaseTimes,
  type GameMode,
  type GameModeData,
  type GameModeStorage,
  type Language,
  type MenuPreference,
  type ModifierId,
  type ModifierSettings,
  type ParseFailure,
  type ParseResult,
  type PhaseTimes,
  type RoleList,
  type RoleOption,
  type Settings,
  type ShareableGameMode
} from './types';
import type { RoleId } from './catalog';

export const LATEST_GAME_MODE_FORMAT = '2026-06-19-remove-recess-phase-time';
export const LATEST_SETTINGS_FORMAT = '2025-10-23-change-to-migration-id-format';

function failure(reason: string, value: unknown): ParseFailure {
  let snippet = String(value);
  try {
    snippet = JSON.stringify(value).slice(0, 500);
  } catch {
    // String(value) is still useful for cyclic or otherwise unserializable input.
  }
  return { ok: false, reason, snippet };
}

function success<T>(value: T): ParseResult<T> {
  return { ok: true, value };
}

function migrateGameModeValue(value: unknown, storage: boolean): ParseResult<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return failure('Expected a game mode object', value);
  }

  let current = cloneValue(value as Record<string, unknown>);
  for (let iteration = 0; iteration < 4; iteration += 1) {
    if (current.format === LATEST_GAME_MODE_FORMAT) {
      return success(current);
    }

    if (current.format === 'v5') {
      if (storage) {
        if (!Array.isArray(current.gameModes)) {
          return failure('The saved gameModes list is missing', current);
        }
        current.gameModes = current.gameModes.map((mode) => addAdjournmentToMode(mode));
      } else {
        current.phaseTimes = addAdjournment(current.phaseTimes);
      }
      current.format = 'v6';
      continue;
    }

    if (current.format === 'v6') {
      current.format = '2025-10-23-change-to-migration-id-format';
      continue;
    }

    if (current.format === '2025-10-23-change-to-migration-id-format') {
      if (storage) {
        if (!Array.isArray(current.gameModes)) {
          return failure('The saved gameModes list is missing', current);
        }
        current.gameModes = current.gameModes.map((mode) => removeRecessFromMode(mode));
      } else {
        current.phaseTimes = removeRecess(current.phaseTimes);
      }
      current.format = LATEST_GAME_MODE_FORMAT;
      continue;
    }

    return failure('Unsupported game mode format', current.format);
  }

  return failure('Too many game mode migrations were required', current);
}

function addAdjournmentToMode(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return value;
  const mode = value as Record<string, unknown>;
  if (typeof mode.data !== 'object' || mode.data === null || Array.isArray(mode.data)) return mode;

  return {
    ...mode,
    data: Object.fromEntries(
      Object.entries(mode.data).map(([players, data]) => {
        if (typeof data !== 'object' || data === null || Array.isArray(data)) return [players, data];
        const gameModeData = data as Record<string, unknown>;
        return [players, { ...gameModeData, phaseTimes: addAdjournment(gameModeData.phaseTimes) }];
      })
    )
  };
}

function removeRecessFromMode(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return value;
  const mode = value as Record<string, unknown>;
  if (typeof mode.data !== 'object' || mode.data === null || Array.isArray(mode.data)) return mode;

  return {
    ...mode,
    data: Object.fromEntries(
      Object.entries(mode.data).map(([players, data]) => {
        if (typeof data !== 'object' || data === null || Array.isArray(data)) return [players, data];
        const gameModeData = data as Record<string, unknown>;
        return [players, { ...gameModeData, phaseTimes: removeRecess(gameModeData.phaseTimes) }];
      })
    )
  };
}

function addAdjournment(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return value;
  const phaseTimes = { ...value } as Record<string, unknown>;
  phaseTimes.adjournment ??= defaultPhaseTimes().adjournment;
  return phaseTimes;
}

function removeRecess(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return value;
  const phaseTimes = { ...value } as Record<string, unknown>;
  delete phaseTimes.recess;
  return phaseTimes;
}

export function parseGameModeStorage(value: unknown): ParseResult<GameModeStorage<RoleId>> {
  const migrated = migrateGameModeValue(value, true);
  if (!migrated.ok) return migrated;
  if (!Array.isArray(migrated.value.gameModes)) {
    return failure('The saved gameModes list is missing', migrated.value);
  }

  const gameModes: GameMode<RoleId>[] = [];
  for (const candidate of migrated.value.gameModes) {
    const parsed = parseMode(candidate);
    if (!parsed.ok) return parsed;
    gameModes.push(parsed.value);
  }

  return success({ format: LATEST_GAME_MODE_FORMAT, gameModes });
}

export function parseShareableGameMode(value: unknown): ParseResult<ShareableGameMode<RoleId>> {
  const migrated = migrateGameModeValue(value, false);
  if (!migrated.ok) return migrated;

  if (typeof migrated.value.name !== 'string' || migrated.value.name.trim().length === 0) {
    return failure('The shared game mode needs a name', migrated.value.name);
  }

  const data = parseModeData(migrated.value);
  if (!data.ok) return data;

  return success({
    format: LATEST_GAME_MODE_FORMAT,
    name: migrated.value.name,
    ...data.value
  });
}

function parseMode(value: unknown): ParseResult<GameMode<RoleId>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return failure('Expected a saved game mode object', value);
  }
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.name !== 'string' || candidate.name.trim().length === 0) {
    return failure('A saved game mode needs a name', candidate.name);
  }
  if (typeof candidate.data !== 'object' || candidate.data === null || Array.isArray(candidate.data)) {
    return failure('A saved game mode is missing its player-count data', candidate);
  }

  const entries: [number, GameModeData<RoleId>][] = [];
  for (const [playersText, data] of Object.entries(candidate.data)) {
    const players = Number.parseInt(playersText, 10);
    if (!Number.isInteger(players) || players < 1) {
      return failure('A game mode has an invalid player count', playersText);
    }
    const parsed = parseModeData(data);
    if (!parsed.ok) return parsed;
    entries.push([players, parsed.value]);
  }

  if (entries.length === 0) return failure('A saved game mode has no player counts', candidate);
  return success({ name: candidate.name, data: Object.fromEntries(entries) });
}

function parseModeData(value: unknown): ParseResult<GameModeData<RoleId>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return failure('Expected game mode data', value);
  }
  const candidate = value as Record<string, unknown>;
  const roleList = parseRoleList(candidate.roleList);
  if (!roleList.ok) return roleList;
  const phaseTimes = parsePhaseTimes(candidate.phaseTimes);
  if (!phaseTimes.ok) return phaseTimes;

  if (!Array.isArray(candidate.enabledRoles)) {
    return failure('The enabled role list is missing', candidate.enabledRoles);
  }
  const enabledRoles: RoleId[] = [];
  for (const role of candidate.enabledRoles) {
    if (typeof role !== 'string' || !isRoleId(role)) return failure('Unknown enabled role', role);
    if (!enabledRoles.includes(role)) enabledRoles.push(role);
  }

  const modifierSettings = parseModifiers(candidate.modifierSettings);
  if (!modifierSettings.ok) return modifierSettings;

  let randomSeed: number | null | undefined;
  if (candidate.randomSeed === null || candidate.randomSeed === undefined) {
    randomSeed = candidate.randomSeed;
  } else if (
    typeof candidate.randomSeed === 'number' &&
    Number.isSafeInteger(candidate.randomSeed) &&
    candidate.randomSeed >= 0
  ) {
    randomSeed = candidate.randomSeed;
  } else {
    return failure('The random seed must be a non-negative integer or blank', candidate.randomSeed);
  }

  return success({
    roleList: roleList.value,
    phaseTimes: phaseTimes.value,
    enabledRoles,
    modifierSettings: modifierSettings.value,
    ...(randomSeed === undefined ? {} : { randomSeed })
  });
}

function parseRoleList(value: unknown): ParseResult<RoleList<RoleId>> {
  if (!Array.isArray(value)) return failure('The role list is missing', value);
  const roleList: RoleList<RoleId> = [];

  for (const outlineValue of value) {
    if (!Array.isArray(outlineValue) || outlineValue.length === 0) {
      return failure('Every role-list slot needs at least one option', outlineValue);
    }
    const outline = [] as RoleList<RoleId>[number];
    for (const optionValue of outlineValue) {
      if (typeof optionValue !== 'object' || optionValue === null || Array.isArray(optionValue)) {
        return failure('A role-list option is invalid', optionValue);
      }
      const option = optionValue as Record<string, unknown>;
      const hasRole = Object.hasOwn(option, 'role');
      const hasRoleSet = Object.hasOwn(option, 'roleSet');
      if (hasRole === hasRoleSet) {
        return failure('A role-list option must name exactly one role or role set', option);
      }

      let parsedOption: RoleOption<RoleId>;
      if (hasRole) {
        if (typeof option.role !== 'string' || !isRoleId(option.role)) {
          return failure('A role-list option names an unknown role', option.role);
        }
        parsedOption = { role: option.role };
      } else {
        if (
          typeof option.roleSet !== 'string' ||
          !(ROLE_SETS as readonly string[]).includes(option.roleSet)
        ) {
          return failure('A role-list option names an unknown role set', option.roleSet);
        }
        parsedOption = { roleSet: option.roleSet as (typeof ROLE_SETS)[number] };
      }

      if (option.playerPool !== undefined) {
        const playerPool = parsePlayerPool(option.playerPool);
        if (!playerPool.ok) return playerPool;
        parsedOption.playerPool = playerPool.value;
      }
      if (option.insiderGroups !== undefined) {
        const insiderGroups = parseAllowedStrings(
          option.insiderGroups,
          INSIDER_GROUPS,
          'A role-list insider group is invalid'
        );
        if (!insiderGroups.ok) return insiderGroups;
        parsedOption.insiderGroups = insiderGroups.value;
      }
      if (option.winIfAny !== undefined) {
        const conclusions = parseAllowedStrings(
          option.winIfAny,
          CONCLUSIONS,
          'A role-list win condition is invalid'
        );
        if (!conclusions.ok) return conclusions;
        parsedOption.winIfAny = conclusions.value;
      }

      outline.push(parsedOption);
    }
    roleList.push(outline);
  }
  return success(roleList);
}

function parsePlayerPool(value: unknown): ParseResult<number[]> {
  if (!Array.isArray(value)) return failure('A role-list player pool must be a list', value);
  const playerPool: number[] = [];
  for (const player of value) {
    if (!Number.isSafeInteger(player) || player < 0 || player > 255) {
      return failure('A role-list player index is invalid', player);
    }
    if (!playerPool.includes(player as number)) playerPool.push(player as number);
  }
  return success(playerPool);
}

function parseAllowedStrings<const Value extends string>(
  value: unknown,
  allowed: readonly Value[],
  reason: string
): ParseResult<Value[]> {
  if (!Array.isArray(value)) return failure(reason, value);
  const parsed: Value[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string' || !allowed.includes(entry as Value)) {
      return failure(reason, entry);
    }
    if (!parsed.includes(entry as Value)) parsed.push(entry as Value);
  }
  return success(parsed);
}

function parsePhaseTimes(value: unknown): ParseResult<PhaseTimes> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return failure('Phase times are missing', value);
  }
  const input = value as Record<string, unknown>;
  const result = {} as PhaseTimes;
  for (const phase of PHASES) {
    if (
      typeof input[phase] !== 'number' ||
      !Number.isSafeInteger(input[phase]) ||
      input[phase] < 0 ||
      input[phase] > 1_000
    ) {
      return failure(`The ${phase} phase time is invalid`, input[phase]);
    }
    result[phase] = input[phase];
  }
  return success(result);
}

function parseModifiers(value: unknown): ParseResult<ModifierSettings<RoleId>> {
  if (!Array.isArray(value)) return failure('Modifier settings are missing', value);
  const result: ModifierSettings<RoleId> = [];
  const seen = new Set<ModifierId>();
  for (const entry of value) {
    if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== 'string') {
      return failure('A modifier setting is invalid', entry);
    }
    const id = entry[0];
    if (!(MODIFIERS as readonly string[]).includes(id)) return failure('Unknown modifier', id);
    if (seen.has(id as ModifierId)) return failure('A modifier is listed more than once', id);
    if (typeof entry[1] !== 'object' || entry[1] === null || Array.isArray(entry[1])) {
      return failure('A modifier state is invalid', entry[1]);
    }
    const state = entry[1] as Record<string, unknown>;
    if (state.type !== id) return failure('A modifier state does not match its ID', entry);
    if (id === 'customRoleLimits') {
      const limits = parseRoleLimits(state.limits);
      if (!limits.ok) return limits;
      result.push([id, { type: id, limits: limits.value }]);
    } else {
      result.push([id as ModifierId, { type: id as ModifierId }]);
    }
    seen.add(id as ModifierId);
  }
  return success(result);
}

function parseRoleLimits(value: unknown): ParseResult<[RoleId, number][]> {
  if (!Array.isArray(value)) return failure('Custom role limits are missing', value);
  const limits: [RoleId, number][] = [];
  const seen = new Set<RoleId>();
  for (const entry of value) {
    if (
      !Array.isArray(entry) ||
      entry.length !== 2 ||
      typeof entry[0] !== 'string' ||
      !isRoleId(entry[0]) ||
      !Number.isSafeInteger(entry[1]) ||
      entry[1] < 0 ||
      entry[1] > 255
    ) {
      return failure('A custom role limit is invalid', entry);
    }
    if (seen.has(entry[0])) return failure('A custom role limit is listed more than once', entry[0]);
    limits.push([entry[0], entry[1] as number]);
    seen.add(entry[0]);
  }
  return success(limits);
}

export function parseSettings(value: unknown, defaults: Settings): ParseResult<Settings> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return failure('Expected a settings object', value);
  }
  let candidate = cloneValue(value as Record<string, unknown>);

  if (candidate.format === 'v3') {
    const oldOrder = Array.isArray(candidate.menuOrder) ? candidate.menuOrder : defaults.menuOrder;
    candidate = {
      ...candidate,
      format: 'v6',
      maxMenus: typeof candidate.maxMenus === 'number' ? candidate.maxMenus : defaults.maxMenus,
      menuOrder: oldOrder
    };
    delete candidate.roleSpecificMenus;
  }
  if (candidate.format === 'v6') candidate.format = LATEST_SETTINGS_FORMAT;
  if (candidate.format !== LATEST_SETTINGS_FORMAT) {
    return failure('Unsupported settings format', candidate.format);
  }

  const volume = numericSetting(candidate.volume, 0, 1, defaults.volume);
  const fontSize = numericSetting(candidate.fontSize, 0.5, 2, defaults.fontSize);
  const maxMenus = numericSetting(candidate.maxMenus, 1, 6, defaults.maxMenus, true);
  const language =
    typeof candidate.language === 'string' && (LANGUAGES as readonly string[]).includes(candidate.language)
      ? (candidate.language as Language)
      : defaults.language;

  return success({
    format: LATEST_SETTINGS_FORMAT,
    volume,
    fontSize,
    maxMenus,
    accessibilityFont:
      typeof candidate.accessibilityFont === 'boolean'
        ? candidate.accessibilityFont
        : defaults.accessibilityFont,
    defaultName: typeof candidate.defaultName === 'string' ? candidate.defaultName : null,
    language,
    menuOrder: parseMenuOrder(candidate.menuOrder, defaults.menuOrder),
    headerEnabled: typeof candidate.headerEnabled === 'boolean' ? candidate.headerEnabled : true
  });
}

function numericSetting(
  value: unknown,
  minimum: number,
  maximum: number,
  fallback: number,
  integer = false
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  if (value < minimum || value > maximum || (integer && !Number.isInteger(value))) return fallback;
  return value;
}

function parseMenuOrder(value: unknown, defaults: MenuPreference[]): MenuPreference[] {
  if (!Array.isArray(value)) return cloneValue(defaults);
  const seen = new Set<string>();
  const result: MenuPreference[] = [];
  for (const item of value) {
    if (!Array.isArray(item) || item.length !== 2 || typeof item[0] !== 'string') continue;
    if (!(MENU_IDS as readonly string[]).includes(item[0]) || seen.has(item[0])) continue;
    seen.add(item[0]);
    result.push([item[0] as MenuPreference[0], item[1] === true]);
  }
  for (const [id, visible] of defaults) {
    if (!seen.has(id)) result.push([id, visible]);
  }
  return result;
}

export function parseJson(text: string): ParseResult<unknown> {
  try {
    return success(JSON.parse(text) as unknown);
  } catch {
    return failure('The text is not valid JSON', text.slice(0, 500));
  }
}

export function parseImportedText(text: string): ParseResult<unknown> {
  const trimmed = text.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const mode = new URL(trimmed).searchParams.get('mode');
      if (mode === null) return failure('The URL does not contain a mode parameter', trimmed);
      return parseJson(mode);
    } catch {
      return failure('The shared game mode URL is invalid', trimmed);
    }
  }
  return parseJson(trimmed);
}

export function createBlankGameMode(): GameModeData<RoleId> {
  return {
    roleList: [],
    phaseTimes: defaultPhaseTimes(),
    enabledRoles: [...roleIds],
    modifierSettings: [],
    randomSeed: null
  };
}
