<script lang="ts">
	import { cn } from '@/utils';
	import { Button, Input, Label } from '@kksh/svelte5';
	import { dialog, event } from '@kksh/api/ui/iframe';
	import { onDestroy, onMount } from 'svelte';
	let {
		class: className,
		name,
		inputPath = $bindable('')
	}: { class?: string; name?: string; inputPath?: string } = $props();

	onMount(async () => {
		event.onDragDrop((e) => {
			if (e.paths && e.paths.length > 0) {
				inputPath = e.paths[0];
			}
		});
	});

	onDestroy(() => {});

	function pickFile() {
		console.log('pickFile');
		dialog
			.open({
				directory: false
			})
			.then((path: string) => {
				console.log('path', path);
				inputPath = path;
			});
	}
</script>

<div class={cn('', className)}>
	<Label for={name} class="font-semibold">Input</Label>
	<div class="flex gap-1">
		<Input
			id={name}
			{name}
			type="text"
			class="font-mono"
			bind:value={inputPath}
			placeholder="You can drag and drop a file"
		/>
		<Button variant="secondary" onclick={pickFile}>Pick</Button>
	</div>
</div>
