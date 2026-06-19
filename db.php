<?php
/* Local development database credentials */
$host = "localhost";
$user = "root";
$pass = "";
$dbname = "game_db";

$conn = new mysqli($host, $user, $pass);
if ($conn->connect_error) {
    die("Database connection failed: " . $conn->connect_error . " (Is MySQL/XAMPP running?)");
}

$conn->query("CREATE DATABASE IF NOT EXISTS `$dbname` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
if (!$conn->select_db($dbname)) {
    die("Unable to select database `$dbname`: " . $conn->error);
}

// Create users table if not exists (includes all required columns)
$conn->query("CREATE TABLE IF NOT EXISTS users (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

// Create score_history table to track individual game rounds
$conn->query("CREATE TABLE IF NOT EXISTS score_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    score INT NOT NULL,
    game_name VARCHAR(100) DEFAULT 'Unknown',
    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

// Add missing columns if table existed with old schema
$userCols = ["recent_score", "games_played", "total_score", "best_score"];
foreach ($userCols as $col) {
    $r = $conn->query("SHOW COLUMNS FROM users LIKE '$col'");
    if ($r && $r->num_rows === 0) {
        $conn->query("ALTER TABLE users ADD COLUMN $col INT DEFAULT 0");
    }
}

$rCreated = $conn->query("SHOW COLUMNS FROM users LIKE 'created_at'");
if ($rCreated && $rCreated->num_rows === 0) {
    $conn->query("ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
}

$scoreHistoryCols = ["game_name VARCHAR(100) DEFAULT 'Unknown'"];
foreach ($scoreHistoryCols as $colDef) {
    $name = explode(" ", $colDef)[0];
    $r = $conn->query("SHOW COLUMNS FROM score_history LIKE '$name'");
    if ($r && $r->num_rows === 0) {
        $conn->query("ALTER TABLE score_history ADD COLUMN $colDef");
    }
}

$conn->set_charset("utf8mb4");

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}