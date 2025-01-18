<script lang="ts">
	import { cn } from '@/utils';
	import { Check, CheckIcon, ChevronsUpDown } from 'lucide-svelte';
	import { Button, Input, Label, Toggle, Command, Popover } from '@kksh/svelte5';
	import InfoPopover from '../info-popover.svelte';
	import { onMount, tick } from 'svelte';
	import { api } from '@/stores/api';
	import EnableButton from '../enable-button.svelte';
	let {
		class: className,
		name,
		videoCodec = $bindable(undefined),
		enabled = $bindable(false),
		codecs = $bindable([])
	}: {
		class?: string;
		name?: string;
		videoCodec?: string;
		enabled?: boolean;
		codecs?: string[];
	} = $props();

	let open = $state(false);
	let triggerRef = $state<HTMLButtonElement>(null!);
	// We want to refocus the trigger button when the user selects
	// an item from the list so users can continue navigating the
	// rest of the form with the keyboard.
	function closeAndFocusTrigger() {
		open = false;
		tick().then(() => {
			triggerRef.focus();
		});
	}
</script>

<div class={cn('flex flex-col gap-1', className)}>
	<div class="flex items-center gap-1">
		<Label for={name} class="font-semibold">Video Codec</Label>
		<InfoPopover
			description={`To take advantage of hardware acceleration, select a codec that is supported by your GPU.
			For example, on an M1 Mac, you can use h264_videotoolbox. Or codec with nvenc if you have an NVIDIA GPU.
			`}
			class="h-4 w-4"
		/>
	</div>
	<div class="flex gap-1">
		<Popover.Root bind:open>
			<Popover.Trigger bind:ref={triggerRef} disabled={!enabled}>
				{#snippet child({ props }: { props: any })}
					<Button
						variant="outline"
						class="w-full justify-between"
						{...props}
						role="combobox"
						aria-expanded={open}
					>
						{videoCodec || 'Select a codec, e.g. libx264'}
						<ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
					</Button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content class="w-[200px] p-0">
				<Command.Root>
					<Command.Input placeholder="Search codec..." disabled={!enabled} autofocus />
					<Command.List>
						<Command.Empty>No codec found.</Command.Empty>
						<Command.Group>
							{#each codecs as codec}
								<Command.Item
									value={codec}
									disabled={!enabled}
									onSelect={() => {
										if (!enabled) return;
										videoCodec = codec;
										closeAndFocusTrigger();
									}}
								>
									<Check class={cn('mr-2 size-4', videoCodec !== codec && 'text-transparent')} />
									{codec}
								</Command.Item>
							{/each}
						</Command.Group>
					</Command.List>
				</Command.Root>
			</Popover.Content>
		</Popover.Root>

		<EnableButton bind:enabled />
	</div>
</div>
