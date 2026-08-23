// ======================================================
// DAKORI POS
// Pedidos + inventario + pago + cocina
// ======================================================


// ======================================================
// SUPABASE
// ======================================================

const SUPABASE_URL =
    "https://cveyhhgcljyxibqtgost.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_-8M32lNeLrCzFfLq319C8Q_bmZnBVB-";


// ======================================================
// ESTADO
// ======================================================

let products = [];

let activeCategory =
    "Todos";

let cart = [];

let nextOrderNumber =
    1;


// ======================================================
// ELEMENTOS
// ======================================================

const categoryTabs =
    document.getElementById(
        "categoryTabs"
    );


const productsGrid =
    document.getElementById(
        "productsGrid"
    );


const cartItems =
    document.getElementById(
        "cartItems"
    );


const subtotalEl =
    document.getElementById(
        "subtotal"
    );


const totalEl =
    document.getElementById(
        "total"
    );


const cartStatus =
    document.getElementById(
        "cartStatus"
    );


const finishOrderBtn =
    document.getElementById(
        "finishOrderBtn"
    );


const clearCartBtn =
    document.getElementById(
        "clearCartBtn"
    );


const paymentMoment =
    document.getElementById(
        "paymentMoment"
    );


const paymentMethod =
    document.getElementById(
        "paymentMethod"
    );


const paymentMethodContainer =
    document.getElementById(
        "paymentMethodContainer"
    );


const orderNumber =
    document.getElementById(
        "orderNumber"
    );


const historyBody =
    document.getElementById(
        "historyBody"
    );


const clearHistoryBtn =
    document.getElementById(
        "clearHistoryBtn"
    );


const toast =
    document.getElementById(
        "toast"
    );


// ======================================================
// UTILIDADES
// ======================================================

function money(value) {

    return `$${Number(value || 0).toFixed(2)}`;

}


function apiHeaders(
    extra = {}
) {

    return {

        apikey:
            SUPABASE_KEY,

        "Content-Type":
            "application/json",

        ...extra

    };

}


async function supabaseFetch(
    path,
    options = {}
) {

    const response =
        await fetch(

            `${SUPABASE_URL}/rest/v1/${path}`,

            {

                ...options,

                headers:
                    apiHeaders(
                        options.headers ||
                        {}
                    )

            }

        );


    if (!response.ok) {

        const errorText =
            await response.text();


        console.error(
            "Supabase:",
            response.status,
            errorText
        );


        throw new Error(
            errorText
        );

    }


    const text =
        await response.text();


    return text
        ? JSON.parse(text)
        : null;

}


// ======================================================
// INTERFAZ DE PAGO
// ======================================================

function updatePaymentUI() {

    if (
        paymentMoment.value ===
        "Después"
    ) {

        paymentMethodContainer
        .style
        .display =
            "none";

    } else {

        paymentMethodContainer
        .style
        .display =
            "block";

    }

}


paymentMoment
.addEventListener(
    "change",
    updatePaymentUI
);


updatePaymentUI();


// ======================================================
// PRODUCTOS
// ======================================================

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

        const data =
            await supabaseFetch(

                "productos" +

                "?select=" +

                "id," +
                "nombre," +
                "categoria," +
                "precio," +
                "activo," +
                "es_prueba," +
                "stock" +

                "&activo=eq.true" +

                "&order=id.asc"

            );


        products =
            (data || [])
            .map(
                product => ({

                    id:
                        Number(
                            product.id
                        ),

                    name:
                        product.nombre,

                    category:
                        product.categoria,

                    price:
                        Number(
                            product.precio
                        ),

                    sample:
                        Boolean(
                            product.es_prueba
                        ),

                    stock:
                        Number(
                            product.stock ??
                            0
                        )

                })
            );


        renderCategories();

        renderProducts();


    } catch (error) {

        console.error(
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

    }

}


// ======================================================
// CATEGORÍAS
// ======================================================

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


    categoryTabs.innerHTML =
        "";


    categories.forEach(
        category => {

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


            categoryTabs
            .appendChild(
                button
            );

        }
    );

}


// ======================================================
// RENDER PRODUCTOS
// ======================================================

