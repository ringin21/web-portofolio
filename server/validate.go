package main

import (
	"fmt"
	"net/mail"
	"net/url"
	"regexp"
	"strings"
	"unicode"
	"unicode/utf8"
)

type Company struct {
	Name   string  `json:"name"`
	Role   string  `json:"role"`
	Period string  `json:"period"`
	Logo   *string `json:"logo,omitempty"` // optional: entries saved before logos existed have no key
}
type Education struct {
	Institution string `json:"institution"`
	Degree      string `json:"degree"`
	Major       string `json:"major"`
	Period      string `json:"period"`
}
type Project struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	URL         string `json:"url"`
	Image       string `json:"image"`
}
type Contact struct {
	Email    string `json:"email"`
	Github   string `json:"github"`
	Linkedin string `json:"linkedin"`
}
type Portfolio struct {
	Name      string      `json:"name"`
	Title     string      `json:"title"`
	Bio       string      `json:"bio"`
	Photo     string      `json:"photo"`
	Companies []Company   `json:"companies"`
	Education []Education `json:"education"`
	Projects  []Project   `json:"projects"`
	Stack     []string    `json:"stack"`
	Contact   Contact     `json:"contact"`
}

// Field labels for error messages; "*" stands for any list index.
var labels = map[string]string{
	"name": "Nama", "title": "Jabatan", "bio": "Bio", "photo": "Foto profil",
	"companies": "Pengalaman", "education": "Pendidikan", "projects": "Proyek", "stack": "Keahlian", "stack.*": "Keahlian",
	"companies.*.name": "nama perusahaan", "companies.*.role": "posisi", "companies.*.period": "periode", "companies.*.logo": "logo perusahaan",
	"education.*.institution": "institusi", "education.*.degree": "jenjang", "education.*.major": "jurusan", "education.*.period": "periode",
	"projects.*.title": "judul proyek", "projects.*.description": "deskripsi proyek", "projects.*.url": "URL proyek", "projects.*.image": "gambar proyek",
	"contact.email": "email", "contact.github": "URL GitHub", "contact.linkedin": "URL LinkedIn",
	"password": "Password",
}

var indexSeg = regexp.MustCompile(`\.\d+(\.|$)`)

// errs keeps the first failure per field (like a validator with "bail"); order remembers which came first.
type errs struct {
	m     map[string]string
	order []string
}

func (e *errs) add(key, tmpl string, max int) {
	if _, dup := e.m[key]; dup {
		return
	}
	label := labels[indexSeg.ReplaceAllString(key, ".*${1}")]
	if label == "" {
		label = key
	}
	r := []rune(label)
	r[0] = unicode.ToUpper(r[0])
	msg := strings.NewReplacer(":Attribute", string(r), ":max", fmt.Sprint(max)).Replace(tmpl)
	if e.m == nil {
		e.m = map[string]string{}
	}
	e.m[key] = msg
	e.order = append(e.order, key)
}

func (e *errs) any() bool { return len(e.m) > 0 }

// body is the 422 payload: the first message plus a count of the rest.
func (e *errs) body() map[string]any {
	msg := e.m[e.order[0]]
	if n := len(e.order) - 1; n > 0 {
		msg += fmt.Sprintf(" (dan %d kesalahan lainnya)", n)
	}
	fields := make(map[string][]string, len(e.m))
	for k, v := range e.m {
		fields[k] = []string{v}
	}
	return map[string]any{"message": msg, "errors": fields}
}

const (
	msgRequired = ":Attribute wajib diisi."
	msgPresent  = ":Attribute wajib ada."
	msgString   = ":Attribute harus berupa teks."
	msgArray    = ":Attribute tidak valid."
	msgMax      = ":Attribute melebihi batas maksimal (:max)."
	msgEmail    = ":Attribute harus berupa alamat email yang valid."
	msgURL      = ":Attribute harus berupa URL http:// atau https:// yang valid."
)

type rule struct {
	required, sometimes bool // neither: the key only has to be present
	max                 int
	kind                string // "", "email" or "url"
}

var (
	req      = rule{required: true}
	reqEmail = rule{required: true, kind: "email"}
	reqURL   = rule{required: true, kind: "url"}
)

func (r rule) maxed(n int) rule { r.max = n; return r }

func validEmail(s string) bool {
	a, err := mail.ParseAddress(s)
	return err == nil && a.Address == s && strings.Contains(a.Address[strings.LastIndex(a.Address, "@"):], ".")
}

func validURL(s string) bool {
	u, err := url.Parse(s)
	return err == nil && (u.Scheme == "http" || u.Scheme == "https") && u.Host != "" && !strings.ContainsAny(s, " \t\r\n")
}

