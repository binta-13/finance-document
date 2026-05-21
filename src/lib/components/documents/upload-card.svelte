<script lang="ts">
	import { Card, CardContent } from "$lib/components/ui/card/index.js";
	import { cn } from "$lib/utils.js";
	import { UploadCloud } from "lucide-svelte";

	let { uploading = false, ocrRunning = false, dragOver = false, uploadCount = 0, totalUploads = 0, ondrop, ondragover, ondragleave, onfilepick }: {
		uploading: boolean; ocrRunning: boolean; dragOver: boolean; uploadCount: number; totalUploads: number;
		ondrop: (e: DragEvent) => void; ondragover: (e: DragEvent) => void; ondragleave: () => void; onfilepick: (e: Event) => void;
	} = $props();
</script>

<Card class={cn(
	"relative flex flex-col items-center justify-center border-2 border-dashed p-10 transition-all",
	dragOver ? "border-primary bg-blue-50/50 ring-4 ring-blue-50" : "border-slate-200 hover:border-slate-300 bg-white"
)}
ondragover={ondragover}
ondragleave={ondragleave}
ondrop={ondrop}>
	{#if uploading || ocrRunning}
		<div class="flex flex-col items-center gap-4 text-center">
			<div class="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
			<div class="space-y-1">
				<p class="font-semibold text-slate-900">{uploading ? `Uploading ${uploadCount + 1} of ${totalUploads}...` : 'Running AI OCR...'}</p>
				<p class="text-xs text-slate-500">This might take a few seconds</p>
			</div>
		</div>
	{:else}
		<div class="flex flex-col items-center gap-4 text-center">
			<div class="bg-primary/10 text-primary flex h-16 w-16 items-center justify-center rounded-2xl">
				<UploadCloud size={32} />
			</div>
			<div class="space-y-1">
				<p class="font-semibold text-slate-900">Drag & drop document</p>
				<p class="text-sm text-slate-500">PDF, JPG, PNG up to 10MB (multiple files)</p>
			</div>
			<label class="bg-primary hover:bg-primary/90 mt-2 inline-flex cursor-pointer items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-black transition-colors shadow-md shadow-blue-500/20">
				Browse Files
				<input type="file" accept="image/*,application/pdf" multiple hidden onchange={onfilepick}>
			</label>
		</div>
	{/if}
</Card>
