const products = [
  { id: 1, name: "Minidakori", category: "Chicken", price: 1.50, sample: false },
  { id: 2, name: "Medikori", category: "Chicken", price: 3.50, sample: false },
  { id: 3, name: "Dakori completo", category: "Chicken", price: 5.00, sample: false },

  { id: 4, name: "Ramen clásico", category: "Ramen", price: 3.00, sample: true },
  { id: 5, name: "Ramen picante", category: "Ramen", price: 3.50, sample: true },

  { id: 6, name: "Gaseosa", category: "Bebidas", price: 1.00, sample: true },
  { id: 7, name: "Agua", category: "Bebidas", price: 0.75, sample: true },

  { id: 8, name: "Snack coreano", category: "Snacks", price: 1.50, sample: true },
  { id: 9, name: "Pocky", category: "Snacks", price: 2.00, sample: true }
];

let activeCategory = "Todos";
let cart = [];

const categories = ["Todos", ...new Set(products.map(p => p.category))];

const categoryTabs = document.getElementById("categoryTabs");
const productsGrid = document.getElementById("productsGrid");
const cartItems = document.getElementById("cartItems");
const subtotalEl = document.getElementById("subtotal");
const totalEl = document.getElementById("total");
const cartStatus = document.getElementById("cartStatus");
const finishOrderBtn = document.getElementById("finishOrderBtn");
const clearCartBtn = document.getElementById("clearCartBtn");
const paymentMethod = document.getElementById("paymentMethod");
const orderNumber = document.getElementById("orderNumber");
const historyBody = document.getElementById("historyBody");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const toast = document.getElementById("toast");

function money(value){
  return `$${value.toFixed(2)}`;
}

function getHistory(){
  return JSON.parse(localStorage.getItem("dakori_orders") || "[]");
}

function saveHistory(history){
  localStorage.setItem("dakori_orders", JSON.stringify(history));
}

function getNextOrderNumber(){
  const history = getHistory();
  const max = history.reduce((acc, order) => Math.max(acc, order.number), 0);
  return max + 1;
}

function refreshOrderNumber(){
  const next = getNextOrderNumber();
  orderNumber.textContent = `#${String(next).padStart(3, "0")}`;
}

function renderCategories(){
  categoryTabs.innerHTML = "";

  categories.forEach(category => {
    const btn = document.createElement("button");
    btn.className = `category-btn ${activeCategory === category ? "active" : ""}`;
    btn.textContent = category;
    btn.addEventListener("click", () => {
      activeCategory = category;
      renderCategories();
      renderProducts();
    });
    categoryTabs.appendChild(btn);
  });
}

function renderProducts(){
  const filtered = activeCategory === "Todos"
    ? products
    : products.filter(p => p.category === activeCategory);

  productsGrid.innerHTML = filtered.map(product => `
    <article class="product-card">
      <div class="product-category">${product.category}</div>
      <h3>${product.name}</h3>
      <div class="price">${money(product.price)}</div>
      <div class="sample">${product.sample ? "Producto de prueba" : "&nbsp;"}</div>
      <button class="add-btn" onclick="addToCart(${product.id})">Agregar</button>
    </article>
  `).join("");
}

function addToCart(productId){
  const product = products.find(p => p.id === productId);
  const existing = cart.find(item => item.id === productId);

  if(existing){
    existing.qty += 1;
  }else{
    cart.push({ ...product, qty: 1 });
  }

  renderCart();
}

function changeQty(productId, amount){
  const item = cart.find(i => i.id === productId);
  if(!item) return;

  item.qty += amount;

  if(item.qty <= 0){
    cart = cart.filter(i => i.id !== productId);
  }

  renderCart();
}

function removeFromCart(productId){
  cart = cart.filter(i => i.id !== productId);
  renderCart();
}

function renderCart(){
  if(cart.length === 0){
    cartItems.innerHTML = `<div class="empty-cart">Tu pedido está vacío.</div>`;
    cartStatus.textContent = "Agrega productos para comenzar";
  }else{
    cartItems.innerHTML = cart.map(item => `
      <div class="cart-item">
        <div class="cart-item-top">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">${money(item.price * item.qty)}</div>
        </div>
        <div class="qty-row">
          <div class="qty-controls">
            <button class="qty-btn" onclick="changeQty(${item.id}, -1)">−</button>
            <strong>${item.qty}</strong>
            <button class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
          </div>
          <button class="remove-btn" onclick="removeFromCart(${item.id})">Eliminar</button>
        </div>
      </div>
    `).join("");

    const units = cart.reduce((sum, item) => sum + item.qty, 0);
    cartStatus.textContent = `${units} producto${units === 1 ? "" : "s"} en la orden`;
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  subtotalEl.textContent = money(subtotal);
  totalEl.textContent = money(subtotal);
  finishOrderBtn.disabled = cart.length === 0;
}

function finalizeOrder(){
  if(cart.length === 0) return;

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const number = getNextOrderNumber();
  const now = new Date();

  const order = {
    number,
    date: now.toLocaleDateString("es-EC"),
    time: now.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" }),
    payment: paymentMethod.value,
    total,
    items: cart.map(item => ({
      id: item.id,
      name: item.name,
      qty: item.qty,
      price: item.price,
      subtotal: item.price * item.qty
    }))
  };

  const history = getHistory();
  history.unshift(order);
  saveHistory(history);

  cart = [];
  renderCart();
  renderHistory();
  refreshOrderNumber();
  showToast(`Orden #${String(number).padStart(3, "0")} finalizada — Total ${money(total)}`);
}

function renderHistory(){
  const history = getHistory();

  if(history.length === 0){
    historyBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;color:#777;padding:24px;">
          Todavía no hay órdenes finalizadas.
        </td>
      </tr>
    `;
    return;
  }

  historyBody.innerHTML = history.map(order => {
    const itemText = order.items.map(item => `${item.qty}× ${item.name}`).join(", ");
    return `
      <tr>
        <td><strong>#${String(order.number).padStart(3, "0")}</strong></td>
        <td>${order.time}</td>
        <td>${itemText}</td>
        <td>${order.payment}</td>
        <td><strong>${money(order.total)}</strong></td>
      </tr>
    `;
  }).join("");
}

function showToast(message){
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

clearCartBtn.addEventListener("click", () => {
  cart = [];
  renderCart();
});

finishOrderBtn.addEventListener("click", finalizeOrder);

clearHistoryBtn.addEventListener("click", () => {
  const confirmed = confirm("¿Seguro que deseas eliminar el historial guardado en este navegador?");
  if(!confirmed) return;

  localStorage.removeItem("dakori_orders");
  renderHistory();
  refreshOrderNumber();
});

renderCategories();
renderProducts();
renderCart();
renderHistory();
refreshOrderNumber();
