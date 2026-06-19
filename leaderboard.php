<?php
// leaderboard.php
// Returns the top 5 players ordered by best score.

session_start();
include "../../model/db.php";

header("Content-Type: application/json");

// Database query: select the highest best_score values for global leaderboard display.
$stmt = $conn->prepare("SELECT username, best_score FROM users ORDER BY best_score DESC LIMIT 5");
$stmt->execute();
$result = $stmt->get_result();

$leaderboard = [];
while ($row = $result->fetch_assoc()) {
    $leaderboard[] = $row;
}

$stmt->close();
$conn->close();

echo json_encode($leaderboard);
?>
