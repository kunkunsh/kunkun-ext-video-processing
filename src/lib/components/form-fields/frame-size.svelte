<script lang="ts">
	import { cn } from '@/utils';
	import { CheckIcon } from 'lucide-svelte';
	import { Button, Input, Label, Toggle } from '@kksh/svelte5';
	import InfoPopover from '../info-popover.svelte';
	import EnableButton from '../enable-button.svelte';
	let {
		class: className,
		name,
		size = $bindable(undefined),
		enabled = $bindable(false)
	}: { class?: string; name?: string; size?: string; enabled?: boolean } = $props();
</script>

<div class={cn('flex flex-col gap-1', className)}>
	<div class="flex items-center gap-1">
		<Label for={name} class="font-semibold">Frame Size</Label>
		<InfoPopover
			description="Don't set this if you've set a Resize Percentage. This will set the frame size to the specified width and height. You can use ? to set either width or height automatically."
			class="h-4 w-4"
		/>
	</div>
	<div class="flex gap-1">
		<Input
			id={name}
			{name}
			disabled={!enabled}
			type="number"
			min="0"
			max="100"
			placeholder="1920x1080 or 1920x?"
			step="1"
			bind:value={size}
		/>
		<EnableButton bind:enabled />
	</div>
</div>
