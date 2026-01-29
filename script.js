document.addEventListener("DOMContentLoaded", function () {
  const authBtn = document.getElementById("authBtn");
  const mockTestBtn = document.getElementById("mockTestBtn");
  const chapTestBtn = document.getElementById("chapTestBtn");
  const subTestBtn = document.getElementById("subTestBtn");
  const pyqTestBtn = document.getElementById("pyqTestBtn");

  //    Check if user is logged in
  const user = localStorage.getItem("user");
  if (user) {
    authBtn.textContent = "Dashboard";
    authBtn.href = "dashboard.html";
  }

  //    Fix: Check if mockTestBtn exists before modifying it
  if (mockTestBtn) {
    if (user) {
      mockTestBtn.disabled = false; // Enable Mock Test button after login
    } else {
      mockTestBtn.disabled = true; // Disable if user not logged in
    }
  }
  if (chapTestBtn) {
    if (user) {
      chapTestBtn.disabled = false; // Enable Mock Test button after login
    } else {
      chapTestBtn.disabled = true; // Disable if user not logged in
    }
  }

  if (subTestBtn) {
    if (user) {
      subTestBtn.disabled = false; // Enable Mock Test button after login
    } else {
      subTestBtn.disabled = true; // Disable if user not logged in
    }
  }

  if (pyqTestBtn) {
    if (user) {
      pyqTestBtn.disabled = false; // Enable Mock Test button after login
    } else {
      pyqTestBtn.disabled = true; // Disable if user not logged in
    }
  }

  //    Handle Registration Form Submission
  if (document.getElementById("registerForm")) {
    document
      .getElementById("registerForm")
      .addEventListener("submit", async function (e) {
        e.preventDefault();

        const name = document.getElementById("name").value;
        const email = document.getElementById("email").value;
        const phone = document.getElementById("phone").value;
        const password = document.getElementById("password").value;

        const response = await fetch(
          "http://localhost:5000/api/auth/register",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, phone, password }),
          }
        );

        const data = await response.json();
        alert(data.msg);

        if (response.ok) {
          window.location.href = "login.html"; //    Redirects to login after successful registration
        }
      });
  }

  //    Handle Login Form Submission
  if (document.getElementById("loginForm")) {
    document
      .getElementById("loginForm")
      .addEventListener("submit", async function (e) {
        e.preventDefault();

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        const response = await fetch("http://localhost:5000/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        alert(data.msg);

        if (response.ok) {
          localStorage.setItem("user", JSON.stringify(data)); //    Store user data
          window.location.href = "dashboard.html"; //    Redirect to dashboard after login
        }
      });
  }
});
document.addEventListener("DOMContentLoaded", function () {
  const newsList = document.querySelector(".news-list");
  let scrollAmount = 0;

  function scrollNews() {
    scrollAmount -= 1;
    if (
      Math.abs(scrollAmount) >=
      newsList.scrollHeight / newsList.children.length
    ) {
      const firstChild = newsList.children[0];
      newsList.appendChild(firstChild);
      scrollAmount = 0;
    }
    newsList.style.transform = `translateY(${scrollAmount}px)`;
  }
  setInterval(scrollNews, 50);
});
function showCards(subject) {
  var cards = document.querySelectorAll(".cards");
  cards.forEach(function (card) {
    card.classList.remove("active");
  });
  var buttons = document.querySelectorAll(".tabs button");
  buttons.forEach(function (button) {
    button.classList.remove("active");
  });
  document.getElementById(subject).classList.add("active");
  event.target.classList.add("active");
}

document.addEventListener("DOMContentLoaded", (event) => {
  const Homepagefooter = document.getElementById("Homepagefooter");
  Homepagefooter.addEventListener("click", () => {
    window.location.href = "index.html";
  });
});

document
  .getElementById("contact-pagen")
  .addEventListener("click", function (e) {
    e.preventDefault();
    window.location.href = "contactpage1.html";
  });
document
  .getElementById("contact-pagef")
  .addEventListener("click", function (e) {
    e.preventDefault();
    window.location.href = "contactpage1.html";
  });
document
  .getElementById("formula-dashbd")
  .addEventListener("click", function (e) {
    e.preventDefault();
    window.location.href = "formulapg.html";
  });
document.getElementById("main-pagen2").addEventListener("click", function (e) {
  e.preventDefault();
  window.location.href = "index.html";
});
