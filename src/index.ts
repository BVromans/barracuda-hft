import { Rujira } from "./rujira";
import { RujiraConstructorOptions, RujiraInitializeOptions } from "./types";

(async function run() {
	const rujira = new Rujira({} as RujiraConstructorOptions);

	await rujira.initialize({} as RujiraInitializeOptions);
})();
