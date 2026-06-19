<?php
// login.php
// Validates credentials and starts a user session.
session_start();
include "../../model/db.php";

if ($_SERVER["REQUEST_METHOD"] == "POST") {

    $email = isset($_POST['email']) ? trim($_POST['email']) : '';
    $password = isset($_POST['password']) ? $_POST['password'] : '';

    // Basic input validation before querying database.
    if ($email === '' || $password === '') {
        echo "Email and password are required";
        exit;
    }

    // Database query: fetch user credentials by email.
    $stmt = $conn->prepare("SELECT id, username, password FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $stmt->store_result();

    if ($stmt->num_rows > 0) {
        $stmt->bind_result($id, $username, $hashedPassword);
        $stmt->fetch();

        if (password_verify($password, $hashedPassword)) {

            // Successful login: persist user identity in session.
            $_SESSION['user_id'] = $id;
            $_SESSION['username'] = $username;
            
            // Set cookie for username as required
            setcookie("username", $username, time()+3600, "/");

            echo "success";

        } else {
            echo "Invalid password";
        }

    } else {
        echo "User not found";
    }

    $stmt->close();
    $conn->close();
}
?>