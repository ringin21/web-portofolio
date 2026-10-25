package main

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	_ "embed"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"

	"golang.org/x/crypto/bcrypt"
)

//go:embed default.json
var defaultContent []byte

const (
	sessionName  = "session"
	sessionTTL   = 120 * time.Minute
	xsrfCookie   = "XSRF-TOKEN"
	maxUpload    = 2 << 20
	maxJSONBytes = 1 << 20
)

type doc struct {
	body []byte
	etag string
}

type app struct {
	dir, email, name, hash        string
	secret                        []byte
	secure, trustProxy            bool
	mu                            sync.Mutex // serialises writes to portfolio.json
	cur                           atomic.Pointer[doc]
	loginLimit, loginAll, upLimit *limiter
}

func newDoc(b []byte) *doc {
	sum := sha256.Sum256(b)
	return &doc{body: b, etag: `"` + hex.EncodeToString(sum[:8]) + `"`}
}

func newApp(dir, email, name, hash string, secret []byte, secure, trustProxy bool) (*app, error) {
	a := &app{dir: dir, email: strings.ToLower(email), name: name, hash: hash, secret: secret, secure: secure, trustProxy: trustProxy,
		loginLimit: newLimiter(5, time.Minute), loginAll: newLimiter(30, time.Minute), upLimit: newLimiter(30, time.Minute)}
	if err := os.MkdirAll(filepath.Join(dir, "uploads"), 0o755); err != nil {
		return nil, err
	}
	// Content saved from the admin wins; default.json is the initial content.
	b, err := os.ReadFile(filepath.Join(dir, "portfolio.json"))
	if errors.Is(err, os.ErrNotExist) {
		b = defaultContent
	} else if err != nil {
		return nil, err
	}
	if !json.Valid(b) {
		return nil, errors.New("portfolio.json is not valid JSON; fix or remove it")
	}
	a.cur.Store(newDoc(b))
	return a, nil
}

func main() {
	secret := os.Getenv("SESSION_SECRET")
	email, hash := os.Getenv("ADMIN_EMAIL"), os.Getenv("ADMIN_PASSWORD_HASH")
	if len(secret) < 32 || email == "" || hash == "" {
		log.Fatal("SESSION_SECRET (>=32 chars), ADMIN_EMAIL and ADMIN_PASSWORD_HASH (bcrypt) are required")
	}
	if _, err := bcrypt.Cost([]byte(hash)); err != nil {
		log.Fatalf("ADMIN_PASSWORD_HASH is not a bcrypt hash: %v", err)
	}
	name := os.Getenv("ADMIN_NAME")
	if name == "" {
		name = "Admin"
	}
	dir := os.Getenv("DATA_DIR")
	if dir == "" {
		dir = "data"
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}
	a, err := newApp(dir, email, name, hash, []byte(secret), os.Getenv("COOKIE_SECURE") == "1", os.Getenv("TRUST_PROXY") == "1")
	if err != nil {
		log.Fatal(err)
	}

	srv := &http.Server{
		Addr: ":" + port, Handler: a.routes(),
		ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 30 * time.Second, WriteTimeout: 30 * time.Second, IdleTimeout: 120 * time.Second,
	}
	done := make(chan struct{})
	go func() {
		defer close(done)
		stop := make(chan os.Signal, 1)
		signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM) // Render sends SIGTERM on deploy
		<-stop
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		srv.Shutdown(ctx)
	}()
	log.Printf("listening on :%s, data in %s", port, dir)
	if err := srv.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
	<-done // let in-flight requests (e.g. a save) finish before exiting
}

func (a *app) routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /up", func(w http.ResponseWriter, r *http.Request) { io.WriteString(w, "ok") })
	mux.HandleFunc("GET /api/portfolio", a.show)
	mux.HandleFunc("GET /storage/uploads/{name}", a.file)
	mux.HandleFunc("POST /api/admin/login", a.limited(a.loginLimit, a.clientIP, a.limited(a.loginAll, everyone, a.login)))
	mux.HandleFunc("GET /api/admin/me", a.auth(a.me))
	mux.HandleFunc("POST /api/admin/logout", a.logout)
	mux.HandleFunc("PUT /api/admin/portfolio", a.auth(a.update))
	mux.HandleFunc("POST /api/admin/uploads", a.auth(a.limited(a.upLimit, a.clientIP, a.upload)))
	return a.base(mux)
}

// ---- middleware ----

