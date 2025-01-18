<script lang="ts">
	import { cn } from '@/utils';
	import { CheckIcon } from 'lucide-svelte';
	import { Button, Input, Label, Toggle } from '@kksh/svelte5';
	import InfoPopover from '../info-popover.svelte';
	import EnableButton from '../enable-button.svelte';
	import { onMount } from 'svelte';
	import { getFFmpegPath, getRpcAPI } from '@/api';
	let {
		class: className,
		name,
		ffmpegPath = $bindable(),
		enabled = $bindable(false)
	}: { class?: string; name?: string; ffmpegPath?: string; enabled?: boolean } = $props();
	let placeholder = $state('/usr/bin/ffmpeg');
	onMount(() => {
		getFFmpegPath().then((path) => {
			if (path) {
				placeholder = path;
			}
		});
	});
</script>

<div class={cn('flex flex-col gap-1', className)}>
	<div class="flex items-center gap-1">
		<Label for={name} class="font-semibold">FFmpeg Path</Label>
		<InfoPopover description="Set ffmpeg path." class="h-4 w-4" />
	</div>
	<div class="flex gap-1">
		<Input id={name} {name} disabled={!enabled} type="text" {placeholder} bind:value={ffmpegPath} />
		<EnableButton bind:enabled />
	</div>
</div>
