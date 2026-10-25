package main

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"golang.org/x/crypto/bcrypt"
)

const tok = "testtoken"

func newTestApp(t *testing.T) (*app, http.Handler) {
	t.Helper()
	h, _ := bcrypt.GenerateFromPassword([]byte("secret-pass"), bcrypt.MinCost)
	a, err := newApp(t.TempDir(), "Admin@Example.com", "Admin", string(h), []byte(strings.Repeat("k", 32)), false, false)
	if err != nil {
		t.Fatal(err)
	}
	return a, a.routes()
}

func do(h http.Handler, method, path string, body any, cookies ...*http.Cookie) *httptest.ResponseRecorder {
	var rd bytes.Buffer
	if s, ok := body.(string); ok {
		rd.WriteString(s)
	} else if body != nil {
		json.NewEncoder(&rd).Encode(body)
	}
	r := httptest.NewRequest(method, path, &rd)
	r.AddCookie(&http.Cookie{Name: xsrfCookie, Value: tok})
	r.Header.Set("X-XSRF-TOKEN", tok)
	for _, c := range cookies {
		r.AddCookie(c)
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	return w
}

func login(t *testing.T, h http.Handler) *http.Cookie {
	t.Helper()
	w := do(h, "POST", "/api/admin/login", map[string]string{"email": "admin@example.com", "password": "secret-pass"})
	if w.Code != 200 {
		t.Fatalf("login: %d %s", w.Code, w.Body)
	}
	for _, c := range w.Result().Cookies() {
		if c.Name == sessionName {
			return c
		}
	}
	t.Fatal("no session cookie")
	return nil
}

func valid() map[string]any {
	return map[string]any{
		"name": " Ringin ", "title": "Dev", "bio": "Bio", "photo": "",
		"companies": []any{map[string]any{"name": "A", "role": "R", "period": "2024"}},
		"education": []any{}, "projects": []any{map[string]any{"title": "T", "description": "D", "url": "https://x.id", "image": ""}},
		"stack":   []any{"Go", " ", "Go", "React"},
		"contact": map[string]any{"email": "a@b.co", "github": "https://github.com/x", "linkedin": "https://linkedin.com/in/x"},
		"extra":   "dropped",
	}
}

func TestShowDefaultAndETag(t *testing.T) {
	_, h := newTestApp(t)
	w := do(h, "GET", "/api/portfolio", nil)
	if w.Code != 200 || !strings.Contains(w.Body.String(), "Nama Anda") || w.Header().Get("Content-Type") != "application/json" {
		t.Fatalf("show: %d %s", w.Code, w.Body)
	}
	r := httptest.NewRequest("GET", "/api/portfolio", nil)
	r.Header.Set("If-None-Match", w.Header().Get("ETag"))
	w2 := httptest.NewRecorder()
	h.ServeHTTP(w2, r)
	if w2.Code != 304 || w2.Body.Len() != 0 {
		t.Fatalf("want 304, got %d", w2.Code)
	}
}

func TestAuthFlow(t *testing.T) {
	_, h := newTestApp(t)
	if c := do(h, "GET", "/api/admin/me", nil).Code; c != 401 {
		t.Fatalf("me unauth: %d", c)
	}
	if c := do(h, "POST", "/api/admin/login", map[string]string{"email": "admin@example.com", "password": "nope"}).Code; c != 422 {
		t.Fatalf("bad password: %d", c)
	}
	if c := do(h, "POST", "/api/admin/login", map[string]string{"email": "x@example.com", "password": "secret-pass"}).Code; c != 422 {
		t.Fatalf("unknown email: %d", c)
	}
	s := login(t, h)
	w := do(h, "GET", "/api/admin/me", nil, s)
	if w.Code != 200 || !strings.Contains(w.Body.String(), "admin@example.com") {
		t.Fatalf("me: %d %s", w.Code, w.Body)
	}
	if !s.HttpOnly {
		t.Fatal("session cookie must be HttpOnly")
	}
	if c := do(h, "POST", "/api/admin/logout", nil, s).Code; c != 204 {
		t.Fatalf("logout: %d", c)
	}
	forged := &http.Cookie{Name: sessionName, Value: "9999999999.abc"}
	if c := do(h, "GET", "/api/admin/me", nil, forged).Code; c != 401 {
		t.Fatalf("forged session accepted: %d", c)
	}
}

func TestCSRFRequired(t *testing.T) {
	_, h := newTestApp(t)
	r := httptest.NewRequest("POST", "/api/admin/login", strings.NewReader(`{}`))
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != 419 {
		t.Fatalf("want 419, got %d", w.Code)
	}
	if w2 := do(h, "GET", "/api/portfolio", nil); w2.Code != 200 { // GET never needs the header
		t.Fatal(w2.Code)
	}
}

func TestLoginThrottle(t *testing.T) {
	_, h := newTestApp(t)
	var last int
	for i := 0; i < 6; i++ {
		last = do(h, "POST", "/api/admin/login", map[string]string{"email": "admin@example.com", "password": "bad"}).Code
	}
	if last != 429 {
		t.Fatalf("6th attempt: %d", last)
	}
}

func TestUpdate(t *testing.T) {
	a, h := newTestApp(t)
	if c := do(h, "PUT", "/api/admin/portfolio", valid()).Code; c != 401 {
		t.Fatalf("unauth update: %d", c)
	}
	s := login(t, h)

	bad := valid()
	bad["projects"] = []any{map[string]any{"title": "T", "description": "D", "url": "javascript:alert(1)", "image": ""}}
	bad["contact"] = map[string]any{"email": "nope"}
	delete(bad, "name")
	w := do(h, "PUT", "/api/admin/portfolio", bad, s)
	var out struct {
		Errors map[string][]string `json:"errors"`
	}
	json.Unmarshal(w.Body.Bytes(), &out)
	if w.Code != 422 || out.Errors["projects.0.url"] == nil || out.Errors["contact.email"] == nil || out.Errors["contact.github"] == nil || out.Errors["name"] == nil {
		t.Fatalf("want field errors, got %d %s", w.Code, w.Body)
	}
	if got := out.Errors["projects.0.url"][0]; !strings.HasPrefix(got, "URL proyek") {
		t.Fatalf("label: %q", got)
	}

	w = do(h, "PUT", "/api/admin/portfolio", valid(), s)
	if w.Code != 200 {
		t.Fatalf("update: %d %s", w.Code, w.Body)
	}
	var p Portfolio
	json.Unmarshal(w.Body.Bytes(), &p)
	if p.Name != "Ringin" || strings.Join(p.Stack, ",") != "Go,React" || p.Companies[0].Logo != nil {
		t.Fatalf("not normalised: %+v", p)
	}
	if strings.Contains(w.Body.String(), "extra") {
		t.Fatal("unknown key kept")
	}
	// Public endpoint now serves the saved content, and a fresh app instance reloads it from disk.
	if g := do(h, "GET", "/api/portfolio", nil).Body.String(); g != w.Body.String() {
		t.Fatalf("show differs from saved:\n%s\n%s", g, w.Body)
	}
	b, err := newApp(a.dir, "a@b.c", "A", a.hash, a.secret, false, false)
	if err != nil || !strings.Contains(string(b.cur.Load().body), "Ringin") {
		t.Fatal("content not persisted")
	}
}

func TestLimits(t *testing.T) {
	_, h := newTestApp(t)
	s := login(t, h)
	p := valid()
	p["name"] = strings.Repeat("é", 101) // counted in characters, not bytes
	if c := do(h, "PUT", "/api/admin/portfolio", p, s).Code; c != 422 {
		t.Fatalf("long name: %d", c)
	}
	p = valid()
	p["name"] = strings.Repeat("é", 100)
	if c := do(h, "PUT", "/api/admin/portfolio", p, s).Code; c != 200 {
		t.Fatalf("100-char name: %d", c)
	}
	if c := do(h, "PUT", "/api/admin/portfolio", "{not json", s).Code; c != 400 {
		t.Fatalf("bad json: %d", c)
	}
}

func uploadReq(h http.Handler, s *http.Cookie, filename string, data []byte) *httptest.ResponseRecorder {
	var b bytes.Buffer
	mw := multipart.NewWriter(&b)
	fw, _ := mw.CreateFormFile("file", filename)
	fw.Write(data)
	mw.Close()
	r := httptest.NewRequest("POST", "/api/admin/uploads", &b)
	r.Header.Set("Content-Type", mw.FormDataContentType())
	r.Header.Set("X-XSRF-TOKEN", tok)
	r.AddCookie(&http.Cookie{Name: xsrfCookie, Value: tok})
	if s != nil {
		r.AddCookie(s)
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	return w
}

var png = []byte("\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89")

func TestUpload(t *testing.T) {
	_, h := newTestApp(t)
	if c := uploadReq(h, nil, "a.png", png).Code; c != 401 {
		t.Fatalf("unauth upload: %d", c)
	}
	s := login(t, h)
	w := uploadReq(h, s, "../../evil.php", png) // client filename is ignored
	var out struct{ URL string }
	json.Unmarshal(w.Body.Bytes(), &out)
	if w.Code != 201 || !strings.HasPrefix(out.URL, "/storage/uploads/") || !strings.HasSuffix(out.URL, ".png") {
		t.Fatalf("upload: %d %s", w.Code, w.Body)
	}
	g := do(h, "GET", out.URL, nil)
	if g.Code != 200 || g.Header().Get("Content-Type") != "image/png" || !bytes.Equal(g.Body.Bytes(), png) {
		t.Fatalf("serve: %d %s", g.Code, g.Header().Get("Content-Type"))
	}
	for name, data := range map[string][]byte{
		"svg":  []byte(`<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`),
		"text": []byte("hello"),
		"big":  append(append([]byte{}, png...), make([]byte, maxUpload)...),
	} {
		if r := uploadReq(h, s, name+".png", data); r.Code != 422 || !strings.Contains(r.Body.String(), `"file"`) {
			t.Fatalf("%s: want 422 with file error, got %d %s", name, r.Code, r.Body)
		}
	}
	if c := do(h, "GET", "/storage/uploads/..%2Fportfolio.json", nil).Code; c != 404 {
		t.Fatalf("traversal: %d", c)
	}
}

func TestPasswordChangeRevokesSessions(t *testing.T) {
	a, h := newTestApp(t)
	s := login(t, h)
	a.hash = "$2a$04$changedchangedchangedchangedchangedchangedchangedcha"
	if c := do(h, "GET", "/api/admin/me", nil, s).Code; c != 401 {
		t.Fatalf("old session still valid: %d", c)
	}
}