// base adds security headers, hands out the XSRF cookie and enforces it on admin writes
// (double submit: the SPA echoes the cookie back in X-XSRF-TOKEN).
func (a *app) base(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if v := recover(); v != nil {
				log.Printf("panic: %v", v)
				writeJSON(w, 500, map[string]string{"message": "Server Error"})
			}
		}()
		w.Header().Set("X-Content-Type-Options", "nosniff")
		c, err := r.Cookie(xsrfCookie)
		if err != nil {
			t := randHex(16)
			http.SetCookie(w, &http.Cookie{Name: xsrfCookie, Value: t, Path: "/", SameSite: http.SameSiteLaxMode, Secure: a.secure})
			c = &http.Cookie{Value: t}
		}
		if strings.HasPrefix(r.URL.Path, "/api/admin/") && r.Method != http.MethodGet {
			if h := r.Header.Get("X-XSRF-TOKEN"); err != nil || !hmac.Equal([]byte(h), []byte(c.Value)) {
				writeJSON(w, 419, map[string]string{"message": "CSRF token mismatch."})
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

func (a *app) auth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		if !a.signedIn(r) {
			writeJSON(w, 401, map[string]string{"message": "Unauthenticated."})
			return
		}
		next(w, r)
	}
}

func (a *app) limited(l *limiter, key func(*http.Request) string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !l.allow(key(r)) {
			w.Header().Set("Retry-After", "60")
			writeJSON(w, 429, map[string]string{"message": "Too Many Attempts."})
			return
		}
		next(w, r)
	}
}

// everyone keys a shared cap: X-Forwarded-For can be forged by calling Render directly,
// so the per-IP limit alone does not stop a spread-out password guess.
func everyone(*http.Request) string { return "" }

func (a *app) clientIP(r *http.Request) string {
	if a.trustProxy {
		if f, _, _ := strings.Cut(r.Header.Get("X-Forwarded-For"), ","); strings.TrimSpace(f) != "" {
			return strings.TrimSpace(f)
		}
	}
	h, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return h
}

// limiter is a per-key sliding window kept in memory (shortcut: resets on restart, per instance).
type limiter struct {
	mu     sync.Mutex
	n      int
	window time.Duration
	hits   map[string][]time.Time
}

func newLimiter(n int, window time.Duration) *limiter {
	return &limiter{n: n, window: window, hits: map[string][]time.Time{}}
}

func (l *limiter) allow(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := time.Now()
	if len(l.hits) > 10000 { // bound memory under a flood of distinct IPs
		for k, v := range l.hits {
			if now.Sub(v[len(v)-1]) > l.window {
				delete(l.hits, k)
			}
		}
	}
	recent := l.hits[key][:0]
	for _, t := range l.hits[key] {
		if now.Sub(t) < l.window {
			recent = append(recent, t)
		}
	}
	if len(recent) >= l.n {
		l.hits[key] = recent
		return false
	}
	l.hits[key] = append(recent, now)
	return true
}

// ---- session: a signed cookie, so logins survive restarts without a database ----

func (a *app) sign(s string) string {
	m := hmac.New(sha256.New, a.secret)
	m.Write([]byte(a.hash)) // changing the admin password invalidates every existing session
	m.Write([]byte(s))
	return base64.RawURLEncoding.EncodeToString(m.Sum(nil))
}

func (a *app) setSession(w http.ResponseWriter) {
	exp := time.Now().Add(sessionTTL)
	payload := strconv.FormatInt(exp.Unix(), 10)
	http.SetCookie(w, &http.Cookie{Name: sessionName, Value: payload + "." + a.sign(payload), Path: "/", Expires: exp,
		HttpOnly: true, Secure: a.secure, SameSite: http.SameSiteLaxMode})
}

func (a *app) signedIn(r *http.Request) bool {
	c, err := r.Cookie(sessionName)
	if err != nil {
		return false
	}
	payload, sig, ok := strings.Cut(c.Value, ".")
	exp, perr := strconv.ParseInt(payload, 10, 64)
	return ok && perr == nil && hmac.Equal([]byte(sig), []byte(a.sign(payload))) && time.Now().Unix() < exp
}

// ---- handlers ----

func (a *app) show(w http.ResponseWriter, r *http.Request) {
	d := a.cur.Load()
	h := w.Header()
	// no-cache + ETag: browsers always revalidate (admin edits show up at once) but get a cheap 304.
	h.Set("Cache-Control", "no-cache, public")
	h.Set("ETag", d.etag)
	if inm := r.Header.Get("If-None-Match"); inm != "" {
		for _, t := range strings.Split(inm, ",") {
			if t = strings.TrimPrefix(strings.TrimSpace(t), "W/"); t == d.etag || t == "*" {
				w.WriteHeader(http.StatusNotModified)
				return
			}
		}
	}
	h.Set("Content-Type", "application/json")
	w.Write(d.body)
}

