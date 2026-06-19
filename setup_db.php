<?php
/**
 * One-time database setup. Run this once: http://localhost/ui%20game/UI%20game/model/setup_db.php
 * Or via XAMPP: open in browser and it will create game_db + users table.
 */

$host = "localhost";
$user = "root";
$pass = "";

// Connect without database first
$conn = new mysqli($host, $user, $pass);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Create database if not exists
$conn->query("CREATE DATABASE IF NOT EXISTS game_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
$conn->select_db("game_db");

$sql = "CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    recent_score INT DEFAULT 0,
    games_played INT DEFAULT 0,
    total_score INT DEFAULT 0,
    best_score INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

if ($conn->query($sql)) {
    echo "Database setup successful. You can close this page.";
} else {
    echo "Error: " . $conn->error;
}

$conn->close();
