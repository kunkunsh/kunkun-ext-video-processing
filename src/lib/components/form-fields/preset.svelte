<script lang="ts">
	import { cn } from '@/utils';
	import { Select, Button, Input, Label, Toggle } from '@kksh/svelte5';
	import InfoPopover from '../info-popover.svelte';
	import EnableButton from '../enable-button.svelte';
	const presets = [
		'ultrafast',
		'superfast',
		'veryfast',
		'faster',
		'fast',
		'medium',
		'slow',
		'slower',
		'veryslow'
	];
	let {
		class: className,
		name,
		preset = $bindable(),
		enabled = $bindable(false)
	}: { class?: string; name?: string; preset?: string; enabled?: boolean } = $props();
</script>

<div class={cn('flex flex-col gap-1', className)}>
	<div class="flex items-center gap-1">
		<Label for={name} class="font-semibold">Preset</Label>
		<InfoPopover description="Preset for the encoding process" class="h-4 w-4" />
	</div>
	<div class="flex gap-1">
		<Select.Root type="single" name="favoriteFruit" bind:value={preset} disabled={!enabled}>
			<Select.Trigger class="">
				{#if preset}
					{preset}
				{:else}
					Select Preset
				{/if}
			</Select.Trigger>
			<Select.Content>
				<Select.Group>
					<Select.GroupHeading>Presets</Select.GroupHeading>
					{#each presets as preset}
						<Select.Item value={preset} label={preset}>
							{preset}
						</Select.Item>
					{/each}
				</Select.Group>
			</Select.Content>
		</Select.Root>
		<EnableButton bind:enabled />
	</div>
</div>
