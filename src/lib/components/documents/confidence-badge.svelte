<script lang="ts">
	import { Badge } from "$lib/components/ui/badge/index.js";
	import { cn } from "$lib/utils.js";
	import { CheckCircle2, AlertTriangle, XCircle, type LucideIcon } from "lucide-svelte";

	let { confidenceJson }: { confidenceJson: string | null } = $props();

	const confidence = $derived(parseConfidence(confidenceJson));

	function parseConfidence(json: string | null): { label: string; color: string; bg: string; border: string; icon: LucideIcon } | null {
		if (!json) return null;
		try {
			const c = JSON.parse(json);
			const score = typeof c.confidence === 'number' ? c.confidence : 0.5;
			if (score >= 0.8) return { label: 'High Accuracy', color: 'text-emerald-700', icon: CheckCircle2, bg: 'bg-emerald-50', border: 'border-emerald-200' };
			if (score >= 0.5) return { label: 'Medium Confidence', color: 'text-amber-700', icon: AlertTriangle, bg: 'bg-amber-50', border: 'border-amber-200' };
			return { label: 'Low Confidence', color: 'text-rose-700', icon: XCircle, bg: 'bg-rose-50', border: 'border-rose-200' };
		} catch { return null; }
	}
</script>

{#if confidence}
	<Badge variant="outline" class={cn("gap-1.5", confidence.bg, confidence.color, confidence.border)}>
		<svelte:component this={confidence.icon} size={12} />
		{confidence.label}
	</Badge>
{/if}
