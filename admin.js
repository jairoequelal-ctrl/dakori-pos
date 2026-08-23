// ======================================================
// DAKORI ADMIN
// Inventario + caja + reportes
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

                    method: "POST",

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


function logout() {

    localStorage.removeItem(
        "dakori_admin_session"
    );


    window.location.href =
        "login.html";

}


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

            logout();

            return false;

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
            error
        );


        logout();

        return false;

    }

}


// ======================================================
// API
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
            "Supabase:",
            response.status,
            text
        );


        throw new Error(
            text
        );

    }


    const text =
        await response.text();


    return text
        ? JSON.parse(text)
        : null;

}


// ======================================================
// UTILIDADES
// ======================================================

function money(value) {

    return `$${Number(value || 0).toFixed(2)}`;

}


function escapeHtml(value) {

    return String(value)

        .replaceAll("&","&amp;")

        .replaceAll("<","&lt;")

        .replaceAll(">","&gt;")

        .replaceAll('"',"&quot;")

        .replaceAll("'","&#039;");

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
// PRODUCTOS
// ======================================================

async function loadProducts() {

    const products =
        await api(
            "productos?select=*&order=id.asc"
        );


    const container =
        document.getElementById(
            "adminProducts"
        );


    document
    .getElementById(
        "activeProducts"
    )
    .textContent =
        products.filter(
            product =>
                product.activo
        ).length;


    document
    .getElementById(
        "totalStock"
    )
    .textContent =
        products.reduce(

            (sum, product) =>
                sum +
                Number(
                    product.stock || 0
                ),

            0

        );


    container.innerHTML =
        products
        .map(product => {

            const stock =
                Number(
                    product.stock || 0
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
                        step="0.01"
                        min="0"
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


    if (
        !nombre ||
        precio < 0 ||
        !Number.isInteger(stock) ||
        stock < 0
    ) {

        alert(
            "Revisa los datos del producto."
        );

        return;

    }


    await api(

        `productos?id=eq.${id}`,

        {

            method: "PATCH",

            headers: {
                Prefer: "return=minimal"
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

}


// ======================================================
// ACTIVAR / DESACTIVAR
// ======================================================

async function toggleProduct(
    id,
    currentStatus
) {

    await api(

        `productos?id=eq.${id}`,

        {

            method: "PATCH",

            headers: {
                Prefer: "return=minimal"
            },

            body:
                JSON.stringify({

                    activo:
                        !currentStatus

                })

        }

    );


    await loadProducts();

}


// ======================================================
// ELIMINAR
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
            `¿Eliminar "${nombre}"?`
        );


    if (!confirmed) {
        return;
    }


    try {

        await api(

            `productos?id=eq.${id}`,

            {
                method: "DELETE"
            }

        );


        await loadProducts();


    } catch {

        alert(
            "No se puede eliminar porque tiene ventas asociadas."
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


    if (
        !nombre ||
        precio < 0 ||
        stock < 0
    ) {

        alert(
            "Completa correctamente los datos."
        );

        return;

    }


    await api(

        "productos",

        {

            method: "POST",

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
    .value =
        "";


    document
    .getElementById(
        "newPrice"
    )
    .value =
        "";


    document
    .getElementById(
        "newStock"
    )
    .value =
        "0";


    await loadProducts();

}


// ======================================================
// ÓRDENES
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


    document
    .getElementById(
        "totalSales"
    )
    .textContent =
        money(

            orders.reduce(

                (sum, order) =>
                    sum +
                    Number(order.total),

                0

            )

        );


    const body =
        document.getElementById(
            "adminOrders"
        );


    body.innerHTML =
        orders
        .map(order => `

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

                    ${
                        new Date(
                            order.fecha
                        )
                        .toLocaleString(
                            "es-EC"
                        )
                    }

                </td>


                <td>

                    ${
                        order.estado_pago ===
                        "Pagado"

                            ? (
                                order.metodo_pago ||
                                "Pagado"
                            )

                            : "Pendiente"
                    }

                </td>


                <td>

                    <strong>
                        ${money(order.total)}
                    </strong>

                </td>

            </tr>

        `)
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
            now.getDate()
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
            "fecha_pago," +
            "total," +
            "metodo_pago," +
            "estado_pago," +

            "detalle_orden(" +
                "cantidad," +
                "subtotal," +
                "productos(" +
                    "nombre," +
                    "categoria" +
                ")" +
            ")" +

            "&estado_pago=eq.Pagado" +

            `&fecha_pago=gte.${encodeURIComponent(
                start.toISOString()
            )}` +

            `&fecha_pago=lte.${encodeURIComponent(
                end.toISOString()
            )}`

        );


    const totalSales =
        orders.reduce(
            (sum,o) =>
                sum +
                Number(o.total),
            0
        );


    const cash =
        orders
        .filter(
            o =>
                o.metodo_pago ===
                "Efectivo"
        )
        .reduce(
            (sum,o) =>
                sum +
                Number(o.total),
            0
        );


    const transfer =
        orders
        .filter(
            o =>
                o.metodo_pago ===
                "Transferencia"
        )
        .reduce(
            (sum,o) =>
                sum +
                Number(o.total),
            0
        );


    const card =
        orders
        .filter(
            o =>
                o.metodo_pago ===
                "Tarjeta"
        )
        .reduce(
            (sum,o) =>
                sum +
                Number(o.total),
            0
        );


    document
    .getElementById(
        "todayOrders"
    )
    .textContent =
        orders.length;


    document
    .getElementById(
        "todayTotal"
    )
    .textContent =
        money(totalSales);


    document
    .getElementById(
        "todayCash"
    )
    .textContent =
        money(cash);


    document
    .getElementById(
        "todayTransfer"
    )
    .textContent =
        money(transfer);


    document
    .getElementById(
        "todayCard"
    )
    .textContent =
        money(card);


    renderTopProducts(
        orders
    );


    return {

        orders,
        totalSales,
        cash,
        transfer,
        card

    };

}


// ======================================================
// TOP PRODUCTOS DEL DÍA
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


                    totals[name] =
                        (
                            totals[name] ||
                            0
                        ) +
                        Number(
                            detail.cantidad
                        );

                }
            );

        }
    );


    const ranking =
        Object.entries(totals)

        .sort(
            (a,b) =>
                b[1] -
                a[1]
        )

        .slice(
            0,
            5
        );


    const container =
        document.getElementById(
            "topProducts"
        );


    container.innerHTML =
        ranking.length

        ? ranking
            .map(
                ([name,qty],i) => `

                    <div class="ranking-row">

                        <div>

                            <span class="ranking-number">
                                ${i + 1}
                            </span>

                            ${escapeHtml(name)}

                        </div>

                        <strong>
                            ${qty} uds.
                        </strong>

                    </div>

                `
            )
            .join("")

        : "<p>No hay ventas pagadas hoy.</p>";

}


// ======================================================
// ÚLTIMO CIERRE
// ======================================================

async function getLastClosing() {

    const rows =
        await api(

            "cierres_caja" +
            "?select=*" +
            "&order=fecha.desc" +
            "&limit=1"

        );


    return (
        rows &&
        rows.length
    )
        ? rows[0]
        : null;

}


// ======================================================
// CAJA ABIERTA
// ======================================================

async function loadOpenCash() {

    const last =
        await getLastClosing();


    let startDate;


    if (
        last &&
        last.periodo_hasta
    ) {

        startDate =
            new Date(
                last.periodo_hasta
            );

    } else {

        const now =
            new Date();


        startDate =
            new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate()
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

            (sum,o) =>
                sum +
                Number(o.total),

            0

        );


    document
    .getElementById(
        "openCashTotal"
    )
    .textContent =
        money(total);


    const info =
        document.getElementById(
            "lastClosingInfo"
        );


    info.innerHTML =
        last

        ? `

            Último cierre:
            <strong>

                ${
                    new Date(
                        last.periodo_hasta ||
                        last.fecha
                    )
                    .toLocaleString(
                        "es-EC"
                    )
                }

            </strong>

            <br>

            Cobros pendientes de cierre:
            <strong>
                ${orders.length}
            </strong>

        `

        : `

            Todavía no existe un cierre.

            <br>

            Cobros pendientes:
            <strong>
                ${orders.length}
            </strong>

        `;


    return {

        orders,
        total,
        startDate

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


    try {

        const open =
            await loadOpenCash();


        if (
            open.orders.length === 0
        ) {

            alert(
                "No existen cobros nuevos."
            );

            return;

        }


        const cash =
            open.orders
            .filter(
                o =>
                    o.metodo_pago ===
                    "Efectivo"
            )
            .reduce(
                (s,o) =>
                    s +
                    Number(o.total),
                0
            );


        const transfer =
            open.orders
            .filter(
                o =>
                    o.metodo_pago ===
                    "Transferencia"
            )
            .reduce(
                (s,o) =>
                    s +
                    Number(o.total),
                0
            );


        const card =
            open.orders
            .filter(
                o =>
                    o.metodo_pago ===
                    "Tarjeta"
            )
            .reduce(
                (s,o) =>
                    s +
                    Number(o.total),
                0
            );


        const confirmed =
            confirm(

                `CIERRE DE CAJA\n\n` +

                `Cobros: ${open.orders.length}\n` +

                `Efectivo: ${money(cash)}\n` +

                `Transferencia: ${money(transfer)}\n` +

                `Tarjeta: ${money(card)}\n\n` +

                `TOTAL: ${money(open.total)}`

            );


        if (!confirmed) {
            return;
        }


        const session =
            getStoredSession();


        const closingTime =
            new Date();


        await api(

            "cierres_caja",

            {

                method:
                    "POST",

                body:
                    JSON.stringify({

                        total_ventas:
                            open.total,

                        total_efectivo:
                            cash,

                        total_transferencia:
                            transfer,

                        total_tarjeta:
                            card,

                        numero_ordenes:
                            open.orders.length,

                        usuario_email:
                            session
                            ?.user
                            ?.email ||
                            null,

                        periodo_desde:
                            open
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

            loadCashClosings()

        ]);


    } finally {

        button.disabled =
            false;

    }

}


// ======================================================
// HISTORIAL DE CIERRES
// ======================================================

async function loadCashClosings() {

    const rows =
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


    body.innerHTML =
        rows.length

        ? rows
            .map(close => `

                <tr>

                    <td>
                        ${
                            new Date(
                                close.fecha
                            )
                            .toLocaleString(
                                "es-EC"
                            )
                        }
                    </td>

                    <td>

                        ${
                            close.periodo_desde

                            ? new Date(
                                close.periodo_desde
                            )
                            .toLocaleString(
                                "es-EC"
                            )

                            : "-"
                        }

                    </td>

                    <td>

                        ${
                            close.periodo_hasta

                            ? new Date(
                                close.periodo_hasta
                            )
                            .toLocaleString(
                                "es-EC"
                            )

                            : "-"
                        }

                    </td>

                    <td>
                        ${close.numero_ordenes}
                    </td>

                    <td>
                        ${money(close.total_efectivo)}
                    </td>

                    <td>
                        ${money(close.total_transferencia)}
                    </td>

                    <td>
                        ${money(close.total_tarjeta)}
                    </td>

                    <td>
                        <strong>
                            ${money(close.total_ventas)}
                        </strong>
                    </td>

                    <td>
                        ${
                            close.usuario_email ||
                            "-"
                        }
                    </td>

                </tr>

            `)
            .join("")

        : `

            <tr>

                <td colspan="9">
                    Todavía no existen cierres.
                </td>

            </tr>

        `;

}


// ======================================================
// REPORTES
// ======================================================

function setDefaultReportDates() {

    const now =
        new Date();


    const first =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        );


    function localDateString(date) {

        const year =
            date.getFullYear();


        const month =
            String(
                date.getMonth() + 1
            )
            .padStart(
                2,
                "0"
            );


        const day =
            String(
                date.getDate()
            )
            .padStart(
                2,
                "0"
            );


        return `${year}-${month}-${day}`;

    }


    document
    .getElementById(
        "reportFrom"
    )
    .value =
        localDateString(first);


    document
    .getElementById(
        "reportTo"
    )
    .value =
        localDateString(now);

}


async function generateReport() {

    const from =
        document
        .getElementById(
            "reportFrom"
        )
        .value;


    const to =
        document
        .getElementById(
            "reportTo"
        )
        .value;


    if (
        !from ||
        !to
    ) {

        alert(
            "Selecciona las fechas."
        );

        return;

    }


    const start =
        new Date(
            `${from}T00:00:00`
        );


    const end =
        new Date(
            `${to}T23:59:59.999`
        );


    if (
        start >
        end
    ) {

        alert(
            "El rango de fechas no es válido."
        );

        return;

    }


    try {

        const paid =
            await api(

                "ordenes" +

                "?select=" +

                "id," +
                "numero_orden," +
                "total," +
                "metodo_pago," +
                "estado_pago," +
                "fecha_pago," +

                "detalle_orden(" +
                    "cantidad," +
                    "subtotal," +
                    "productos(" +
                        "nombre," +
                        "categoria" +
                    ")" +
                ")" +

                "&estado_pago=eq.Pagado" +

                `&fecha_pago=gte.${encodeURIComponent(
                    start.toISOString()
                )}` +

                `&fecha_pago=lte.${encodeURIComponent(
                    end.toISOString()
                )}`

            );


        const pending =
            await api(

                "ordenes" +

                "?select=" +
                "id," +
                "total," +
                "fecha," +
                "estado_pago" +

                "&estado_pago=eq.Pendiente" +

                `&fecha=gte.${encodeURIComponent(
                    start.toISOString()
                )}` +

                `&fecha=lte.${encodeURIComponent(
                    end.toISOString()
                )}`

            );


        const totalSales =
            paid.reduce(
                (s,o) =>
                    s +
                    Number(o.total),
                0
            );


        const pendingTotal =
            pending.reduce(
                (s,o) =>
                    s +
                    Number(o.total),
                0
            );


        const cash =
            paid
            .filter(
                o =>
                    o.metodo_pago ===
                    "Efectivo"
            )
            .reduce(
                (s,o) =>
                    s +
                    Number(o.total),
                0
            );


        const transfer =
            paid
            .filter(
                o =>
                    o.metodo_pago ===
                    "Transferencia"
            )
            .reduce(
                (s,o) =>
                    s +
                    Number(o.total),
                0
            );


        const card =
            paid
            .filter(
                o =>
                    o.metodo_pago ===
                    "Tarjeta"
            )
            .reduce(
                (s,o) =>
                    s +
                    Number(o.total),
                0
            );


        document
        .getElementById(
            "reportSales"
        )
        .textContent =
            money(totalSales);


        document
        .getElementById(
            "reportOrders"
        )
        .textContent =
            paid.length;


        document
        .getElementById(
            "reportPending"
        )
        .textContent =
            money(pendingTotal);


        document
        .getElementById(
            "reportCash"
        )
        .textContent =
            money(cash);


        document
        .getElementById(
            "reportTransfer"
        )
        .textContent =
            money(transfer);


        document
        .getElementById(
            "reportCard"
        )
        .textContent =
            money(card);


        renderReportProducts(
            paid
        );


        renderReportCategories(
            paid
        );


    } catch (error) {

        console.error(
            "Error en reporte:",
            error
        );


        alert(
            "No se pudo generar el reporte."
        );

    }

}


// ======================================================
// PRODUCTOS DEL REPORTE
// ======================================================

function renderReportProducts(
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

                        totals[name] = {
                            qty: 0,
                            sales: 0
                        };

                    }


                    totals[name].qty +=
                        Number(
                            detail.cantidad
                        );


                    totals[name].sales +=
                        Number(
                            detail.subtotal ||
                            0
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
            (a,b) =>
                b[1].qty -
                a[1].qty
        );


    const container =
        document.getElementById(
            "reportTopProducts"
        );


    container.innerHTML =
        ranking.length

        ? ranking
            .map(
                ([name,data],index) => `

                    <div class="ranking-row">

                        <div>

                            <span class="ranking-number">
                                ${index + 1}
                            </span>

                            ${escapeHtml(name)}

                        </div>


                        <div style="text-align:right">

                            <strong>
                                ${data.qty} uds.
                            </strong>

                            <div
                                style="
                                    color:#777;
                                    font-size:.8rem;
                                "
                            >
                                ${money(data.sales)}
                            </div>

                        </div>

                    </div>

                `
            )
            .join("")

        : "<p>No hay ventas en este período.</p>";

}


// ======================================================
// CATEGORÍAS DEL REPORTE
// ======================================================

function renderReportCategories(
    orders
) {

    const categories = {};


    orders.forEach(
        order => {

            (
                order.detalle_orden ||
                []
            )
            .forEach(
                detail => {

                    const category =
                        detail
                        .productos
                        ?.categoria ||
                        "Sin categoría";


                    if (
                        !categories[
                            category
                        ]
                    ) {

                        categories[
                            category
                        ] = {

                            qty: 0,
                            sales: 0

                        };

                    }


                    categories[
                        category
                    ].qty +=

                        Number(
                            detail.cantidad
                        );


                    categories[
                        category
                    ].sales +=

                        Number(
                            detail.subtotal ||
                            0
                        );

                }
            );

        }
    );


    const list =
        Object.entries(
            categories
        )
        .sort(
            (a,b) =>
                b[1].sales -
                a[1].sales
        );


    const container =
        document.getElementById(
            "reportCategories"
        );


    container.innerHTML =
        list.length

        ? list
            .map(
                ([category,data]) => `

                    <div class="ranking-row">

                        <div>
                            ${escapeHtml(category)}
                        </div>

                        <div style="text-align:right">

                            <strong>
                                ${money(data.sales)}
                            </strong>

                            <div
                                style="
                                    color:#777;
                                    font-size:.8rem;
                                "
                            >
                                ${data.qty} uds.
                            </div>

                        </div>

                    </div>

                `
            )
            .join("")

        : "<p>No hay ventas en este período.</p>";

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


document
.getElementById(
    "generateReportBtn"
)
.addEventListener(
    "click",
    generateReport
);


// ======================================================
// INICIO
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
            "Configura Supabase en admin.js."
        );

        return;

    }


    const authorized =
        await requireAdminSession();


    if (!authorized) {

        return;

    }


    setDefaultReportDates();


    try {

        await Promise.all([

            loadProducts(),

            loadOrders(),

            loadDailyCash(),

            loadOpenCash(),

            loadCashClosings()

        ]);


        await generateReport();


        console.log(
            "DAKORI Admin cargado correctamente."
        );


    } catch (error) {

        console.error(
            "Error iniciando Admin:",
            error
        );


        alert(
            "No se pudo cargar completamente el panel."
        );

    }

}


initAdmin();