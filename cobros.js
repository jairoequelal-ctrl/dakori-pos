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


function goLogin() {

    window.location.href =
        "login.html";

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


async function checkSession() {

    let session =
        getStoredSession();


    if (
        !session ||
        !session.access_token
    ) {

        goLogin();

        return false;

    }


    if (
        session.expires_at &&
        Date.now() >
        session.expires_at - 120000
    ) {

        const refreshed =
            await refreshSession();


        if (!refreshed) {

            goLogin();

            return false;

        }


        session =
            getStoredSession();

    }


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

        goLogin();

        return false;

    }


    return true;

}


// ======================================================
// API
// ======================================================

function authHeaders() {

    const session =
        getStoredSession();


    return {

        apikey:
            SUPABASE_KEY,

        Authorization:
            `Bearer ${session.access_token}`,

        "Content-Type":
            "application/json"

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

                headers: {

                    ...authHeaders(),

                    ...(options.headers || {})

                }

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

                        headers: {

                            ...authHeaders(),

                            ...(options.headers || {})

                        }

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


// ======================================================
// CARGAR COBROS PENDIENTES
// ======================================================

async function loadPendingPayments() {

    try {

        const orders =
            await api(

                "ordenes" +

                "?select=" +

                "id," +
                "numero_orden," +
                "fecha," +
                "total," +
                "estado," +
                "estado_pago," +
                "momento_pago," +

                "detalle_orden(" +
                    "cantidad," +
                    "productos(nombre)" +
                ")" +

                "&estado_pago=eq.Pendiente" +

                "&order=fecha.asc"

            );


        const count =
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
            "pendingCount"
        )
        .textContent =
            count;


        document
        .getElementById(
            "pendingTotal"
        )
        .textContent =
            money(
                total
            );


        renderOrders(
            orders
        );


    } catch (error) {

        console.error(
            "Error cargando cobros:",
            error
        );

    }

}


// ======================================================
// RENDER
// ======================================================

function renderOrders(
    orders
) {

    const container =
        document.getElementById(
            "pendingOrders"
        );


    if (
        orders.length === 0
    ) {

        container.innerHTML = `

            <div class="empty">

                No hay pedidos pendientes de cobro.

            </div>

        `;


        return;

    }


    container.innerHTML =
        orders
        .map(
            order => {


                const items =
                    (
                        order.detalle_orden ||
                        []
                    )
                    .map(
                        detail => `

                            <div class="item">

                                <strong>
                                    ${detail.cantidad} ×
                                </strong>

                                ${
                                    detail
                                    .productos
                                    ?.nombre ||
                                    "Producto"
                                }

                            </div>

                        `
                    )
                    .join("");


                return `

                    <article class="order-card">


                        <div class="order-top">


                            <div class="order-number">

                                #${
                                    String(
                                        order.numero_orden
                                    )
                                    .padStart(
                                        3,
                                        "0"
                                    )
                                }

                            </div>


                            <div class="status">

                                PAGO PENDIENTE

                            </div>


                        </div>


                        <div class="items">

                            ${items}

                        </div>


                        <div class="order-state">

                            Estado del pedido:

                            <strong>
                                ${order.estado}
                            </strong>

                        </div>


                        <div class="total">

                            <span>
                                TOTAL
                            </span>

                            <strong>
                                ${money(order.total)}
                            </strong>

                        </div>


                        <select
                            class="payment-select"
                            id="payment-${order.id}"
                        >

                            <option value="Efectivo">
                                Efectivo
                            </option>

                            <option value="Transferencia">
                                Transferencia
                            </option>

                            <option value="Tarjeta">
                                Tarjeta
                            </option>

                        </select>


                        <button
                            class="pay-btn"
                            id="pay-btn-${order.id}"
                            onclick="
                                payOrder(
                                    ${order.id},
                                    ${order.numero_orden},
                                    ${order.total}
                                )
                            "
                        >

                            COBRAR

                        </button>


                    </article>

                `;

            }
        )
        .join("");

}


// ======================================================
// COBRAR
// ======================================================

async function payOrder(
    orderId,
    orderNumber,
    total
) {

    const select =
        document.getElementById(
            `payment-${orderId}`
        );


    const button =
        document.getElementById(
            `pay-btn-${orderId}`
        );


    const method =
        select.value;


    const confirmed =
        confirm(

            `COBRAR ORDEN #${String(orderNumber).padStart(3,"0")}\n\n` +

            `Total: ${money(total)}\n` +

            `Método: ${method}\n\n` +

            `¿Confirmar pago?`

        );


    if (!confirmed) {

        return;

    }


    button.disabled =
        true;


    button.textContent =
        "Registrando pago...";


    try {

        const response =
            await fetch(

                `${SUPABASE_URL}/rest/v1/rpc/marcar_orden_pagada`,

                {

                    method:
                        "POST",

                    headers:
                        authHeaders(),

                    body:
                        JSON.stringify({

                            p_orden_id:
                                orderId,

                            p_metodo_pago:
                                method

                        })

                }

            );


        if (!response.ok) {

            const text =
                await response.text();


            throw new Error(
                text
            );

        }


        alert(

            `Orden #${String(orderNumber).padStart(3,"0")} cobrada correctamente.`

        );


        await loadPendingPayments();


    } catch (error) {

        console.error(
            error
        );


        alert(
            "No se pudo registrar el pago."
        );


        button.disabled =
            false;


        button.textContent =
            "COBRAR";

    }

}


// ======================================================
// INICIO
// ======================================================

async function init() {

    const authenticated =
        await checkSession();


    if (!authenticated) {

        return;

    }


    await loadPendingPayments();


    setInterval(

        loadPendingPayments,

        5000

    );

}


init();