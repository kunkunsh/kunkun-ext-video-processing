import { VideoMetadata, DefaultVideoMetadata } from '@hk/photographer-toolbox/types';
import type { API } from '../src/types';
import {
	Action,
	app,
	Child,
	clipboard,
	expose,
	Form,
	fs,
	Icon,
	IconEnum,
	List,
	path,
	shell,
	system,
	toast,
	ui,
	WorkerExtension
} from '@kksh/api/ui/worker';
import { filesize } from 'filesize';

class VideoInfo extends WorkerExtension {
	api: API | undefined;
	apiProcess: Child | undefined;
	videoMetadata: Record<string, DefaultVideoMetadata> = {};

	async fillApi() {
		if (this.api) return;
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
		command.stderr.on('data', (stderr) => {
			console.warn('stderr', stderr);
		});
		this.api = rpcChannel.getAPI();
		this.apiProcess = process;
	}

	async refreshList(paths: string[]) {
		ui.render(new List.List({ items: [] }));
		if (!this.api) await this.fillApi();
		ui.showLoadingBar(true);
		return Promise.all(paths.map((p) => this.api?.readDefaultVideoMetadata(p)))
			.then((metadatas) => metadatas.filter((m) => !!m))
			.then((metadatas) => {
				this.videoMetadata = Object.fromEntries(
					paths.map((file, index) => [file, metadatas[index]])
				);
			})
			.then(async () => {
				return ui.render(
					new List.List({
						detail: new List.ItemDetail({
							width: 60,
							children: []
						}),
						items: await Promise.all(
							paths.map(async (file) => {
								const baseName = await path.basename(file);
								return new List.Item({
									title: baseName,
									value: file
								});
							})
						)
					})
				);
			})
			.finally(() => {
				ui.showLoadingBar(false);
				console.log('finally, kill api process', this.apiProcess?.pid);
				this.apiProcess?.kill();
				this.apiProcess = undefined;
				this.api = undefined;
			});
	}

	async load() {
		ui.render(new List.List({ items: [] }));
		await this.fillApi();
		ui.showLoadingBar(true);
		const ffprobePath = await shell.whereIsCommand('ffprobe');
		console.log('ffprobePath', ffprobePath);
		if (!ffprobePath) {
			return toast.error('ffprobe not found in path');
		}
		// await this.api?.setFfprobePath(ffprobePath);
		let videoPaths = (
			await Promise.all([
				system.getSelectedFilesInFileExplorer().catch(() => {
					return [];
				}),
				clipboard.hasFiles().then((has) => (has ? clipboard.readFiles() : Promise.resolve([])))
			])
		).flat();
		console.log('videoPaths', videoPaths);

		videoPaths = Array.from(new Set(videoPaths));
		this.refreshList(videoPaths);
	}

	async onFilesDropped(paths: string[]): Promise<void> {
		return this.refreshList(paths);
	}

	async onHighlightedListItemChanged(filePath: string): Promise<void> {
		const metadata = this.videoMetadata[filePath];
		const metadataLabels = [
			// genMetadataLabel(metadata, 'Width', 'width'),
			// genMetadataLabel(metadata, 'Height', 'height'),
			new List.ItemDetailMetadataLabel({
				title: 'Resolution',
				text: `${metadata.width}x${metadata.height}`
			}),
			new List.ItemDetailMetadataLabel({
				title: 'Size',
				text: metadata.size ? filesize(metadata.size) : 'N/A'
			}),
			genMetadataLabel(metadata, 'Average Frame Rate', 'avgFrameRate'),
			// genMetadataLabel(metadata, 'Bit Rate', 'bitRate'),
			new List.ItemDetailMetadataLabel({
				title: 'Bit Rate',
				// text: metadata.bitRate ? metadata.bitRate.toString() : 'N/A'
				text: metadata.bitRate ? `${filesize(metadata.bitRate / 8, { bits: true })}/s` : 'N/A'
			}),
			genMetadataLabel(metadata, 'Bits Per Raw Sample', 'bitsPerRawSample'),
			genMetadataLabel(metadata, 'Codec', 'codec'),
			genMetadataLabel(metadata, 'Codec Long Name', 'codecLongName'),
			genMetadataLabel(metadata, 'Codec Tag', 'codecTag'),
			genMetadataLabel(metadata, 'Codec Tag String', 'codecTagString'),
			genMetadataLabel(metadata, 'Codec Type', 'codecType'),
			genMetadataLabel(metadata, 'Duration', 'duration'),
			genMetadataLabel(metadata, 'File Path', 'filePath'),
			genMetadataLabel(metadata, 'Format Long Name', 'formatLongName'),
			genMetadataLabel(metadata, 'Format Name', 'formatName'),
			genMetadataLabel(metadata, 'Number Of Frames', 'numberOfFrames'),
			genMetadataLabel(metadata, 'Number Of Streams', 'numberOfStreams'),
			genMetadataLabel(metadata, 'Numeric Average Frame Rate', 'numericAvgFrameRate'),
			genMetadataLabel(metadata, 'Profile', 'profile'),
			genMetadataLabel(metadata, 'Raw Frame Rate', 'rFrameRate'),
			genMetadataLabel(metadata, 'Start Time', 'startTime'),
			genMetadataLabel(metadata, 'Time Base', 'timeBase')
		].filter((label) => label !== null);
		return ui.render(
			new List.List({
				inherits: ['items'],
				detail: new List.ItemDetail({
					width: 55,
					children: [new List.ItemDetailMetadata(metadataLabels)]
				})
			})
		);
	}

	async onBeforeGoBack(): Promise<void> {
		console.log('onBeforeGoBack, kill api process', this.apiProcess?.pid);
		await this.apiProcess?.kill();
	}

	async onListItemSelected(value: string): Promise<void> {
		return Promise.resolve();
	}
}

function genMetadataLabel(metadata: DefaultVideoMetadata, title: string, key: string) {
	if (!metadata[key]) return null;
	return new List.ItemDetailMetadataLabel({
		title,
		text:
			typeof metadata[key] === 'number'
				? Number.isInteger(metadata[key])
					? metadata[key].toString()
					: metadata[key].toFixed(3).toString()
				: metadata[key].toString()
	});
}

expose(new VideoInfo());
