const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/authMiddleware');
const mockTestController = require('../controllers/mockTestController'); 

// 1. Get attempted test status
router.get('/mock-tests/tests/status', authenticateUser, mockTestController.getTestStatus);

// 2. Get questions for a test
router.get('/questions/:testNumber', authenticateUser, mockTestController.getTestQuestions);

// 3. Submit answers
router.post('/submit/:testNumber', authenticateUser, mockTestController.submitTestAnswers);

// 4. Get result of a test
router.get('/result/:testNumber', authenticateUser, mockTestController.getTestResult);

// 5. Get dashboard summary + ML prediction
router.get('/dashboard/summary', authenticateUser, mockTestController.getDashboardSummary);

module.exports = router;
