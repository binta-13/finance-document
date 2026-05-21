<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import { cn } from "$lib/utils.js";
	import { ChevronLeft, Download, RefreshCw, Save } from "lucide-svelte";

	let { filename, docId, saving = false, ocrRunning = false, onexport, onrunocr, onsave }: {
		filename: string; docId: string; saving: boolean; ocrRunning: boolean;
		onexport: () => void; onrunocr: () => void; onsave: () => void;
	} = $props();
</script>

<header class="border-b bg-white px-4 py-3 sm:px-6">
	<div class="mx-auto flex max-w-7xl items-center justify-between">
		<div class="flex items-center gap-4">
			<a href="/" class="text-slate-500 hover:text-slate-900 transition-colors">
				<ChevronLeft size={24} />
			</a>
			<div>
				<h1 class="text-lg font-bold text-slate-900">{filename}</h1>
				<p class="text-xs font-medium text-slate-500">ID: {docId?.slice(0, 8) ?? '...'}</p>
			</div>
		</div>

		<div class="flex items-center gap-2">
			<Button variant="outline" size="sm" class="hidden sm:flex" onclick={onexport}>
				<Download size={16} class="mr-2" />
				Export CSV
			</Button>
			<Button variant="secondary" size="sm" onclick={onrunocr} disabled={ocrRunning}>
				<RefreshCw size={16} class={cn("mr-2", ocrRunning && "animate-spin")} />
				{ocrRunning ? 'Running OCR...' : 'Run OCR'}
			</Button>
			<Button size="sm" onclick={onsave} disabled={saving || ocrRunning} class="shadow-md shadow-blue-500/20">
				{#if saving}
					<RefreshCw size={16} class="mr-2 animate-spin" />
					Saving...
				{:else}
					<Save size={16} class="mr-2" />
					Save Changes
				{/if}
			</Button>
		</div>
	</div>
</header>
