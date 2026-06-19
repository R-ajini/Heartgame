<?php
// signup.php
// Registers a new user account and creates an active session.
session_start();
include "../../model/db.php";

if ($_SERVER["REQUEST_METHOD"] == "POST") {

    $username = isset($_POST['username']) ? trim($_POST['username']) : '';
    $email = isset($_POST['email']) ? trim($_POST['email']) : '';
    $rawPassword = isset($_POST['password']) ? $_POST['password'] : '';

    // Validate required fields before attempting account creation.
    if ($username === '' || $email === '' || $rawPassword === '') {
        echo "All fields are required";
        exit();
    }

    // Security: hash password before storing in database.
    $password = password_hash($rawPassword, PASSWORD_DEFAULT);

    // Database query: check for duplicate username/email.
    $check = $conn->prepare("SELECT username, email FROM users WHERE username = ? OR email = ? LIMIT 1");
    $check->bind_param("ss", $username, $email);
    $check->execute();
    $check->store_result();

    if ($check->num_rows > 0) {
        $check->bind_result($existingUsername, $existingEmail);
        $check->fetch();
        $check->close();

        if ($existingUsername === $username) {
            echo "Username already taken!";
            exit();
        }

        if ($existingEmail === $email) {
            echo "Email already registered!";
            exit();
        }

        echo "Account already exists!";
        exit();
    }
    $check->close();

    try {
        // Database query: insert the new user record.
        $stmt = $conn->prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
        $stmt->bind_param("sss", $username, $email, $password);

        if ($stmt->execute()) {
            // Save new user session right after registration.
            $user_id = $conn->insert_id;
            $_SESSION['user_id'] = $user_id;
            $_SESSION['username'] = $username;
            
            // Set cookie for username as required
            setcookie("username", $username, time()+3600, "/");
            
            echo "Registration successful";
        } else {
            echo "Registration failed";
        }
        $stmt->close();
    } catch (mysqli_sql_exception $e) {
        $errorCode = (int) $e->getCode();
        if ($errorCode === 1062) {
            // Graceful duplicate-key handling for existing DB constraints.
            if (stripos($e->getMessage(), "username") !== false) {
                echo "Username already taken!";
            } elseif (stripos($e->getMessage(), "email") !== false) {
                echo "Email already registered!";
            } else {
                echo "Account already exists!";
            }
        } else {
            echo "Registration failed";
        }
    }

    $conn->close();
}
?>