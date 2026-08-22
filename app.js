
const SUPABASE_URL = "https://cveyhhgcljyxibqtgost.supabase.co";
const SUPABASE_KEY = "sb_publishable_-8M32lNeLrCzFfLq319C8Q_bmZnBVB-";


// ------------------------------------------------------
// 2. VARIABLES PRINCIPALES
// ------------------------------------------------------

let products = [];
let activeCategory = "Todos";
let cart = [];
let nextOrderNumber = 1;


// ------------------------------------------------------
// 3. ELEMENTOS DEL HTML
// ------------------------------------------------------

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


// ------------------------------------------------------
// 4. FUNCIONES GENERALES
// ------------------------------------------------------

function money(value) {
    return `$${Number(value).toFixed(2)}`;
}


// ------------------------------------------------------
// 5. CONEXIÓN CON SUPABASE
// ------------------------------------------------------

function apiHeaders(extraHeaders = {}) {

    return {
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json",
        ...extraHeaders
    };

}


async function supabaseFetch(path, options = {}) {

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/${path}`,
        {
            ...options,
            headers: apiHeaders(options.headers || {})
        }
    );

    if (!response.ok) {

        const errorText = await response.text();

        console.error(
            "Error Supabase:",
            response.status,
            errorText
        );

        throw new Error(
            `Error ${response.status}: ${errorText}`
        );

    }

    const text = await response.text();

    if (!text) {
        return null;
    }

    return JSON.parse(text);
}


// ------------------------------------------------------
// 6. CARGAR PRODUCTOS DESDE SUPABASE
// ------------------------------------------------------

async function loadProducts() {

    productsGrid.innerHTML = `
        <div
            class="empty-cart"
            style="grid-column:1/-1"
        >
            Cargando productos...
        </div>
    `;

    try {

        const data = await supabaseFetch(
            "productos" +
            "?select=id,nombre,categoria,precio,activo,es_prueba" +
            "&activo=eq.true" +
            "&order=id.asc"
        );

        products = (data || []).map(product => {

            return {

                id: Number(product.id),

                name: product.nombre,

                category: product.categoria,

                price: Number(product.precio),

                sample: Boolean(product.es_prueba)

            };

        });


        console.log(
            "Productos cargados:",
            products
        );


        renderCategories();
        renderProducts();


    } catch (error) {

        console.error(
            "Error cargando productos:",
            error
        );

        productsGrid.innerHTML = `
            <div
                class="empty-cart"
                style="grid-column:1/-1"
            >
                No se pudieron cargar los productos.
                Revisa la conexión con Supabase.
            </div>
        `;

        showToast(
            "Error al cargar productos"
        );

    }

}


// ------------------------------------------------------
// 7. CATEGORÍAS
// ------------------------------------------------------

function renderCategories() {

    const categories = [
        "Todos",
        ...new Set(
            products.map(
                product => product.category
            )
        )
    ];


    categoryTabs.innerHTML = "";


    categories.forEach(category => {

        const button =
            document.createElement("button");


        button.className =
            `category-btn ${
                activeCategory === category
                    ? "active"
                    : ""
            }`;


        button.textContent =
            category;


        button.addEventListener(
            "click",
            () => {

                activeCategory =
                    category;

                renderCategories();
                renderProducts();

            }
        );


        categoryTabs.appendChild(
            button
        );

    });

}


// ------------------------------------------------------
// 8. MOSTRAR PRODUCTOS
// ------------------------------------------------------

function renderProducts() {

    let filteredProducts;


    if (activeCategory === "Todos") {

        filteredProducts =
            products;

    } else {

        filteredProducts =
            products.filter(
                product =>
                    product.category ===
                    activeCategory
            );

    }


    if (filteredProducts.length === 0) {

        productsGrid.innerHTML = `
            <div
                class="empty-cart"
                style="grid-column:1/-1"
            >
                No hay productos disponibles.
            </div>
        `;

        return;

    }


    productsGrid.innerHTML =
        filteredProducts
        .map(product => `

            <article class="product-card">

                <div class="product-category">
                    ${product.category}
                </div>

                <h3>
                    ${product.name}
                </h3>

                <div class="price">
                    ${money(product.price)}
                </div>

                <div class="sample">

                    ${
                        product.sample
                        ? "Producto de prueba"
                        : "&nbsp;"
                    }

                </div>

                <button
                    class="add-btn"
                    onclick="addToCart(${product.id})"
                >
                    Agregar
                </button>

            </article>

        `)
        .join("");

}


// ------------------------------------------------------
// 9. AGREGAR PRODUCTOS AL PEDIDO
// ------------------------------------------------------

function addToCart(productId) {

    const product =
        products.find(
            product =>
                product.id === productId
        );


    if (!product) {
        return;
    }


    const existingItem =
        cart.find(
            item =>
                item.id === productId
        );


    if (existingItem) {

        existingItem.qty += 1;

    } else {

        cart.push({
            ...product,
            qty: 1
        });

    }


    renderCart();

}


// ------------------------------------------------------
// 10. CAMBIAR CANTIDAD
// ------------------------------------------------------

function changeQty(productId, amount) {

    const item =
        cart.find(
            item =>
                item.id === productId
        );


    if (!item) {
        return;
    }


    item.qty += amount;


    if (item.qty <= 0) {

        cart =
            cart.filter(
                item =>
                    item.id !== productId
            );

    }


    renderCart();

}


// ------------------------------------------------------
// 11. ELIMINAR PRODUCTO
// ------------------------------------------------------

function removeFromCart(productId) {

    cart =
        cart.filter(
            item =>
                item.id !== productId
        );


    renderCart();

}


// ------------------------------------------------------
// 12. MOSTRAR CARRITO
// ------------------------------------------------------

function renderCart() {

    if (cart.length === 0) {

        cartItems.innerHTML = `

            <div class="empty-cart">

                Tu pedido está vacío.

            </div>

        `;


        cartStatus.textContent =
            "Agrega productos para comenzar";


    } else {

        cartItems.innerHTML =
            cart
            .map(item => `

                <div class="cart-item">

                    <div class="cart-item-top">

                        <div class="cart-item-name">

                            ${item.name}

                        </div>


                        <div class="cart-item-price">

                            ${
                                money(
                                    item.price *
                                    item.qty
                                )
                            }

                        </div>

                    </div>


                    <div class="qty-row">

                        <div class="qty-controls">

                            <button
                                class="qty-btn"
                                onclick="
                                    changeQty(
                                        ${item.id},
                                        -1
                                    )
                                "
                            >
                                −
                            </button>


                            <strong>
                                ${item.qty}
                            </strong>


                            <button
                                class="qty-btn"
                                onclick="
                                    changeQty(
                                        ${item.id},
                                        1
                                    )
                                "
                            >
                                +
                            </button>

                        </div>


                        <button
                            class="remove-btn"
                            onclick="
                                removeFromCart(
                                    ${item.id}
                                )
                            "
                        >
                            Eliminar
                        </button>

                    </div>

                </div>

            `)
            .join("");


        const units =
            cart.reduce(
                (total, item) =>
                    total + item.qty,
                0
            );


        cartStatus.textContent =
            `${units} producto${
                units === 1
                    ? ""
                    : "s"
            } en la orden`;

    }


    const subtotal =
        cart.reduce(
            (total, item) =>
                total +
                item.price *
                item.qty,
            0
        );


    subtotalEl.textContent =
        money(subtotal);


    totalEl.textContent =
        money(subtotal);


    finishOrderBtn.disabled =
        cart.length === 0;

}


// ------------------------------------------------------
// 13. CALCULAR SIGUIENTE NÚMERO DE ORDEN
// ------------------------------------------------------

async function loadNextOrderNumber() {

    try {

        const rows =
            await supabaseFetch(

                "ordenes" +
                "?select=numero_orden" +
                "&order=numero_orden.desc" +
                "&limit=1"

            );


        if (
            rows &&
            rows.length > 0
        ) {

            nextOrderNumber =
                Number(
                    rows[0].numero_orden
                ) + 1;

        } else {

            nextOrderNumber = 1;

        }


        refreshOrderNumber();


    } catch (error) {

        console.error(
            "Error obteniendo número de orden:",
            error
        );


        nextOrderNumber = 1;

        refreshOrderNumber();

    }

}


// ------------------------------------------------------
// 14. MOSTRAR NÚMERO DE ORDEN
// ------------------------------------------------------

function refreshOrderNumber() {

    orderNumber.textContent =
        `#${
            String(
                nextOrderNumber
            ).padStart(
                3,
                "0"
            )
        }`;

}


// ------------------------------------------------------
// 15. FINALIZAR ORDEN
// ------------------------------------------------------

async function finalizeOrder() {

    if (cart.length === 0) {
        return;
    }


    finishOrderBtn.disabled = true;

    finishOrderBtn.textContent =
        "Guardando...";


    const total =
        cart.reduce(
            (sum, item) =>
                sum +
                item.price *
                item.qty,
            0
        );


    try {

        // --------------------------------------------
        // Crear orden principal
        // --------------------------------------------

        const createdOrders =
            await supabaseFetch(
                "ordenes",
                {

                    method: "POST",

                    headers: {

                        "Prefer":
                            "return=representation"

                    },

                    body:
                        JSON.stringify({

                            numero_orden:
                                nextOrderNumber,

                            total:
                                total,

                            metodo_pago:
                                paymentMethod.value,

                            estado:
                                "Finalizada"

                        })

                }
            );


        console.log(
            "Orden creada:",
            createdOrders
        );


        if (
            !createdOrders ||
            createdOrders.length === 0
        ) {

            throw new Error(
                "Supabase no devolvió la orden creada."
            );

        }


        const createdOrder =
            createdOrders[0];


        if (!createdOrder.id) {

            throw new Error(
                "No se obtuvo el ID de la orden."
            );

        }


        // --------------------------------------------
        // Crear detalle de orden
        // --------------------------------------------

        const details =
            cart.map(item => ({

                orden_id:
                    createdOrder.id,

                producto_id:
                    item.id,

                cantidad:
                    item.qty,

                precio_unitario:
                    item.price,

                subtotal:
                    item.price *
                    item.qty

            }));


        await supabaseFetch(
            "detalle_orden",
            {

                method:
                    "POST",

                headers: {

                    "Prefer":
                        "return=minimal"

                },

                body:
                    JSON.stringify(
                        details
                    )

            }
        );


        console.log(
            "Detalle guardado:",
            details
        );


        const completedNumber =
            nextOrderNumber;


        // Limpiar carrito
        cart = [];

        renderCart();


        showToast(

            `Orden #${
                String(
                    completedNumber
                ).padStart(
                    3,
                    "0"
                )
            } finalizada — ${money(total)}`

        );


        // Actualizar número e historial
        await loadNextOrderNumber();

        await renderHistory();


    } catch (error) {

        console.error(
            "Error guardando orden:",
            error
        );


        showToast(
            "No se pudo guardar la orden"
        );

    } finally {

        finishOrderBtn.textContent =
            "Finalizar orden";


        finishOrderBtn.disabled =
            cart.length === 0;

    }

}


// ------------------------------------------------------
// 16. CARGAR HISTORIAL DE SUPABASE
// ------------------------------------------------------

async function renderHistory() {

    historyBody.innerHTML = `

        <tr>

            <td
                colspan="5"
                style="
                    text-align:center;
                    color:#777;
                    padding:24px;
                "
            >

                Cargando historial...

            </td>

        </tr>

    `;


    try {

        const rows =
            await supabaseFetch(

                "ordenes" +

                "?select=" +

                "id," +
                "numero_orden," +
                "fecha," +
                "total," +
                "metodo_pago," +
                "estado," +
                "detalle_orden(" +
                    "cantidad," +
                    "productos(nombre)" +
                ")" +

                "&order=fecha.desc" +
                "&limit=50"

            );


        console.log(
            "Historial:",
            rows
        );


        if (
            !rows ||
            rows.length === 0
        ) {

            historyBody.innerHTML = `

                <tr>

                    <td
                        colspan="5"
                        style="
                            text-align:center;
                            color:#777;
                            padding:24px;
                        "
                    >

                        Todavía no hay órdenes finalizadas.

                    </td>

                </tr>

            `;

            return;

        }


        historyBody.innerHTML =
            rows
            .map(order => {

                const date =
                    new Date(
                        order.fecha
                    );


                const time =
                    date.toLocaleTimeString(
                        "es-EC",
                        {

                            hour:
                                "2-digit",

                            minute:
                                "2-digit"

                        }
                    );


                const itemText =
                    (
                        order.detalle_orden ||
                        []
                    )
                    .map(detail => {

                        const name =
                            detail.productos
                            ?.nombre ||
                            "Producto";


                        return (
                            `${detail.cantidad}× ${name}`
                        );

                    })
                    .join(", ");


                return `

                    <tr>

                        <td>

                            <strong>

                                #${
                                    String(
                                        order.numero_orden
                                    ).padStart(
                                        3,
                                        "0"
                                    )
                                }

                            </strong>

                        </td>


                        <td>

                            ${time}

                        </td>


                        <td>

                            ${
                                itemText ||
                                "Sin detalle"
                            }

                        </td>


                        <td>

                            ${order.metodo_pago}

                        </td>


                        <td>

                            <strong>

                                ${
                                    money(
                                        order.total
                                    )
                                }

                            </strong>

                        </td>

                    </tr>

                `;

            })
            .join("");


    } catch (error) {

        console.error(
            "Error cargando historial:",
            error
        );


        historyBody.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    style="
                        text-align:center;
                        color:#b33;
                        padding:24px;
                    "
                >

                    No se pudo cargar el historial.

                </td>

            </tr>

        `;

    }

}


