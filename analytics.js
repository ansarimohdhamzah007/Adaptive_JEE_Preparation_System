// backend/routes/analytics.js

const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { execFile, execFileSync } = require('child_process');
const path = require('path');

/**
 * JS fallback: produces exactly two lines (Peers Average & You).
**/

function makeSynthetic(userScores) {
  const MAX = 60, N = 10;
  const synth = Array.from({ length: N }, () =>
    userScores.map(() => Math.floor(Math.random() * (MAX + 1)))
  );
  const peerAvg = userScores.map((_, i) =>
    Math.round(synth.reduce((sum, row) => sum + row[i], 0) / N)
  );
  const datasets = [
    {
      label: 'Peers Average',
      data: peerAvg,
      borderColor: '#36A2EB',
      fill: false,
      tension: 0.3
    },
    {
      label: 'You',
      data: userScores,
      borderColor: '#f44336',
      fill: false,
      tension: 0.3
    }
  ];
  const labels = userScores.map((_, i) => `Test ${i+1}`);
  return { labels, datasets };
}

// ── backend/routes/analytics.js ──
router.get('/summary/:studentId', async (req, res) => {
  const studentId = req.params.studentId;
  try {
    // 1) Fetch correct/incorrect counts per test
    const rows = await db.query(
      `SELECT
         test_number,
         SUM(is_correct) AS correct_count,
         SUM(CASE WHEN selected_option IS NOT NULL AND is_correct = 0 THEN 1 ELSE 0 END) AS incorrect_count
       FROM mock_test_results
       WHERE student_id = ?
       GROUP BY test_number
       ORDER BY test_number ASC`,
      [studentId]
    );

    // 2) Build a fixed-length (5) scores array
    const userScores = Array(5).fill(0);
    rows.forEach(r => {
      const idx = r.test_number - 1;
      if (idx >= 0 && idx < 5) {
        userScores[idx] = (r.correct_count * 4) - r.incorrect_count;
      }
    });

    // 3) Compute Your Average
    const yourAverage = +(
      userScores.reduce((sum, x) => sum + x, 0) / 5
    ).toFixed(1);

    // 4) Compute Peer Average via Python ML or JS fallback
    let peerData;
    try {
      const script = path.join(__dirname, '../ml/worm_model_kmeans.py');
      const out    = execFileSync('python', [script, JSON.stringify(userScores)], { timeout: 10000 });
      const parsed = JSON.parse(out);
      peerData      = parsed.datasets.find(ds => ds.label === 'Peers Average').data;
    } catch {
      peerData = makeSynthetic(userScores).datasets[0].data;
    }
    const peerAverage = +(
      peerData.reduce((sum, x) => sum + x, 0) / peerData.length
    ).toFixed(1);

    // 5) Predict next (T6) via Random Forest
    let predictedNext = 0;
    try {
      const predScript = path.join(__dirname, '../ml/predict_score.py');
      const predOut    = execFileSync(
        'python',
        [predScript, userScores.join(',')],
        { timeout: 10000 }
      );
      predictedNext = JSON.parse(predOut.toString());
    } catch (e) {
      console.warn('Prediction script failed:', e);
    }

    // 6) Best Test (highest mark among T1–T5)
    const bestTest = Math.max(...userScores);

    return res.json({ yourAverage, peerAverage, bestTest, predictedNext });
  } catch (err) {
    console.error('Summary error:', err);
    return res.status(500).json({
      yourAverage: 0,
      peerAverage: 0,
      bestTest: 0,
      predictedNext: 0
    });
  }
});


router.get('/worm-data/:studentId', async (req, res) => {
  const studentId = req.params.studentId;
  try {
    // 1) Fetch counts per test
    const rows = await db.query(
      `SELECT
         test_number,
         SUM(is_correct) AS correct_count,
         SUM(CASE WHEN selected_option IS NOT NULL AND is_correct = 0 THEN 1 ELSE 0 END) AS incorrect_count
       FROM mock_test_results
       WHERE student_id = ?
       GROUP BY test_number
       ORDER BY test_number ASC`,
      [studentId]
    );

    // 2) Build a 5-slot mark array (0 if unattempted)
    const userScores = Array(5).fill(0);
    rows.forEach(r => {
      const idx = r.test_number - 1;
      if (idx >= 0 && idx < 5) {
        userScores[idx] = (r.correct_count * 4) - r.incorrect_count;
      }
    });

    // 3) Try Python ML fallback to JS
    const scriptPath = path.join(__dirname, '../ml/worm_model_kmeans.py');
    const pythonCmds = ['py', 'python', 'python3'];
    let done = false;

    for (const cmd of pythonCmds) {
      if (done) break;
      try {
        const stdout = await new Promise((resolve, reject) => {
          execFile(cmd, [scriptPath, JSON.stringify(userScores)], { timeout: 10000 }, (err, out, stderr) => {
            if (stderr) console.error(stderr);
            if (err) return reject(err);
            resolve(out);
          });
        });
        if (stdout) {
          const wormData = JSON.parse(stdout);
          res.json(wormData);
          done = true;
        }
      } catch {
        // try next
      }
    }

    // 4) JS fallback if Python fails
    if (!done) {
      console.warn('Python not found or failed; using JS synthetic fallback.');
      return res.json(makeSynthetic(userScores));
    }

  } catch (err) {
    console.error('Analytics error:', err);
    return res.json(makeSynthetic([0,0,0,0,0]));
  }
});


module.exports = router;
