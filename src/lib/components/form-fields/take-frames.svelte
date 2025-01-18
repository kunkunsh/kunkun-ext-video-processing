<script lang="ts">
	import { cn } from '@/utils';
	import { Button, Input, Label, Toggle } from '@kksh/svelte5';
	import InfoPopover from '../info-popover.svelte';
	import EnableButton from '../enable-button.svelte';
	let {
		class: className,
		name,
		takeFrames = $bindable(),
		enabled = $bindable(false)
	}: { class?: string; name?: string; takeFrames?: number; enabled?: boolean } = $props();
</script>

<div class={cn('flex flex-col gap-1', className)}>
	<div class="flex items-center gap-1">
		<Label for={name} class="font-semibold">Take Frames</Label>
		<InfoPopover description="Only encode a certain number of frames" class="h-4 w-4" />
	</div>
	<div class="flex gap-1">
		<Input
			id={name}
			{name}
			disabled={!enabled}
			type="number"
			min="0"
			step="1"
			placeholder="240"
			class="grow"
			bind:value={takeFrames}
		/>
		<EnableButton bind:enabled />
	</div>
</div>
