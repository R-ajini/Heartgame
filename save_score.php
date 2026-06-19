<?php
// save_score.php
// Saves a completed game score and updates user aggregates.
session_start();
include "../../model/db.php";

header("Content-Type: text/plain");

if (!isset($_SESSION['user_id'])) {
    // Session guard: score saving requires an authenticated user.
    echo "not_logged_in";
    exit;
}

$user_id = (int) $_SESSION['user_id'];
$score = isset($_POST['score']) ? (int) $_POST['score'] : 0;
$game_name = isset($_POST['game_name']) ? $_POST['game_name'] : 'Unknown';

// Database query: update aggregate score stats in users table.
$stmt = $conn->prepare("UPDATE users SET recent_score = ?, games_played = games_played + 1, total_score = total_score + ?, best_score = GREATEST(COALESCE(best_score, 0), ?) WHERE id = ?");
$stmt->bind_param("iiii", $score, $score, $score, $user_id);

if ($stmt->execute()) {
    // Database query: insert one row per played game in history table.
    $hist_stmt = $conn->prepare("INSERT INTO score_history (user_id, score, game_name) VALUES (?, ?, ?)");
    if ($hist_stmt) {
        $hist_stmt->bind_param("iis", $user_id, $score, $game_name);
        $hist_stmt->execute();
        $hist_stmt->close();
    }

    echo "success";
} else {
    echo "error";
}

$stmt->close();
$conn->close();