## verdict
1. resolved — The policy Link now closes the modal; browser-results.json confirms /privacy-policy#section-4 with zero dialogs, zero inert elements and restored body scrolling. Desktop and mobile recaptures preserve the original form hierarchy and reachable controls.
2. resolved — Cookie reads/writes and runtime cookie cleanup are guarded. The targeted throwing getter/setter test verifies fail-closed reads, refusal persistence, change dispatch and safe cleanup; setter-only failure preserves subsequent explicit choices. No visual regression is visible in the recaptures.

## remaining
clear
