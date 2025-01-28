<script lang="ts">
	import { Button, HoverCard } from '@kksh/svelte5';
	import { InfoIcon } from 'lucide-svelte';

	let { description } = $props();
</script>

<HoverCard.Root>
	<HoverCard.Trigger>
		<Button size="icon" variant="outline"><InfoIcon /></Button>
	</HoverCard.Trigger>
	<HoverCard.Content>{description}</HoverCard.Content>
</HoverCard.Root>