function renderProducts() {

    const filtered =
        activeCategory === "Todos"

        ? products

        : products.filter(
            product =>
                product.category ===
                activeCategory
        );


    productsGrid.innerHTML =
        filtered
        .map(
            product => `

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

                        ${
                            product.stock === 0

                                ? "AGOTADO"

                                : `Stock: ${product.stock}`
                        }

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
                                >
                                    AGOTADO
                                </button>

                              `
                    }


                </article>

            `
        )
        .join("");

}


// ======================================================
// CARRITO
// ======================================================

function addToCart(
    productId
) {

    const product =
        products.find(
            product =>
                product.id ===
                productId
        );


    if (!product) {
        return;
    }


    const existing =
        cart.find(
            item =>
                item.id ===
                productId
        );


    const currentQty =
        existing
            ? existing.qty
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


    if (existing) {

        existing.qty += 1;

    } else {

        cart.push({

            ...product,

            qty: 1

        });

    }


    renderCart();

}


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
        item.qty >=
        item.stock
    ) {

        showToast(
            `Solo quedan ${item.stock} unidades`
        );

        return;

    }


    item.qty +=
        amount;


    if (
        item.qty <= 0
    ) {

        cart =
            cart.filter(
                item =>
                    item.id !==
                    productId
            );

    }


    renderCart();

}


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


// ======================================================
// RENDER CARRITO
// ======================================================

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
            .map(
                item => `

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

                `
            )
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


    const total =
        cart.reduce(

            (sum, item) =>
                sum +
                item.price *
                item.qty,

            0

        );


    subtotalEl.textContent =
        money(total);


    totalEl.textContent =
        money(total);


    finishOrderBtn.disabled =
        cart.length === 0;

}


// ======================================================
// SIGUIENTE ORDEN
// ======================================================

async function loadNextOrderNumber() {

    try {

        const rows =
            await supabaseFetch(

                "ordenes" +
                "?select=numero_orden" +
                "&order=numero_orden.desc" +
                "&limit=1"

            );


        nextOrderNumber =
            rows &&
            rows.length

                ? Number(
                    rows[0]
                    .numero_orden
                ) + 1

                : 1;


        refreshOrderNumber();


    } catch (error) {

        console.error(
            error
        );

    }

}


function refreshOrderNumber() {

    orderNumber.textContent =
        `#${
            String(
                nextOrderNumber
            )
            .padStart(
                3,
                "0"
            )
        }`;

}


// ======================================================
// FINALIZAR PEDIDO
// ======================================================

async function finalizeOrder() {

    if (
        cart.length === 0
    ) {

        return;

    }


    finishOrderBtn.disabled =
        true;


    finishOrderBtn.textContent =
        "Registrando pedido...";


    try {

        const detalles =
            cart.map(
                item => ({

                    producto_id:
                        item.id,

                    cantidad:
                        item.qty

                })
            );


        const momentoPago =
            paymentMoment.value;


        const metodoPago =
            momentoPago ===
            "Antes"

                ? paymentMethod.value

                : null;


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

                            p_momento_pago:
                                momentoPago,

                            p_metodo_pago:
                                metodoPago,

                            p_detalles:
                                detalles

                        })

                }

            );


        const text =
            await response.text();


        if (!response.ok) {

            console.error(
                text
            );


            let message =
                "No se pudo registrar el pedido";


            try {

                const error =
                    JSON.parse(
                        text
                    );


                if (
                    error.message
                ) {

                    message =
                        error.message;

                }

            } catch {}


            showToast(
                message
            );


            await loadProducts();


            return;

        }


        const result =
            JSON.parse(
                text
            );


        const numero =
            result.numero_orden;


        const total =
            Number(
                result.total
            );


        const estadoPago =
            result.estado_pago;


        cart = [];


        renderCart();


        const pagoTexto =
            estadoPago ===
            "Pagado"

                ? "PAGADO"

                : "PAGO PENDIENTE";


        showToast(

            `Pedido #${
                String(
                    numero
                )
                .padStart(
                    3,
                    "0"
                )
            } · ${pagoTexto} · ${money(total)}`

        );


        await Promise.all([

            loadProducts(),

            loadNextOrderNumber(),

            renderHistory()

        ]);


    } catch (error) {

        console.error(
            error
        );


        showToast(
            "No se pudo registrar el pedido"
        );


    } finally {

        finishOrderBtn.textContent =
            "Registrar pedido";


        finishOrderBtn.disabled =
            cart.length === 0;

    }

}


// ======================================================
// HISTORIAL
// ======================================================

async function renderHistory() {

    try {

        const rows =
            await supabaseFetch(

                "ordenes" +

                "?select=" +

                "id," +
                "numero_orden," +
                "fecha," +
                "total," +
                "estado," +
                "estado_pago," +
                "metodo_pago," +

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
                        colspan="6"
                        style="
                            text-align:center;
                            padding:24px;
                        "
                    >

                        Todavía no existen pedidos.

                    </td>

                </tr>

            `;


            return;

        }


        historyBody.innerHTML =
            rows
            .map(
                order => {


                    const time =
                        new Date(
                            order.fecha
                        )
                        .toLocaleTimeString(
                            "es-EC",
                            {

                                hour:
                                    "2-digit",

                                minute:
                                    "2-digit"

                            }
                        );


                    const items =
                        (
                            order.detalle_orden ||
                            []
                        )
                        .map(
                            detail => {

                                const name =
                                    detail
                                    .productos
                                    ?.nombre ||
                                    "Producto";


                                return (
                                    `${detail.cantidad}× ${name}`
                                );

                            }
                        )
                        .join(", ");


                    return `

                        <tr>


                            <td>

                                <strong>

                                    #${
                                        String(
                                            order.numero_orden
                                        )
                                        .padStart(
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
                                ${items}
                            </td>


                            <td>
                                ${order.estado}
                            </td>


                            <td>

                                ${
                                    order.estado_pago ===
                                    "Pagado"

                                        ? "Pagado"

                                        : "Pendiente"
                                }

                            </td>


                            <td>

                                <strong>

                                    ${money(
                                        order.total
                                    )}

                                </strong>

                            </td>


                        </tr>

                    `;

                }
            )
            .join("");


    } catch (error) {

        console.error(
            error
        );

    }

}


// ======================================================
// MENSAJE
// ======================================================

function showToast(
    message
) {

    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    setTimeout(
        () => {

            toast
            .classList
            .remove(
                "show"
            );

        },

        3000

    );

}


// ======================================================
// EVENTOS
// ======================================================

clearCartBtn
.addEventListener(
    "click",
    () => {

        cart = [];

        renderCart();

    }
);


finishOrderBtn
.addEventListener(
    "click",
    finalizeOrder
);


// ======================================================
// INICIO
// ======================================================

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
            "Configura Supabase en app.js."
        );

        return;

    }


    renderCart();


    await Promise.all([

        loadProducts(),

        loadNextOrderNumber(),

        renderHistory()

    ]);

}


init();