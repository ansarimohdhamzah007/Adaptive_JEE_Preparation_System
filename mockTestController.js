// backend/controllers/mockTestController.js

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const db = require('../config/db');           // promisified in config/db.js
const { spawn } = require('child_process');

// 1. Get attempted test status
exports.getTestStatus = (req, res) => {
  const userId = req.user.id;
  if (!userId) return res.status(401).json({ msg: "User ID missing in token" });

  db.query(
    "SELECT DISTINCT test_number FROM mock_test_results WHERE student_id = ?",
    [userId]
  )
    .then(results => res.json({ attemptedTests: results.map(r => r.test_number) }))
    .catch(err => {
      console.error("Database error:", err);
      res.status(500).json({ msg: "Database error" });
    });
};

// 2. Get questions from CSV
exports.getTestQuestions = (req, res) => {
  const testNumber = req.params.testNumber;
  const filePath = path.join(__dirname, '..', 'data', `test${testNumber}.csv`);
  const questions = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', row => questions.push(row))
    .on('end', () => {
      questions.forEach(q => delete q.correct_answer);
      res.json({ questions });
    })
    .on('error', err => {
      console.error("Error reading CSV:", filePath, err);
      res.status(500).json({ error: 'CSV file not found or invalid' });
    });
};

// 3. Submit test answers (with time_taken)
exports.submitTestAnswers = async (req, res) => {
  const studentId  = req.user.id;
  const testNumber = parseInt(req.params.testNumber, 10);
  const answers    = req.body.answers || {};  // { "<qid>": { answer: "2"|null, timeTaken: <sec>|null } }

  console.log("⇨ Received answers:", answers);

  try {
    // 3a) Wipe old submissions so we can re-attempt
    await db.query(
      'DELETE FROM mock_test_results WHERE student_id = ? AND test_number = ?',
      [studentId, testNumber]
    );

    // 3b) Load testX.csv into memory
    const filePath = path.join(__dirname, '..', 'data', `test${testNumber}.csv`);
    const questionsData = await new Promise((resolve, reject) => {
      const arr = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', row => arr.push(row))
        .on('end', () => resolve(arr))
        .on('error', err => reject(err));
    });

    // 3c) Build bulk‑insert values array
    const values = [];
    for (const [qid, info] of Object.entries(answers)) {
      // Find the question row in CSV
      const qRow = questionsData.find(r => r.id.toString() === qid.toString());
      if (!qRow) continue;

      // Parse selected option and timeTaken
      const selOpt    = (info.answer != null)
        ? Number.parseInt(info.answer, 10)
        : null;
      const timeTaken = (info.timeTaken != null)
        ? Number.parseInt(info.timeTaken, 10)
        : null;

      // Determine correct answer index (1–4)
      let correct = null;
      const corrText = (qRow.correct_answer || '').trim();
      if (corrText) {
        const idx = ['option1', 'option2', 'option3', 'option4']
          .findIndex(k => (qRow[k] || '').trim() === corrText);
        if (idx !== -1) correct = idx + 1;
      }

      // Determine boolean is_correct
      const isCorrect = (selOpt !== null && selOpt === correct) ? 1 : 0;

      values.push([
        studentId,
        testNumber,
        Number.parseInt(qid, 10),
        qRow.subject,
        qRow.topic,
        qRow.sub_topic,
        selOpt,
        correct,
        isCorrect,
        timeTaken
      ]);
    }

    // 3d) If there really are no answered rows, reject early
    if (values.length === 0) {
      return res.status(400).json({ error: 'No answers submitted' });
    }

    // 3e) Bulk insert into mock_test_results (including time_taken)
    await db.query(
      `INSERT INTO mock_test_results
         (student_id, test_number, question_id,
          subject, topic, sub_topic,
          selected_option, correct_answer, is_correct, time_taken)
       VALUES ?`,
      [values]
    );

    res.json({ message: 'Test submitted successfully' });
  } catch (err) {
    console.error("Submission failed:", err);
    res.status(500).json({ error: err.message || 'Submission failed' });
  }
};

