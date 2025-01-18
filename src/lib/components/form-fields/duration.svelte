<script lang="ts">
	import { cn } from '@/utils';
	import { Button, Input, Label, Toggle } from '@kksh/svelte5';
	import InfoPopover from '../info-popover.svelte';
	import EnableButton from '../enable-button.svelte';
	let {
		class: className,
		name,
		duration = $bindable(),
		enabled = $bindable(false)
	}: { class?: string; name?: string; duration?: number | string; enabled?: boolean } = $props();
</script>

<div class={cn('flex flex-col gap-1', className)}>
	<div class="flex items-center gap-1">
		<Label for={name} class="font-semibold">Duration</Label>
		<InfoPopover
			description="Forces ffmpeg to stop transcoding after a specific output duration. The time parameter may be a number (in seconds) or a timestamp string (with format [[hh:]mm:]ss[.xxx])."
			class="h-4 w-4"
		/>
	</div>
	<div class="flex gap-1">
		<Input
			id={name}
			{name}
			disabled={!enabled}
			type="text"
			placeholder="e.g. 134.5 or 2:14.500"
			bind:value={duration}
		/>
		<EnableButton bind:enabled />
	</div>
</div>
