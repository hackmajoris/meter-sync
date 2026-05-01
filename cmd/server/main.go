package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/hackmajoris/counters/pkg/api"
	"github.com/hackmajoris/counters/pkg/store"
	"github.com/hackmajoris/counters/pkg/web"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	if err := run(ctx, os.Args[1:], os.Stdout); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}

func run(ctx context.Context, args []string, out io.Writer) error {
	fs := flag.NewFlagSet("server", flag.ContinueOnError)
	fs.SetOutput(out)
	addr := fs.String("addr", ":8080", "listen address")
	dbPath := fs.String("db", "data/data.db", "sqlite database path")
	if err := fs.Parse(args); err != nil {
		return err
	}

	st, err := store.New(*dbPath)
	if err != nil {
		return fmt.Errorf("opening store: %w", err)
	}
	defer st.Close()

	mux := http.NewServeMux()
	api.Register(mux, st)
	mux.Handle("/", web.Handler())

	srv := &http.Server{Addr: *addr, Handler: mux}

	go func() {
		<-ctx.Done()
		srv.Shutdown(context.Background()) //nolint:errcheck
	}()

	fmt.Fprintf(out, "listening on %s\n", *addr)
	if err := srv.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}
