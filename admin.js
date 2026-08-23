// ======================================================
// DAKORI ADMIN
// Login + inventario + productos + ventas + caja
// ======================================================


// ======================================================
// CONFIGURACIÓN SUPABASE
// ======================================================

const SUPABASE_URL =
    "https://cveyhhgcljyxibqtgost.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_-8M32lNeLrCzFfLq319C8Q_bmZnBVB-";


// ======================================================
// SESIÓN
// ======================================================

function getStoredSession() {

    try {

        return JSON.parse(
            localStorage.getItem(
                "dakori_admin_session"
            )
        );

    } catch {

        return null;

    }

}


// ======================================================
// RENOVAR SESIÓN
// ======================================================

async function refreshSession() {

    const session =
        getStoredSession();


    if (
        !session ||
        !session.refresh_token
    ) {

        return false;

    }


    try {

        const response =
            await fetch(

                `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,

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

                            refresh_token:
                                session.refresh_token

                        })

                }

            );


        if (!response.ok) {

            return false;

        }


        const data =
            await response.json();


        const newSession = {

            access_token:
                data.access_token,

            refresh_token:
                data.refresh_token,

            expires_at:
                Date.now() +
                (
                    Number(
                        data.expires_in
                    ) * 1000
                ),

            user:
                data.user

        };


        localStorage.setItem(

            "dakori_admin_session",

            JSON.stringify(
                newSession
            )

        );


        return true;


    } catch (error) {

        console.error(
            "Error renovando sesión:",
            error
        );


        return false;

    }

}


// ======================================================
// LOGOUT
// ======================================================

function logout() {

    localStorage.removeItem(
        "dakori_admin_session"
    );


    window.location.href =
        "login.html";

}


// ======================================================
// VALIDAR SESIÓN
// ======================================================

async function requireAdminSession() {

    let session =
        getStoredSession();


    if (
        !session ||
        !session.access_token
    ) {

        window.location.href =
            "login.html";

        return false;

    }


    if (
        session.expires_at &&
        Date.now() >
        session.expires_at -
        120000
    ) {

        const refreshed =
            await refreshSession();


        if (!refreshed) {

            logout();

            return false;

        }


        session =
            getStoredSession();

    }


    try {

        const response =
            await fetch(

                `${SUPABASE_URL}/auth/v1/user`,

                {

                    headers: {

                        apikey:
                            SUPABASE_KEY,

                        Authorization:
                            `Bearer ${session.access_token}`

                    }

                }

            );


        if (!response.ok) {

            const refreshed =
                await refreshSession();


            if (!refreshed) {

                logout();

                return false;

            }


            session =
                getStoredSession();

        }


        if (
            session.user &&
            session.user.email
        ) {

            document
            .getElementById(
                "adminUser"
            )
            .textContent =
                session.user.email;

        }


        return true;


    } catch (error) {

        console.error(
            "Error validando sesión:",
            error
        );


        logout();

        return false;

    }

}


// ======================================================
// HEADERS
// ======================================================

function headers(extra = {}) {

    const session =
        getStoredSession();


    return {

        apikey:
            SUPABASE_KEY,

        Authorization:
            session
                ? `Bearer ${session.access_token}`
                : "",

        "Content-Type":
            "application/json",

        ...extra

    };

}


// ======================================================
// API
// ======================================================

async function api(
    path,
    options = {}
) {

    let response =
        await fetch(

            `${SUPABASE_URL}/rest/v1/${path}`,

            {

                ...options,

                headers:
                    headers(
                        options.headers ||
                        {}
                    )

            }

        );


    if (
        response.status === 401
    ) {

        const refreshed =
            await refreshSession();


        if (refreshed) {

            response =
                await fetch(

                    `${SUPABASE_URL}/rest/v1/${path}`,

                    {

                        ...options,

                        headers:
                            headers(
                                options.headers ||
                                {}
                            )

                    }

                );

        }

    }


    if (!response.ok) {

        const text =
            await response.text();


        console.error(
            "Supabase error:",
            response.status,
            text
        );


        throw new Error(
            `Error ${response.status}: ${text}`
        );

    }


    const text =
        await response.text();


    if (!text) {

        return null;

    }


    return JSON.parse(
        text
    );

}


// ======================================================
// UTILIDADES
// ======================================================

function money(value) {

    return `$${Number(value || 0).toFixed(2)}`;

}


function getStockClass(stock) {

    if (stock === 0) {

        return "stock-zero";

    }


    if (stock <= 5) {

        return "stock-low";

    }


    return "";

}


function escapeHtml(value) {

    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


function categoryOption(
    category,
    selected
) {

    return `

        <option
            value="${category}"
            ${
                category === selected
                    ? "selected"
                    : ""
            }
        >
            ${category}
        </option>

    `;

}


// ======================================================
// PRODUCTOS
// ======================================================

async function loadProducts() {

    const products =
        await api(

            "productos" +
            "?select=*" +
            "&order=id.asc"

        );


    const container =
        document.getElementById(
            "adminProducts"
        );


    const activeCount =
        products.filter(
            product =>
                product.activo
        ).length;


    document
    .getElementById(
        "activeProducts"
    )
    .textContent =
        activeCount;


    const totalStock =
        products.reduce(

            (total, product) =>
                total +
                Number(
                    product.stock ||
                    0
                ),

            0

        );


    document
    .getElementById(
        "totalStock"
    )
    .textContent =
        totalStock;


    if (
        products.length === 0
    ) {

        container.innerHTML =
            "<p>No hay productos registrados.</p>";

        return;

    }


    container.innerHTML =
        products
        .map(product => {

            const stock =
                Number(
                    product.stock ||
                    0
                );


            const encodedName =
                encodeURIComponent(
                    product.nombre
                );


            return `

                <div class="product-row">


                    <input
                        id="name-${product.id}"
                        value="${escapeHtml(product.nombre)}"
                    >


                    <select
                        id="category-${product.id}"
                    >

                        ${categoryOption(
                            "Chicken",
                            product.categoria
                        )}

                        ${categoryOption(
                            "Ramen",
                            product.categoria
                        )}

                        ${categoryOption(
                            "Bebidas",
                            product.categoria
                        )}

                        ${categoryOption(
                            "Snacks",
                            product.categoria
                        )}

                    </select>


                    <input
                        id="price-${product.id}"
                        type="number"
                        min="0"
                        step="0.01"
                        value="${product.precio}"
                    >


                    <input
                        id="stock-${product.id}"
                        type="number"
                        min="0"
                        step="1"
                        class="${getStockClass(stock)}"
                        value="${stock}"
                    >


                    <span
                        class="${
                            product.activo
                                ? "status-active"
                                : "status-inactive"
                        }"
                    >

                        ${
                            product.activo
                                ? "Activo"
                                : "Inactivo"
                        }

                    </span>


                    <div class="actions">


                        <button
                            class="admin-btn secondary"
                            onclick="
                                saveProduct(
                                    ${product.id}
                                )
                            "
                        >
                            Guardar
                        </button>


                        <button
                            class="admin-btn warning"
                            onclick="
                                toggleProduct(
                                    ${product.id},
                                    ${product.activo}
                                )
                            "
                        >

                            ${
                                product.activo
                                    ? "Desactivar"
                                    : "Activar"
                            }

                        </button>


                        <button
                            class="admin-btn danger"
                            onclick="
                                deleteProduct(
                                    ${product.id},
                                    '${encodedName}'
                                )
                            "
                        >
                            Eliminar
                        </button>


                    </div>


                </div>

            `;

        })
        .join("");

}


// ======================================================
// GUARDAR PRODUCTO
// ======================================================

async function saveProduct(id) {

    const nombre =
        document
        .getElementById(
            `name-${id}`
        )
        .value
        .trim();


    const categoria =
        document
        .getElementById(
            `category-${id}`
        )
        .value;


    const precio =
        Number(
            document
            .getElementById(
                `price-${id}`
            )
            .value
        );


    const stock =
        Number(
            document
            .getElementById(
                `stock-${id}`
            )
            .value
        );


    if (!nombre) {

        alert(
            "El producto debe tener nombre."
        );

        return;

    }


    if (
        Number.isNaN(precio) ||
        precio < 0
    ) {

        alert(
            "Precio inválido."
        );

        return;

    }


    if (
        !Number.isInteger(stock) ||
        stock < 0
    ) {

        alert(
            "Stock inválido."
        );

        return;

    }


    try {

        await api(

            `productos?id=eq.${id}`,

            {

                method:
                    "PATCH",

                headers: {

                    Prefer:
                        "return=minimal"

                },

                body:
                    JSON.stringify({

                        nombre,
                        categoria,
                        precio,
                        stock

                    })

            }

        );


        alert(
            "Producto actualizado."
        );


        await loadProducts();


    } catch (error) {

        console.error(
            error
        );


        alert(
            "No se pudo actualizar."
        );

    }

}


// ======================================================
// ACTIVAR / DESACTIVAR
// ======================================================

async function toggleProduct(
    id,
    currentStatus
) {

    try {

        await api(

            `productos?id=eq.${id}`,

            {

                method:
                    "PATCH",

                headers: {

                    Prefer:
                        "return=minimal"

                },

                body:
                    JSON.stringify({

                        activo:
                            !currentStatus

                    })

            }

        );


        await loadProducts();


    } catch (error) {

        console.error(
            error
        );


        alert(
            "No se pudo cambiar el estado."
        );

    }

}


// ======================================================
// ELIMINAR PRODUCTO
// ======================================================

async function deleteProduct(
    id,
    encodedName
) {

    const nombre =
        decodeURIComponent(
            encodedName
        );


    const confirmed =
        confirm(

            `¿Eliminar "${nombre}"?\n\n` +

            `Esta acción no se puede deshacer.`

        );


    if (!confirmed) {

        return;

    }


    try {

        await api(

            `productos?id=eq.${id}`,

            {

                method:
                    "DELETE",

                headers: {

                    Prefer:
                        "return=minimal"

                }

            }

        );


        alert(
            "Producto eliminado."
        );


        await loadProducts();


    } catch (error) {

        console.error(
            error
        );


        alert(

            "No se pudo eliminar.\n\n" +

            "Si tiene ventas asociadas, utiliza Desactivar."

        );

    }

}


// ======================================================
// AGREGAR PRODUCTO
// ======================================================

async function addProduct() {

    const nombre =
        document
        .getElementById(
            "newName"
        )
        .value
        .trim();


    const categoria =
        document
        .getElementById(
            "newCategory"
        )
        .value;


    const precio =
        Number(
            document
            .getElementById(
                "newPrice"
            )
            .value
        );


    const stock =
        Number(
            document
            .getElementById(
                "newStock"
            )
            .value
        );


    const sample =
        document
        .getElementById(
            "newSample"
        )
        .value === "true";


    const activo =
        document
        .getElementById(
            "newActive"
        )
        .value === "true";


    if (!nombre) {

        alert(
            "Ingresa el nombre."
        );

        return;

    }


    if (
        Number.isNaN(precio) ||
        precio < 0
    ) {

        alert(
            "Ingresa un precio válido."
        );

        return;

    }


    if (
        !Number.isInteger(stock) ||
        stock < 0
    ) {

        alert(
            "Ingresa un stock válido."
        );

        return;

    }


    try {

        await api(

            "productos",

            {

                method:
                    "POST",

                headers: {

                    Prefer:
                        "return=minimal"

                },

                body:
                    JSON.stringify({

                        nombre,
                        categoria,
                        precio,
                        stock,
                        activo,

                        es_prueba:
                            sample

                    })

            }

        );


        document
        .getElementById(
            "newName"
        )
        .value = "";


        document
        .getElementById(
            "newPrice"
        )
        .value = "";


        document
        .getElementById(
            "newStock"
        )
        .value = "0";


        document
        .getElementById(
            "newSample"
        )
        .value = "false";


        document
        .getElementById(
            "newActive"
        )
        .value = "true";


        alert(
            "Producto agregado."
        );


        await loadProducts();


    } catch (error) {

        console.error(
            error
        );


        alert(
            "No se pudo agregar el producto."
        );

    }

}


// ======================================================
// HISTORIAL GENERAL DE ÓRDENES
// ======================================================

async function loadOrders() {

    const orders =
        await api(

            "ordenes" +
            "?select=*" +
            "&order=fecha.desc" +
            "&limit=50"

        );


    document
    .getElementById(
        "totalOrders"
    )
    .textContent =
        orders.length;


    const total =
        orders.reduce(

            (sum, order) =>
                sum +
                Number(
                    order.total
                ),

            0

        );


    document
    .getElementById(
        "totalSales"
    )
    .textContent =
        money(total);


    const body =
        document.getElementById(
            "adminOrders"
        );


    if (
        orders.length === 0
    ) {

        body.innerHTML = `

            <tr>

                <td
                    colspan="4"
                    style="
                        text-align:center;
                        padding:24px;
                        color:#777;
                    "
                >
                    Todavía no hay órdenes.
                </td>

            </tr>

        `;

        return;

    }


    body.innerHTML =
        orders
        .map(order => {

            const fecha =
                new Date(
                    order.fecha
                )
                .toLocaleString(
                    "es-EC"
                );


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
                        ${fecha}
                    </td>

                    <td>
                        ${order.metodo_pago}
                    </td>

                    <td>

                        <strong>
                            ${money(order.total)}
                        </strong>

                    </td>

                </tr>

            `;

        })
        .join("");

}


