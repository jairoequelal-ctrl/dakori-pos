const SUPABASE_URL =
    "https://cveyhhgcljyxibqtgost.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_-8M32lNeLrCzFfLq319C8Q_bmZnBVB-";


const loginForm =
    document.getElementById(
        "loginForm"
    );

const loginBtn =
    document.getElementById(
        "loginBtn"
    );

const loginError =
    document.getElementById(
        "loginError"
    );


function showError(message) {

    loginError.textContent =
        message;

    loginError.style.display =
        "block";

}


loginForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        loginError.style.display =
            "none";


        const email =
            document
            .getElementById(
                "email"
            )
            .value
            .trim();


        const password =
            document
            .getElementById(
                "password"
            )
            .value;


        loginBtn.disabled =
            true;

        loginBtn.textContent =
            "Ingresando...";


        try {

            const response =
                await fetch(

                    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,

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

                                email,
                                password

                            })

                    }

                );


            const data =
                await response.json();


            if (!response.ok) {

                console.error(
                    "Error login:",
                    data
                );


                throw new Error(
                    data.error_description ||
                    data.msg ||
                    data.message ||
                    "Correo o contraseña incorrectos."
                );

            }


            const session = {

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
                    session
                )
            );


            window.location.href =
                "admin.html";


        } catch (error) {

            console.error(
                error
            );


            showError(
                error.message ||
                "No se pudo iniciar sesión."
            );


        } finally {

            loginBtn.disabled =
                false;

            loginBtn.textContent =
                "Iniciar sesión";

        }

    }
);