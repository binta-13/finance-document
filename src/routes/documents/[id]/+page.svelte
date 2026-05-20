<script lang="ts">
	import { TableRow } from "$lib/components/ui/table/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Label } from "$lib/components/ui/label/index.js";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import {
		Card,
		CardContent,
		CardHeader,
		CardTitle,
	} from "$lib/components/ui/card/index.js";
	import { 
		ChevronLeft, 
		Save, 
		RefreshCw, 
		Download, 
		Plus, 
		Trash2, 
		Info,
		CheckCircle2,
		AlertTriangle,
		XCircle,
		DollarSign,
		Calendar as CalendarIcon,
		Building2
	} from "lucide-svelte";
	import { cn } from "$lib/utils.js";
	import type { Document, LineItem } from "$lib/types.js";

	let { data } = $props();

	function toImageUrl(url: string): string {
		if (/\.(jpg|jpeg|png|gif|webp|bmp)/i.test(url)) return url;
		return url.replace(/\/upload\//, '/upload/f_jpg/');
	}

	const extraction = data.doc?.extraction;

	let doc = $state(data.doc as Document | null);
	let saving = $state(false);
	let ocrRunning = $state(false);

	let vendor = $state(extraction?.vendor ?? '');
	let date = $state(extraction?.date ?? '');
	let total = $state(extraction?.total?.toString() ?? '');
	let currency = $state(extraction?.currency ?? '');
	let lineItems = $state(extraction?.line_items?.map((i: LineItem) => ({ ...i })) ?? [{ description: '', quantity: '', unit_price: '', amount: '' }] as LineItem[]);

	function confidenceLevel(): { label: string; color: string; icon: typeof CheckCircle2; bg: string; border: string } | null {
		if (!doc?.extraction?.confidence_json) return null;
		try {
			const c = JSON.parse(doc.extraction.confidence_json);
			const score = typeof c.confidence === 'number' ? c.confidence : 0.5;
			if (score >= 0.8) return { 
				label: 'High Accuracy', 
				color: 'text-emerald-700', 
				icon: CheckCircle2, 
				bg: 'bg-emerald-50', 
				border: 'border-emerald-200' 
			};
			if (score >= 0.5) return { 
				label: 'Medium Confidence', 
				color: 'text-amber-700', 
				icon: AlertTriangle, 
				bg: 'bg-amber-50', 
				border: 'border-amber-200' 
			};
			return { 
				label: 'Low Confidence', 
				color: 'text-rose-700', 
				icon: XCircle, 
				bg: 'bg-rose-50', 
				border: 'border-rose-200' 
			};
		} catch { return null; }
	}
	let confidence = $derived(confidenceLevel());

	function addItem() {
		lineItems = [...lineItems, { id: '', description: '', quantity: '', unit_price: '', amount: '' }];
	}
	function removeItem(index: number) {
		lineItems = lineItems.filter((_item, i: number) => i !== index);
	}

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
					? updated.extraction.line_items.map((i: Record<string, unknown>) => ({ id: (i.id as string) ?? '', description: (i.description as string) ?? '', quantity: (i.quantity?.toString() as string) ?? '', unit_price: (i.unit_price?.toString() as string) ?? '', amount: (i.amount?.toString() as string) ?? '' }))
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

	function downloadTemplate() {
		if (!doc) return;
		const a = document.createElement('a');
		a.href = `/api/documents/template/csv?documentId=${doc.id}`;
		a.download = `${doc.filename}_template.csv`;
		a.click();
	}
</script>

<svelte:head>
	<title>Review — {doc?.filename ?? 'Not Found'}</title>
</svelte:head>

<div class="flex h-screen flex-col bg-slate-50/50">
	<!-- Sticky Header -->
	<header class="border-b bg-white px-4 py-3 sm:px-6">
		<div class="mx-auto flex max-w-7xl items-center justify-between">
			<div class="flex items-center gap-4">
				<a href="/" class="text-slate-500 hover:text-slate-900 transition-colors">
					<ChevronLeft size={24} />
				</a>
				<div>
					<h1 class="text-lg font-bold text-slate-900">{doc?.filename ?? 'Document Review'}</h1>
					<p class="text-xs font-medium text-slate-500">ID: {doc?.id?.slice(0, 8) ?? '...'}</p>
				</div>
			</div>
			
			<div class="flex items-center gap-2">
				<Button variant="ghost" size="sm" onclick={downloadTemplate} disabled={!doc}>
					<Download size={16} class="mr-2" />
					Template
				</Button>
				<Button variant="outline" size="sm" class="hidden sm:flex" onclick={exportCsv} disabled={!doc}>
					<Download size={16} class="mr-2" />
					Export CSV
				</Button>
				<Button variant="secondary" size="sm" onclick={runOcr} disabled={ocrRunning || !doc}>
					<RefreshCw size={16} class={cn("mr-2", ocrRunning && "animate-spin")} />
					{ocrRunning ? 'Running OCR...' : 'Run OCR'}
				</Button>
				<Button size="sm" onclick={save} disabled={saving || ocrRunning || !doc} class="shadow-md shadow-blue-500/20">
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
			<!-- Left: Document Preview -->
			<div class="hidden w-1/2 overflow-auto border-r bg-slate-200/50 p-6 md:block">
				<Card class="mx-auto max-w-2xl overflow-hidden shadow-2xl ring-1 ring-slate-300">
					<div class="relative bg-white p-2">
						<img 
							src={toImageUrl(doc.file_url)} 
							alt={doc.filename} 
							class="h-auto w-full object-contain" 
						/>
					</div>
				</Card>
			</div>

			<!-- Right: Extraction Details -->
			<div class="flex w-full flex-col overflow-y-auto bg-white md:w-1/2">
				<div class="p-6 lg:p-8">
					<!-- Status & Confidence -->
					<div class="mb-8 flex items-center justify-between">
						<div>
							<h2 class="text-sm font-semibold uppercase tracking-wider text-slate-500">Extraction Results</h2>
							<div class="mt-1 flex items-center gap-2">
								<Badge variant="outline" class="bg-blue-50 text-blue-700 border-blue-200 capitalize">
									{doc.status}
								</Badge>
								{#if confidence}
									<Badge variant="outline" class={cn("gap-1.5", confidence.bg, confidence.color, confidence.border)}>
										<confidence.icon size={12} />
										{confidence.label}
									</Badge>
								{/if}
							</div>
						</div>
					</div>

					<!-- Main Fields -->
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
								<!-- <DollarSign class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" /> -->
								<Input id="total" type="number" step="0.01" bind:value={total} class="pl-9 focus:ring-primary font-semibold" placeholder="0.00" />
							</div>
						</div>
						<div class="space-y-1.5">
							<Label for="currency" class="text-xs font-bold uppercase text-slate-500">Currency</Label>
							<Input id="currency" bind:value={currency} placeholder="e.g. USD" class="focus:ring-primary" />
						</div>
					</div>

					<!-- Line Items -->
					<div class="mt-10">
						<div class="mb-4 flex items-center justify-between border-b pb-2">
							<h3 class="text-sm font-bold uppercase tracking-wider text-slate-900">Line Items</h3>
							<Button variant="outline" size="xs" onclick={addItem} class="h-8 text-primary border-primary/20 hover:bg-primary/5">
								<Plus size={14} class="mr-1" />
								Add Item
							</Button>
						</div>

						<div class="space-y-3">
							{#each lineItems as item, i}
								<div class="group relative rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all hover:border-slate-300 hover:bg-white hover:shadow-sm">
									<div class="grid grid-cols-12 gap-3">
										<div class="col-span-12 sm:col-span-6">
											<Label class="mb-1 block text-[10px] font-bold uppercase text-slate-400">Description</Label>
											<Input bind:value={item.description} placeholder="Item description" class="bg-white" />
										</div>
										<div class="col-span-4 sm:col-span-2">
											<Label class="mb-1 block text-[10px] font-bold uppercase text-slate-400">Qty</Label>
											<Input type="number" step="1" bind:value={item.quantity} placeholder="0" class="bg-white text-center" />
										</div>
										<div class="col-span-4 sm:col-span-2">
											<Label class="mb-1 block text-[10px] font-bold uppercase text-slate-400">Price</Label>
											<Input type="number" step="0.01" bind:value={item.unit_price} placeholder="0.00" class="bg-white text-right" />
										</div>
										<div class="col-span-4 sm:col-span-2">
											<Label class="mb-1 block text-[10px] font-bold uppercase text-slate-400">Amount</Label>
											<Input type="number" step="0.01" bind:value={item.amount} placeholder="0.00" class="bg-white text-right font-medium" />
										</div>
									</div>
									<button 
										class="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-50 text-rose-500 opacity-0 shadow-sm transition-all group-hover:opacity-100 hover:bg-rose-500 hover:text-white"
										onclick={() => removeItem(i)}
										disabled={lineItems.length === 1}
									>
										<Trash2 size={12} />
									</button>
								</div>
							{/each}
						</div>
					</div>

					<!-- Mobile Document Preview (only visible on small screens) -->
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