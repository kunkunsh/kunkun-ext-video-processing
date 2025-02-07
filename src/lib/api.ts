import { shell, toast } from '@kksh/api/ui/custom';
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
	command.stderr.on('data', (data) => {
		console.warn(data);
		if (data.includes('Conversion failed!')) {
			toast.error('Conversion failed!');
		}
	});
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
