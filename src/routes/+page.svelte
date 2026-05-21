<script lang="ts">
	import { Badge } from "$lib/components/ui/badge/index.js";
	import { FileText } from "lucide-svelte";
	import type { Document } from "$lib/types.js";
	import StatsGrid from "$lib/components/documents/stats-grid.svelte";
	import UploadCard from "$lib/components/documents/upload-card.svelte";
	import FilterBar from "$lib/components/documents/filter-bar.svelte";
	import DocumentTable from "$lib/components/documents/document-table.svelte";
	import { DOCUMENT_POLL_INTERVAL, DASHBOARD_DOCUMENT_LIMIT } from "$lib/config/constants.js";

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

	const stats = $derived({
		total: docs.length,
		pending: docs.filter(d => d.status === 'pending' || d.status === 'processing').length,
		completed: docs.filter(d => d.status === 'completed').length,
		failed: docs.filter(d => d.status === 'failed').length
	});

	async function loadDocs() {
		const params = new URLSearchParams({ limit: String(DASHBOARD_DOCUMENT_LIMIT) });
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
		const timer = setInterval(loadDocs, DOCUMENT_POLL_INTERVAL);
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
		<StatsGrid total={stats.total} pending={stats.pending} completed={stats.completed} failed={stats.failed} />

		<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
			<div class="lg:col-span-1">
				<div class="sticky top-24 space-y-6">
					<div>
						<h2 class="text-lg font-semibold text-slate-900">Upload Center</h2>
						<p class="text-sm text-slate-500">Drop your invoices or receipts here for AI processing.</p>
					</div>
					<UploadCard
						{uploading}
						{ocrRunning}
						{dragOver}
						{uploadCount}
						{totalUploads}
						ondrop={onDrop}
						ondragover={onDragOver}
						ondragleave={onDragLeave}
						onfilepick={onFilePick}
					/>
				</div>
			</div>

			<div class="lg:col-span-2 space-y-6">
				<FilterBar bind:vendorFilter bind:dateFrom bind:dateTo onfilter={applyFilters} />
				<DocumentTable {docs} ondeletedoc={deleteDoc} />
			</div>
		</div>
	</main>
</div>
