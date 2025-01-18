import { get, writable } from 'svelte/store';
import type { API } from '../../types';
import { getRpcAPI } from '@/api';
import type { Child, DenoCommand } from '@kksh/api/ui/worker';

export function createApiStore() {
	const store = writable<{
		api: API;
		process: Child;
		command: DenoCommand<string>;
	} | null>(null);

	async function init() {
		return getRpcAPI().then(({ api, process, command }) => {
			console.log('init api', api);
			store.set({ api, process, command });
		});
	}

	return {
		...store,
		init,
		api: get(store)?.api,
		destroy() {
			console.log('destroy api');
			get(store)?.process.kill();
		}
	};
}

export const api = createApiStore();
