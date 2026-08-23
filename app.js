// ======================================================
// DAKORI POS
// Productos + carrito + órdenes + historial + stock
// ======================================================


// ------------------------------------------------------
// 1. CONFIGURACIÓN SUPABASE
// ------------------------------------------------------

const SUPABASE_URL = "https://cveyhhgcljyxibqtgost.supabase.co";
const SUPABASE_KEY = "sb_publishable_-8M32lNeLrCzFfLq319C8Q_bmZnBVB-";


// ------------------------------------------------------
// 2. ESTADO DE LA APP
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
// 4. UTILIDADES
// ------------------------------------------------------

function money(value) {
    return `$${Number(value).toFixed(2)}`;
}


function apiHeaders(extraHeaders = {}) {

    return {
        apikey: SUPABASE_KEY,
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
// 5. CARGAR PRODUCTOS
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
            "?select=id,nombre,categoria,precio,activo,es_prueba,stock" +
            "&activo=eq.true" +
            "&order=id.asc"
        );

        products = (data || []).map(product => ({

            id: Number(product.id),

            name: product.nombre,

            category: product.categoria,

            price: Number(product.precio),

            sample: Boolean(product.es_prueba),

            stock: Number(product.stock ?? 0)

        }));

        console.log(
            "Productos cargados con stock:",
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
            </div>
        `;

        showToast(
            "Error al cargar productos"
        );
    }
}


// ------------------------------------------------------
// 6. CATEGORÍAS
// ------------------------------------------------------

function renderCategories() {

    const categories = [

        "Todos",

        ...new Set(
            products.map(
                product =>
                    product.category
            )
        )

    ];


    categoryTabs.innerHTML = "";


    categories.forEach(category => {

        const button =
            document.createElement(
                "button"
            );


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
// 7. MOSTRAR PRODUCTOS
// ------------------------------------------------------

function renderProducts() {

    const filteredProducts =
        activeCategory === "Todos"

        ? products

        : products.filter(
            product =>
                product.category ===
                activeCategory
        );


    if (
        filteredProducts.length === 0
    ) {

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
        .map(product => {

            const stockText =
                product.stock === 0
                ? "Agotado"
                : `Stock: ${product.stock}`;


            return `

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
                                : ""
                        }

                    </div>


                    <div
                        style="
                            margin:8px 0 12px;
                            font-weight:700;
                            color:${
                                product.stock === 0
                                    ? "#b33"
                                    : "#17304b"
                            };
                        "
                    >
                        ${stockText}
                    </div>


                    ${
                        product.stock > 0

                        ? `

                            <button
                                class="add-btn"
                                onclick="
                                    addToCart(
                                        ${product.id}
                                    )
                                "
                            >
                                Agregar
                            </button>

                          `

                        : `

                            <button
                                class="add-btn"
                                disabled
                                style="
                                    opacity:.4;
                                    cursor:not-allowed;
                                "
                            >
                                AGOTADO
                            </button>

                          `
                    }

                </article>

            `;

        })
        .join("");

}


// ------------------------------------------------------
// 8. AGREGAR AL CARRITO
// ------------------------------------------------------

function addToCart(productId) {

    const product =
        products.find(
            product =>
                product.id ===
                productId
        );


    if (!product) {
        return;
    }


    if (product.stock <= 0) {

        showToast(
            "Producto agotado"
        );

        return;

    }


    const existingItem =
        cart.find(
            item =>
                item.id ===
                productId
        );


    const currentQty =
        existingItem
            ? existingItem.qty
            : 0;


    if (
        currentQty >=
        product.stock
    ) {

        showToast(
            `Solo quedan ${product.stock} unidades`
        );

        return;

    }


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
// 9. CAMBIAR CANTIDAD
// ------------------------------------------------------

function changeQty(
    productId,
    amount
) {

    const item =
        cart.find(
            item =>
                item.id ===
                productId
        );


    if (!item) {
        return;
    }


    if (
        amount > 0 &&
        item.qty >= item.stock
    ) {

        showToast(
            `Solo quedan ${item.stock} unidades`
        );

        return;

    }


    item.qty += amount;


    if (item.qty <= 0) {

        cart =
            cart.filter(
                item =>
                    item.id !==
                    productId
            );

    }


    renderCart();

}


// ------------------------------------------------------
// 10. ELIMINAR DEL CARRITO
// ------------------------------------------------------

function removeFromCart(
    productId
) {

    cart =
        cart.filter(
            item =>
                item.id !==
                productId
        );


    renderCart();

}


// ------------------------------------------------------
// 11. MOSTRAR CARRITO
// ------------------------------------------------------

function renderCart() {

    if (
        cart.length === 0
    ) {

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


                    <div
                        style="
                            margin-top:8px;
                            font-size:.8rem;
                            color:#777;
                        "
                    >
                        Disponible:
                        ${item.stock}
                    </div>

                </div>

            `)
            .join("");


        const units =
            cart.reduce(
                (total, item) =>
                    total +
                    item.qty,
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
// 12. NÚMERO DE ORDEN
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
                    rows[0]
                    .numero_orden
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
// 13. VALIDAR STOCK ANTES DE VENDER
// ------------------------------------------------------

async function validateStock() {

    const ids =
        cart.map(
            item =>
                item.id
        );


    if (
        ids.length === 0
    ) {
        return true;
    }


    const idsFilter =
        ids.join(",");


    const currentProducts =
        await supabaseFetch(

            `productos?select=id,nombre,stock&id=in.(${idsFilter})`

        );


    for (
        const item of cart
    ) {

        const current =
            currentProducts.find(
                product =>
                    Number(product.id) ===
                    item.id
            );


        if (!current) {

            throw new Error(
                `Producto no encontrado: ${item.name}`
            );

        }


        if (
            Number(current.stock) <
            item.qty
        ) {

            throw new Error(
                `Stock insuficiente para ${item.name}. Disponible: ${current.stock}`
            );

        }

    }


    return true;

}


// ------------------------------------------------------
// 14. DESCONTAR STOCK
// ------------------------------------------------------

async function discountStock(
    productId,
    quantity
) {

    const response =
        await fetch(

            `${SUPABASE_URL}/rest/v1/rpc/descontar_stock`,

            {

                method:
                    "POST",

                headers: {

                    apikey:
                        SUPABASE_KEY,

                    "Content-Type":
                        "application/json"

                },

                body:
                    JSON.stringify({

                        p_producto_id:
                            productId,

                        p_cantidad:
                            quantity

                    })

            }

        );


    if (!response.ok) {

        const errorText =
            await response.text();


        console.error(
            "Error descontando stock:",
            errorText
        );


        throw new Error(
            errorText
        );

    }

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
        "Procesando...";


    try {

        const detalles =
            cart.map(item => ({

                producto_id:
                    item.id,

                cantidad:
                    item.qty

            }));


        const response =
            await fetch(

                `${SUPABASE_URL}/rest/v1/rpc/crear_orden`,

                {

                    method:
                        "POST",

                    headers: {

                        apikey:
                            SUPABASE_KEY,

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            p_metodo_pago:
                                paymentMethod.value,

                            p_detalles:
                                detalles

                        })

                }

            );


        const responseText =
            await response.text();


        if (!response.ok) {

            console.error(
                "Error creando orden:",
                responseText
            );


            let mensaje =
                "No se pudo finalizar la orden";


            try {

                const error =
                    JSON.parse(
                        responseText
                    );


                if (error.message) {
                    mensaje =
                        error.message;
                }

            } catch {
                // Mantener mensaje general
            }


            showToast(
                mensaje
            );


            await loadProducts();

            return;

        }


        const result =
            JSON.parse(
                responseText
            );


        console.log(
            "Orden registrada:",
            result
        );


        const numero =
            result.numero_orden;


        const total =
            Number(
                result.total
            );


        // Limpiar carrito
        cart = [];


        renderCart();


        showToast(

            `Orden #${
                String(
                    numero
                ).padStart(
                    3,
                    "0"
                )
            } finalizada — ${money(total)}`

        );


        // Actualizar productos, stock e historial
        await loadProducts();

        await loadNextOrderNumber();

        await renderHistory();


    } catch (error) {

        console.error(
            "Error inesperado:",
            error
        );


        showToast(
            "No se pudo finalizar la orden"
        );


        await loadProducts();

    } finally {

        finishOrderBtn.textContent =
            "Finalizar orden";


        finishOrderBtn.disabled =
            cart.length === 0;

    }

}


// ------------------------------------------------------
// 16. HISTORIAL
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
                            detail
                            .productos
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
        3000
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
// 19. HISTORIAL ONLINE
// ------------------------------------------------------

clearHistoryBtn.disabled = true;

clearHistoryBtn.textContent =
    "Historial online";

clearHistoryBtn.title =
    "Las ventas están guardadas en Supabase";


// ------------------------------------------------------
// 20. INICIAR APP
// ------------------------------------------------------

async function init() {

    if (
        SUPABASE_URL.includes(
            "PEGA_AQUI"
        ) ||
        SUPABASE_KEY.includes(
            "PEGA_AQUI"
        )
    ) {

        alert(
            "Configura SUPABASE_URL y SUPABASE_KEY en app.js."
        );

        return;

    }


    renderCart();


    try {

        await loadProducts();

        await loadNextOrderNumber();

        await renderHistory();


        console.log(
            "DAKORI POS iniciado correctamente."
        );


    } catch (error) {

        console.error(
            "Error iniciando DAKORI POS:",
            error
        );

    }

}


init();