<script lang="ts">
	import { cn } from '@/utils';
	import { Button, Input, Label, Toggle } from '@kksh/svelte5';
	import InfoPopover from '../info-popover.svelte';
	import EnableButton from '../enable-button.svelte';
	let {
		class: className,
		name,
		startTime = $bindable(),
		enabled = $bindable(false)
	}: { class?: string; name?: string; startTime?: number | string; enabled?: boolean } = $props();
</script>

<div class={cn('flex flex-col gap-1', className)}>
	<div class="flex items-center gap-1">
		<Label for={name} class="font-semibold">Start Time</Label>
		<InfoPopover
			description="Seeks an input and only start decoding at given time offset. The time argument may be a number (in seconds) or a timestamp string (with format [[hh:]mm:]ss[.xxx])."
			class="h-4 w-4"
		/>
	</div>
	<div class="flex gap-1">
		<Input
			id={name}
			{name}
			disabled={!enabled}
			class="grow"
			bind:value={startTime}
			placeholder="e.g. 134.5 or 2:14.500"
		/>
		<EnableButton bind:enabled />
	</div>
</div>