// str reads m[k] as a trimmed string and records the first rule it breaks.
func (e *errs) str(m map[string]any, k, path string, r rule) string {
	raw, ok := m[k]
	if !ok && r.sometimes {
		return ""
	}
	if raw == nil {
		if r.required {
			e.add(path, msgRequired, 0)
		} else if ok {
			e.add(path, msgString, 0)
		} else {
			e.add(path, msgPresent, 0)
		}
		return ""
	}
	s, isStr := raw.(string)
	if !isStr {
		e.add(path, msgString, 0)
		return ""
	}
	s = strings.TrimSpace(s)
	switch {
	case r.required && s == "":
		e.add(path, msgRequired, 0)
	case r.max > 0 && utf8.RuneCountInString(s) > r.max:
		e.add(path, msgMax, r.max)
	case r.kind == "email" && !validEmail(s):
		e.add(path, msgEmail, 0)
	case r.kind == "url" && !validURL(s):
		e.add(path, msgURL, 0)
	}
	return s
}

// list reads m[k] as an array that must be present and have at most max items.
func (e *errs) list(m map[string]any, k string, max int) []any {
	raw, ok := m[k]
	if !ok {
		e.add(k, msgPresent, 0)
		return nil
	}
	l, isList := raw.([]any)
	if !isList {
		e.add(k, msgArray, 0)
		return nil
	}
	if len(l) > max {
		e.add(k, msgMax, max)
	}
	return l
}

func obj(v any) map[string]any {
	m, _ := v.(map[string]any)
	return m // nil map reads as "every key missing"
}

// cleanStack drops blank and duplicate tags before validation.
func cleanStack(l []any) []any {
	seen := map[string]bool{}
	out := make([]any, 0, len(l))
	for _, v := range l {
		if s, ok := v.(string); ok {
			s = strings.TrimSpace(s)
			if s == "" || seen[s] {
				continue
			}
			seen[s] = true
			v = s
		} else if v == nil {
			continue
		}
		out = append(out, v)
	}
	return out
}

// parsePortfolio validates the admin payload; unknown keys are dropped.
func parsePortfolio(in map[string]any) (Portfolio, *errs) {
	e := &errs{}
	p := Portfolio{
		Name:  e.str(in, "name", "name", req.maxed(100)),
		Title: e.str(in, "title", "title", req.maxed(150)),
		Bio:   e.str(in, "bio", "bio", req.maxed(2000)),
		Photo: e.str(in, "photo", "photo", rule{max: 500}),
	}
	p.Companies = []Company{}
	for i, v := range e.list(in, "companies", 50) {
		m, at := obj(v), fmt.Sprintf("companies.%d.", i)
		c := Company{
			Name:   e.str(m, "name", at+"name", req.maxed(150)),
			Role:   e.str(m, "role", at+"role", req.maxed(150)),
			Period: e.str(m, "period", at+"period", req.maxed(100)),
		}
		if _, has := m["logo"]; has {
			logo := e.str(m, "logo", at+"logo", rule{sometimes: true, max: 500})
			c.Logo = &logo
		}
		p.Companies = append(p.Companies, c)
	}
	p.Education = []Education{}
	for i, v := range e.list(in, "education", 50) {
		m, at := obj(v), fmt.Sprintf("education.%d.", i)
		p.Education = append(p.Education, Education{
			Institution: e.str(m, "institution", at+"institution", req.maxed(150)),
			Degree:      e.str(m, "degree", at+"degree", req.maxed(100)),
			Major:       e.str(m, "major", at+"major", req.maxed(150)),
			Period:      e.str(m, "period", at+"period", req.maxed(100)),
		})
	}
	p.Projects = []Project{}
	for i, v := range e.list(in, "projects", 50) {
		m, at := obj(v), fmt.Sprintf("projects.%d.", i)
		p.Projects = append(p.Projects, Project{
			Title:       e.str(m, "title", at+"title", req.maxed(150)),
			Description: e.str(m, "description", at+"description", req.maxed(1000)),
			URL:         e.str(m, "url", at+"url", reqURL),
			Image:       e.str(m, "image", at+"image", rule{max: 500}),
		})
	}
	p.Stack = []string{}
	if raw, ok := in["stack"].([]any); ok {
		in["stack"] = cleanStack(raw)
	}
	for i, v := range e.list(in, "stack", 100) {
		p.Stack = append(p.Stack, e.str(map[string]any{"v": v}, "v", fmt.Sprintf("stack.%d", i), req.maxed(50)))
	}
	c := obj(in["contact"])
	p.Contact = Contact{
		Email:    e.str(c, "email", "contact.email", reqEmail),
		Github:   e.str(c, "github", "contact.github", reqURL),
		Linkedin: e.str(c, "linkedin", "contact.linkedin", reqURL),
	}
	if e.any() {
		return p, e
	}
	return p, nil
}
