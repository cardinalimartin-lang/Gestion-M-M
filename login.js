document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');

    // Objeto que almacena los usuarios y sus contraseñas.
    // La clave es el nombre de usuario y el valor es la contraseña.
    const usuarios = {
        "Martin": "Martin",
        "Mateo": "Mateo",
        "Dario": "Dario"
    };

    loginForm.addEventListener('submit', function(event) {
        // Previene el envío del formulario para que JavaScript pueda manejarlo.
        event.preventDefault();

        // Obtiene los valores ingresados por el usuario.
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Comprueba si el usuario existe en el objeto 'usuarios' y si la contraseña coincide.
        // La condición usuarios[username] verifica que la clave exista.
        // La segunda parte, usuarios[username] === password, compara la contraseña ingresada con la almacenada.
        if (usuarios[username] && usuarios[username] === password) {
            alert("¡Inicio de sesión exitoso!");
            
            // Redirige al usuario a la página 'perfil.html' tras un inicio de sesión exitoso.
            window.location.href = "menu/menu.html"; 
        } else {
            // Muestra una alerta si el usuario o la contraseña son incorrectos.
            alert("Usuario o contraseña incorrectos.");
        }
    });
});