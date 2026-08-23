// ======================================================
// DAKORI KITCHEN DISPLAY
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


function goLogin() {

    window.location.href =
        "login.html";

}


async function checkSession() {

    const session =
        getStoredSession();


    if (
        !session ||
        !session.access_token
    ) {

        goLogin();

        return false;

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
// HEADERS
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


// ======================================================
// API
// ======================================================

async function api(
    path,
    options = {}
) {

    const response =
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


    if (!response.ok) {

        const text =
            await response.text();


        console.error(
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
// TIEMPO
// ======================================================

function minutesAgo(
    fecha
) {

    const created =
        new Date(
            fecha
        );


    const now =
        new Date();


    return Math.max(

        0,

        Math.floor(

            (
                now -
                created
            ) /
            60000

        )

    );

}


function getTimeClass(
    minutes
) {

    if (
        minutes >= 20
    ) {

        return "late";

    }


    if (
        minutes >= 10
    ) {

        return "warning";

    }


    return "";

}


// ======================================================
// CARGAR PEDIDOS
// ======================================================

async function loadOrders() {

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

                "&estado=in.(Pendiente,En proceso)" +

                "&order=fecha.asc"

            );


        const pending =
            orders.filter(

                order =>
                    order.estado ===
                    "Pendiente"

            );


        const process =
            orders.filter(

                order =>
                    order.estado ===
                    "En proceso"

            );


        renderOrders(

            pending,

            "pendingOrders",

            "Pendiente"

        );


        renderOrders(

            process,

            "processOrders",

            "En proceso"

        );


        document
        .getElementById(
            "pendingCounter"
        )
        .textContent =
            pending.length;


        document
        .getElementById(
            "processCounter"
        )
        .textContent =
            process.length;


    } catch (error) {

        console.error(
            "Error cargando pedidos:",
            error
        );

    }

}


// ======================================================
// RENDER PEDIDOS
// ======================================================

function renderOrders(
    orders,
    containerId,
    state
) {

    const container =
        document.getElementById(
            containerId
        );


    if (
        orders.length === 0
    ) {

        container.innerHTML = `

            <div class="empty">

                ${
                    state === "Pendiente"

                        ? "No hay pedidos pendientes."

                        : "No hay pedidos en proceso."
                }

            </div>

        `;


        return;

    }


    container.innerHTML =
        orders
        .map(
            order => {


                const minutes =
                    minutesAgo(
                        order.fecha
                    );


                const timeClass =
                    getTimeClass(
                        minutes
                    );


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


                const paymentClass =
                    order.estado_pago ===
                    "Pagado"

                        ? "paid"

                        : "unpaid";


                const paymentText =
                    order.estado_pago ===
                    "Pagado"

                        ? "✓ PAGADO"

                        : "⚠ PAGO PENDIENTE";


                const button =
                    state === "Pendiente"

                        ? `

                            <button
                                class="action-btn prepare"
                                onclick="
                                    changeStatus(
                                        ${order.id},
                                        'En proceso'
                                    )
                                "
                            >
                                INICIAR PREPARACIÓN
                            </button>

                          `

                        : `

                            <button
                                class="action-btn deliver"
                                onclick="
                                    changeStatus(
                                        ${order.id},
                                        'Entregado'
                                    )
                                "
                            >
                                MARCAR ENTREGADO
                            </button>

                          `;


                return `

                    <article
                        class="
                            order-card
                            ${timeClass}
                        "
                    >


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


                            <div class="time">

                                Hace
                                ${minutes}
                                min

                            </div>


                        </div>


                        <div class="items">

                            ${items}

                        </div>


                        <div
                            class="
                                payment
                                ${paymentClass}
                            "
                        >

                            ${paymentText}

                        </div>


                        ${button}


                    </article>

                `;

            }
        )
        .join("");

}


// ======================================================
// CAMBIAR ESTADO
// ======================================================

async function changeStatus(
    orderId,
    newState
) {

    try {

        const response =
            await fetch(

                `${SUPABASE_URL}/rest/v1/rpc/cambiar_estado_pedido`,

                {

                    method:
                        "POST",

                    headers:
                        authHeaders(),

                    body:
                        JSON.stringify({

                            p_orden_id:
                                orderId,

                            p_estado:
                                newState

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


        await loadOrders();


    } catch (error) {

        console.error(
            error
        );


        alert(
            "No se pudo actualizar el pedido."
        );

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


    await loadOrders();


    // Actualización automática cada 5 segundos

    setInterval(

        loadOrders,

        5000

    );

}


init();