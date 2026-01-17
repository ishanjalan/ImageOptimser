<script lang="ts">
	import { Heart, Github, Shield, Video, Disc3 } from 'lucide-svelte';
</script>

<footer class="mt-auto border-t border-surface-800/50 py-6">
	<div class="mx-auto max-w-6xl px-6">
		<div class="flex flex-col items-center justify-between gap-4 lg:flex-row">
			<!-- Left: Privacy badge -->
			<div class="flex items-center gap-4 text-sm text-surface-500">
				<div class="flex items-center gap-1.5">
					<Shield class="h-4 w-4 text-green-500" />
					<span>100% Private</span>
				</div>
				<span class="text-surface-700">•</span>
				<span>Your images never leave your device</span>
			</div>

			<!-- Center: Sibling apps -->
			<div class="flex items-center gap-3 text-xs text-surface-600">
				<span>Also try:</span>
				<a
					href="https://ishanjalan.github.io/Squash/"
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500/10 to-red-500/10 px-3 py-1 text-sm font-medium text-orange-400 transition-all hover:from-orange-500/20 hover:to-red-500/20"
				>
					<Video class="h-3.5 w-3.5" />
					<span>Squash</span>
				</a>
				<a
					href="https://ishanjalan.github.io/Swirl/"
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 px-3 py-1 text-sm font-medium text-violet-400 transition-all hover:from-violet-500/20 hover:to-fuchsia-500/20"
				>
					<Disc3 class="h-3.5 w-3.5" />
					<span>Swirl</span>
				</a>
			</div>

			<!-- Right: Links -->
			<div class="flex items-center gap-3">
				<a
					href="https://github.com/ishanjalan/ImageOptimser"
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center gap-1.5 text-sm text-surface-500 transition-colors hover:text-surface-100"
				>
					<Github class="h-4 w-4" />
					<span>Source</span>
				</a>
				<span class="text-surface-700">•</span>
				<p class="flex items-center gap-1.5 text-sm text-surface-500">
					<span>Made with</span>
					<Heart class="h-3.5 w-3.5 text-red-500 fill-red-500" />
					<span>by Ishan Jalan</span>
				</p>
			</div>
		</div>
	</div>
</footer>
