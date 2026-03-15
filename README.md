# n8n-nodes-docmiral

An [n8n](https://n8n.io) community node for [DocMiral](https://docmiral.com) — automate document generation, AI-powered filling, PDF/PPTX/image export, and more directly from your n8n workflows.

---

## Features

- Generate documents from templates written in **HTML & Tailwind CSS** — full styling control with structured data
- Export to **PDF**, **PowerPoint (PPTX)**, or **Image** — from an existing document or directly from a template in a single step
- Use **TARS AI** to fill documents from natural language, parse CVs, extract text, and smart-clone documents
- Manage templates (create, update, clone, build, get schema)
- Browse categories and filter templates by library or category

---

## Installation

### In n8n (Community Nodes)

1. Open your n8n instance
2. Go to **Settings → Community Nodes**
3. Click **Install a community node**
4. Enter `n8n-nodes-docmiral` and confirm

### Self-hosted / Docker

```bash
# Inside your n8n data directory
npm install n8n-nodes-docmiral
```

Restart n8n after installation.

---

## Credentials

Create a **DocMiral API** credential with:

| Field | Value |
|---|---|
| **API Token** | Your DocMiral API token (from your account settings) |
| **Base URL** | `https://api.docmiral.com/api` |

> **Important:** Use `https://` — HTTP will trigger a redirect that breaks POST requests.

---

## Resources & Operations

### Document

Manage your DocMiral documents (entities).

| Operation | Description |
|---|---|
| **List** | Fetch a paginated list of documents (`limit`, `offset`) |
| **Get** | Get a single document by ID |
| **Create** | Create a document from a template. Supports `init` (empty), `data`, and `settings` |
| **Update** | Update the data of an existing document |
| **Delete** | Delete a document by ID |
| **Clone** | Clone an existing document |
| **Build PDF** | Export a document as a PDF binary |
| **Build PPTX** | Export a document as a PowerPoint binary |
| **Build Image** | Export a specific page of a document as a PNG image |

#### Build Source (PDF / PPTX / Image)

All three build operations support two modes via the **Build Source** toggle:

- **By Document ID** — build from an existing document (provide its ID)
- **Directly from Template** — create a document on the fly and immediately export it. Accepts the same `Template ID`, `Name`, `Init`, `Settings`, and `Data` fields as Create. The **Keep Document** toggle controls whether the intermediate document is saved to your list or automatically deleted after the file is generated.

#### Document Data Format

When creating or updating a document, field data and rendering settings are combined inside a single `data` object:

```json
{
  "templateId": "your-template-id",
  "init": false,
  "data": {
    "settings": {
      "size": "A4",
      "background": "#FFFFFF",
      "color": "#000000",
      "margin": "1in",
      "fontSize": "12pt"
    },
    "title": "My Document Title",
    "recipient_name": "Alice Johnson",
    "items": ["Item A", "Item B"]
  }
}
```

---

### Template

Manage reusable document templates.

| Operation | Description |
|---|---|
| **List** | List templates. Filter by `Category ID` and/or **Library** (Public / My Library) |
| **Get** | Get a template by ID |
| **Create** | Create a new template with name, category, HTML, and settings |
| **Update** | Update a template's name, settings, HTML, header, or footer |
| **Delete** | Delete a template by ID |
| **Clone** | Clone a template |
| **Build PDF** | Render a template preview as PDF |
| **Build Image** | Render all pages of a template as PNG images (one output item per page) |
| **Get Schema** | Get the variable schema of a template in Standard, JSON Schema, or OpenAI format. Optionally return sample data with default values. |

#### Template Settings

```json
{
  "size": "A4",
  "margin": "1in",
  "padding": "0",
  "background": "#FFFFFF",
  "color": "#000000",
  "fontSize": "12pt"
}
```

---

### TARS (AI)

AI-powered operations for document intelligence.

| Operation | Description |
|---|---|
| **Chat (Fill Document)** | Send a natural language message to TARS to fill a document's fields (e.g. `"Name is Alice, she works at Google"`) |
| **Parse CV** | Upload a CV/resume PDF and receive structured JSON data |
| **Extract Text** | Upload any file and extract its raw text content |
| **Smart Clone** | Clone a document using AI to adapt its content based on a message prompt |

> **Parse CV**, **Extract Text**, and **Smart Clone** require binary input from a previous node (e.g. Read Binary File, HTTP Request, or Google Drive).

---

### Category

| Operation | Description |
|---|---|
| **List** | Fetch all available template categories |

---

## Example Workflows

### Generate a PDF report from a template

1. **DocMiral** → Document: **Build PDF**
   - Build Source: `Directly from Template`
   - Template ID: `your-template-id`
   - Data (JSON): `{ "title": "Q1 Report", "revenue": 120000 }`
   - Settings (JSON): `{ "size": "A4" }`
   - Keep Document: `false`
2. **Write Binary File** or **Send Email** with the PDF attachment

---

### AI-fill a document from a form submission

1. **Webhook** — receive form data
2. **DocMiral** → Document: **Create**
   - Template ID: `your-template-id`
   - Data (JSON): `={{ $json }}`
3. **DocMiral** → TARS: **Chat**
   - Document ID: `={{ $json.data.id }}`
   - Message: `"Update the summary section with a professional tone"`
4. **DocMiral** → Document: **Build PDF**
   - Build Source: `By Document ID`
   - Document ID: `={{ $json.data.id }}`

---

### Parse a CV and populate a document

1. **Read Binary File** — load the CV PDF
2. **DocMiral** → TARS: **Parse CV**
3. **DocMiral** → Document: **Create**
   - Template ID: `your-cv-template-id`
   - Data (JSON): `={{ $json.data }}`

---

## Compatibility

| Requirement | Version |
|---|---|
| n8n | `>= 1.0.0` |
| n8n-workflow | `>= 2.12.0` |
| Node.js | `>= 18` |

---

## License

MIT — see [LICENSE](https://github.com/DocMiral/integrations/blob/master/n8n/LICENSE)

---

## Links

- [DocMiral Website](https://docmiral.com)
- [DocMiral API Docs](https://docmiral.com/api)
- [GitHub Repository](https://github.com/DocMiral/integrations)
- [Report an Issue](https://github.com/DocMiral/integrations/issues)
