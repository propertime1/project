const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'exam_system.db'));

// 删除学生 ID=5 在考试 ID=2 的所有记录
const stmt = db.prepare('DELETE FROM exam_records WHERE exam_id = ? AND student_id = ?');
const result = stmt.run(2, 5);

console.log(`已删除 ${result.changes} 条考试记录`);

// 删除错题本中该学生的记录
const wrongStmt = db.prepare('DELETE FROM wrong_questions WHERE student_id = ?');
const wrongResult = wrongStmt.run(5);
console.log(`已删除 ${wrongResult.changes} 条错题记录`);

// 删除成绩记录
const scoreStmt = db.prepare('DELETE FROM scores WHERE exam_id = ? AND student_id = ?');
const scoreResult = scoreStmt.run(2, 5);
console.log(`已删除 ${scoreResult.changes} 条成绩记录`);

db.close();
console.log('清理完成！');