func (a *app) login(w http.ResponseWriter, r *http.Request) {
	var in map[string]any
	if !readJSON(w, r, &in) {
		return
	}
	e := &errs{}
	email := e.str(in, "email", "email", reqEmail)
	pass, _ := in["password"].(string)
	if pass == "" {
		e.add("password", msgRequired, 0)
	}
	if e.any() {
		writeJSON(w, 422, e.body())
		return
	}
	// Always run bcrypt, even for an unknown email, so timing does not reveal which emails exist.
	okPass := bcrypt.CompareHashAndPassword([]byte(a.hash), []byte(pass)) == nil
	if !okPass || strings.ToLower(email) != a.email {
		writeJSON(w, 422, map[string]any{"message": "Email atau password salah.", "errors": map[string][]string{"email": {"Email atau password salah."}}})
		return
	}
	a.setSession(w)
	writeJSON(w, 200, map[string]string{"name": a.name, "email": a.email})
}

func (a *app) me(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, map[string]string{"name": a.name, "email": a.email})
}

func (a *app) logout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{Name: sessionName, Value: "", Path: "/", MaxAge: -1, HttpOnly: true, Secure: a.secure, SameSite: http.SameSiteLaxMode})
	w.WriteHeader(http.StatusNoContent)
}

func (a *app) update(w http.ResponseWriter, r *http.Request) {
	var in map[string]any
	if !readJSON(w, r, &in) {
		return
	}
	p, e := parsePortfolio(in)
	if e != nil {
		writeJSON(w, 422, e.body())
		return
	}
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(p); err != nil {
		serverError(w, err)
		return
	}
	b := bytes.TrimRight(buf.Bytes(), "\n")

	a.mu.Lock()
	defer a.mu.Unlock()
	if err := writeAtomic(filepath.Join(a.dir, "portfolio.json"), b); err != nil {
		serverError(w, err)
		return
	}
	a.cur.Store(newDoc(b))
	w.Header().Set("Content-Type", "application/json")
	w.Write(b)
}

var imageExt = map[string]string{"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}

func (a *app) upload(w http.ResponseWriter, r *http.Request) {
	fail := func(status int, msg string) {
		writeJSON(w, status, map[string]any{"message": msg, "errors": map[string][]string{"file": {msg}}})
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxUpload+1<<20) // headroom for multipart framing
	f, _, err := r.FormFile("file")
	if err != nil {
		var tooBig *http.MaxBytesError
		if errors.As(err, &tooBig) {
			fail(422, "Ukuran gambar maksimal 2 MB.")
		} else {
			fail(422, "Pilih file gambar terlebih dahulu.")
		}
		return
	}
	defer f.Close()
	data, err := io.ReadAll(io.LimitReader(f, maxUpload+1))
	if err != nil {
		fail(422, "Unggahan gagal. Ukuran file mungkin melebihi batas server.")
		return
	}
	if len(data) > maxUpload {
		fail(422, "Ukuran gambar maksimal 2 MB.")
		return
	}
	// Sniff the bytes, not the client's claim. SVG is excluded: it can carry scripts.
	ext, ok := imageExt[http.DetectContentType(data)]
	if !ok {
		fail(422, "Format yang didukung: JPG, PNG, atau WebP.")
		return
	}
	name := randHex(16) + ext
	if err := writeAtomic(filepath.Join(a.dir, "uploads", name), data); err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, 201, map[string]string{"url": "/storage/uploads/" + name})
}

var uploadName = regexp.MustCompile(`^[A-Za-z0-9]{16,64}\.(jpg|png|webp)$`)

func (a *app) file(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("name")
	if !uploadName.MatchString(name) {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Cache-Control", "public, max-age=31536000, immutable") // names are random and never reused
	http.ServeFile(w, r, filepath.Join(a.dir, "uploads", name))
}

// ---- helpers ----

func readJSON(w http.ResponseWriter, r *http.Request, v any) bool {
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxJSONBytes)).Decode(v); err != nil {
		writeJSON(w, 400, map[string]string{"message": "JSON tidak valid."})
		return false
	}
	return true
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func serverError(w http.ResponseWriter, err error) {
	log.Printf("error: %v", err)
	writeJSON(w, 500, map[string]string{"message": "Server Error"})
}

// writeAtomic writes via a temp file + rename so a crash never leaves a half-written file.
func writeAtomic(path string, b []byte) error {
	tmp := fmt.Sprintf("%s.%s.tmp", path, randHex(4))
	if err := os.WriteFile(tmp, b, 0o644); err != nil {
		return err
	}
	if err := os.Rename(tmp, path); err != nil {
		os.Remove(tmp)
		return err
	}
	return nil
}

func randHex(n int) string {
	b := make([]byte, n)
	rand.Read(b)
	return hex.EncodeToString(b)
}
