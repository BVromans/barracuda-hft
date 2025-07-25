import { Map as ImmutableMap, List as ImmutableList } from 'immutable';

/**
 * Enhanced Map factory that returns mutable maps by default
 * @param entries - The entries to initialize the map with
 * @returns A mutable map
 */
function Map<K, V>(collection?: Iterable<readonly [K, V]>): ImmutableMap<K, V>;
function Map<R extends { [key in PropertyKey]: unknown }>(obj: R): ImmutableMap<keyof R, R[keyof R]>;
function Map<V>(obj: { [key: string]: V }): ImmutableMap<string, V>;
function Map<K extends string | symbol, V>(obj: { [P in K]?: V }): ImmutableMap<K, V>;
function Map(entries?: any): any {
	let map = ImmutableMap(entries);

	map = map.asMutable();

	const originalGet = map.get as any;
	const originalSet = map.set as any;

	/**
	 * Get a value from the map
	 * @param key - The key to get the value from
	 * @param notSetValue - The value to return if the key is not set
	 * @returns The value from the map
	 */
	map.get = function<K, V, NSV = any>(key: K, notSetValue?: NSV): V | NSV {
		if (Array.isArray(key)) {
			return originalGet.call(this, key, notSetValue);
		}

		if (typeof key === 'string') {
			const path = key.trim().split('.');
			if (path.length === 1) {
				return originalGet.call(this, path[0], notSetValue);
			}

			return map.getIn(path, notSetValue);
		}

		return originalGet.call(this, key, notSetValue);
	};

	/**
	 * Set a value in the map
	 * @param key - The key to set the value for
	 * @param value - The value to set
	 * @returns The map with the value set
	 */
	map.set = function<K, V>(key: K, value: V): any {
		if (key == null) {
			throw new Error(`Invalid key ("${key}").`);
		}

		if (Array.isArray(key)) {
			return originalSet.call(this, key, value);
		}

		if (typeof key === 'string') {
			const path = key.trim().split('.');
			if (path.length === 1) {
				return originalSet.call(this, path[0], value);
			}

			return map.setIn(path, value);
		}

		return originalSet.call(this, key, value);
	};

	return map;
}

// Copy static methods from the original Map
Map.isMap = ImmutableMap.isMap;

/**
 * Enhanced List factory that returns mutable lists by default
 * @param collection - The collection to initialize the list with
 * @returns A mutable list
 */
function List<T>(collection?: Iterable<T>): ImmutableList<T>;
function List<T>(array: T[]): ImmutableList<T>;
function List(array?: any): any {
	let list = ImmutableList(array);

	list = list.asMutable();

	return list;
}

List.isList = ImmutableList.isList;

export { Map, List };
