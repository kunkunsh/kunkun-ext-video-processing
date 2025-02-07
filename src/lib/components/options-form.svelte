<script lang="ts">
	import { browser, dev } from '$app/environment';
	import { ProcessVideoOptionsSchema, type OptionsEnable } from '@/types';
	import type { ProcessVideoOptions } from '@hk/photographer-toolbox/types';
	import type { ProcessVideoOptions as LocalProcessVideoOptions } from '@/types';
	import {
		Tabs,
		Switch,
		Label,
		Input,
		Form,
		Card,
		Button,
		Separator,
		Accordion
	} from '@kksh/svelte5';

	// import * as Form from '$lib/components/ui/form';
	import SuperDebug, { defaults, superForm } from 'sveltekit-superforms';
	import { valibot, valibotClient } from 'sveltekit-superforms/adapters';
	import * as v from 'valibot';
	import InputFile from './form-fields/input-file.svelte';
	import FFmpegPath from './form-fields/ffmpeg-path.svelte';
	import FPS from './form-fields/fps.svelte';
	import OutputPath from './form-fields/output-path.svelte';
	import ResizePercentage from './form-fields/resize-percentage.svelte';
	import FrameSize from './form-fields/frame-size.svelte';
	import AspectRatio from './form-fields/aspect-ratio.svelte';
	import VideoCodec from './form-fields/video-codec.svelte';
	import AudioCodec from './form-fields/audio-codec.svelte';
	import Format from './form-fields/format.svelte';
	import NoAudio from './form-fields/no-audio.svelte';
	import TakeFrames from './form-fields/take-frames.svelte';
	import NoVideo from './form-fields/no-video.svelte';
	import AudioQuality from './form-fields/audio-quality.svelte';
	import Preset from './form-fields/preset.svelte';
	import StartTime from './form-fields/start-time.svelte';
	import Duration from './form-fields/duration.svelte';
	import AudioBitrate from './form-fields/audio-bitrate.svelte';
	import VideoBitrate from './form-fields/video-bitrate.svelte';
	import AudioChannels from './form-fields/audio-channels.svelte';
	import Autopad from './form-fields/autopad.svelte';
	import { getRpcAPI } from '@/api';
	import type { Child } from '@kksh/api/ui/template';
	import { toast } from 'svelte-sonner';

	let {
		options = $bindable({}),
		onSubmit,
		inProgress
	}: {
		options: ProcessVideoOptions;
		onSubmit?: (options: LocalProcessVideoOptions, enabled: OptionsEnable) => void;
		inProgress?: boolean;
	} = $props();
	let videoCodecs = $state<string[]>([]);
	let audioCodecs = $state<string[]>([]);
	let apiProcess: Child | undefined;
	const enabled = $state<OptionsEnable>({
		resizePercentage: false,
		size: false,
		aspectRatio: false,
		videoCodec: false,
		audioCodec: false,
		format: false,
		outputOptions: false,
		audioFilters: false,
		noAudio: false,
		takeFrames: false,
		noVideo: false,
		autopadPad: false,
		autopadColor: false,
		audioQuality: false,
		fps: false,
		preset: false,
		startTime: false,
		duration: false,
		audioBitrate: false,
		videoBitrate: false,
		audioChannels: false,
		ffmpegPath: false
	});
	const form = superForm(defaults(valibot(ProcessVideoOptionsSchema)), {
		validators: valibotClient(ProcessVideoOptionsSchema),
		SPA: true,
		onUpdate({ form, cancel }) {
			const result = v.safeParse(ProcessVideoOptionsSchema, form.data);
			if (result.issues) {
				console.log(v.flatten(result.issues));
			}
			if (!form.valid) {
				console.log('invalid');
				return;
			}
			onSubmit?.(form.data, enabled);
			cancel();
		}
	});

	$effect(() => {
		getRpcAPI().then(({ api, process }) => {
			apiProcess = process;
			return api
				.getAvailableCodecsNamesByType('video', $formData.inputPath)
				.then((_codecs) => {
					videoCodecs = ['copy', ..._codecs];
				})
				.then(() => api.getAvailableCodecsNamesByType('audio', $formData.inputPath))
				.then((_codecs) => {
					audioCodecs = ['copy', ..._codecs];
				})
				.catch((err) => {
					toast.error('Fail to load codecs', {
						description: err.message
					});
				})
				.finally(() => {
					process.kill();
				});
		});
	});

	const { form: formData, enhance, errors } = form;
