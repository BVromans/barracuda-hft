// Install these first:
//   npm install @type-cacheable/core @type-cacheable/lru-cache-adapter lru-cache

import { Cacheable } from '@type-cacheable/core';
import cacheManager, { CacheManagerOptions } from '@type-cacheable/core';
import { useAdapter } from '@type-cacheable/lru-cache-adapter';
import { LRUCache } from 'lru-cache';

// 1) Create your LRU cache instance (ttl here is optional — decorator handles expiry)
const rawCache = new LRUCache<string, any>({
  max: 1000,
  ttl: 1000,
});

// 2) Wrap it in the type-cacheable adapter
const cacheAdapter = useAdapter(rawCache);

// 3) (Optional) Set globally so you don’t need to pass `client` each time:
cacheManager.setOptions(<CacheManagerOptions>{
  adapter: cacheAdapter,
});

// 4) Define your class and decorate the method
class TestClass {
  // build a key from the first arg
  static setCacheKey = ([id]: [number]) => id.toString();

  @Cacheable({
    cacheKey: (args: any[]) => args[0].toString(),
    ttlSeconds: 5,        // cache for 5 seconds
    // client: cacheAdapter // not needed if you used setOptions above
  })
  public async getValue(id: number): Promise<number> {
    console.log('🔄 Generating new random for id', id);
    return Math.floor(Math.random() * 100) + 1;
  }
}

;(async () => {
  const test = new TestClass();

  console.log(await test.getValue(1)); // 🔄 computes
  console.log(await test.getValue(1)); // cached
  await new Promise((r) => setTimeout(r, 1000));
  console.log(await test.getValue(1)); // cached

  // wait 6 seconds so TTL (5s) expires
  await new Promise((r) => setTimeout(r, 6000));

  console.log(await test.getValue(1)); // 🔄 computes again
  console.log(await test.getValue(1)); // cached

  await new Promise((r) => setTimeout(r, 6000));
  console.log(await test.getValue(1)); // 🔄 computes again
  console.log(await test.getValue(1)); // cached
})();
