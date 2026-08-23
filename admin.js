const SUPABASE_URL = "PEGA_AQUI_TU_PROJECT_URL";
const SUPABASE_KEY = "PEGA_AQUI_TU_PUBLISHABLE_KEY";


function headers(extra = {}) {

    return {
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json",
        ...extra
    };

}


async function api(path, options = {}) {

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/${path}`,
        {
            ...options,
            headers: headers(options.headers || {})
        }
    );


    if (!response.ok) {

        const text = await response.text();

        console.error(
            "Supabase error:",
            response.status,
            text
        );

        throw new Error(
            `Error ${response.status}: ${text}`
        );

    }


    const text = await response.text();


    if (!text) {
        return null;
    }


    return JSON.parse(text);

}


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


async function loadProducts() {

    const products =
        await api(
            "productos?select=*&order=id.asc"
        );


    const container =
        document.getElementById(
            "adminProducts"
        );


    const activeCount =
        products.filter(
            product => product.activo
        ).length;


    document.getElementById(
        "activeProducts"
    ).textContent =
        activeCount;


    const totalStock =
        products.reduce(
            (total, product) =>
                total +
                Number(product.stock || 0),
            0
        );


    document.getElementById(
        "totalStock"
    ).textContent =
        totalStock;


    if (products.length === 0) {

        container.innerHTML =
            "<p>No hay productos registrados.</p>";

        return;

    }


    container.innerHTML =
        products
        .map(product => {

            const stock =
                Number(
                    product.stock || 0
                );


            return `

                <div class="product-row">

                    <input
                        id="name-${product.id}"
                        value="${product.nombre}"
                    >


                    <select
                        id="category-${product.id}"
                    >

                        <option
                            value="Chicken"
                            ${
                                product.categoria === "Chicken"
                                ? "selected"
                                : ""
                            }
                        >
                            Chicken
                        </option>


                        <option
                            value="Ramen"
                            ${
                                product.categoria === "Ramen"
                                ? "selected"
                                : ""
                            }
                        >
                            Ramen
                        </option>


                        <option
                            value="Bebidas"
                            ${
                                product.categoria === "Bebidas"
                                ? "selected"
                                : ""
                            }
                        >
                            Bebidas
                        </option>


                        <option
                            value="Snacks"
                            ${
                                product.categoria === "Snacks"
                                ? "selected"
                                : ""
                            }
                        >
                            Snacks
                        </option>

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
                            onclick="saveProduct(${product.id})"
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

                    </div>

                </div>

            `;

        })
        .join("");

}


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
            "Error actualizando producto:",
            error
        );


        alert(
            "No se pudo actualizar el producto."
        );

    }

}


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
            "No se pudo cambiar el estado del producto."
        );

    }

}


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
            "La cantidad debe ser un número entero igual o mayor a 0."
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


        document.getElementById(
            "newName"
        ).value = "";


        document.getElementById(
            "newPrice"
        ).value = "";


        document.getElementById(
            "newStock"
        ).value = "0";


        document.getElementById(
            "newSample"
        ).value = "false";


        document.getElementById(
            "newActive"
        ).value = "true";


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


async function loadOrders() {

    const orders =
        await api(

            "ordenes" +
            "?select=*" +
            "&order=fecha.desc" +
            "&limit=50"

        );


    document.getElementById(
        "totalOrders"
    ).textContent =
        orders.length;


    const total =
        orders.reduce(
            (sum, order) =>
                sum +
                Number(order.total),
            0
        );


    document.getElementById(
        "totalSales"
    ).textContent =
        money(total);


    const body =
        document.getElementById(
            "adminOrders"
        );


    if (orders.length === 0) {

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

                        #${
                            String(
                                order.numero_orden
                            ).padStart(
                                3,
                                "0"
                            )
                        }

                    </td>


                    <td>
                        ${fecha}
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

}


document
.getElementById(
    "addProductBtn"
)
.addEventListener(
    "click",
    addProduct
);


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


    try {

        await Promise.all([
            loadProducts(),
            loadOrders()
        ]);


        console.log(
            "DAKORI Admin cargado correctamente."
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