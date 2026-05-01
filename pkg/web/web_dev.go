//go:build !release

package web

import "net/http"

// Handler returns a stub in non-release builds.
// In development, the Vite dev server handles the frontend.
func Handler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "frontend served by vite dev server", http.StatusNotFound)
	})
}
