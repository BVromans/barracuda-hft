import { Map as ImmutableMap, List as ImmutableList } from 'immutable';
import { Map as ImmutableMapInterface, List as ImmutableListInterface } from './interfaces';

/**
 * Represents a list
 */
export class List<T> implements ImmutableListInterface<T> {
	/**
	 * Inner list
	 */
	private inner: ImmutableList<T>;

	/**
	 * Allow arbitrary lookups on `this`
	 */
	[key: string]: any;

	/**
	 * Constructor
	 * @param items
	 */
	constructor(items?: Iterable<T>) {
		// start with a mutable List
		this.inner = ImmutableList<T>(items).asMutable();

		// return a proxy so that unknown props/methods go to inner
		return new Proxy(this, {
			get: (target, property: PropertyKey, receiver) => {
				// 1) if it’s on our wrapper, use it
				// noinspection DuplicatedCode
				if (property in target) {
					const value = Reflect.get(target, property, receiver);
					const type = typeof value;

					if (type === 'function') {
						return (value as Function).bind(target);
					}

					return value;
				}

				// 2) otherwise forward to the inner list
				const innerValue = (target.inner as any)[property];
				const type = typeof innerValue;

				if (type === 'function') {
					return (...args: any[]) => {
						const result = innerValue.apply(target.inner, args);
						// if the result is a new List, make it mutable and swap in
						if (ImmutableList.isList(result)) {
							target.inner = (result as ImmutableList<T>).asMutable();

							return receiver; // enable chaining
						}
						return result;
					};
				}

				return innerValue;
			},

			set: (target, property: PropertyKey, value: any) => {
				// assign to our wrapper if it’s a known field
				if (property in target) {
					(target as any)[property] = value;
				} else {
					// else set on the inner list directly (rarely used)
					(target.inner as any)[property] = value;
				}

				return true;
			},
		});
	}
}

/**
 * Represents a map
 */
export class Map<K, V> implements ImmutableMapInterface<K, V> {
	/**
	 * Inner map
	 */
	private inner: ImmutableMap<K, V>;

	/**
	 * Constructor
	 * @param entries
	 */
	constructor(entries?: Iterable<[K, V]>) {
		// create a mutable instance of the ImmutableJS Map
		this.inner = ImmutableMap<K, V>(entries).asMutable();

		// return a Proxy so that any unknown .foo() or .bar property is forwarded
		return new Proxy(this, {
			get: (target, property: PropertyKey, receiver) => {
				// 1) if it exists on our wrapper, use it
				// noinspection DuplicatedCode
				if (property in target) {
					const value = Reflect.get(target, property, receiver);
					const type = typeof value;

					if (type === 'function') {
						return (value as Function).bind(target);
					}

					return value;
				}
				// 2) otherwise forward to the inner map
				const innerValue = (target.inner as any)[property];
				const type = typeof innerValue;

				if (type === 'function') {
					return (...args: any[]) => {
						const result = innerValue.apply(target.inner, args);
						// if it returned a new map, keep it mutable and swap it in
						if (ImmutableMap.isMap(result)) {
							target.inner = (result as ImmutableMap<K, V>).asMutable();

							return receiver; // allow chaining
						}

						return result;
					};
				}

				return innerValue;
			},

			set: (target, property: PropertyKey, value: any) => {
				// assign to our wrapper if it’s a known property
				if (property in target) {
					(target as any)[property] = value;
				} else {
					// otherwise set it on the inner map
					;(target.inner as any)[property] = value;
				}

				return true;
			},
		});
	}

	/**
	 *
	 * @param key
	 */
	getIn<T>(key: K): T {
		if ((key as any).constructor === Array) {
			return this.inner.getIn(key as Iterable<any>) as T;
		} else if (typeof key === 'string') {
			return this.inner.getIn(key.toString().trim().split('.')) as T;
		}

		throw Error(`Invalid key ("${key}").`);
	}

	/**
	 *
	 * @param key
	 * @param value
	 */
	setIn<T,V>(key: T, value: V) {
		if (key == null) {
			throw Error(`Invalid key ("${key}").`);
		}

		if (key.constructor === Array) {
			this.inner = this.inner.setIn(key, value);
		} else if (typeof key === 'string') {
			this.inner = this.inner.setIn(key.toString().trim().split('.'), value);
		} else {
			throw Error(`Invalid key ("${key}").`);
		}
	}
}
