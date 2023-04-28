<script lang="ts">
	import type { log } from './types';
	import { Doughnut } from 'svelte-chartjs';
	import 'chart.js/auto';

	export let rangeStartM: number;
	export let rangeEndM: number;
	export let logs: log[];
	export let colormap: any;

	var summary: any[] = [];
	function getSummary(logs: log[], rangeStart = rangeStartM, rangeEnd = rangeEndM) {
		let s: any = {};
		logs.forEach((log) => {
			var start;
			var end;
			if (log.start < rangeStart) {
				start = rangeStart;
			} else {
				start = log.start;
			}
			if (log.end > rangeEnd) {
				end = rangeEnd;
			} else {
				end = log.end;
			}
			if (start < end) {
				if (log.title in s) {
					s[log.title]['time'] += end - start;
				} else {
					s[log.title] = {};
					s[log.title]['time'] = end - start;
					s[log.title]['title'] = log.title;
				}
			}
		});
		return Object.values(s);
	}

	function getChartConfig(summary: any[]) {
		var sum = 0;
		summary.forEach((e) => (sum += e.time));
		if (summary.length == 0 || !colormap) {
			console.log(summary, colormap);
			return {};
		}
		return {
			labels: summary.map((e) => e.title),
			datasets: [
				{
					data: summary.map((e) => Math.round((100 * e.time) / sum)),
					backgroundColor: summary.map((e) => colormap[e.title]),
					hoverBackgroundColor: summary.map((e) => colormap[e.title])
				}
			]
		};
	}

	$: summary = getSummary(logs, rangeStartM, rangeEndM);
	$: data = getChartConfig(summary);
</script>

{#each summary as log}
	<h3>
		{log.title}
	</h3>
	<p>time: {log.time / 3600000} hours</p>
{/each}

<Doughnut {data} options={{ responsive: false }} width={200} height={200} />