// 4. Get test result details (now including time_taken)
exports.getTestResult = async (req, res) => {
  const studentId  = req.user.id;
  const testNumber = parseInt(req.params.testNumber, 10);

  try {
    // 4a) Pull answered rows with time_taken
    const resultRows = await db.query(
      `SELECT 
         question_id,
         selected_option,
         correct_answer,
         is_correct,
         subject,
         topic,
         sub_topic,
         time_taken
       FROM mock_test_results
       WHERE student_id = ? 
         AND test_number = ?
       ORDER BY question_id ASC`,
      [studentId, testNumber]
    );

    // 4b) Normalize CSV for merging
    const filePath = path.join(__dirname, '..', 'data', `test${testNumber}.csv`);
    const questionsData = await new Promise((resolve, reject) => {
      const arr = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', row => {
          const norm = {};
          for (const [k, v] of Object.entries(row)) {
            const key = k.trim().toLowerCase().replace(/\s+/g, '');
            norm[key] = v;
          }
          arr.push(norm);
        })
        .on('end', () => resolve(arr))
        .on('error', err => reject(err));
    });

    // 4c) Merge DB answers with CSV text + include timeTaken
    const responses = resultRows.map(r => {
      const qRow = questionsData.find(q => q.id === String(r.question_id));
      const question     = qRow ? (qRow.question || qRow.questiontext) : "Question text not found";
      const givenAnswer  = qRow ? qRow['option' + r.selected_option] : null;
      const correctAnswer= qRow ? qRow['option' + r.correct_answer] : null;
      const status       = r.is_correct
        ? 'correct'
        : (r.selected_option == null ? 'skipped' : 'incorrect');

      return {
        questionId:    r.question_id,
        question,
        givenAnswer,
        correctAnswer,
        subject: r.subject,
        topic: r.topic,
        sub_topic: r.sub_topic,
        status,
        timeTaken: r.time_taken   // in seconds (null if skipped)
      };
    });

    // 4d) Compute summary
    const correctCount   = responses.filter(r => r.status === 'correct').length;
    const incorrectCount = responses.filter(r => r.status === 'incorrect').length;
    const skippedCount   = responses.filter(r => r.status === 'skipped').length;
    const totalMarks     = correctCount * 4 - incorrectCount;

    // 4e) Return to front‑end
    res.json({ totalMarks, correctCount, incorrectCount, skippedCount, responses });
  } catch (err) {
    console.error("Failed to fetch result:", err);
    res.status(500).json({ error: err.message || 'Failed to fetch result' });
  }
};

// 5. Dashboard summary unchanged
exports.getDashboardSummary = async (req, res) => {
  const studentId = req.user.id;

  try {
    const rows = await db.query(
      `SELECT
         test_number,
         SUM(is_correct) AS correct_count,
         SUM(
           CASE WHEN selected_option IS NOT NULL AND is_correct = 0 THEN 1
                ELSE 0
           END
         ) AS incorrect_count
       FROM mock_test_results
       WHERE student_id = ?
       GROUP BY test_number
       ORDER BY test_number ASC`,
      [studentId]
    );

    const scores = rows.map(r => {
      const marks = r.correct_count * 4 - r.incorrect_count;
      return { test_number: r.test_number, score: marks };
    });

    const input = scores.map(s => s.score).join(',');
    const scriptPath = path.join(__dirname, '..', 'ml', 'predict_score.py');
    const pythonExe = path.join(
      __dirname,       // …/jee-study-plannerF/backend/controllers
      '..',            // …/jee-study-plannerF/backend
      '..',            // …/jee-study-plannerF
      '.venv',         // your virtual-env folder
      'Scripts',
      'python.exe'
    );
    
    const py = spawn(pythonExe, [ scriptPath, input ], {
      cwd: path.join(__dirname, '..')
    });
    

    let stdout = '', stderr = '';
    py.stdout.on('data', data => { stdout += data.toString(); });
    py.stderr.on('data', data => { stderr += data.toString(); });
    py.on('close', code => {
      if (stderr) console.error('predict_score.py stderr:', stderr.trim());
      if (code !== 0) console.warn(`predict_score.py exited with code ${code}`);
      const prediction = parseFloat(stdout) || 0;
      res.json({ scores, prediction });
    });
  } catch (err) {
    console.error("Failed to fetch summary:", err);
    res.status(500).json({ error: err.message || 'Failed to fetch summary' });
  }
};