// ======================================================
// CAJA DEL DÍA
// ======================================================

async function loadDailyCash() {

    const now =
        new Date();


    const start =
        new Date(

            now.getFullYear(),
            now.getMonth(),
            now.getDate(),

            0,
            0,
            0,
            0

        );


    const end =
        new Date(

            now.getFullYear(),
            now.getMonth(),
            now.getDate(),

            23,
            59,
            59,
            999

        );


    const orders =
        await api(

            "ordenes" +

            "?select=" +

            "id," +
            "numero_orden," +
            "fecha," +
            "total," +
            "metodo_pago," +

            "detalle_orden(" +
                "cantidad," +
                "producto_id," +
                "productos(nombre)" +
            ")" +

            `&fecha=gte.${encodeURIComponent(
                start.toISOString()
            )}` +

            `&fecha=lte.${encodeURIComponent(
                end.toISOString()
            )}` +

            "&order=fecha.desc"

        );


    const totalOrders =
        orders.length;


    const totalSales =
        orders.reduce(

            (sum, order) =>
                sum +
                Number(
                    order.total
                ),

            0

        );


    const cash =
        orders

        .filter(
            order =>
                order.metodo_pago ===
                "Efectivo"
        )

        .reduce(

            (sum, order) =>
                sum +
                Number(
                    order.total
                ),

            0

        );


    const transfer =
        orders

        .filter(
            order =>
                order.metodo_pago ===
                "Transferencia"
        )

        .reduce(

            (sum, order) =>
                sum +
                Number(
                    order.total
                ),

            0

        );


    const card =
        orders

        .filter(
            order =>
                order.metodo_pago ===
                "Tarjeta"
        )

        .reduce(

            (sum, order) =>
                sum +
                Number(
                    order.total
                ),

            0

        );


    document
    .getElementById(
        "todayOrders"
    )
    .textContent =
        totalOrders;


    document
    .getElementById(
        "todayTotal"
    )
    .textContent =
        money(
            totalSales
        );


    document
    .getElementById(
        "todayCash"
    )
    .textContent =
        money(
            cash
        );


    document
    .getElementById(
        "todayTransfer"
    )
    .textContent =
        money(
            transfer
        );


    document
    .getElementById(
        "todayCard"
    )
    .textContent =
        money(
            card
        );


    renderTopProducts(
        orders
    );


    return {

        totalOrders,
        totalSales,
        cash,
        transfer,
        card

    };

}


