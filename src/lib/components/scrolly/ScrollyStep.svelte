<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Step } from './utils.js';

	/** The step data for this row. */
	export let step: Step;

	/** Minimum height of this step in vh (passed down from parent). */
	export let stepHeightVh: number;

	/** Bootstrap column + background class string for the text box. */
	export let posClass: string;

	/** Current playback state for this step's video button. */
	export let vState: 'idle' | 'playing' | 'ended' = 'idle';

	/** Whether to render the play/pause/replay button at all. */
	export let hasVideoButton: boolean = false;

	/**
	 * Bound by the parent to read the text box's DOM position for scroll
	 * trigger computation.
	 */
	export let textBoxEl: HTMLElement | null = null;

	const dispatch = createEventDispatcher<{ videoplay: void }>();

	$: label =
		vState === 'playing' ? 'Pause' : (step.videoActionText ?? '');
</script>

<div class="step" style={`min-height:${stepHeightVh}vh;`}>
	<div class="container-fluid">
		<div
			class="row px-md-4 px-lg-5 align-items-start step-row"
			class:start={step.pos === 'start'}
			class:center={step.pos === 'center'}
			class:end={step.pos === 'end'}
		>
			<!-- text box — the parent binds this ref for scroll trigger computation -->
			<div class={posClass} bind:this={textBoxEl}>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html step.text}

				{#if hasVideoButton}
					<button
						class="btn btn-danger rounded-pill mt-4 d-inline-flex align-items-center gap-2"
						on:click={() => dispatch('videoplay')}
						aria-label={label}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="currentColor"
							style="width:1em;height:1em;"
							aria-hidden="true"
						>
							{#if vState === 'playing'}
								<!-- Pause icon -->
								<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
							{:else}
								<!-- Play icon (idle and ended) -->
								<path d="M8 5v14l11-7z" />
							{/if}
						</svg>
						{label}
					</button>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.step {
		display: block;
	}

	/* Row fills the viewport; text box sits at the bottom edge by default.
	   --text-bottom is set on the parent <section> and inherited here. */
	.step-row {
		min-height: 100vh;
		padding-bottom: var(--text-bottom);
	}

	.step :global(.bg-body-secondary) {
		border-radius: 0.5rem;
	}

	/* Horizontal positioning */
	.row.start {
		justify-content: flex-start;
	}
	.row.center {
		justify-content: center;
	}
	.row.end {
		justify-content: flex-end;
	}
</style>
