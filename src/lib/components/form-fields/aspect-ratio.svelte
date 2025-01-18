<script lang="ts">
	import { cn } from '@/utils';
	import { CheckIcon } from 'lucide-svelte';
	import { Button, Input, Label, Toggle } from '@kksh/svelte5';
	import InfoPopover from '../info-popover.svelte';
	import EnableButton from '../enable-button.svelte';
	let {
		class: className,
		name,
		aspectRatio = $bindable(undefined),
		enabled = $bindable(false)
	}: { class?: string; name?: string; aspectRatio?: string; enabled?: boolean } = $props();
</script>

<div class={cn('flex flex-col gap-1', className)}>
	<div class="flex items-center gap-1">
		<Label for={name} class="font-semibold">Aspect Ratio</Label>
		<InfoPopover
			description="Aspect Ratio is ignored if Frame Size is set to a fixed value. set frame size to something like 640x?, instead of 640x480."
			class="h-4 w-4"
		/>
	</div>
	<div class="flex gap-1">
		<Input
			id={name}
			{name}
			disabled={!enabled}
			type="text"
			placeholder="4:3 or 1.3333"
			bind:value={aspectRatio}
		/>
		<EnableButton bind:enabled />
	</div>
</div>
