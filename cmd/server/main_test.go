package main

import (
	"bytes"
	"context"
	"path/filepath"
	"testing"
)

func TestRun(t *testing.T) {
	db := filepath.Join(t.TempDir(), "test.db")

	ctx, cancel := context.WithCancel(context.Background())
	errc := make(chan error, 1)
	go func() {
		errc <- run(ctx, []string{"-db", db, "-addr", ":0"}, &bytes.Buffer{})
	}()

	cancel()
	if err := <-errc; err != nil {
		t.Fatalf("run error: %v", err)
	}
}
