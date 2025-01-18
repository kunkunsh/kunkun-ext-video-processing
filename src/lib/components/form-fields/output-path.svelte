<script lang="ts">
	import { cn } from '@/utils';
	import { Button, Input, Label } from '@kksh/svelte5';
	import { dialog } from '@kksh/api/ui/iframe';
	let {
		class: className,
		name,
		outputPath = $bindable('')
	}: { class?: string; name?: string; outputPath?: string } = $props();

	function pickSavePath() {
		dialog.save().then((path: string | null) => {
			if (path) {
				outputPath = path;
			}
		});
	}
</script>

<div class={cn('', className)}>
	<Label for={name} class="font-semibold">Output</Label>
	<div class="flex gap-1">
		<Input id={name} {name} type="text" class="font-mono" bind:value={outputPath} />
		<Button variant="secondary" onclick={pickSavePath}>Pick</Button>
	</div>
</div>
