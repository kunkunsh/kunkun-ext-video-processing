<script lang="ts">
	import type { ProcessVideoOptions } from '@/types';
	import { cn } from '@/utils';
	import { Button, Input, Label } from '@kksh/svelte5';
	import EnableButton from '../enable-button.svelte';

	let {
		autopad = $bindable(),
		autopadColor = $bindable(),
		name,
		enabled = $bindable(false),
		class: className
	}: {
		autopad?: ProcessVideoOptions['enableAutopad'];
		autopadColor?: ProcessVideoOptions['autopadColor'];
		name?: string;
		enabled?: boolean;
		class?: string;
	} = $props();
</script>

<div class={cn('', className)}>
	<Label for={name} class="font-semibold">Autopad</Label>
	<div class="flex gap-1">
		<Input id={name} {name} type="color" bind:value={autopadColor} disabled={!autopad} />
		<EnableButton bind:enabled={autopad} />
	</div>
</div>
