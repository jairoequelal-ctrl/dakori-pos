// ======================================================
// DAKORI ADMIN
// Login + productos + inventario + ventas + caja
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

            console.error(
                "No se pudo renovar la sesión."
            );

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
// CERRAR SESIÓN
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


function getStockClass(stock) {

    if (stock === 0) {

        return "stock-zero";

    }


    if (stock <= 5) {

        return "stock-low";

    }


    return "";

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
// CARGAR PRODUCTOS
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
            "El precio no es válido."
        );

        return;

    }


    if (
        !Number.isInteger(stock) ||
        stock < 0
    ) {

        alert(
            "El stock debe ser un número entero igual o mayor a 0."
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
            "Producto actualizado correctamente."
        );


        await loadProducts();


    } catch (error) {

        console.error(
            "Error actualizando producto:",
            error
        );


        alert(
            "No se pudo actualizar el producto."
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
            "Error cambiando estado:",
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
            "Error eliminando producto:",
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
            "Producto agregado correctamente."
        );


        await loadProducts();


    } catch (error) {

        console.error(
            "Error agregando producto:",
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
        money(
            total
        );


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

                        ${
                            order.metodo_pago ||
                            "Pendiente"
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

        })
        .join("");

}


// ======================================================
// CAJA DEL DÍA
// SE BASA EN FECHA DE PAGO
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
            "fecha_pago," +
            "total," +
            "metodo_pago," +
            "estado_pago," +

            "detalle_orden(" +
                "cantidad," +
                "producto_id," +
                "productos(nombre)" +
            ")" +

            "&estado_pago=eq.Pagado" +

            `&fecha_pago=gte.${encodeURIComponent(
                start.toISOString()
            )}` +

            `&fecha_pago=lte.${encodeURIComponent(
                end.toISOString()
            )}` +

            "&order=fecha_pago.desc"

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

        orders,
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
            "<p>No hay ventas pagadas hoy.</p>";

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
// OBTENER ÚLTIMO CIERRE
// ======================================================

async function getLastClosing() {

    const closings =
        await api(

            "cierres_caja" +
            "?select=*" +
            "&order=fecha.desc" +
            "&limit=1"

        );


    if (
        !closings ||
        closings.length === 0
    ) {

        return null;

    }


    return closings[0];

}


// ======================================================
// CAJA ABIERTA
// USA FECHA DE PAGO
// ======================================================

async function loadOpenCash() {

    const lastClosing =
        await getLastClosing();


    let startDate;


    if (
        lastClosing &&
        lastClosing.periodo_hasta
    ) {

        startDate =
            new Date(
                lastClosing.periodo_hasta
            );

    } else {

        const now =
            new Date();


        startDate =
            new Date(

                now.getFullYear(),
                now.getMonth(),
                now.getDate(),

                0,
                0,
                0,
                0

            );

    }


    const orders =
        await api(

            "ordenes" +

            "?select=" +

            "id," +
            "numero_orden," +
            "fecha_pago," +
            "total," +
            "metodo_pago," +
            "estado_pago" +

            "&estado_pago=eq.Pagado" +

            `&fecha_pago=gt.${encodeURIComponent(
                startDate.toISOString()
            )}` +

            "&order=fecha_pago.asc"

        );


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
        "openCashTotal"
    )
    .textContent =
        money(
            total
        );


    const info =
        document.getElementById(
            "lastClosingInfo"
        );


    if (
        lastClosing &&
        lastClosing.periodo_hasta
    ) {

        const fecha =
            new Date(
                lastClosing.periodo_hasta
            )
            .toLocaleString(
                "es-EC"
            );


        info.innerHTML = `

            Último cierre:
            <strong>
                ${fecha}
            </strong>

            <br>

            Cobros pendientes de cierre:
            <strong>
                ${orders.length}
            </strong>

        `;

    } else {

        info.innerHTML = `

            Todavía no existe un cierre de caja.

            <br>

            Cobros pendientes de cierre:
            <strong>
                ${orders.length}
            </strong>

        `;

    }


    return {

        orders,
        total,
        startDate,
        lastClosing

    };

}


// ======================================================
// CERRAR CAJA
// ======================================================

async function closeCash() {

    const button =
        document.getElementById(
            "closeCashBtn"
        );


    button.disabled =
        true;


    button.textContent =
        "Revisando caja...";


    try {

        const openCash =
            await loadOpenCash();


        if (
            openCash.orders.length === 0
        ) {

            alert(

                "No existen cobros nuevos desde el último cierre.\n\n" +

                "No es necesario realizar otro cierre."

            );


            return;

        }


        const totalSales =
            openCash.orders.reduce(

                (sum, order) =>
                    sum +
                    Number(
                        order.total
                    ),

                0

            );


        const cash =
            openCash.orders

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
            openCash.orders

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
            openCash.orders

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


        const message =

            `CIERRE DE CAJA\n\n` +

            `Cobros: ${openCash.orders.length}\n\n` +

            `Efectivo: ${money(cash)}\n` +

            `Transferencia: ${money(transfer)}\n` +

            `Tarjeta: ${money(card)}\n\n` +

            `TOTAL: ${money(totalSales)}\n\n` +

            `¿Confirmar cierre?`;


        const confirmed =
            confirm(
                message
            );


        if (!confirmed) {

            return;

        }


        button.textContent =
            "Cerrando caja...";


        const session =
            getStoredSession();


        const email =
            session
            ?.user
            ?.email ||
            null;


        const closingTime =
            new Date();


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
                            totalSales,

                        total_efectivo:
                            cash,

                        total_transferencia:
                            transfer,

                        total_tarjeta:
                            card,

                        numero_ordenes:
                            openCash.orders.length,

                        usuario_email:
                            email,

                        periodo_desde:
                            openCash
                            .startDate
                            .toISOString(),

                        periodo_hasta:
                            closingTime
                            .toISOString(),

                        estado:
                            "Cerrado"

                    })

            }

        );


        alert(
            "Caja cerrada correctamente."
        );


        await Promise.all([

            loadDailyCash(),

            loadOpenCash(),

            loadCashClosings(),

            loadOrders()

        ]);


    } catch (error) {

        console.error(
            "Error realizando cierre:",
            error
        );


        alert(
            "No se pudo realizar el cierre de caja."
        );


    } finally {

        button.disabled =
            false;


        button.textContent =
            "Cerrar caja";

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
                    colspan="9"
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


            const closingDate =
                new Date(
                    close.fecha
                )
                .toLocaleString(
                    "es-EC"
                );


            const desde =
                close.periodo_desde
                    ? new Date(
                        close.periodo_desde
                    )
                    .toLocaleString(
                        "es-EC"
                    )
                    : "-";


            const hasta =
                close.periodo_hasta
                    ? new Date(
                        close.periodo_hasta
                    )
                    .toLocaleString(
                        "es-EC"
                    )
                    : "-";


            return `

                <tr>


                    <td>
                        ${closingDate}
                    </td>


                    <td>
                        ${desde}
                    </td>


                    <td>
                        ${hasta}
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
// INICIALIZAR
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

            loadOpenCash(),

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