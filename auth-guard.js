// Guard page access by verifying user session on page load.
// API call: profile endpoint returns login status.
fetch("../controller/php/profile.php")
  .then((res) => {
    if (!res.ok) {
      throw new Error("not ok");
    }
    return res.json();
  })
  .then((data) => {
    if (data && data.error === "not logged in") {
      window.location.href = "login.html";
    }
  })
  .catch(() => {
    window.location.href = "login.html";
  });
