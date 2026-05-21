<script lang="ts">
	import { Input } from "$lib/components/ui/input/index.js";
	import { Label } from "$lib/components/ui/label/index.js";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import { Card } from "$lib/components/ui/card/index.js";
	import { cn } from "$lib/utils.js";
	import type { Document, LineItem } from "$lib/types.js";
	import { Building2, Calendar as CalendarIcon, Info } from "lucide-svelte";
	import DocumentHeader from "$lib/components/documents/document-header.svelte";
	import DocumentPreview from "$lib/components/documents/document-preview.svelte";
	import ConfidenceBadge from "$lib/components/documents/confidence-badge.svelte";
	import LineItemsEditor from "$lib/components/documents/line-items-editor.svelte";
	import { IMAGE_EXT_REGEX } from "$lib/config/constants.js";

	function toImageUrl(url: string): string {
		if (IMAGE_EXT_REGEX.test(url)) return url;
		return url.replace(/\/upload\//, '/upload/f_jpg/');
	}

	let { data } = $props();

	const extraction = data.doc?.extraction;
	const confidenceJson = extraction?.confidence_json ?? null;

	let doc = $state(data.doc as Document | null);
	let saving = $state(false);
	let ocrRunning = $state(false);

	let vendor = $state(extraction?.vendor ?? '');
	let date = $state(extraction?.date ?? '');
	let total = $state(extraction?.total?.toString() ?? '');
	let currency = $state(extraction?.currency ?? '');
	let lineItems = $state(
		extraction?.line_items?.map((i: LineItem) => ({ ...i })) ?? [{ description: '', quantity: '', unit_price: '', amount: '' }] as LineItem[]
	);

	async function save() {
		if (!doc) return;
		saving = true;
		try {
			const payload = {
				status: 'completed',
				extraction: {
					vendor: vendor || null,
					date: date || null,
					total: total ? parseFloat(total) : null,
					currency: currency || null,
					is_reviewed: 1,
					edited_json: JSON.stringify({ vendor, date, total, currency }),
					line_items: lineItems.map((i: LineItem) => ({
						description: i.description || null,
						quantity: i.quantity ? parseFloat(String(i.quantity)) : null,
						unit_price: i.unit_price ? parseFloat(String(i.unit_price)) : null,
						amount: i.amount ? parseFloat(String(i.amount)) : null
					}))
				}
			};
			const res = await fetch(`/api/documents/${doc.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (res.ok) doc.status = 'completed';
		} finally { saving = false; }
	}

	async function runOcr() {
		if (!doc?.id) return;
		ocrRunning = true;
		try {
			const ocrRes = await fetch(`/api/ocr/${doc.id}`, { method: 'POST' });
			if (!ocrRes.ok) { console.error('OCR server error', await ocrRes.text()); return; }
			const docRes = await fetch(`/api/documents/${doc.id}`);
			if (docRes.ok) {
				const updated = await docRes.json();
				doc = updated;
				vendor = updated.extraction?.vendor ?? '';
				date = updated.extraction?.date ?? '';
				total = updated.extraction?.total?.toString() ?? '';
				currency = updated.extraction?.currency ?? '';
				lineItems = updated.extraction?.line_items?.length > 0
					? updated.extraction.line_items.map((i: Record<string, unknown>) => ({
						id: (i.id as string) ?? '', description: (i.description as string) ?? '',
						quantity: (i.quantity?.toString() as string) ?? '',
						unit_price: (i.unit_price?.toString() as string) ?? '',
						amount: (i.amount?.toString() as string) ?? ''
					}))
					: [{ description: '', quantity: '', unit_price: '', amount: '' }];
			}
		} finally { ocrRunning = false; }
	}

	function exportCsv() {
		if (!doc) return;
		const a = document.createElement('a');
		a.href = `/api/documents/${doc.id}/export?format=csv`;
		a.download = `${doc.filename}_export.csv`;
		a.click();
	}
</script>

<svelte:head>
	<title>Review — {doc?.filename ?? 'Not Found'}</title>
</svelte:head>

<div class="flex h-screen flex-col bg-slate-50/50">
	<DocumentHeader
		filename={doc?.filename ?? 'Document Review'}
		docId={doc?.id ?? ''}
		{saving}
		{ocrRunning}
		onexport={exportCsv}
		onrunocr={runOcr}
		onsave={save}
	/>

	{#if !doc}
		<div class="flex flex-1 items-center justify-center">
			<div class="text-center">
				<div class="bg-slate-100 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-slate-400">
					<Info size={24} />
				</div>
				<h2 class="text-lg font-semibold text-slate-900">Document not found</h2>
				<p class="text-slate-500 mt-1">The document you're looking for doesn't exist or has been removed.</p>
				<a href="/" class="text-primary mt-4 inline-block font-medium hover:underline">Return to Dashboard</a>
			</div>
		</div>
	{:else}
		<main class="flex flex-1 overflow-hidden">
			<DocumentPreview fileUrl={doc.file_url} filename={doc.filename} />

			<div class="flex w-full flex-col overflow-y-auto bg-white md:w-1/2">
				<div class="p-6 lg:p-8">
					<div class="mb-8 flex items-center justify-between">
						<div>
							<h2 class="text-sm font-semibold uppercase tracking-wider text-slate-500">Extraction Results</h2>
							<div class="mt-1 flex items-center gap-2">
								<Badge variant="outline" class="bg-blue-50 text-blue-700 border-blue-200 capitalize">
									{doc.status}
								</Badge>
								<ConfidenceBadge confidenceJson={confidenceJson} />
							</div>
						</div>
					</div>

					<div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
						<div class="space-y-1.5">
							<Label for="vendor" class="text-xs font-bold uppercase text-slate-500">Vendor</Label>
							<div class="relative">
								<Building2 class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
								<Input id="vendor" bind:value={vendor} class="pl-9 focus:ring-primary" placeholder="Vendor Name" />
							</div>
						</div>
						<div class="space-y-1.5">
							<Label for="date" class="text-xs font-bold uppercase text-slate-500">Date</Label>
							<div class="relative">
								<CalendarIcon class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
								<Input id="date" type="date" bind:value={date} class="pl-9 focus:ring-primary" />
							</div>
						</div>
						<div class="space-y-1.5">
							<Label for="total" class="text-xs font-bold uppercase text-slate-500">Total Amount</Label>
							<div class="relative">
								<Input id="total" type="number" step="0.01" bind:value={total} class="pl-9 focus:ring-primary font-semibold" placeholder="0.00" />
							</div>
						</div>
						<div class="space-y-1.5">
							<Label for="currency" class="text-xs font-bold uppercase text-slate-500">Currency</Label>
							<Input id="currency" bind:value={currency} placeholder="e.g. USD" class="focus:ring-primary" />
						</div>
					</div>

					<LineItemsEditor bind:items={lineItems} />

					<div class="mt-10 md:hidden">
						<h3 class="mb-4 text-sm font-bold uppercase tracking-wider text-slate-900">Document Image</h3>
						<Card class="overflow-hidden border-slate-200">
							<img src={toImageUrl(doc.file_url)} alt={doc.filename} class="w-full" />
						</Card>
					</div>
				</div>
			</div>
		</main>
	{/if}
</div>