// ======================================================
// PRODUCTOS MÁS VENDIDOS
// ======================================================

function renderTopProducts(
    orders
) {

    const totals = {};


    orders.forEach(
        order => {

            (
                order.detalle_orden ||
                []
            )
            .forEach(
                detail => {

                    const name =
                        detail
                        .productos
                        ?.nombre ||
                        "Producto";


                    if (!totals[name]) {

                        totals[name] = 0;

                    }


                    totals[name] +=
                        Number(
                            detail.cantidad
                        );

                }
            );

        }
    );


    const ranking =
        Object.entries(
            totals
        )

        .sort(
            (a, b) =>
                b[1] - a[1]
        )

        .slice(
            0,
            5
        );


    const container =
        document.getElementById(
            "topProducts"
        );


    if (
        ranking.length === 0
    ) {

        container.innerHTML =
            "<p>No hay ventas registradas hoy.</p>";

        return;

    }


    container.innerHTML =
        ranking
        .map(
            (
                [name, qty],
                index
            ) => `

                <div class="ranking-row">

                    <div>

                        <span class="ranking-number">
                            ${index + 1}
                        </span>

                        ${escapeHtml(name)}

                    </div>


                    <strong>
                        ${qty} uds.
                    </strong>

                </div>

            `
        )
        .join("");

}


