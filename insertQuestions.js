const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const db = require("../config/db");

const testFiles = ["test1.csv", "test2.csv", "test3.csv", "test4.csv", "test5.csv"];
const dataDir = path.join(__dirname, "../data");

const insertQuestionsFromCSV = (fileName) => {
    return new Promise((resolve, reject) => {
        const results = [];

        fs.createReadStream(path.join(dataDir, fileName))
            .pipe(csv())
            .on("data", (data) => {
                results.push(data);
            })
            .on("end", async () => {
                for (const row of results) {
                    const {
                        id,
                        subject,
                        topic,
                        sub_topic,
                        question,
                        option1,
                        option2,
                        option3,
                        option4,
                        correct_answer,
                        test_number
                    } = row;

                    try {
                        await db.query(
                            `INSERT INTO questions 
                             (id, subject, topic, sub_topic, question, option1, option2, option3, option4, correct_answer, test_number)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                id,
                                subject,
                                topic,
                                sub_topic,
                                question,
                                option1,
                                option2,
                                option3,
                                option4,
                                correct_answer,
                                test_number
                            ]
                        );
                        console.log(`✅ Inserted Question ID: ${id} from ${fileName}`);
                    } catch (err) {
                        console.error(`❌ Error inserting ID ${id}:`, err.message);
                    }
                }
                resolve();
            });
    });
};

const startInsertion = async () => {
    for (const file of testFiles) {
        console.log(`📥 Inserting from: ${file}`);
        await insertQuestionsFromCSV(file);
    }

    console.log("🎉 All questions inserted successfully.");
    process.exit();
};

startInsertion();
