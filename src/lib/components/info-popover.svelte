<script lang="ts">
	import { Popover } from '@kksh/svelte5';
	import { InfoIcon } from 'lucide-svelte';

	let { description, class: className }: { description: string; class?: string } = $props();
</script>

<Popover.Root>
	<Popover.Trigger>
		<InfoIcon class={className} />
	</Popover.Trigger>
	<Popover.Content>
		<div class="text-sm">{description}</div>
	</Popover.Content>
</Popover.Root>