// ======================================================
// CERRAR CAJA
// ======================================================

async function closeCash() {

    const confirmed =
        confirm(

            "¿Deseas cerrar la caja del día?\n\n" +

            "Se guardará un resumen de las ventas actuales."

        );


    if (!confirmed) {

        return;

    }


    const button =
        document.getElementById(
            "closeCashBtn"
        );


    button.disabled =
        true;


    button.textContent =
        "Guardando cierre...";


    try {

        const summary =
            await loadDailyCash();


        if (
            summary.totalOrders === 0
        ) {

            alert(
                "No existen ventas para realizar un cierre."
            );

            return;

        }


        const session =
            getStoredSession();


        const email =
            session
            ?.user
            ?.email ||
            null;


        await api(

            "cierres_caja",

            {

                method:
                    "POST",

                headers: {

                    Prefer:
                        "return=minimal"

                },

                body:
                    JSON.stringify({

                        total_ventas:
                            summary.totalSales,

                        total_efectivo:
                            summary.cash,

                        total_transferencia:
                            summary.transfer,

                        total_tarjeta:
                            summary.card,

                        numero_ordenes:
                            summary.totalOrders,

                        usuario_email:
                            email

                    })

            }

        );


        alert(
            "Cierre de caja guardado correctamente."
        );


        await loadCashClosings();


    } catch (error) {

        console.error(
            "Error cerrando caja:",
            error
        );


        alert(
            "No se pudo realizar el cierre de caja."
        );


    } finally {

        button.disabled =
            false;


        button.textContent =
            "Cerrar caja del día";

    }

}


