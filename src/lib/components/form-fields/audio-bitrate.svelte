<script lang="ts">
	import { cn } from '@/utils';
	import { Button, Input, Label, Toggle } from '@kksh/svelte5';
	import InfoPopover from '../info-popover.svelte';
	import EnableButton from '../enable-button.svelte';
	let {
		class: className,
		name,
		audioBitrate = $bindable(),
		enabled = $bindable(false)
	}: {
		class?: string;
		name?: string;
		audioBitrate?: number | string;
		enabled?: boolean;
	} = $props();
</script>

<div class={cn('flex flex-col gap-1', className)}>
	<div class="flex items-center gap-1">
		<Label for={name} class="font-semibold">Audio Bitrate</Label>
		<InfoPopover description="Sets the audio bitrate in kbps." class="h-4 w-4" />
	</div>
	<div class="flex gap-1">
		<Input
			id={name}
			{name}
			disabled={!enabled}
			type="number"
			step="1"
			placeholder="128"
			bind:value={audioBitrate}
		/>
		<EnableButton bind:enabled />
	</div>
</div>
