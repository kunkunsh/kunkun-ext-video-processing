<script lang="ts">
	import InputFile from '@/components/form-fields/input-file.svelte';
	import OutputPath from '@/components/form-fields/output-path.svelte';
	import { Label, Card, Input, Button, Progress } from '@kksh/svelte5';
	import { toast, fs, dialog, ui } from '@kksh/api/ui/custom';
	import { getRpcAPI } from '@/api';
	import ExplainCard from './ExplainCard.svelte';
	import { onMount } from 'svelte';

	let progress = $state(0);
	let elapsedTimeSecs = $state(0);
	let inputPath = $state('');
	let outputPath = $state('');
	let fps = $state(10);
	let duration = $state(5);
	let startTime = $state(0);
	let scale = $state(480);

	onMount(() => {
		ui.showBackButton('bottom-right');
	});

	async function handleSubmit() {
		elapsedTimeSecs = 0;
		const start = Date.now();
		if (!inputPath || !outputPath) {
			toast.error('Please select an input and output path');
			return;
		}
		if (!(await fs.exists(inputPath))) {
			toast.error('Input file does not exist');
			return;
		}
		if (!outputPath.endsWith('.gif')) {
			toast.error('Output file must end with .gif');
			return;
		}
		if (await fs.exists(outputPath)) {
			if (!(await dialog.confirm('Output file already exists. Overwrite?'))) {
				toast.info('Cancelled');
				return;
			}
		}

		getRpcAPI().then(({ api, process }) => {
			return api
				.convertToGif(
					inputPath,
					outputPath,
					{
						scale,
						fps,
						duration,
						startTime
					},
					() => {
						progress = 0;
						toast.info('Started');
					},
					(p) => {
						console.log(p);
						elapsedTimeSecs = Math.floor((Date.now() - start) / 1000);
						progress = p.percent ?? 0;
					},
					() => {
						console.log('end');
						progress = 100;
						process.kill();
						toast.info('Done');
					}
				)
				.catch((e) => {
					console.error(e);
					toast.error('Failed', { description: e });
					process.kill();
				})
				.finally(() => {});
		});
	}
</script>

<main class="container max-w-screen-lg space-y-3 pb-10 pt-10">
	<h1 class="text-2xl font-semibold">Convert to GIF</h1>
	<Card.Root>
		<Card.Header>
			<Label class="text-lg font-semibold"
				>Progress
				{#if elapsedTimeSecs > 0}
					({elapsedTimeSecs}s)
				{/if}
			</Label>
			<Progress value={progress} max={100} class="pointer-events-none my-5" />
		</Card.Header>
		<Card.Content class="space-y-1">
			<InputFile bind:inputPath />
			<OutputPath bind:outputPath />
			<div class="grid grid-cols-4 gap-2">
				<div>
					<Label class="pl-1">FPS</Label>
					<div class="flex gap-0.5">
						<Input type="number" min={1} step={1} bind:value={fps} />
						<ExplainCard description="Frames per second" />
					</div>
				</div>
				<div>
					<Label class="pl-1">Duration (s)</Label>
					<div class="flex gap-0.5">
						<Input type="number" min={1} step={1} bind:value={duration} />
						<ExplainCard
							description="Duration in seconds. You can take 5 seconds from a 3 minutes video. gif will be huge if you don't set a duration limit."
						/>
					</div>
				</div>
				<div>
					<Label class="pl-1">Start Time (s)</Label>
					<div class="flex gap-0.5">
						<Input type="number" min={0} bind:value={startTime} />
						<ExplainCard
							description="Start time in seconds. This is an offset from the start of the video."
						/>
					</div>
				</div>
				<div>
					<Label class="pl-1">Scale</Label>
					<div class="flex gap-0.5">
						<Input type="number" min={100} step={10} bind:value={scale} />
						<ExplainCard description="This number will be the final width of the gif" />
					</div>
				</div>
			</div>
		</Card.Content>
		<Card.Footer>
			<Button class="w-full" disabled={!inputPath || !outputPath} onclick={handleSubmit}>
				Convert
			</Button>
		</Card.Footer>
	</Card.Root>
</main>
