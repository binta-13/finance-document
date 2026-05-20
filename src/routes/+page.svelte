<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow,
	} from "$lib/components/ui/table/index.js";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card/index.js";
	import { cn } from "$lib/utils.js";
	import type { Document } from "$lib/types.js";
	import { 
		FileText, 
		Clock, 
		CheckCircle, 
		AlertCircle, 
		UploadCloud, 
		Filter, 
		Trash2, 
		Eye,
		Search,
		Calendar
	} from "lucide-svelte";

	let { data } = $props();

	let docs = $state(data.docs ?? [] as Document[]);
	let pending = $state(data.pending ?? [] as Document[]);
	let uploading = $state(false);
	let uploadCount = $state(0);
	let totalUploads = $state(0);
	let ocrRunning = $state(false);
	let dragOver = $state(false);
	let vendorFilter = $state('');
	let dateFrom = $state('');
	let dateTo = $state('');

	// Summary stats
	const stats = $derived({
		total: docs.length,
		pending: docs.filter(d => d.status === 'pending' || d.status === 'processing').length,
		completed: docs.filter(d => d.status === 'completed').length,
		failed: docs.filter(d => d.status === 'failed').length
	});

	function statusClass(s: string) {
		if (s === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50';
		if (s === 'processing') return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50';
		if (s === 'completed') return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50';
		return 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50';
	}

	async function loadDocs() {
		const params = new URLSearchParams({ limit: '50' });
		if (vendorFilter) params.set('vendor', vendorFilter);
		if (dateFrom) params.set('date_from', dateFrom);
		if (dateTo) params.set('date_to', dateTo);
		try {
			const res = await fetch(`/api/documents?${params}`);
			if (res.ok) {
				const json = await res.json();
				const d = (Array.isArray(json.data) ? json.data : []) as Document[];
				docs = d;
				pending = d.filter(x => x.status === 'pending' || x.status === 'processing');
			}
		} catch { /* ignore */ }
	}

	$effect(() => {
		if (pending?.length === 0) return;
		const timer = setInterval(loadDocs, 3000);
		return () => clearInterval(timer);
	});

	function applyFilters() { loadDocs(); }

	async function runServerOcr(docId: string) {
		ocrRunning = true;
		try {
			const res = await fetch(`/api/ocr/${docId}`, { method: 'POST' });
			if (!res.ok) console.error('OCR server error', await res.text());
		} catch (e) { console.error('OCR failed', e); }
		finally { ocrRunning = false; }
	}

	async function handleUpload(files: File[]) {
		uploading = true;
		totalUploads = files.length;
		uploadCount = 0;
		for (const file of files) {
			const fd = new FormData();
			fd.append('file', file);
			try {
				const res = await fetch('/api/upload', { method: 'POST', body: fd });
				if (res.ok) {
					const doc = await res.json();
					await runServerOcr(doc.id);
				}
			} catch { /* ignore */ }
			uploadCount++;
		}
		uploading = false;
		await loadDocs();
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		const files = Array.from(e.dataTransfer?.files ?? []);
		if (files.length) handleUpload(files);
	}

	function onDragOver(e: DragEvent) { e.preventDefault(); dragOver = true; }
	function onDragLeave() { dragOver = false; }

	function onFilePick(e: Event) {
		const files = Array.from((e.target as HTMLInputElement).files ?? []);
		if (files.length) handleUpload(files);
	}

	async function deleteDoc(id: string) {
		if (!confirm('Delete this document?')) return;
		try {
			await fetch(`/api/documents/${id}`, { method: 'DELETE' });
			await loadDocs();
		} catch { /* ignore */ }
	}
</script>

<svelte:head>
	<title>Smart Doc Reader</title>
</svelte:head>

<div class="min-h-screen bg-slate-50/50">
	<header class="sticky top-0 z-10 border-b bg-white/80 backdrop-blur-md">
		<div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
			<div class="flex items-center gap-3">
				<div class="bg-primary flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg shadow-blue-500/20">
					<FileText size={24} />
				</div>
				<div>
					<h1 class="text-xl font-bold tracking-tight text-slate-900">Finance<span class="text-primary">Pro</span></h1>
					<p class="text-xs font-medium text-slate-500">Smart Document Intelligence</p>
				</div>
			</div>
			<div class="flex items-center gap-3">
				<Badge variant="outline" class="hidden font-medium sm:flex">
					<span class="mr-1.5 flex h-2 w-2 rounded-full bg-emerald-500"></span>
					System Active
				</Badge>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
		<!-- Stats Grid -->
		<div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<Card class="overflow-hidden border-none shadow-sm ring-1 ring-slate-200">
				<CardContent class="p-6">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-slate-500">Total Documents</p>
							<h3 class="mt-1 text-2xl font-bold text-slate-900">{stats.total}</h3>
						</div>
						<div class="rounded-lg bg-slate-100 p-2.5 text-slate-600">
							<FileText size={20} />
						</div>
					</div>
				</CardContent>
			</Card>
			<Card class="overflow-hidden border-none shadow-sm ring-1 ring-slate-200">
				<CardContent class="p-6">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-slate-500">Pending Review</p>
							<h3 class="mt-1 text-2xl font-bold text-slate-900">{stats.pending}</h3>
						</div>
						<div class="rounded-lg bg-amber-100 p-2.5 text-amber-600">
							<Clock size={20} />
						</div>
					</div>
				</CardContent>
			</Card>
			<Card class="overflow-hidden border-none shadow-sm ring-1 ring-slate-200">
				<CardContent class="p-6">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-slate-500">Completed</p>
							<h3 class="mt-1 text-2xl font-bold text-slate-900">{stats.completed}</h3>
						</div>
						<div class="rounded-lg bg-emerald-100 p-2.5 text-emerald-600">
							<CheckCircle size={20} />
						</div>
					</div>
				</CardContent>
			</Card>
			<Card class="overflow-hidden border-none shadow-sm ring-1 ring-slate-200">
				<CardContent class="p-6">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-slate-500">Failed / Errors</p>
							<h3 class="mt-1 text-2xl font-bold text-slate-900">{stats.failed}</h3>
						</div>
						<div class="rounded-lg bg-rose-100 p-2.5 text-rose-600">
							<AlertCircle size={20} />
						</div>
					</div>
				</CardContent>
			</Card>
		</div>

		<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
			<!-- Upload Section -->
			<div class="lg:col-span-1">
				<div class="sticky top-24 space-y-6">
					<div>
						<h2 class="text-lg font-semibold text-slate-900">Upload Center</h2>
						<p class="text-sm text-slate-500">Drop your invoices or receipts here for AI processing.</p>
					</div>
					
					<Card class={cn(
						"relative flex flex-col items-center justify-center border-2 border-dashed p-10 transition-all",
						dragOver ? "border-primary bg-blue-50/50 ring-4 ring-blue-50" : "border-slate-200 hover:border-slate-300 bg-white"
					)}
					ondragover={onDragOver}
					ondragleave={onDragLeave}
					ondrop={onDrop}>
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
									<input type="file" accept="image/*,application/pdf" multiple hidden onchange={onFilePick}>
								</label>
							</div>
						{/if}
					</Card>

					<Card class="border-none shadow-sm ring-1 ring-slate-200">
						<CardHeader class="pb-3">
							<CardTitle class="flex items-center gap-2 text-base font-semibold">
								<Filter size={18} class="text-slate-400" />
								Filters
							</CardTitle>
						</CardHeader>
						<CardContent class="space-y-4">
							<div class="space-y-1.5">
								<label class="text-xs font-semibold text-slate-500 uppercase tracking-wider" for="vendor">Vendor Name</label>
								<div class="relative">
									<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
									<Input id="vendor" bind:value={vendorFilter} placeholder="Search vendor..." class="pl-9" oninput={applyFilters} />
								</div>
							</div>
							<div class="grid grid-cols-2 gap-3">
								<div class="space-y-1.5">
									<label class="text-xs font-semibold text-slate-500 uppercase tracking-wider" for="from">From</label>
									<div class="relative">
										<Calendar class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
										<Input id="from" type="date" bind:value={dateFrom} class="pl-9" onchange={applyFilters} />
									</div>
								</div>
								<div class="space-y-1.5">
									<label class="text-xs font-semibold text-slate-500 uppercase tracking-wider" for="to">To</label>
									<div class="relative">
										<Calendar class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
										<Input id="to" type="date" bind:value={dateTo} class="pl-9" onchange={applyFilters} />
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			<!-- Documents Table Section -->
			<div class="lg:col-span-2">
				<Card class="overflow-hidden border-none shadow-sm ring-1 ring-slate-200 bg-white">
					<CardHeader class="border-b bg-slate-50/50 py-4">
						<div class="flex items-center justify-between">
							<CardTitle class="text-lg font-semibold text-slate-900">Recent Documents</CardTitle>
							<Badge variant="secondary" class="font-medium">{docs.length} Items</Badge>
						</div>
					</CardHeader>
					<div class="overflow-x-auto">
						<Table>
							<TableHeader class="bg-slate-50/50">
								<TableRow class="hover:bg-transparent">
									<TableHead class="font-semibold text-slate-900">Document</TableHead>
									<TableHead class="font-semibold text-slate-900">Vendor</TableHead>
									<TableHead class="font-semibold text-slate-900">Date</TableHead>
									<TableHead class="font-semibold text-slate-900">Total</TableHead>
									<TableHead class="font-semibold text-slate-900">Status</TableHead>
									<TableHead class="text-right font-semibold text-slate-900">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#each docs as doc}
									<TableRow class="group transition-colors hover:bg-slate-50/50">
										<TableCell>
											<div class="flex items-center gap-3">
												<div class="bg-slate-100 text-slate-500 flex h-9 w-9 items-center justify-center rounded-lg group-hover:bg-white group-hover:shadow-sm transition-all">
													<FileText size={18} />
												</div>
												<span class="max-w-[150px] truncate font-medium text-slate-900" title={doc.filename}>
													{doc.filename}
												</span>
											</div>
										</TableCell>
										<TableCell>
											<span class="text-slate-600">{doc.vendor ?? '—'}</span>
										</TableCell>
										<TableCell>
											<span class="text-slate-600">{doc.date ?? '—'}</span>
										</TableCell>
										<TableCell>
											{#if doc.total != null}
												<span class="font-semibold text-slate-900">
													{doc.currency ?? ''} {doc.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
												</span>
											{:else}
												<span class="text-slate-400">—</span>
											{/if}
										</TableCell>
										<TableCell>
											<Badge class={cn("capitalize font-medium shadow-none px-2 py-0.5", statusClass(doc.status))} variant="outline">
												{doc.status}
											</Badge>
										</TableCell>
										<TableCell class="text-right">
											<div class="flex items-center justify-end gap-2">
												{#if doc.extraction_id}
													<a href={`/documents/${doc.id}`}>
														<Button variant="ghost" size="icon-sm" class="h-8 w-8 text-slate-500 hover:text-primary hover:bg-blue-50">
															<Eye size={16} />
														</Button>
													</a>
												{/if}
												<Button variant="ghost" size="icon-sm" class="h-8 w-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50" onclick={() => deleteDoc(doc.id)}>
													<Trash2 size={16} />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								{/each}
							</TableBody>
						</Table>

						{#if docs.length === 0}
							<div class="flex flex-col items-center justify-center py-20 text-center">
								<div class="bg-slate-50 mb-4 rounded-full p-4">
									<Search size={32} class="text-slate-300" />
								</div>
								<h3 class="text-lg font-semibold text-slate-900">No documents found</h3>
								<p class="text-muted-foreground mt-1 text-sm">Try adjusting your filters or upload a new document.</p>
							</div>
						{/if}
					</div>
				</Card>
			</div>
		</div>
	</main>
</div>
