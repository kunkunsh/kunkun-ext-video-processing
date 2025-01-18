<script lang="ts">
	import { cn } from '@/utils';
	import { Button, Label, Switch } from '@kksh/svelte5';
	import { CheckIcon } from 'lucide-svelte';
	import EnableButton from '../enable-button.svelte';

	let {
		class: className,
		name,
		noVideo = $bindable(),
		enabled = $bindable(false)
	}: { class?: string; name?: string; noVideo?: boolean; enabled?: boolean } = $props();
</script>

<div class={cn('flex flex-col gap-1', className)}>
	<div class="flex"><Label class="font-semibold">No Video</Label></div>
	<div class="flex items-center justify-between space-x-2">
		<div class="flex items-center gap-2">
			<Switch id={name} bind:checked={noVideo} disabled={!enabled} />
			{#if noVideo}
				<Label for={name}>Disable Video</Label>
			{:else}
				<Label for={name}>Keep Default</Label>
			{/if}
		</div>
		<EnableButton bind:enabled />
	</div>
</div>
