<?php
// profile.php
// Returns current logged-in user profile data as JSON.
session_start();
include "../../model/db.php";

header("Content-Type: application/json");

if (!isset($_SESSION['user_id'])) {
    // Session guard: caller must be logged in.
    echo json_encode(["error" => "not logged in"]);
    exit;
}

$user_id = (int) $_SESSION['user_id'];

// Database query: get profile stats for current user.
$stmt = $conn->prepare("SELECT username, email, games_played, total_score, best_score, created_at FROM users WHERE id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();
$row = $result->fetch_assoc();

$stmt->close();
$conn->close();

if ($row) {
    // Normalize date format so frontend can parse consistently.
    if (!empty($row['created_at'])) {
        $ts = strtotime($row['created_at']);
        if ($ts !== false) {
            $row['created_at'] = date('c', $ts);
        }
    }
    echo json_encode($row);
} else {
    echo json_encode(["error" => "User not found"]);
}