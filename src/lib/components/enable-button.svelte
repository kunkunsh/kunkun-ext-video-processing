<script lang="ts">
	import { cn } from '@/utils';
	import { Button } from '@kksh/svelte5';
	import { CheckIcon } from 'lucide-svelte';
	import Icon from '@iconify/svelte';

	let { enabled = $bindable(false) }: { enabled?: boolean } = $props();
</script>

<Button
	variant={enabled ? 'default' : 'secondary'}
	size="icon"
	class={cn('shrink-0 text-xl', {
		'text-green-500': enabled,
		'text-gray-500': !enabled
	})}
	onclick={() => (enabled = !enabled)}
>
	<Icon
		icon="mdi:check-bold"
		class={cn('h-6 w-6', {
			'scale-125': enabled
		})}
	/>
</Button>
