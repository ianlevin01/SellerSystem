// src/pages/PublicStore.jsx
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import client from "../api/client";
import { ShoppingCart, X, Plus, Minus, Send, MessageCircle } from "lucide-react";

export default function PublicStore() {
  const { slug } = useParams();
  const [store, setStore]       = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [cart, setCart]         = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderForm, setOrderForm] = useState({ name: "", email: "", phone: "", city: "", notes: "" });
  const [ordering, setOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [search, setSearch]     = useState("");

  // Chat state
  const [chatOpen, setChatOpen]       = useState(false);
  const [chatConvId, setChatConvId]   = useState(() => localStorage.getItem(`chat_conv_${window.location.pathname}`) || null);
  const [chatToken, setChatToken]     = useState(() => localStorage.getItem(`chat_token_${window.location.pathname}`) || null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatForm, setChatForm]       = useState({ name: "", email: "", phone: "", body: "" });
  const [chatStarted, setChatStarted] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [chatReply, setChatReply]     = useState("");
  const chatPollRef                   = useRef(null);
  const chatEndRef                    = useRef(null);

  useEffect(() => {
    client.get(`/seller/store/public/${slug}`)
      .then(res => { setStore(res.data.page); setProducts(res.data.products); })
      .catch(() => setError("Tienda no encontrada"))
      .finally(() => setLoading(false));
  }, [slug]);

  function addToCart(product) {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
  }

  function updateQty(id, delta) {
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0));
  }

  const cartTotal = cart.reduce((sum, i) => sum + Number(i.precio_venta) * i.qty, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.code || "").toLowerCase().includes(search.toLowerCase())
  );

  async function submitOrder() {
    if (!orderForm.name) return alert("Por favor ingresá tu nombre");
    if (cart.length === 0) return alert("El carrito está vacío");
    setOrdering(true);
    try {
      await client.post(`/seller/store/public/${slug}/order`, {
        customer: orderForm,
        items: cart.map(i => ({
          product_id: i.id,
          name: i.custom_name || i.name,
          quantity: i.qty,
          unit_price: i.precio_venta,
        })),
        total: cartTotal,
      });
      setOrderSuccess(true);
      setCart([]);
      setCartOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || "Error al enviar el pedido");
    } finally {
      setOrdering(false);
    }
  }

  const fetchChatMessages = useCallback(async (convId, token) => {
    if (!convId || !token) return;
    try {
      const res = await client.get(`/store/${slug}/chat/${convId}/messages?token=${token}`);
      setChatMessages(res.data);
    } catch { /* ignore */ }
  }, [slug]);

  useEffect(() => {
    if (chatConvId && chatToken) {
      setChatStarted(true);
      fetchChatMessages(chatConvId, chatToken);
    }
  }, [chatConvId, chatToken, fetchChatMessages]);

  useEffect(() => {
    if (chatOpen && chatStarted) {
      clearInterval(chatPollRef.current);
      chatPollRef.current = setInterval(() => fetchChatMessages(chatConvId, chatToken), 15000);
    } else {
      clearInterval(chatPollRef.current);
    }
    return () => clearInterval(chatPollRef.current);
  }, [chatOpen, chatStarted, chatConvId, chatToken, fetchChatMessages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  async function handleStartChat(e) {
    e.preventDefault();
    if (!chatForm.name.trim() || !chatForm.body.trim()) return;
    setChatSending(true);
    try {
      const res = await client.post(`/store/${slug}/chat`, chatForm);
      const key = `chat_conv_${window.location.pathname}`;
      const tkey = `chat_token_${window.location.pathname}`;
      localStorage.setItem(key, res.data.conversation_id);
      localStorage.setItem(tkey, res.data.access_token);
      setChatConvId(res.data.conversation_id);
      setChatToken(res.data.access_token);
      setChatStarted(true);
      await fetchChatMessages(res.data.conversation_id, res.data.access_token);
    } finally {
      setChatSending(false);
    }
  }

  async function handleSendChatReply(e) {
    e.preventDefault();
    if (!chatReply.trim()) return;
    setChatSending(true);
    try {
      await client.post(`/store/${slug}/chat/${chatConvId}/messages?token=${chatToken}`, { body: chatReply.trim() });
      setChatReply("");
      await fetchChatMessages(chatConvId, chatToken);
    } finally {
      setChatSending(false);
    }
  }

  const bannerColor = store?.banner_color || "#5b52f0";

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "var(--text-secondary)" }}>Cargando tienda...</p>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
        <h2>Tienda no encontrada</h2>
        <p style={{ marginTop: 8 }}>El link puede estar desactivado o ser incorrecto.</p>
      </div>
    </div>
  );

  if (orderSuccess) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 24 }}>
      <div className="card" style={{ maxWidth: 400, textAlign: "center", padding: 48 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <h2 style={{ marginBottom: 8 }}>¡Pedido enviado!</h2>
        <p style={{ marginBottom: 28 }}>
          Tu pedido fue recibido. Te contactaremos pronto para coordinar la entrega.
        </p>
        <button
          onClick={() => setOrderSuccess(false)}
          className="btn btn--primary btn--full btn--lg"
          style={{ background: bannerColor }}
        >
          Seguir comprando
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Banner */}
      <header className="store-header" style={{ background: bannerColor }}>
        <div className="store-header__inner">
          <h1>{store?.store_name || "Mi tienda"}</h1>
          {store?.store_description && <p>{store.store_description}</p>}
        </div>
      </header>

      {/* Topbar sticky */}
      <div className="store-topbar">
        <div className="store-topbar__inner">
          <div className="search-wrapper" style={{ flex: 1 }}>
            <input
              className="form-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar productos..."
            />
          </div>
          <button
            className="btn"
            onClick={() => setCartOpen(true)}
            style={{ background: bannerColor, color: "#fff", gap: 8, position: "relative" }}
          >
            <ShoppingCart size={16} />
            Carrito
            {cartCount > 0 && (
              <span style={{
                background: "#fff",
                color: bannerColor,
                borderRadius: "50%",
                width: 20, height: 20,
                fontSize: 11, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Productos */}
      <main className="store-main">
        {filteredProducts.length === 0 ? (
          <div className="empty-state">No se encontraron productos.</div>
        ) : (
          <div className="product-grid">
            {filteredProducts.map((product, i) => {
              const images = product.images || [];
              const imgUrl = images[0] || null;
              const inCart = cart.find(ci => ci.id === product.id);

              return (
                <div key={product.id} className="store-product-card" style={{ animationDelay: `${i * 30}ms` }}>
                  <div className="store-product-card__img">
                    {imgUrl
                      ? <img src={imgUrl} alt={product.custom_name || product.name} />
                      : <div className="store-product-card__img-placeholder">📦</div>
                    }
                  </div>
                  <div className="store-product-card__body">
                    <div className="store-product-card__name">
                      {product.custom_name || product.name}
                    </div>
                    {(product.custom_desc || product.description) && (
                      <div className="store-product-card__desc">
                        {product.custom_desc || product.description}
                      </div>
                    )}
                    <div className="store-product-card__price" style={{ color: bannerColor }}>
                      ${fmt(product.precio_venta)}
                    </div>

                    {inCart ? (
                      <div className="store-qty-row">
                        <button className="qty-btn" onClick={() => updateQty(product.id, -1)}><Minus size={12} /></button>
                        <span className="qty-count">{inCart.qty}</span>
                        <button className="qty-btn" onClick={() => updateQty(product.id, 1)}><Plus size={12} /></button>
                        <span className="qty-label">en carrito</span>
                      </div>
                    ) : (
                      <button
                        className="btn btn--full"
                        style={{ background: bannerColor, color: "#fff" }}
                        onClick={() => addToCart(product)}
                      >
                        Agregar al carrito
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Botón flotante de chat */}
      <button
        onClick={() => setChatOpen(o => !o)}
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 1000,
          background: bannerColor, color: "#fff",
          border: "none", borderRadius: "50%",
          width: 52, height: 52, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
        }}
        title="Consultar al vendedor"
      >
        <MessageCircle size={22} />
      </button>

      {/* Chat popup */}
      {chatOpen && (
        <div style={{
          position: "fixed", bottom: 88, right: 24, zIndex: 1000,
          width: 330, maxHeight: 480,
          background: "#fff", borderRadius: 16,
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          border: "1px solid #e5e7eb",
        }}>
          <div style={{ background: bannerColor, color: "#fff", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 600, fontSize: ".95rem" }}>Consultar al vendedor</span>
            <button onClick={() => setChatOpen(false)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", lineHeight: 1 }}>
              <X size={16} />
            </button>
          </div>

          {!chatStarted ? (
            <form onSubmit={handleStartChat} style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <input className="form-input" placeholder="Tu nombre *" value={chatForm.name} onChange={e => setChatForm(f => ({ ...f, name: e.target.value }))} required />
              <input className="form-input" type="email" placeholder="Tu email (opcional)" value={chatForm.email} onChange={e => setChatForm(f => ({ ...f, email: e.target.value }))} />
              <input className="form-input" placeholder="Tu teléfono (opcional)" value={chatForm.phone} onChange={e => setChatForm(f => ({ ...f, phone: e.target.value }))} />
              <textarea className="form-input" rows={3} placeholder="Tu consulta *" value={chatForm.body} onChange={e => setChatForm(f => ({ ...f, body: e.target.value }))} required style={{ resize: "none" }} />
              <button className="btn" type="submit" disabled={chatSending} style={{ background: bannerColor, color: "#fff" }}>
                {chatSending ? "Enviando..." : "Enviar consulta"}
              </button>
            </form>
          ) : (
            <>
              <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", minHeight: 200, maxHeight: 300 }}>
                {chatMessages.length === 0 ? (
                  <p style={{ textAlign: "center", color: "#9ca3af", fontSize: ".85rem", marginTop: 20 }}>Enviaste tu consulta. El vendedor te responderá aquí.</p>
                ) : chatMessages.map(msg => (
                  <div key={msg.id} style={{ display: "flex", justifyContent: msg.sender === "customer" ? "flex-end" : "flex-start", marginBottom: 10 }}>
                    <div style={{
                      maxWidth: "80%", padding: "8px 12px", fontSize: ".85rem",
                      borderRadius: msg.sender === "customer" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      background: msg.sender === "customer" ? bannerColor : "#f3f4f6",
                      color: msg.sender === "customer" ? "#fff" : "#111",
                    }}>
                      {msg.body}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleSendChatReply} style={{ padding: "10px 12px", borderTop: "1px solid #e5e7eb", display: "flex", gap: 8 }}>
                <input className="form-input" style={{ flex: 1, fontSize: ".85rem" }} value={chatReply} onChange={e => setChatReply(e.target.value)} placeholder="Escribí otra consulta..." disabled={chatSending} />
                <button type="submit" disabled={chatSending || !chatReply.trim()} style={{ background: bannerColor, color: "#fff", border: "none", borderRadius: 8, padding: "0 12px", cursor: "pointer" }}>
                  <Send size={14} />
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* Carrito drawer */}
      {cartOpen && (
        <div className="cart-overlay">
          <div className="cart-backdrop" onClick={() => setCartOpen(false)} />
          <div className="cart-drawer">
            <div className="cart-drawer__header">
              <span className="cart-drawer__title">Tu carrito</span>
              <button className="cart-drawer__close" onClick={() => setCartOpen(false)}>
                <X size={16} />
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="empty-state">El carrito está vacío.</div>
            ) : (
              <>
                <div style={{ flex: 1 }}>
                  {cart.map(item => (
                    <div key={item.id} className="cart-item">
                      <div className="cart-item__info">
                        <div className="cart-item__name">{item.custom_name || item.name}</div>
                        <div className="cart-item__unit">${fmt(item.precio_venta)} × {item.qty}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button className="qty-btn" onClick={() => updateQty(item.id, -1)}><Minus size={11} /></button>
                        <span style={{ fontSize: ".875rem", fontWeight: 600, minWidth: 16, textAlign: "center" }}>{item.qty}</span>
                        <button className="qty-btn" onClick={() => updateQty(item.id, 1)}><Plus size={11} /></button>
                      </div>
                      <div className="cart-item__total">${fmt(Number(item.precio_venta) * item.qty)}</div>
                    </div>
                  ))}
                </div>

                <div className="cart-total-row">
                  <span>Total</span>
                  <span>${fmt(cartTotal)}</span>
                </div>

                {/* Datos del comprador */}
                <div>
                  <h3 style={{ marginBottom: 12, fontSize: ".9rem" }}>Tus datos</h3>
                  {[
                    { key: "name",  label: "Nombre *", type: "text",  placeholder: "Tu nombre completo" },
                    { key: "email", label: "Email",     type: "email", placeholder: "tu@email.com" },
                    { key: "phone", label: "Teléfono",  type: "tel",   placeholder: "+54 11 ..." },
                    { key: "city",  label: "Ciudad",    type: "text",  placeholder: "Buenos Aires" },
                  ].map(({ key, label, type, placeholder }) => (
                    <div className="form-group" key={key} style={{ marginBottom: 10 }}>
                      <label className="form-label">{label}</label>
                      <input type={type} className="form-input form-input--sm"
                        placeholder={placeholder}
                        value={orderForm[key]}
                        onChange={e => setOrderForm(p => ({ ...p, [key]: e.target.value }))}
                      />
                    </div>
                  ))}
                  <div className="form-group">
                    <label className="form-label">Observaciones</label>
                    <textarea className="form-textarea" style={{ minHeight: 60 }}
                      placeholder="¿Alguna aclaración para el pedido?"
                      value={orderForm.notes}
                      onChange={e => setOrderForm(p => ({ ...p, notes: e.target.value }))}
                    />
                  </div>
                </div>

                <button
                  className="btn btn--full btn--lg"
                  style={{ background: bannerColor, color: "#fff" }}
                  onClick={submitOrder}
                  disabled={ordering}
                >
                  <Send size={15} />
                  {ordering ? "Enviando..." : "Confirmar pedido"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function fmt(n) { return Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 }); }
