<script>
	import '../app.css';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster, ThemeWrapper, updateTheme } from '@kksh/svelte5';
	import { toast } from 'svelte-sonner';
	import { onDestroy, onMount } from 'svelte';
	import { ui, shell } from '@kksh/api/ui/custom';
	import { api } from '@/stores/api';
	import { getFFmpegPath } from '@/api';

	onMount(async () => {
		ui.registerDragRegion();
		ui.getTheme().then((theme) => {
			updateTheme(theme);
		});
		getFFmpegPath().then((path) => {
			if (!path) {
				toast.error('ffmpeg not found in PATH', {
					description: 'Please install ffmpeg and ensure it is in your PATH'
				});
			}
		});
	});

	onDestroy(() => {
		api.destroy();
	});
</script>

<svelte:window
	on:keydown={(e) => {
		if (e.key === 'Escape') {
			if (document.activeElement?.nodeName === 'BODY') {
				e.preventDefault();
				ui.goBack();
			}
		}
	}}
/>
<Toaster richColors />
<ModeWatcher />
<ThemeWrapper>
	<div class="fixed top-0 h-12 w-full" data-kunkun-drag-region></div>
	<slot />
</ThemeWrapper>
