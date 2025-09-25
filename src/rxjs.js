// This file acts as a secondary entry point for re-exporting
// a curated set of RxJS functionalities. This allows consumers
// of the library to import them via `rx-tiny-flux/rxjs`.

export {
	// Operators
	map,
	concatMap,
	switchMap,
	exhaustMap,
	mergeMap,
	delay,
	filter,
	tap,
	catchError,
	// Creation Functions
	defer,
	from,
	of,
} from 'rxjs';