// ======================================================
// HISTORIAL DE CIERRES
// ======================================================

async function loadCashClosings() {

    const closings =
        await api(

            "cierres_caja" +
            "?select=*" +
            "&order=fecha.desc" +
            "&limit=30"

        );


    const body =
        document.getElementById(
            "cashClosings"
        );


    if (
        !closings ||
        closings.length === 0
    ) {

        body.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    style="
                        text-align:center;
                        padding:24px;
                        color:#777;
                    "
                >
                    Todavía no hay cierres de caja.
                </td>

            </tr>

        `;

        return;

    }


    body.innerHTML =
        closings
        .map(close => {

            const date =
                new Date(
                    close.fecha
                )
                .toLocaleString(
                    "es-EC"
                );


            return `

                <tr>

                    <td>
                        ${date}
                    </td>

                    <td>
                        ${close.numero_ordenes}
                    </td>

                    <td>
                        ${money(
                            close.total_efectivo
                        )}
                    </td>

                    <td>
                        ${money(
                            close.total_transferencia
                        )}
                    </td>

                    <td>
                        ${money(
                            close.total_tarjeta
                        )}
                    </td>

                    <td>

                        <strong>

                            ${money(
                                close.total_ventas
                            )}

                        </strong>

                    </td>

                    <td>
                        ${
                            close.usuario_email ||
                            "-"
                        }
                    </td>

                </tr>

            `;

        })
        .join("");

}


// ======================================================
// EVENTOS
// ======================================================

document
.getElementById(
    "addProductBtn"
)
.addEventListener(
    "click",
    addProduct
);


document
.getElementById(
    "logoutBtn"
)
.addEventListener(
    "click",
    logout
);


document
.getElementById(
    "closeCashBtn"
)
.addEventListener(
    "click",
    closeCash
);


// ======================================================
// INICIALIZACIÓN
// ======================================================

async function initAdmin() {

    if (
        SUPABASE_URL.includes(
            "PEGA_AQUI"
        ) ||
        SUPABASE_KEY.includes(
            "PEGA_AQUI"
        )
    ) {

        alert(
            "Configura SUPABASE_URL y SUPABASE_KEY en admin.js."
        );

        return;

    }


    const authorized =
        await requireAdminSession();


    if (!authorized) {

        return;

    }


    try {

        await Promise.all([

            loadProducts(),

            loadOrders(),

            loadDailyCash(),

            loadCashClosings()

        ]);


        console.log(
            "DAKORI Admin iniciado correctamente."
        );


    } catch (error) {

        console.error(
            "Error iniciando panel:",
            error
        );


        alert(
            "No se pudo cargar completamente el panel de administración."
        );

    }

}


initAdmin();