<script lang="ts">
	import { Input } from "$lib/components/ui/input/index.js";
	import { Card, CardContent } from "$lib/components/ui/card/index.js";
	import { Search, Calendar } from "lucide-svelte";

	let { vendorFilter = $bindable(''), dateFrom = $bindable(''), dateTo = $bindable(''), onfilter }: {
		vendorFilter: string; dateFrom: string; dateTo: string; onfilter: () => void;
	} = $props();
</script>

<Card class="border-none shadow-sm ring-1 ring-slate-200">
	<CardContent class="p-4">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-end">
			<div class="flex-1 space-y-1.5">
				<label class="text-xs font-semibold text-slate-500 uppercase tracking-wider" for="vendor">Vendor Name</label>
				<div class="relative">
					<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
					<Input id="vendor" bind:value={vendorFilter} placeholder="Search vendor..." class="pl-9" oninput={onfilter} />
				</div>
			</div>
			<div class="grid flex-1 grid-cols-2 gap-3">
				<div class="space-y-1.5">
					<label class="text-xs font-semibold text-slate-500 uppercase tracking-wider" for="from">From</label>
					<div class="relative">
						<Calendar class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
						<Input id="from" type="date" bind:value={dateFrom} class="pl-9" onchange={onfilter} />
					</div>
				</div>
				<div class="space-y-1.5">
					<label class="text-xs font-semibold text-slate-500 uppercase tracking-wider" for="to">To</label>
					<div class="relative">
						<Calendar class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
						<Input id="to" type="date" bind:value={dateTo} class="pl-9" onchange={onfilter} />
					</div>
				</div>
			</div>
		</div>
	</CardContent>
</Card>
