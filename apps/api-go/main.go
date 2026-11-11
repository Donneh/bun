package main

import (
	"context"
	"errors"
	"flag"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"riftkeeper/api-go/internal/api"
	"riftkeeper/api-go/internal/cards"
	"riftkeeper/api-go/internal/search"
)

func main() {
	address := flag.String("addr", ":3000", "HTTP listen address")
	dataDir := flag.String("data", "../api/data", "directory containing card and price snapshots")
	flag.Parse()
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	if err := run(ctx, *address, *dataDir); err != nil {
		log.Print(err)
		os.Exit(1)
	}
}

func run(ctx context.Context, address, dataDir string) error {
	catalog, err := cards.Load(dataDir)
	if err != nil {
		return err
	}
	cardService := cards.NewService(catalog)
	searchService := search.NewService(catalog)
	server := &http.Server{
		Addr:              address,
		Handler:           api.NewHandler(cardService, searchService),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
	return serve(ctx, server)
}

func serve(ctx context.Context, server *http.Server) error {
	finished := make(chan error, 1)
	go func() {
		log.Printf("starting HTTP server on %s", server.Addr)
		finished <- server.ListenAndServe()
	}()
	select {
	case err := <-finished:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := server.Shutdown(shutdownCtx); err != nil {
			_ = server.Close()
			<-finished
			return err
		}
		err := <-finished
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	}
}
