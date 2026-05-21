<script lang="ts">
	import { Card } from "$lib/components/ui/card/index.js";
	import { IMAGE_EXT_REGEX } from "$lib/config/constants.js";

	let { fileUrl, filename }: { fileUrl: string; filename: string } = $props();

	function toImageUrl(url: string): string {
		if (IMAGE_EXT_REGEX.test(url)) return url;
		return url.replace(/\/upload\//, '/upload/f_jpg/');
	}
</script>

<div class="hidden w-1/2 overflow-auto border-r bg-slate-200/50 p-6 md:block">
	<Card class="mx-auto max-w-2xl overflow-hidden shadow-2xl ring-1 ring-slate-300">
		<div class="relative bg-white p-2">
			<img src={toImageUrl(fileUrl)} alt={filename} class="h-auto w-full object-contain" />
		</div>
	</Card>
</div>
