import { makeCompactBitArray } from '@cosmjs/stargate/build/multisignature';
import { List, Map } from '../../src/extensions/immutablejs/types';
import { has } from 'immutable';

// const list = List<number>([1, 2, 3]);

// console.log(list.get(0));
// console.log(list.get(1));
// console.log(list.get(2));
// console.log(list.get(3));
// console.log(list.get(4));
// console.log(list.get(5));
// console.log(list.get(6));

const map = Map<string, number>({ 'a': 1, 'b': 2, 'c': 3 });

map.set('d', 4);
map.set('e', 5);
map.set('f', 6);
map.set('g', 7);

console.log(map.get('a'));
console.log(map.get('b'));
console.log(map.get('c'));
console.log(map.get('d'));
console.log(map.get('e'));
console.log(map.get('f'));
console.log(map.get('g'));
console.log(map.findLast((value) => value === 2));

map.set('h.i', 8);
// map.set('h.j', 8);
map.setIn(['h', 'j'], 9);

console.log(map.toJS());

console.log(map.getIn(['h', 'i']));
console.log(map.get('h.j'));
