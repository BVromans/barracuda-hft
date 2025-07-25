import { Map, List, MapOf } from 'immutable';

declare namespace Immutable {

	/**
	 * Enhanced List factory that returns mutable lists by default
	 * @param collection - The collection to initialize the list with
	 * @returns A mutable list
	 */
	function FunList<T>(collection?: Iterable<T> | ArrayLike<T>): List<T> {
		let list = List(collection);

		list = list.asMutable();

		return list;
	}

	FunList.isList = List.isList;

	/**
	 * Enhanced Map factory that returns mutable maps by default
	 * @param collection - The collection to initialize the map with
	 * @returns A mutable map
	 */
	function FunMap<K, V>(collection?: Iterable<readonly [K, V]>): Map<K, V>;
	function FunMap<R extends { [key in PropertyKey]: unknown }>(obj: R): MapOf<R>;
	function FunMap<V>(obj: { [key: string]: V }): Map<string, V>;
	function FunMap<K extends string | symbol, V>(obj: { [P in K]?: V }): Map<K, V>;
	function FunMap(entries?: any): Map<any, any> {
		let map = Map(entries);

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
				return originalGet.call(this, key, notSetValue) as V | NSV;
			}

			if (typeof key === 'string') {
				const path = key.trim().split('.');
				if (path.length === 1) {
					return originalGet.call(this, path[0], notSetValue) as V | NSV;
				}

				return map.getIn(path, notSetValue) as V | NSV;
			}

			return originalGet.call(this, key, notSetValue) as V | NSV;
		};

		/**
		 * Set a value in the map
		 * @param key - The key to set the value for
		 * @param value - The value to set
		 * @returns The map with the value set
		 */
		// @ts-ignore
		map.set = function<K, V>(key: K, value: V): Map<K, V> {
			if (key == null) {
				throw new Error(`Invalid key ("${key}").`);
			}

			if (Array.isArray(key)) {
				return originalSet.call(this, key, value) as Map<K, V>;
			}

			if (typeof key === 'string') {
				const path = key.trim().split('.');
				if (path.length === 1) {
					return originalSet.call(this, path[0], value) as Map<K, V>;
				}

				return map.setIn(path, value) as Map<K, V>;
			}

			return originalSet.call(this, key, value) as Map<K, V>;
		};

		return map;
	}

	FunMap.isMap = Map.isMap;
}

export { FunMap as Map, FunList as List };
