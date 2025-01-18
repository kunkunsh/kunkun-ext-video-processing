import { shell } from '@kksh/api/ui/iframe';
import type { API } from '../types';

export async function getRpcAPI() {
	const { rpcChannel, process, command } = await shell.createDenoRpcChannel<object, API>(
		'$EXTENSION/deno-src/index.ts',
		[],
		{
			allowAllEnv: true,
			// allowEnv: ['NODE_V8_COVERAGE', 'npm_package_config_libvips', 'EXIFTOOL_HOME', 'OSTYPE'],
			// allowFfi: ["*sharp-darwin-arm64.node"],
			allowAllFfi: true,
			allowAllRead: true,
			allowAllSys: true,
			// allowSys: ['uid', 'cpus'],
			// allowRun: ["*exiftool"]
			allowAllRun: true,
			env: {
				FFMPEG_PATH: '/opt/homebrew/bin/ffmpeg',
				FFPROBE_PATH: '/opt/homebrew/bin/ffprobe'
			}
		},
		{}
	);
	const api = rpcChannel.getAPI();
	return {
		api,
		rpcChannel,
		process,
		command
	};
}

export function getFFmpegPath() {
	return shell.hasCommand('ffmpeg').then((has) => {
		if (has) {
			return shell.whereIsCommand('ffmpeg');
		} else {
			return null;
		}
	});
}