// ------------------------------------------------------
// 17. MENSAJES
// ------------------------------------------------------

function showToast(message) {

    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    setTimeout(
        () => {

            toast.classList.remove(
                "show"
            );

        },
        2600
    );

}


// ------------------------------------------------------
// 18. BOTONES
// ------------------------------------------------------

clearCartBtn.addEventListener(
    "click",
    () => {

        cart = [];

        renderCart();

    }
);


finishOrderBtn.addEventListener(
    "click",
    finalizeOrder
);


// ------------------------------------------------------
// 19. HISTORIAL
// ------------------------------------------------------

// Por ahora no permitimos borrar ventas desde la web.
// Más adelante haremos un panel administrativo.

clearHistoryBtn.disabled = true;

clearHistoryBtn.textContent =
    "Historial online";

clearHistoryBtn.title =
    "Las ventas están guardadas en Supabase";


// ------------------------------------------------------
// 20. INICIAR SISTEMA
// ------------------------------------------------------

async function init() {

    console.log(
        "Iniciando DAKORI POS..."
    );


    // Revisar configuración

    if (
        SUPABASE_URL.includes(
            "PEGA_AQUI"
        ) ||
        SUPABASE_KEY.includes(
            "PEGA_AQUI"
        )
    ) {

        alert(
            "Debes configurar SUPABASE_URL y SUPABASE_KEY en app.js."
        );

        return;

    }


    renderCart();


    try {

        await loadProducts();

        await loadNextOrderNumber();

        await renderHistory();


        console.log(
            "DAKORI POS conectado correctamente."
        );


    } catch (error) {

        console.error(
            "Error iniciando DAKORI POS:",
            error
        );

    }

}


// ------------------------------------------------------
// INICIAR
// ------------------------------------------------------

init();