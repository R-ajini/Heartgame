<?php
// logout.php
// Clears active session and returns a simple logout status.
session_start();
// Session cleanup.
session_unset();
session_destroy();

// Simple logout endpoint – front-end can redirect after calling this
echo "logged_out";
