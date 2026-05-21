<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import {
		Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
	} from "$lib/components/ui/table/index.js";
	import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card/index.js";
	import { cn } from "$lib/utils.js";
	import type { Document } from "$lib/types.js";
	import { Eye, Trash2, FileText, Search } from "lucide-svelte";

	let { docs = [], ondeletedoc }: {
		docs: Document[]; ondeletedoc: (id: string) => void;
	} = $props();

	function statusClass(s: string) {
		if (s === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50';
		if (s === 'processing') return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50';
		if (s === 'completed') return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50';
		return 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50';
	}
</script>

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
						<TableCell><span class="text-slate-600">{doc.vendor ?? '—'}</span></TableCell>
						<TableCell><span class="text-slate-600">{doc.date ?? '—'}</span></TableCell>
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
								<Button variant="ghost" size="icon-sm" class="h-8 w-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50" onclick={() => ondeletedoc(doc.id)}>
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
