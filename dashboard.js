// dashboard.js

// 🛠 Startup logging
console.log("🔍 dashboard.js loaded – token =", localStorage.getItem("token"));

document.addEventListener("DOMContentLoaded", async () => {
  // 0) Token check
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Please log in first!");
    return location.href = "login.html";
  }

  // 1) FETCH & PARSE PROFILE
  let user;
  try {
    console.log("→ ⏳ Calling /api/auth/dashboard …");
    const res = await fetch("http://localhost:5000/api/auth/dashboard", {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("← Status:", res.status, "Content-Type:", res.headers.get("content-type"));

    // grab raw text so we can detect HTML vs JSON
    const raw = await res.text();
    console.log("← Raw response:", raw);

    user = JSON.parse(raw);
    if (!res.ok) throw new Error(user.msg || res.statusText);

  } catch (err) {
    console.error("❌ PROFILE LOAD FAILED:", err);
    alert("Session expired: " + err.message);
    localStorage.clear();
    return location.href = "login.html";
  }

  // 2) UPDATE PROFILE UI
  try {
    console.log("→ Updating profile UI with", user);
    document.getElementById("userName").textContent  = user.name;
    document.getElementById("userEmail").textContent = user.email;
    document.getElementById("userPhone").textContent = user.phone;
    localStorage.setItem("student_id", user.id);
  } catch (err) {
    console.warn("⚠️ PROFILE UI UPDATE FAILED:", err);
  }

  // 3) SUMMARY CARDS (Your Avg, Peer Avg, Best Test)
  try {
    console.log("→ ⏳ Calling /api/analytics/summary …");
    const sumRes = await fetch(
      `http://localhost:5000/api/analytics/summary/${user.id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!sumRes.ok) throw new Error("Summary status " + sumRes.status);
    const { yourAverage, peerAverage, bestTest } = await sumRes.json();
    console.log("← Summary JSON:", { yourAverage, peerAverage, bestTest });

    document.getElementById("yourAverage").textContent = yourAverage;
    document.getElementById("peerAverage").textContent = peerAverage;
    document.getElementById("bestTest").textContent     = bestTest;
  } catch (err) {
    console.warn("⚠️ SUMMARY CARDS FAILED:", err);
  }

  // 4) MOCK TESTS LIST & PERFORMANCE CHART
  try {
    console.log("→ ⏳ Calling /api/mock/dashboard/summary …");
    const r = await fetch("http://localhost:5000/api/mock/dashboard/summary", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!r.ok) throw new Error("mock/dashboard summary status " + r.status);
    const { scores, prediction } = await r.json();
    console.log("← Mock summary JSON:", { scores, prediction });

    const MAX = 60;
    const ul = document.getElementById("mockResults");
    ul.innerHTML = "";
    for (let t = 1; t <= 5; t++) {
      const s = scores.find(x => x.test_number === t);
      const li = document.createElement("li");
      if (s) {
        li.innerHTML = `
          <strong>Mock Test ${t}</strong>: ${s.score} / ${MAX}
          <button onclick="viewResult(${t})">Show Result</button>
        `;
      } else {
        li.innerHTML = `
          <strong>Mock Test ${t}</strong>: Not Attempted
          <button disabled>Show Result</button>
        `;
      }
      ul.appendChild(li);
    }

    // ── build data for bar chart ──
    // actual scores for T1–T5
    const actualScores = [1, 2, 3, 4, 5].map(n => {
      const s = scores.find(x => x.test_number === n);
      return s ? s.score : 0;
    });

    // debug raw prediction shape
    console.log("Raw prediction payload:", prediction);

    // derive predicted array and labels
    let predictedScoresArray = [];
    let predLabels = [];

    if (typeof prediction === "number") {
      // single numeric prediction → T6
      predictedScoresArray = [prediction];
      predLabels = [`Pred (T${actualScores.length + 1})`];
    } else if (Array.isArray(prediction)) {
      // array of predictions → T6, T7, ...
      predictedScoresArray = prediction.map(n => Number(n));
      predLabels = predictedScoresArray.map((_, i) =>
        `Pred (T${actualScores.length + i + 1})`
      );
    } else if (prediction && typeof prediction === "object") {
      // object with keys pred1, pred2, ...
      const keys = Object.keys(prediction)
        .filter(k => /^pred\d+$/.test(k))
        .sort((a, b) => parseInt(a.slice(4)) - parseInt(b.slice(4)));
      predictedScoresArray = keys.map(k => Number(prediction[k] || 0));
      predLabels = keys.map(k => {
        const num = parseInt(k.slice(4));
        return `Pred (T${num})`;
      });
    } else {
      // unexpected
      console.warn("Unexpected prediction type:", prediction);
      predictedScoresArray = [0];
      predLabels = [`Pred (T${actualScores.length + 1})`];
    }

    const combinedScores = actualScores.concat(predictedScoresArray);
    const labels = actualScores.map((_, i) => `T${i + 1}`).concat(predLabels);

    // debug final chart arrays
    console.log("Chart labels:", labels);
    console.log("Chart data:", combinedScores);

    const barColors = combinedScores.map((_, i) =>
      i < actualScores.length ? '#2196f3' : '#ffa726'
    );

    new Chart(
      document.getElementById("performanceChart"),
      {
        type: "bar",
        data: {
          labels,
          datasets: [{
            label: "Marks",
            data: combinedScores,
            backgroundColor: barColors
          }]
        },
        options: {
          responsive: true,
          scales: { y: { beginAtZero: true, max: MAX } }
        }
      }
    );
    // ── end chart build ──

  } catch (err) {
    console.error("❌ MOCK DASHBOARD SUMMARY FAILED:", err);
  }

  // 5) CHART TOGGLES + WORM GRAPH
  try {
    const predBtn  = document.getElementById("predGraphBtn");
    const wormBtn  = document.getElementById("wormGraphBtn");
    const predCont = document.getElementById("predGraphContainer");
    const wormCont = document.getElementById("wormGraphContainer");
    const wormCtx  = document.getElementById("wormChart").getContext("2d");

    predBtn.addEventListener("click", () => {
      predCont.style.display = ""; wormCont.style.display = "none";
    });
    wormBtn.addEventListener("click", () => {
      predCont.style.display = "none"; wormCont.style.display = "";
    });

    console.log("→ ⏳ Calling /api/analytics/worm-data …");
    const wd = await fetch(
      `http://localhost:5000/api/analytics/worm-data/${user.id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const { labels, datasets } = await wd.json();
    console.log("← Worm JSON:", { labels, datasets });

    // style each dataset
    datasets.forEach((ds, i) => {
      const color = ds.label === "You" ? "red" : "#17becf";
      ds.borderColor          = color;
      ds.backgroundColor      = color;
      ds.pointBorderColor     = color;
      ds.pointBackgroundColor = color;
      ds.pointRadius          = ds.label==="You"?6:4;
      ds.pointHoverRadius     = ds.label==="You"?8:6;
      ds.borderWidth          = ds.label==="You"?3:2;
      ds.fill                 = false;
      ds.tension              = 0.3;
    });

    new Chart(wormCtx, {
      type: "line",
      data: { labels, datasets },
      options: {
        plugins: { legend: { position: "bottom" } },
        scales: { y: { beginAtZero: true, max: 60 } }
      }
    });
  } catch (err) {
    console.error("❌ WORM GRAPH LOAD FAILED:", err);
  }

  // 6) LOAD STRENGTH & WEAK AREA BOXES
  await loadStrengthAreas(token);
  await loadHighlightedWeakAreas(token);
});

// ── helper to load strength topics per test ──
async function loadStrengthAreas(token) {
  for (let t = 1; t <= 5; t++) {
    const listEl = document.getElementById(`strong${t}`);
    listEl.innerHTML = "<li>Loading…</li>";
    try {
      const res = await fetch(
        `http://localhost:5000/api/mock/result/${t}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        listEl.innerHTML = "<li>— none —</li>";
        continue;
      }
      const { responses } = await res.json();
      const strongItems = responses
        .filter(r => r.status === "correct")
        .map(r => `<li>${r.subject} › ${r.topic} › ${r.sub_topic}</li>`);
      listEl.innerHTML = strongItems.length
        ? strongItems.join("")
        : "<li>— none —</li>";
    } catch (err) {
      console.warn(`Could not load strength areas for Test ${t}:`, err);
      listEl.innerHTML = "<li>— none —</li>";
    }
  }
}

// ── helper to load weak topics per test ──
async function loadHighlightedWeakAreas(token) {
  for (let t = 1; t <= 5; t++) {
    const listEl = document.getElementById(`weak${t}`);
    listEl.innerHTML = "<li>Loading…</li>";
    try {
      const res = await fetch(
        `http://localhost:5000/api/mock/result/${t}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        listEl.innerHTML = "<li>— none —</li>";
        continue;
      }
      const { responses } = await res.json();
      const weakItems = responses
        .filter(r => r.status !== "correct")
        .map(r => `<li>${r.subject} › ${r.topic} › ${r.sub_topic}</li>`);
      listEl.innerHTML = weakItems.length
        ? weakItems.join("")
        : "<li>— none —</li>";
    } catch (err) {
      console.warn(`Could not load weak areas for Test ${t}:`, err);
      listEl.innerHTML = "<li>— none —</li>";
    }
  }
}

// ── helper to navigate to individual result pages ──
function viewResult(n) {
  location.href = `resultPage.html?test=${n}`;
}

// Make strength boxes clickable
document.querySelectorAll('.strength-box').forEach(box => {
  box.addEventListener('click', () => {
    const list = box.querySelector('ul');
    if (list.style.display === 'none' || list.style.display === '') {
      list.style.display = 'block';
    } else {
      list.style.display = 'none';
    }
  });
});

// Make weakness boxes clickable
document.querySelectorAll('.weakness-box').forEach(box => {
  box.addEventListener('click', () => {
    const list = box.querySelector('ul');
    if (list.style.display === 'none' || list.style.display === '') {
      list.style.display = 'block';
    } else {
      list.style.display = 'none';
    }
  });
});