// =====================================================
// DAKORI ADMIN
// Login + productos + inventario + ventas
// =====================================================


// =====================================================
// SUPABASE
// =====================================================


const SUPABASE_URL =
    "https://cveyhhgcljyxibqtgost.supabase.co";


const SUPABASE_KEY =
    "sb_publishable_-8M32lNeLrCzFfLq319C8Q_bmZnBVB-";


// =====================================================
// SESIÓN
// =====================================================


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


// =====================================================
// RENOVAR SESIÓN
// =====================================================


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
                "No se pudo renovar sesión"
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


// =====================================================
// CERRAR SESIÓN
// =====================================================


function logout() {

    localStorage.removeItem(
        "dakori_admin_session"
    );


    window.location.href =
        "login.html";

}


// =====================================================
// VERIFICAR SESIÓN
// =====================================================


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


    // Renovar si está próxima a vencer

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


// =====================================================
// HEADERS SUPABASE
// =====================================================


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


// =====================================================
// API
// =====================================================


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


    // Si expira token, intentamos una renovación

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


// =====================================================
// UTILIDADES
// =====================================================


function money(value) {

    return `$${Number(value).toFixed(2)}`;

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


// =====================================================
// CARGAR PRODUCTOS
// =====================================================


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


    document.getElementById(
        "activeProducts"
    ).textContent =
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


    document.getElementById(
        "totalStock"
    ).textContent =
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


            /*
             * Usamos encodeURIComponent para
             * pasar nombres de manera segura
             * al botón Eliminar.
             */

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


// =====================================================
// ESCAPAR HTML
// =====================================================


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


// =====================================================
// OPCIONES DE CATEGORÍA
// =====================================================


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


// =====================================================
// GUARDAR PRODUCTO
// =====================================================


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
            "El producto debe tener un nombre."
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
            error
        );


        alert(
            "No se pudo actualizar el producto."
        );

    }

}


// =====================================================
// ACTIVAR / DESACTIVAR
// =====================================================


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
            "No se pudo cambiar el estado del producto."
        );

    }

}


// =====================================================
// ELIMINAR PRODUCTO
// =====================================================


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

            `Esta acción no se puede deshacer.\n\n` +

            `Si el producto ya forma parte de una venta, ` +

            `el sistema puede impedir eliminarlo.`

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
            "Producto eliminado correctamente."
        );


        await loadProducts();


    } catch (error) {

        console.error(
            "Error eliminando producto:",
            error
        );


        alert(

            "No se pudo eliminar el producto.\n\n" +

            "Probablemente tiene ventas asociadas. " +

            "En ese caso utiliza Desactivar."

        );

    }

}


// =====================================================
// AGREGAR PRODUCTO
// =====================================================


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
            "Ingresa el nombre del producto."
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
            "El stock debe ser un número entero igual o mayor a 0."
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


        // Limpiar formulario


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


        document
        .getElementById(
            "newSample"
        )
        .value =
            "false";


        document
        .getElementById(
            "newActive"
        )
        .value =
            "true";


        alert(
            "Producto agregado correctamente."
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


// =====================================================
// CARGAR ÓRDENES
// =====================================================


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


// =====================================================
// EVENTOS
// =====================================================


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


// =====================================================
// INICIAR PANEL
// =====================================================


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

            loadOrders()

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
            "No se pudo cargar el panel de administración."
        );

    }

}


initAdmin();