</script>

<form method="POST" use:enhance>
	<Card.Root>
		<Card.Content class="space-y-1">
			<InputFile bind:inputPath={$formData.inputPath} />
			<OutputPath bind:outputPath={$formData.outputPath} />
			<div class="grid grid-cols-2 gap-2 pt-2">
				<Format bind:format={$formData.format} bind:enabled={enabled.format} />
				<ResizePercentage
					bind:resizePercentage={$formData.resizePercentage}
					bind:enabled={enabled.resizePercentage}
				/>
			</div>
		</Card.Content>
	</Card.Root>
	<Form.Button class="mt-3" disabled={inProgress}>Start Processing</Form.Button>
	<Separator class="my-3" />
	<Accordion.Root type="single" class="w-full">
		<Accordion.Item value="item-1">
			<Accordion.Trigger>More Options</Accordion.Trigger>
			<Accordion.Content>
				<Tabs.Root value="video" class="w-full">
					<Tabs.List class="grid w-full grid-cols-2">
						<Tabs.Trigger value="video">Video</Tabs.Trigger>
						<Tabs.Trigger value="audio">Audio</Tabs.Trigger>
					</Tabs.List>
					<Tabs.Content value="video">
						<Card.Root>
							<Card.Content class="grid grid-cols-2 gap-2 space-y-2">
								<FrameSize bind:size={$formData.size} bind:enabled={enabled.size} />
								<!-- <AspectRatio
									bind:aspectRatio={$formData.aspectRatio}
									bind:enabled={enabled.aspectRatio}
								/> -->
								<VideoCodec
									bind:videoCodec={$formData.videoCodec}
									bind:enabled={enabled.videoCodec}
									codecs={videoCodecs}
								/>
								<TakeFrames
									bind:takeFrames={$formData.takeFrames}
									bind:enabled={enabled.takeFrames}
								/>
								<NoVideo bind:noVideo={$formData.noVideo} bind:enabled={enabled.noVideo} />
								<FPS bind:fps={$formData.fps} bind:enabled={enabled.fps} />
								<Preset bind:preset={$formData.preset} bind:enabled={enabled.preset} />
								<StartTime bind:startTime={$formData.startTime} bind:enabled={enabled.startTime} />
								<Duration bind:duration={$formData.duration} bind:enabled={enabled.duration} />
								<VideoBitrate
									bind:videoBitrate={$formData.videoBitrate}
									bind:enabled={enabled.videoBitrate}
								/>
								<Autopad
									bind:autopad={$formData.enableAutopad}
									bind:autopadColor={$formData.autopadColor}
									bind:enabled={enabled.autopadPad}
								/>
								<FFmpegPath
									bind:ffmpegPath={$formData.ffmpegPath}
									bind:enabled={enabled.ffmpegPath}
								/>
							</Card.Content>
						</Card.Root>
					</Tabs.Content>
					<Tabs.Content value="audio">
						<Card.Root>
							<Card.Content class="grid grid-cols-2 gap-2 space-y-2">
								<AudioCodec
									bind:audioCodec={$formData.audioCodec}
									bind:enabled={enabled.audioCodec}
									codecs={audioCodecs}
								/>
								<NoAudio bind:noAudio={$formData.noAudio} bind:enabled={enabled.noAudio} />
								<AudioQuality
									bind:audioQuality={$formData.audioQuality}
									bind:enabled={enabled.audioQuality}
								/>
								<AudioBitrate
									bind:audioBitrate={$formData.audioBitrate}
									bind:enabled={enabled.audioBitrate}
								/>
								<AudioChannels
									bind:audioChannels={$formData.audioChannels}
									bind:enabled={enabled.audioChannels}
								/>
							</Card.Content>
						</Card.Root>
					</Tabs.Content>
				</Tabs.Root>
			</Accordion.Content>
		</Accordion.Item>
	</Accordion.Root>
	{#if browser && dev}
		<SuperDebug data={$formData} />
	{/if}
</form>

<!-- <pre>{JSON.stringify(enabled, null, 2)}</pre> -->
