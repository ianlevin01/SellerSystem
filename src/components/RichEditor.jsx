import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TipTapImage from "@tiptap/extension-image";
import { useCallback, useRef, useState } from "react";
import { Bold, Italic, List, ListOrdered, Heading2, Heading3, Link as LinkIcon, Upload } from "lucide-react";
import client from "../api/client";

const MAX_MB    = 5;
const MAX_BYTES = MAX_MB * 1024 * 1024;

// ── Drag-to-resize image NodeView ────────────────────────────────
function ResizableImageView({ node, updateAttributes, selected }) {
  const wrapRef = useRef(null);

  function startResize(e) {
    e.preventDefault();
    e.stopPropagation();
    const wrap   = wrapRef.current;
    if (!wrap) return;
    const startX = e.clientX;
    const startW = wrap.offsetWidth;
    const parentW = wrap.parentElement?.offsetWidth || startW;

    function onMove(mv) {
      const dx  = mv.clientX - startX;
      const pct = Math.min(100, Math.max(10, Math.round(((startW + dx) / parentW) * 100)));
      wrap.style.width = `${pct}%`;           // live DOM update (no re-render)
    }
    function onUp(uv) {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
      const dx  = uv.clientX - startX;
      const pct = Math.min(100, Math.max(10, Math.round(((startW + dx) / parentW) * 100)));
      updateAttributes({ width: `${pct}%` }); // commit to editor state
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
  }

  return (
    <NodeViewWrapper style={{ display: "block" }}>
      <div
        ref={wrapRef}
        className={`re-img-wrap${selected ? " re-img-wrap--sel" : ""}`}
        style={{ width: node.attrs.width || "100%" }}
      >
        <img
          src={node.attrs.src}
          alt={node.attrs.alt || ""}
          draggable="false"
          style={{ width: "100%", height: "auto", display: "block", borderRadius: 8 }}
        />
        {selected && (
          <div className="re-resize-handle" onMouseDown={startResize} title="Arrastrar para redimensionar" />
        )}
        {selected && (
          <div className="re-img-size-tag">{node.attrs.width || "100%"}</div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

// ── Image extension with resizable width ─────────────────────────
const ResizableImage = TipTapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: "100%",
        parseHTML: el => el.style.width || el.getAttribute("width") || "100%",
        renderHTML: ({ width }) => ({
          style: `width:${width || "100%"};max-width:100%;height:auto;display:block;border-radius:8px;`,
        }),
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});

// ── Main editor component ─────────────────────────────────────────
export default function RichEditor({ value, onChange, productId }) {
  const [showUrl,     setShowUrl]     = useState(false);
  const [imgUrl,      setImgUrl]      = useState("");
  const [uploading,   setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      ResizableImage.configure({ inline: false, allowBase64: false }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  const insertUrl = useCallback(() => {
    const url = imgUrl.trim();
    if (!url || !editor) return;
    editor.chain().focus().setImage({ src: url }).run();
    setImgUrl(""); setShowUrl(false);
  }, [imgUrl, editor]);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_BYTES) {
      setUploadError(`El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB — máximo ${MAX_MB} MB.`);
      return;
    }
    setUploadError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await client.post(`/seller/images/desc/${productId}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      editor?.chain().focus().setImage({ src: res.data.url }).run();
    } catch (err) {
      setUploadError(err.response?.data?.message || "Error al subir el archivo");
    } finally {
      setUploading(false);
    }
  }

  if (!editor) return null;

  function Btn({ active, onClick, title, children, disabled }) {
    return (
      <button
        type="button" title={title} disabled={disabled}
        className={`re-btn${active ? " re-btn--on" : ""}`}
        onClick={onClick}
      >{children}</button>
    );
  }

  return (
    <div className="rich-editor">
      <div className="rich-editor__toolbar">
        <Btn active={editor.isActive("bold")}   onClick={() => editor.chain().focus().toggleBold().run()}   title="Negrita"><Bold size={14} /></Btn>
        <Btn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Cursiva"><Italic size={14} /></Btn>
        <div className="re-sep" />
        <Btn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="H2"><Heading2 size={14} /></Btn>
        <Btn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="H3"><Heading3 size={14} /></Btn>
        <div className="re-sep" />
        <Btn active={editor.isActive("bulletList")}  onClick={() => editor.chain().focus().toggleBulletList().run()}  title="Lista"><List size={14} /></Btn>
        <Btn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Lista numerada"><ListOrdered size={14} /></Btn>
        <div className="re-sep" />
        <Btn active={showUrl} onClick={() => setShowUrl(p => !p)} title="Insertar por URL (imagen / GIF)"><LinkIcon size={14} /></Btn>
        {productId && (
          <>
            <Btn active={uploading} disabled={uploading} onClick={() => fileRef.current?.click()} title={`Subir desde la computadora (máx. ${MAX_MB} MB)`}>
              <Upload size={14} />
            </Btn>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
          </>
        )}
        <div className="re-spacer" />
        <span className="re-hint">Seleccioná una imagen para redimensionarla</span>
      </div>

      {showUrl && (
        <div className="rich-editor__img-row">
          <input
            className="form-input form-input--sm"
            placeholder="Pegá la URL de una imagen o GIF..."
            value={imgUrl}
            onChange={e => setImgUrl(e.target.value)}
            onKeyDown={e => e.key === "Enter" && insertUrl()}
            autoFocus style={{ flex: 1 }}
          />
          <button type="button" className="btn btn--primary btn--sm" onClick={insertUrl}>Insertar</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setShowUrl(false); setImgUrl(""); }}>✕</button>
        </div>
      )}

      {uploadError && (
        <div className="rich-editor__error">
          ⚠ {uploadError}
          <button type="button" className="re-close" onClick={() => setUploadError("")}>✕</button>
        </div>
      )}
      {uploading && <div className="rich-editor__uploading">Subiendo archivo…</div>}

      <EditorContent editor={editor} className="rich-editor__content" />
    </div>
  );
}
