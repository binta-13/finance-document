<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Label } from "$lib/components/ui/label/index.js";
	import { Plus, Trash2 } from "lucide-svelte";

	export interface LineItemInput {
		description: string | null;
		quantity: number | string | null;
		unit_price: number | string | null;
		amount: number | string | null;
	}

	let { items = $bindable([] as LineItemInput[]) }: { items: LineItemInput[] } = $props();

	function addItem() {
		items = [...items, { description: '', quantity: '', unit_price: '', amount: '' }];
	}

	function removeItem(index: number) {
		items = items.filter((_item, i) => i !== index);
	}
</script>

<div class="mt-10">
	<div class="mb-4 flex items-center justify-between border-b pb-2">
		<h3 class="text-sm font-bold uppercase tracking-wider text-slate-900">Line Items</h3>
		<Button variant="outline" size="xs" onclick={addItem} class="h-8 text-primary border-primary/20 hover:bg-primary/5">
			<Plus size={14} class="mr-1" />
			Add Item
		</Button>
	</div>

	<div class="space-y-3">
		{#each items as item, i}
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
					disabled={items.length === 1}
				>
					<Trash2 size={12} />
				</button>
			</div>
		{/each}
	</div>
</div>
