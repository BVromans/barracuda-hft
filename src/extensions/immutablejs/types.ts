import { Map, List } from 'immutable';

const originalConstructor = Map.prototype.constructor;

/**
 * Constructor for the map
 * @param entries - The entries to initialize the map with
 * @returns The map
 */
Map.prototype.constructor = function MapConstructor<K, V>(
  entries?: Iterable<[K, V]> | { [key: string]: V } | Map<K, V>
): Map<K, V> {
  const map = originalConstructor(entries);

	return map.asMutable();
};

const originalGet = Map.prototype.get;

/**
 * Get a value from the map
 * @param key - The key to get the value from
 * @param notSetValue - The value to return if the key is not set
 * @returns The value from the map
 */
Map.prototype.get = function<K, V, NSV = any>(key: K, notSetValue?: NSV): V | NSV {
	if (Array.isArray(key)) {
		return originalGet.call(this, key, notSetValue);
	}

	if (typeof key === 'string') {
		const path = key.trim().split('.');
		return originalGet.call(this, path, notSetValue);
	}

	return originalGet.call(this, key, notSetValue);
};

const originalSet = Map.prototype.set;

/**
 * Set a value in the map
 * @param key - The key to set the value for
 * @param value - The value to set
 * @returns The map with the value set
 */
Map.prototype.set = function<K, V>(key: K, value: V): Map<K, V> {
	if (key == null) {
		throw new Error(`Invalid key ("${key}").`);
	}

	if (Array.isArray(key)) {
		return originalSet.call(this, key, value);
	}

	if (typeof key === 'string') {
		const path = key.trim().split('.');
		return originalSet.call(this, path, value);
	}

	return originalSet.call(this, key, value);
};

export { Map, List };
