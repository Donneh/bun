package main

import (
	"context"
	"net"
	"net/http"
	"testing"
	"time"
)

func TestServeStopsOnCancellation(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	server := &http.Server{Addr: "127.0.0.1:0", ReadHeaderTimeout: time.Second}
	finished := make(chan error, 1)
	go func() { finished <- serve(ctx, server) }()
	cancel()
	select {
	case err := <-finished:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(5 * time.Second):
		_ = server.Close()
		t.Fatal("server did not shut down")
	}
}

func TestServeReportsListenFailure(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer listener.Close()
	server := &http.Server{Addr: listener.Addr().String(), ReadHeaderTimeout: time.Second}
	if err := serve(context.Background(), server); err == nil {
		t.Fatal("expected an error for an occupied port")
	}
}
