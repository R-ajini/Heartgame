<?php
// get_score_history.php
// Returns the 10 most recent game records for the currently logged-in user.

session_start();
include "../../model/db.php";

header("Content-Type: application/json");

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["error" => "not logged in"]);
    exit;
}

$user_id = (int) $_SESSION['user_id'];

// Database query: retrieve the most recent score history entries for this user.
$stmt = $conn->prepare("SELECT score, game_name, played_at FROM score_history WHERE user_id = ? ORDER BY played_at DESC LIMIT 10");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

$history = [];
while ($row = $result->fetch_assoc()) {
    $history[] = $row;
}

$stmt->close();
$conn->close();

echo json_encode($history);
?>
