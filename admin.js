const SUPABASE_URL = "https://cveyhhgcljyxibqtgost.supabase.co";
const SUPABASE_KEY = "sb_publishable_-8M32lNeLrCzFfLq319C8Q_bmZnBVB-";


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
            text
        );

        throw new Error(text);

    }


    const text = await response.text();

    return text
        ? JSON.parse(text)
        : null;

}


function money(value) {

    return `$${Number(value).toFixed(2)}`;

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


    document.getElementById(
        "activeProducts"
    ).textContent =
        products.filter(
            p => p.activo
        ).length;


    container.innerHTML =
        products
        .map(product => `

            <div class="product-row">

                <input
                    id="name-${product.id}"
                    value="${product.nombre}"
                >


                <select
                    id="category-${product.id}"
                >

                    <option ${
                        product.categoria === "Chicken"
                        ? "selected"
                        : ""
                    }>
                        Chicken
                    </option>

                    <option ${
                        product.categoria === "Ramen"
                        ? "selected"
                        : ""
                    }>
                        Ramen
                    </option>

                    <option ${
                        product.categoria === "Bebidas"
                        ? "selected"
                        : ""
                    }>
                        Bebidas
                    </option>

                    <option ${
                        product.categoria === "Snacks"
                        ? "selected"
                        : ""
                    }>
                        Snacks
                    </option>

                </select>


                <input
                    id="price-${product.id}"
                    type="number"
                    step="0.01"
                    value="${product.precio}"
                >


                <span class="${
                    product.activo
                    ? "status-active"
                    : "status-inactive"
                }">

                    ${
                        product.activo
                        ? "Activo"
                        : "Inactivo"
                    }

                </span>


                <div>

                    <button
                        class="admin-btn secondary"
                        onclick="saveProduct(${product.id})"
                    >
                        Guardar
                    </button>


                    <button
                        class="admin-btn"
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

        `)
        .join("");

}


async function saveProduct(id) {

    const nombre =
        document.getElementById(
            `name-${id}`
        ).value;


    const categoria =
        document.getElementById(
            `category-${id}`
        ).value;


    const precio =
        Number(
            document.getElementById(
                `price-${id}`
            ).value
        );


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
                    precio

                })

        }
    );


    alert(
        "Producto actualizado"
    );


    loadProducts();

}


async function toggleProduct(
    id,
    currentStatus
) {

    await api(
        `productos?id=eq.${id}`,
        {

            method:
                "PATCH",

            body:
                JSON.stringify({

                    activo:
                        !currentStatus

                })

        }
    );


    loadProducts();

}


async function addProduct() {

    const nombre =
        document.getElementById(
            "newName"
        ).value.trim();


    const categoria =
        document.getElementById(
            "newCategory"
        ).value;


    const precio =
        Number(
            document.getElementById(
                "newPrice"
            ).value
        );


    const sample =
        document.getElementById(
            "newSample"
        ).value === "true";


    if (
        !nombre ||
        !precio
    ) {

        alert(
            "Completa nombre y precio."
        );

        return;

    }


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
                    activo:
                        true,

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


    loadProducts();

}


async function loadOrders() {

    const orders =
        await api(

            "ordenes" +
            "?select=*" +
            "&order=fecha.desc" +
            "&limit=20"

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

    try {

        await Promise.all([
            loadProducts(),
            loadOrders()
        ]);

    } catch (error) {

        console.error(
            "Error iniciando panel:",
            error
        );

        alert(
            "No se pudo cargar el panel."
        );

    }

}


initAdmin();