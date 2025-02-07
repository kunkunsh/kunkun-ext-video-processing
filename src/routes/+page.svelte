<script lang="ts">
	import { toast, ui } from '@kksh/api/ui/custom';
	import { Label, Progress } from '@kksh/svelte5';
	import type { ProcessVideoOptions } from '@hk/photographer-toolbox/types';
	import { Card } from '@kksh/svelte5';
	import type { ProcessVideoOptions as LocalProcessVideoOptions } from '@/types';
	import OptionsForm from '@/components/options-form.svelte';
	import type { OptionsEnable } from '@/types';
	import { verifyFormOptions } from '@/form';
	import { getRpcAPI } from '@/api';
	import { onMount } from 'svelte';

	onMount(() => {
		ui.showBackButton('bottom-right');
	});

	let options: ProcessVideoOptions = $state({});
	let progress = $state(0);
	let elapsedTimeSecs = $state(0);

	async function handleSubmit(options: LocalProcessVideoOptions, enabled: OptionsEnable) {
		progress = 1;
		const verifiedOptions = verifyFormOptions(options, enabled);
		if (!verifiedOptions) {
			toast.error('Invalid options');
			return;
		}
		const startTime = Date.now();
		getRpcAPI().then(({ api, process }) => {
			return api
				.convertVideo(
					options.inputPath,
					options.outputPath,
					verifiedOptions,
					() => {
						toast.info('Started');
					},
					(p) => {
						elapsedTimeSecs = Math.floor((Date.now() - startTime) / 1000);
						progress = p.percent ?? 0;
					},
					() => {
						progress = 0;
						process.kill();
						toast.success('Done');
					}
				)
				.catch((e) => {
					toast.error('Failed', { description: e });
					process.kill();
				});
		});
	}
</script>

<main class="container max-w-screen-lg space-y-3 pb-10 pt-10">
	<h1 class="text-2xl font-semibold">Convert Video</h1>
	<Card.Root class="sticky top-12 z-50">
		<Card.Content class="px-8 pb-0 pt-1">
			<Label class="text-lg font-semibold"
				>Progress
				{#if elapsedTimeSecs > 0}
					({elapsedTimeSecs}s)
				{/if}
			</Label>
			<Progress value={progress} max={100} class="pointer-events-none my-5" />
		</Card.Content>
	</Card.Root>
	<OptionsForm bind:options onSubmit={handleSubmit} inProgress={progress > 0} />
</main>
