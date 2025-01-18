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
		format = $bindable(undefined),
		enabled = $bindable(false),
		inputFilePath
	}: {
		class?: string;
		name?: string;
		format?: string;
		enabled?: boolean;
		inputFilePath?: string;
	} = $props();

	const videoFormats = $state(['mp4', 'mkv', 'webm', 'mpg', 'avi', 'ogv', 'flv']);
	const audioFormats = $state(['mp3', 'm4a', 'ogg', 'flac', 'wav']);

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
		<Label for={name} class="font-semibold">Format</Label>
		<InfoPopover description="" class="h-4 w-4" />
	</div>
	<div class="flex gap-1">
		<Popover.Root bind:open>
			<Popover.Trigger bind:ref={triggerRef} class="grow" disabled={!enabled}>
				{#snippet child({ props }: { props: any })}
					<Button
						variant="outline"
						class="w-full justify-between"
						{...props}
						role="combobox"
						aria-expanded={open}
					>
						{format || 'Select a format, e.g. mp4'}
						<ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
					</Button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content class="w-[200px] p-0">
				<Command.Root>
					<Command.Input placeholder="Search format..." disabled={!enabled} autofocus />
					<Command.List>
						<Command.Empty>No format found.</Command.Empty>
						<Command.Group heading="Video">
							{#each videoFormats as _format}
								<Command.Item
									value={_format}
									disabled={!enabled}
									onSelect={() => {
										if (!enabled) return;
										format = _format;
										closeAndFocusTrigger();
									}}
								>
									<Check class={cn('mr-2 size-4', format !== _format && 'text-transparent')} />
									{_format}
								</Command.Item>
							{/each}
						</Command.Group>
						<Command.Group heading="Audio">
							{#each audioFormats as _format}
								<Command.Item
									value={_format}
									disabled={!enabled}
									onSelect={() => {
										if (!enabled) return;
										format = _format;
										closeAndFocusTrigger();
									}}
								>
									<Check class={cn('mr-2 size-4', format !== _format && 'text-transparent')} />
									{_format}
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
