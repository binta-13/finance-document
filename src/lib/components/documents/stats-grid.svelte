<script lang="ts">
	import { Card, CardContent } from "$lib/components/ui/card/index.js";
	import { FileText, Clock, CheckCircle, AlertCircle } from "lucide-svelte";

	let { total = 0, pending = 0, completed = 0, failed = 0 }: {
		total: number; pending: number; completed: number; failed: number;
	} = $props();
</script>

<div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
	<Card class="overflow-hidden border-none shadow-sm ring-1 ring-slate-200">
		<CardContent class="p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-slate-500">Total Documents</p>
					<h3 class="mt-1 text-2xl font-bold text-slate-900">{total}</h3>
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
					<h3 class="mt-1 text-2xl font-bold text-slate-900">{pending}</h3>
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
					<h3 class="mt-1 text-2xl font-bold text-slate-900">{completed}</h3>
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
					<h3 class="mt-1 text-2xl font-bold text-slate-900">{failed}</h3>
				</div>
				<div class="rounded-lg bg-rose-100 p-2.5 text-rose-600">
					<AlertCircle size={20} />
				</div>
			</div>
		</CardContent>
	</Card>
</div>
