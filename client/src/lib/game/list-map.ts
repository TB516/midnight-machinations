/**
 * JSON shape used by the server's `VecMap`: an insertion-ordered list of pairs.
 * Unlike `Map`, this survives JSON serialization without conversion.
 */
export type ListMapData<Key, Value> = Array<[Key, Value]>;

export type KeyEquals<Key> = (left: Key, right: Key) => boolean;

export function listMapGet<Key, Value>(
	map: readonly (readonly [Key, Value])[],
	key: Key,
	equals: KeyEquals<Key> = Object.is
): Value | undefined {
	return map.find(([candidate]) => equals(candidate, key))?.[1];
}

export function listMapHas<Key, Value>(
	map: readonly (readonly [Key, Value])[],
	key: Key,
	equals: KeyEquals<Key> = Object.is
): boolean {
	return map.some(([candidate]) => equals(candidate, key));
}

/** Returns a new map, preserving the position of an existing key. */
export function listMapSet<Key, Value>(
	map: readonly (readonly [Key, Value])[],
	key: Key,
	value: Value,
	equals: KeyEquals<Key> = Object.is
): ListMapData<Key, Value> {
	const index = map.findIndex(([candidate]) => equals(candidate, key));
	if (index === -1) {
		return [...map.map(([entryKey, entryValue]) => [entryKey, entryValue] as [Key, Value]), [key, value]];
	}

	const next = map.map(([entryKey, entryValue]) => [entryKey, entryValue] as [Key, Value]);
	next[index] = [key, value];
	return next;
}

export function listMapDelete<Key, Value>(
	map: readonly (readonly [Key, Value])[],
	key: Key,
	equals: KeyEquals<Key> = Object.is
): ListMapData<Key, Value> {
	return map
		.filter(([candidate]) => !equals(candidate, key))
		.map(([entryKey, entryValue]) => [entryKey, entryValue]);
}

/** Converts JSON objects whose keys are numeric room IDs into ordered pairs. */
export function numericRecordToListMap<Value>(record: Record<string, Value>): ListMapData<number, Value> {
	return Object.entries(record)
		.map(([key, value]) => [Number(key), value] as [number, Value])
		.filter(([key]) => Number.isSafeInteger(key));
}
