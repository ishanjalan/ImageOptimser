// Focus trap utility for modals
// Traps focus within a container and manages body scroll lock

const FOCUSABLE_SELECTORS = [
	'button:not([disabled])',
	'[href]',
	'input:not([disabled])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[tabindex]:not([tabindex="-1"])',
	'[contenteditable="true"]'
].join(', ');

interface FocusTrapState {
	container: HTMLElement;
	previouslyFocused: HTMLElement | null;
	handleKeyDown: (e: KeyboardEvent) => void;
}

let activeTrap: FocusTrapState | null = null;

function getFocusableElements(container: HTMLElement): HTMLElement[] {
	return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS))
		.filter(el => el.offsetParent !== null); // Only visible elements
}

function handleKeyDown(e: KeyboardEvent, container: HTMLElement) {
	if (e.key !== 'Tab') return;

	const focusableElements = getFocusableElements(container);
	if (focusableElements.length === 0) return;

	const firstElement = focusableElements[0];
	const lastElement = focusableElements[focusableElements.length - 1];

	if (e.shiftKey) {
		// Shift+Tab: going backwards
		if (document.activeElement === firstElement) {
			e.preventDefault();
			lastElement.focus();
		}
	} else {
		// Tab: going forwards
		if (document.activeElement === lastElement) {
			e.preventDefault();
			firstElement.focus();
		}
	}
}

export function trapFocus(container: HTMLElement): void {
	// Store previously focused element to restore later
	const previouslyFocused = document.activeElement as HTMLElement | null;

	// Create the key handler bound to this container
	const boundKeyHandler = (e: KeyboardEvent) => handleKeyDown(e, container);

	// Store the trap state
	activeTrap = {
		container,
		previouslyFocused,
		handleKeyDown: boundKeyHandler
	};

	// Lock body scroll
	document.body.classList.add('modal-open');

	// Add event listener
	document.addEventListener('keydown', boundKeyHandler);

	// Focus first focusable element
	const focusableElements = getFocusableElements(container);
	if (focusableElements.length > 0) {
		// Small delay to ensure DOM is ready
		requestAnimationFrame(() => {
			focusableElements[0].focus();
		});
	}
}

export function releaseFocus(): void {
	if (!activeTrap) return;

	// Remove event listener
	document.removeEventListener('keydown', activeTrap.handleKeyDown);

	// Unlock body scroll
	document.body.classList.remove('modal-open');

	// Restore focus to previously focused element
	if (activeTrap.previouslyFocused && typeof activeTrap.previouslyFocused.focus === 'function') {
		activeTrap.previouslyFocused.focus();
	}

	activeTrap = null;
}

// Svelte action for easy use in components
export function focusTrap(node: HTMLElement) {
	trapFocus(node);

	return {
		destroy() {
			releaseFocus();
		}
	};
}
